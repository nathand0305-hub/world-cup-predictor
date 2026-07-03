const state = {
  user: null,
  matches: [],
  leaderboard: [],
  activeView: 'matches'
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function showNotice(message, type = 'success') {
  const notice = $('#notice');
  notice.textContent = message;
  notice.className = `notice ${type}`;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.add('hidden'), 4200);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong.');
  }
  return data;
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Time not available';
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function countdownText(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return 'Locked';
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

function renderAuth() {
  const authArea = $('#authArea');
  const panel = $('#authPanel');

  if (state.user) {
    panel.classList.add('hidden');
    authArea.innerHTML = `
      <span>Hi, <strong>${escapeHtml(state.user.name)}</strong> • ${state.user.points} pts</span>
      <button id="logoutBtn" class="ghost">Logout</button>
    `;
    $('#logoutBtn').addEventListener('click', logout);
  } else {
    panel.classList.remove('hidden');
    authArea.innerHTML = `<button id="showJoin" class="primary">Join / Login</button>`;
    $('#showJoin').addEventListener('click', () => panel.scrollIntoView({ behavior: 'smooth' }));
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMatches() {
  const grid = $('#matchesGrid');
  if (!state.matches.length) {
    grid.innerHTML = `<div class="empty-card"><h3>No matches yet</h3><p>Connect a football API or add demo matches in data/data.json.</p></div>`;
    return;
  }

  grid.innerHTML = state.matches.map(match => {
    const prediction = match.myPrediction;
    const locked = match.locked;
    const status = match.status || 'upcoming';
    const scoreText = match.homeScore === null || match.awayScore === null ? '—' : `${match.homeScore} - ${match.awayScore}`;
    const predictionText = prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : 'No prediction yet';

    return `
      <article class="match-card" data-match-id="${escapeHtml(match.id)}">
        <div class="match-top">
          <span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>
          <span class="meta">${locked ? 'Predictions locked' : countdownText(match.startTime)}</span>
        </div>

        <div class="teams">
          <div class="team-row">
            <div class="team-name"><span>${escapeHtml(match.homeFlag || '🏳️')}</span>${escapeHtml(match.homeTeam)}</div>
            <div class="score">${match.homeScore === null ? '' : escapeHtml(match.homeScore)}</div>
          </div>
          <div class="team-row">
            <div class="team-name"><span>${escapeHtml(match.awayFlag || '🏳️')}</span>${escapeHtml(match.awayTeam)}</div>
            <div class="score">${match.awayScore === null ? '' : escapeHtml(match.awayScore)}</div>
          </div>
        </div>

        <p class="meta">Kickoff: ${formatDateTime(match.startTime)}${match.venue ? ` • ${escapeHtml(match.venue)}` : ''}</p>
        <p class="meta">Final score: ${escapeHtml(scoreText)}</p>
        <div class="prediction-chip">Your prediction: <strong>${escapeHtml(predictionText)}</strong>${prediction && prediction.pointsAwarded !== null ? ` • earned <strong>${prediction.pointsAwarded}</strong> pts` : ''}</div>

        ${renderPredictionAction(match, prediction, locked)}
      </article>
    `;
  }).join('');

  $$('.predict-form').forEach(form => {
    form.addEventListener('submit', savePrediction);
  });
}

function renderPredictionAction(match, prediction, locked) {
  if (!state.user) {
    return `<div class="locked-box">Login or join to predict this match.</div>`;
  }
  if (locked) {
    return `<div class="locked-box">This match is locked. Predictions can only be made before kickoff.</div>`;
  }
  return `
    <form class="predict-form">
      <input type="hidden" name="matchId" value="${escapeHtml(match.id)}" />
      <input type="number" name="homeScore" min="0" max="30" placeholder="${escapeHtml(match.homeTeam)}" value="${prediction ? prediction.homeScore : ''}" required />
      <input type="number" name="awayScore" min="0" max="30" placeholder="${escapeHtml(match.awayTeam)}" value="${prediction ? prediction.awayScore : ''}" required />
      <button class="primary" type="submit">${prediction ? 'Update' : 'Save'} prediction</button>
    </form>
  `;
}

function renderLeaderboard() {
  const body = $('#leaderboardBody');
  if (!state.leaderboard.length) {
    body.innerHTML = `<tr><td colspan="5">No players yet. Be the first to join.</td></tr>`;
    return;
  }
  body.innerHTML = state.leaderboard.map(user => `
    <tr>
      <td class="rank">#${user.rank}</td>
      <td><strong>${escapeHtml(user.name)}</strong><br><span class="meta">@${escapeHtml(user.username)}</span></td>
      <td><strong>${user.points}</strong></td>
      <td>${user.exactCount}</td>
      <td>${user.winnerCount}</td>
    </tr>
  `).join('');
}

async function renderDashboard() {
  const wrap = $('#dashboardContent');
  if (!state.user) {
    wrap.innerHTML = `<div class="empty-card"><h3>Login required</h3><p>Create an account or login to see your predictions and points.</p></div>`;
    return;
  }

  try {
    const data = await request('/api/dashboard');
    state.user = data.user;
    const predictions = data.predictions || [];
    const missing = data.missingUpcoming || [];

    wrap.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card"><p>Total points</p><strong>${state.user.points}</strong></div>
        <div class="stat-card"><p>Exact scores</p><strong>${state.user.exactCount}</strong></div>
        <div class="stat-card"><p>Correct winners</p><strong>${state.user.winnerCount}</strong></div>
      </div>

      <div class="section-title"><h3>Your predictions</h3></div>
      <div class="prediction-list">
        ${predictions.length ? predictions.map(renderPredictionRow).join('') : '<div class="empty-card"><h3>No predictions yet</h3><p>Go to Matches and add your first score.</p></div>'}
      </div>

      <div class="section-title"><h3>Upcoming games you still need to predict</h3></div>
      <div class="prediction-list">
        ${missing.length ? missing.map(match => `<div class="prediction-row"><div><strong>${escapeHtml(match.homeTeam)} vs ${escapeHtml(match.awayTeam)}</strong><p class="meta">${formatDateTime(match.startTime)}</p></div><span class="points-pill">Open</span></div>`).join('') : '<div class="empty-card"><h3>All caught up</h3><p>You predicted every currently open match.</p></div>'}
      </div>
    `;
  } catch (error) {
    wrap.innerHTML = `<div class="empty-card"><h3>Could not load dashboard</h3><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function renderPredictionRow(row) {
  const match = row.match || {};
  const earned = row.pointsAwarded === null || row.pointsAwarded === undefined ? 'Pending' : `${row.pointsAwarded} pts`;
  const real = match.homeScore === null || match.awayScore === null ? 'Not finished' : `${match.homeScore}-${match.awayScore}`;
  return `
    <div class="prediction-row">
      <div>
        <strong>${escapeHtml(match.homeTeam || 'Match')} vs ${escapeHtml(match.awayTeam || '')}</strong>
        <p class="meta">Prediction: ${row.homeScore}-${row.awayScore} • Real: ${escapeHtml(real)} • Status: ${escapeHtml(match.status || 'unknown')}</p>
      </div>
      <span class="points-pill">${escapeHtml(earned)}</span>
    </div>
  `;
}

function setView(view) {
  state.activeView = view;
  $$('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  $$('.view').forEach(section => section.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  if (view === 'dashboard') renderDashboard();
}

async function loadMe() {
  const data = await request('/api/me');
  state.user = data.user;
  renderAuth();
}

async function loadMatches() {
  const data = await request('/api/matches');
  state.matches = data.matches;
  renderMatches();
}

async function loadLeaderboard() {
  const data = await request('/api/leaderboard');
  state.leaderboard = data.leaderboard;
  renderLeaderboard();
}

async function refreshAll() {
  $('#refreshStatus').textContent = 'Refreshing...';
  try {
    await Promise.all([loadMe(), loadMatches(), loadLeaderboard()]);
    if (state.activeView === 'dashboard') await renderDashboard();
    $('#refreshStatus').textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    $('#refreshStatus').textContent = 'Refresh failed';
    showNotice(error.message, 'error');
  }
}

async function savePrediction(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form));
  try {
    await request('/api/predictions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showNotice('Prediction saved. It will lock when the match starts.', 'success');
    await refreshAll();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

async function logout() {
  try {
    await request('/api/logout', { method: 'POST', body: '{}' });
    state.user = null;
    showNotice('Logged out.', 'success');
    await refreshAll();
  } catch (error) {
    showNotice(error.message, 'error');
  }
}

function setupAuthForms() {
  $('#joinTab').addEventListener('click', () => {
    $('#joinTab').classList.add('active');
    $('#loginTab').classList.remove('active');
    $('#joinForm').classList.remove('hidden');
    $('#loginForm').classList.add('hidden');
  });

  $('#loginTab').addEventListener('click', () => {
    $('#loginTab').classList.add('active');
    $('#joinTab').classList.remove('active');
    $('#loginForm').classList.remove('hidden');
    $('#joinForm').classList.add('hidden');
  });

  $('#joinForm').addEventListener('submit', async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await request('/api/join', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.user = data.user;
      event.currentTarget.reset();
      showNotice('Account created. You can start predicting.', 'success');
      await refreshAll();
    } catch (error) {
      showNotice(error.message, 'error');
    }
  });

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await request('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.user = data.user;
      event.currentTarget.reset();
      showNotice('Logged in successfully.', 'success');
      await refreshAll();
    } catch (error) {
      showNotice(error.message, 'error');
    }
  });
}

function setupNavigation() {
  $$('.nav-btn').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
  $('#manualRefresh').addEventListener('click', refreshAll);
}

setupNavigation();
setupAuthForms();
refreshAll();
setInterval(refreshAll, 15000);
