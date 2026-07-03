const crypto = require('crypto');
const axios = require('axios');
const { mutateData, readData } = require('../dataStore');

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase();
  if (['ft', 'aet', 'pen', 'finished', 'match finished', 'full-time'].some(x => s.includes(x))) return 'finished';
  if (['1h', '2h', 'ht', 'live', 'in progress', 'elapsed'].some(x => s.includes(x))) return 'live';
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
    homeScore: status === 'finished' ? safeNumber(fixture.goals?.home) : safeNumber(fixture.goals?.home),
    awayScore: status === 'finished' ? safeNumber(fixture.goals?.away) : safeNumber(fixture.goals?.away),
    venue: fixture.fixture?.venue?.name || '',
    updatedAt: new Date().toISOString()
  };
}

async function fetchMatchesFromConfiguredApi() {
  const url = process.env.FOOTBALL_API_URL;
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!url || !apiKey) {
    console.warn('Real match sync skipped: FOOTBALL_API_URL or FOOTBALL_API_KEY is missing.');
    return [];
  }

  const headers = {
    'x-apisports-key': apiKey
  };
  if (process.env.FOOTBALL_API_HOST) {
    headers['x-rapidapi-host'] = process.env.FOOTBALL_API_HOST;
    headers['x-rapidapi-key'] = apiKey;
  }

  const response = await axios.get(url, { headers, timeout: 15000 });
  const payload = response.data;

  if (payload?.errors && Object.keys(payload.errors).length) {
    throw new Error(`API-Football error: ${JSON.stringify(payload.errors)}`);
  }

  // API-Football format: { response: [fixtures...] }
  if (Array.isArray(payload?.response)) {
    return payload.response.map(mapApiFootballFixture);
  }

  // Generic format support if your API already returns matches directly.
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
      // Real-data mode: once the API works, remove all demo/fake matches.
      // Predictions and users are kept. Match IDs from API-Football stay stable.
      data.matches = apiMatches;
      data.activity.push({
        id: crypto.randomUUID(),
        type: 'matches_synced',
        message: `Synced ${apiMatches.length} real World Cup match(es) from API`,
        createdAt: new Date().toISOString()
      });
    });
  } else {
    console.warn('Real match sync returned 0 matches. Check FOOTBALL_API_URL, FOOTBALL_API_KEY, and API quota.');
  }
  lockStartedMatchesAndScoreFinishedMatches();
  return readData().matches;
}

module.exports = {
  syncMatches,
  lockStartedMatchesAndScoreFinishedMatches,
  resultType
};
