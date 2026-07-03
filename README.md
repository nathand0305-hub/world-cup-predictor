# World Cup Predictor

## Want other users to join when your computer is off?

Local mode uses:

```txt
http://localhost:3000
```

That only works while your computer and Terminal are open.

For a public online version, open:

```txt
DEPLOY_ONLINE_HEBREW.md
```

This project now includes `render.yaml`, so it is ready to deploy on Render.


A complete World Cup score prediction site.

## Hebrew quick start

Open this file first if you want the simple Hebrew guide:

```txt
START_HERE_HEBREW.md
```

This ZIP also includes `node_modules`, so in most cases you can run it immediately after unzipping, as long as Node.js is installed.

---

## Start here

The project is ready to run locally.

### Mac / Linux

```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

### Windows

Double-click:

```txt
start-windows.bat
```

Then open:

```txt
http://localhost:3000
```

For the full step-by-step guide, open:

```txt
RUNNING_GUIDE.md
```

---

Users can:

- Create an account with name, username, and password
- Log back in later
- Predict exact scores before kickoff
- Edit predictions only before the game starts
- Earn 5 points for exact score
- Earn 2 points for correct winner / correct draw but wrong exact score
- Never lose points
- View a live-updating leaderboard
- View their own dashboard with predictions and earned points

The backend enforces the important rules, so users cannot cheat from the frontend.

---

## Tech stack

- Node.js
- Express
- bcryptjs for password hashing
- Express sessions for login
- Persistent JSON database in `data/data.json`
- Vanilla HTML/CSS/JS frontend
- Live updates by polling every 15 seconds

I used a JSON database so you can run this easily without setting up PostgreSQL or Supabase. You can later replace `dataStore.js` with a real database if you want.

---

## Project structure

```txt
world-cup-predictor/
  server.js
  dataStore.js
  package.json
  package-lock.json
  .env
  .env.example
  README.md
  RUNNING_GUIDE.md
  start-mac-linux.sh
  start-windows.bat
  data/
    data.json
  scripts/
    reset-data.js
  services/
    matchSync.js
  public/
    index.html
    styles.css
    app.js
```

---

## How to run locally

The easiest way is to use the included start files.

Mac / Linux:

```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

Windows:

```txt
start-windows.bat
```

Manual way:

```bash
npm install
npm start
```

Then open this in your browser:

```txt
http://localhost:3000
```

A ready `.env` file is included. The full running guide is in `RUNNING_GUIDE.md`.

---

## How scoring works

After a match is marked as `finished` and has final scores:

- Exact score = 5 points
- Correct winner but not exact = 2 points
- Correct draw but not exact = 2 points
- Wrong result = 0 points

The server calculates points only once per prediction.

---

## How prediction locking works

A prediction is accepted only if:

- The user is logged in
- The match exists
- The match status is `upcoming`
- Current time is before `startTime`

Even if someone edits the frontend, the server blocks late predictions.

---

## Demo matches

The app comes with demo matches inside:

```txt
data/data.json
```

You can change those matches manually while testing.

Example finished match:

```json
{
  "id": "demo-1",
  "homeTeam": "Brazil",
  "awayTeam": "Germany",
  "homeFlag": "🇧🇷",
  "awayFlag": "🇩🇪",
  "startTime": "2026-07-10T19:00:00.000Z",
  "status": "finished",
  "homeScore": 2,
  "awayScore": 1,
  "venue": "Demo Stadium",
  "externalId": "demo-1",
  "updatedAt": "2026-07-03T00:00:00.000Z"
}
```

After you save the file, the server will score predictions on the next refresh / sync.

---

## Connecting a real football API

The app supports optional API syncing in `services/matchSync.js`.

Add your API URL and key in `.env`:

```env
FOOTBALL_API_URL=https://your-football-api-url-here
FOOTBALL_API_KEY=your-api-key-here
FOOTBALL_API_HOST=optional-host-if-needed
MATCH_SYNC_INTERVAL_MS=60000
```

The app already supports API-Football style responses like:

```json
{
  "response": [
    {
      "fixture": {
        "id": 123,
        "date": "2026-07-10T19:00:00+00:00",
        "status": { "short": "NS", "long": "Not Started" },
        "venue": { "name": "Stadium" }
      },
      "teams": {
        "home": { "name": "Brazil" },
        "away": { "name": "Germany" }
      },
      "goals": { "home": null, "away": null }
    }
  ]
}
```

It also supports a simpler generic format:

```json
{
  "matches": [
    {
      "id": "match-1",
      "homeTeam": "Brazil",
      "awayTeam": "Germany",
      "startTime": "2026-07-10T19:00:00.000Z",
      "status": "upcoming",
      "homeScore": null,
      "awayScore": null
    }
  ]
}
```

---

## Useful API routes

```txt
POST /api/join
POST /api/login
POST /api/logout
GET  /api/me
GET  /api/matches
POST /api/predictions
GET  /api/dashboard
GET  /api/leaderboard
POST /api/admin/sync
```

---

## Security notes

This project already includes:

- Hashed passwords with bcryptjs
- Session login
- Server-side prediction locking
- Server-side scoring
- Users can edit only their own predictions
- Points are never accepted from the frontend

For real production, add:

- HTTPS
- Strong `SESSION_SECRET`
- Real database like PostgreSQL / Supabase
- Rate limiting
- Email reset password flow
- Admin panel for match management

---

## Reset the demo database

```bash
npm run reset-data
```

Then start again:

```bash
npm start
```
