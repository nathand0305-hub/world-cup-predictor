const crypto = require('crypto');
const axios = require('axios');
const { mutateData, readData } = require('../dataStore');

const DEFAULT_ESPN_WORLD_CUP_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=1000';

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['ft', 'aet', 'pen', 'finished', 'match finished', 'full-time', 'final', 'final/so', 'post'].some(x => s.includes(x))) return 'finished';
  if (['1h', '2h', 'ht', 'live', 'in progress', 'elapsed', 'in', 'halftime'].some(x => s.includes(x))) return 'live';
  return 'upcoming';
}

function safeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapApiFootballFixture(fixture) {
  const status = normalizeStatus(fixture.fixture?.status?.short || fixture.fixture?.status?.long);
  return {
    id: String(fixture.fixture?.id || `${fixture.teams?.home?.name}-${fixture.teams?.away?.name}-${fixture.fixture?.date}`),
    externalId: String(fixture.fixture?.id || ''),
    homeTeam: fixture.teams?.home?.name || 'Home Team',
    awayTeam: fixture.teams?.away?.name || 'Away Team',
    homeFlag: '',
    awayFlag: '',
    startTime: fixture.fixture?.date || new Date().toISOString(),
    status,
    homeScore: safeNumber(fixture.goals?.home),
    awayScore: safeNumber(fixture.goals?.away),
    venue: fixture.fixture?.venue?.name || '',
    updatedAt: new Date().toISOString()
  };
}

function mapEspnEvent(event) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};
  const statusType = event.status?.type || competition.status?.type || {};
  const status = statusType.completed ? 'finished' : normalizeStatus(statusType.name || statusType.state || statusType.description || statusType.detail);

  const homeLogo = home.team?.logos?.[0]?.href || home.team?.logo || '';
  const awayLogo = away.team?.logos?.[0]?.href || away.team?.logo || '';

  return {
    id: `espn-${event.id}`,
    externalId: String(event.id || ''),
    homeTeam: home.team?.displayName || home.team?.shortDisplayName || home.team?.name || 'Home Team',
    awayTeam: away.team?.displayName || away.team?.shortDisplayName || away.team?.name || 'Away Team',
    homeFlag: homeLogo,
    awayFlag: awayLogo,
    startTime: event.date || competition.date || new Date().toISOString(),
    status,
    homeScore: safeNumber(home.score),
    awayScore: safeNumber(away.score),
    venue: competition.venue?.fullName || competition.venue?.displayName || '',
    updatedAt: new Date().toISOString()
  };
}

async function fetchEspnWorldCup(url = DEFAULT_ESPN_WORLD_CUP_URL) {
  const response = await axios.get(url, { timeout: 20000 });
  const payload = response.data;

  if (!Array.isArray(payload?.events)) {
    return [];
  }

  return payload.events
    .map(mapEspnEvent)
    .filter(match => match.homeTeam && match.awayTeam && match.startTime)
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}

async function fetchApiFootball(url, apiKey) {
  const headers = { 'x-apisports-key': apiKey };
  if (process.env.FOOTBALL_API_HOST) {
    headers['x-rapidapi-host'] = process.env.FOOTBALL_API_HOST;
    headers['x-rapidapi-key'] = apiKey;
  }

  const response = await axios.get(url, { headers, timeout: 15000 });
  const payload = response.data;

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
  }
  if (payload?.errors && typeof payload.errors === 'object' && Object.keys(payload.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
  }

  if (Array.isArray(payload?.response)) {
    return payload.response.map(mapApiFootballFixture);
  }

  if (Array.isArray(payload?.matches)) {
    return payload.matches.map(match => ({
      id: String(match.id || match.externalId),
      externalId: String(match.externalId || match.id || ''),
      homeTeam: match.homeTeam || match.home || 'Home Team',
      awayTeam: match.awayTeam || match.away || 'Away Team',
      homeFlag: match.homeFlag || '',
      awayFlag: match.awayFlag || '',
      startTime: match.startTime || match.utcDate || match.date,
      status: normalizeStatus(match.status),
      homeScore: safeNumber(match.homeScore),
      awayScore: safeNumber(match.awayScore),
      venue: match.venue || '',
      updatedAt: new Date().toISOString()
    }));
  }

  return [];
}

async function fetchMatchesFromConfiguredApi() {
  const configuredUrl = process.env.FOOTBALL_API_URL || process.env.ESPN_API_URL || DEFAULT_ESPN_WORLD_CUP_URL;
  const apiKey = process.env.FOOTBALL_API_KEY;

  // ESPN public scoreboard: no key required. This is the preferred free option for World Cup 2026.
  if (configuredUrl.includes('espn.com')) {
    return fetchEspnWorldCup(configuredUrl);
  }

  // API-Football paid/free-key route. If it blocks 2026 on free plans, fall back to ESPN.
  if (configuredUrl && apiKey) {
    try {
      const matches = await fetchApiFootball(configuredUrl, apiKey);
      if (matches.length) return matches;
      console.warn('Configured football API returned 0 matches. Falling back to ESPN World Cup feed.');
    } catch (error) {
      console.warn(error.message || error);
      console.warn('Falling back to ESPN World Cup feed.');
    }
  }

  return fetchEspnWorldCup(DEFAULT_ESPN_WORLD_CUP_URL);
}

function resultType(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home';
  if (awayScore > homeScore) return 'away';
  return 'draw';
}

function lockStartedMatchesAndScoreFinishedMatches() {
  return mutateData(data => {
    const now = Date.now();
    let changed = false;

    data.matches.forEach(match => {
      const start = Date.parse(match.startTime);
      if (match.status === 'upcoming' && Number.isFinite(start) && start <= now) {
        match.status = 'live';
        match.updatedAt = new Date().toISOString();
        changed = true;
      }
    });

    data.predictions.forEach(prediction => {
      if (prediction.evaluatedAt) return;
      const match = data.matches.find(m => m.id === prediction.matchId);
      if (!match || match.status !== 'finished') return;
      if (match.homeScore === null || match.awayScore === null) return;

      const exact = prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore;
      const correctResult = resultType(prediction.homeScore, prediction.awayScore) === resultType(match.homeScore, match.awayScore);
      const points = exact ? 5 : correctResult ? 2 : 0;
      prediction.pointsAwarded = points;
      prediction.evaluatedAt = new Date().toISOString();

      const user = data.users.find(u => u.id === prediction.userId);
      if (user && points > 0) {
        user.points = (user.points || 0) + points;
        if (exact) user.exactCount = (user.exactCount || 0) + 1;
        else user.winnerCount = (user.winnerCount || 0) + 1;
      }

      data.activity.push({
        id: crypto.randomUUID(),
        userId: prediction.userId,
        type: 'prediction_scored',
        message: `Prediction scored ${points} point(s)`,
        matchId: prediction.matchId,
        createdAt: new Date().toISOString()
      });
      changed = true;
    });

    return changed;
  });
}

async function syncMatches() {
  const apiMatches = await fetchMatchesFromConfiguredApi();
  if (apiMatches.length) {
    mutateData(data => {
      // Replace demo/old fixture list with the real current API list, but keep users/predictions/activity.
      const existingById = new Map(data.matches.map(m => [m.id, m]));
      const nextMatches = apiMatches.map(apiMatch => ({
        ...(existingById.get(apiMatch.id) || {}),
        ...apiMatch
      }));
      data.matches = nextMatches;
      data.activity.push({
        id: crypto.randomUUID(),
        type: 'matches_synced',
        message: `Synced ${apiMatches.length} real World Cup match(es)`,
        createdAt: new Date().toISOString()
      });
    });
  } else {
    console.warn('Match sync returned 0 matches. Check API URL/key or ESPN availability.');
  }
  lockStartedMatchesAndScoreFinishedMatches();
  return readData().matches;
}

module.exports = {
  syncMatches,
  lockStartedMatchesAndScoreFinishedMatches,
  resultType
};
