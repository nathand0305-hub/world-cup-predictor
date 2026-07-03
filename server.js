require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const { readData, mutateData, publicUser } = require('./dataStore');
const { syncMatches, lockStartedMatchesAndScoreFinishedMatches } = require('./services/matchSync');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const MATCH_SYNC_INTERVAL_MS = Number(process.env.MATCH_SYNC_INTERVAL_MS || 60000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION,
      maxAge: 1000 * 60 * 60 * 24 * 14
    }
  })
);
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You must log in first.' });
  }
  next();
}

function getCurrentUser(req) {
  const data = readData();
  return data.users.find(user => user.id === req.session.userId) || null;
}

function validateScore(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 30;
}

function canPredict(match) {
  if (!match) return false;
  if (match.status !== 'upcoming') return false;
  const start = Date.parse(match.startTime);
  if (!Number.isFinite(start)) return false;
  return Date.now() < start;
}

function sanitizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.get('/api/me', (req, res) => {
  const user = getCurrentUser(req);
  res.json({ user: publicUser(user) });
});

app.post('/api/join', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const username = sanitizeUsername(req.body.username);
  const password = String(req.body.password || '');

  if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = mutateData(data => {
    if (data.users.some(u => u.username === username)) {
      return null;
    }
    const newUser = {
      id: crypto.randomUUID(),
      name,
      username,
      passwordHash,
      points: 0,
      exactCount: 0,
      winnerCount: 0,
      createdAt: new Date().toISOString()
    };
    data.users.push(newUser);
    data.activity.push({
      id: crypto.randomUUID(),
      userId: newUser.id,
      type: 'user_joined',
      message: `${name} joined the game`,
      createdAt: new Date().toISOString()
    });
    return newUser;
  });

  if (!user) return res.status(409).json({ error: 'That username already exists.' });
  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/login', async (req, res) => {
  const username = sanitizeUsername(req.body.username);
  const password = String(req.body.password || '');
  const data = readData();
  const user = data.users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'Wrong username or password.' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Wrong username or password.' });

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/matches', (req, res) => {
  lockStartedMatchesAndScoreFinishedMatches();
  const data = readData();
  const userId = req.session.userId;
  const predictions = userId ? data.predictions.filter(p => p.userId === userId) : [];
  const matches = data.matches
    .slice()
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
    .map(match => ({
      ...match,
      locked: !canPredict(match),
      myPrediction: predictions.find(p => p.matchId === match.id) || null
    }));
  res.json({ matches });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  lockStartedMatchesAndScoreFinishedMatches();
  const data = readData();
  const user = data.users.find(u => u.id === req.session.userId);
  const predictions = data.predictions.filter(p => p.userId === req.session.userId);
  const matchById = new Map(data.matches.map(m => [m.id, m]));

  const predictedMatchIds = new Set(predictions.map(p => p.matchId));
  const missingUpcoming = data.matches
    .filter(match => match.status === 'upcoming' && !predictedMatchIds.has(match.id) && canPredict(match))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  const predictionRows = predictions
    .map(prediction => ({
      ...prediction,
      match: matchById.get(prediction.matchId) || null
    }))
    .sort((a, b) => Date.parse(a.match?.startTime || 0) - Date.parse(b.match?.startTime || 0));

  res.json({
    user: publicUser(user),
    predictions: predictionRows,
    missingUpcoming
  });
});

app.post('/api/predictions', requireAuth, (req, res) => {
  const matchId = String(req.body.matchId || '');
  const homeScore = Number(req.body.homeScore);
  const awayScore = Number(req.body.awayScore);

  if (!validateScore(homeScore) || !validateScore(awayScore)) {
    return res.status(400).json({ error: 'Scores must be whole numbers between 0 and 30.' });
  }

  const result = mutateData(data => {
    const match = data.matches.find(m => m.id === matchId);
    if (!match) return { status: 404, error: 'Match not found.' };
    if (!canPredict(match)) return { status: 403, error: 'Predictions for this match are locked.' };

    let prediction = data.predictions.find(p => p.userId === req.session.userId && p.matchId === matchId);
    if (prediction) {
      prediction.homeScore = homeScore;
      prediction.awayScore = awayScore;
      prediction.updatedAt = new Date().toISOString();
      data.activity.push({
        id: crypto.randomUUID(),
        userId: req.session.userId,
        type: 'prediction_updated',
        message: `Updated prediction for ${match.homeTeam} vs ${match.awayTeam}`,
        matchId,
        createdAt: new Date().toISOString()
      });
      return { status: 200, prediction };
    }

    prediction = {
      id: crypto.randomUUID(),
      userId: req.session.userId,
      matchId,
      homeScore,
      awayScore,
      pointsAwarded: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evaluatedAt: null
    };
    data.predictions.push(prediction);
    data.activity.push({
      id: crypto.randomUUID(),
      userId: req.session.userId,
      type: 'prediction_created',
      message: `Predicted ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`,
      matchId,
      createdAt: new Date().toISOString()
    });
    return { status: 201, prediction };
  });

  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(result.status).json({ prediction: result.prediction });
});

app.get('/api/leaderboard', (req, res) => {
  lockStartedMatchesAndScoreFinishedMatches();
  const data = readData();
  const leaderboard = data.users
    .map(publicUser)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
      return a.name.localeCompare(b.name);
    })
    .map((user, index) => ({ ...user, rank: index + 1 }));
  res.json({ leaderboard });
});

app.post('/api/admin/sync', async (req, res) => {
  const adminKey = process.env.ADMIN_SYNC_KEY;
  if (adminKey && req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ error: 'Admin key required.' });
  }
  try {
    const matches = await syncMatches();
    res.json({ ok: true, matches: matches.length });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Sync failed.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function boot() {
  try {
    await syncMatches();
  } catch (error) {
    console.warn('Initial match sync skipped:', error.message);
  }

  setInterval(async () => {
    try {
      await syncMatches();
    } catch (error) {
      console.warn('Scheduled match sync failed:', error.message);
      lockStartedMatchesAndScoreFinishedMatches();
    }
  }, MATCH_SYNC_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`World Cup Predictor running at http://localhost:${PORT}`);
  });
}

boot();
