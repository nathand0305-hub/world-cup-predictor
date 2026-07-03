# Running Guide — World Cup Predictor

This guide shows exactly how to run the site on your computer.

---

## What you need

You only need:

1. **Node.js 18 or newer**
2. The project folder: `world-cup-predictor`
3. A browser like Chrome

Check Node.js:

```bash
node -v
npm -v
```

If `node -v` does not work, install Node.js from the official Node.js website, then reopen Terminal / PowerShell.

---

## Fastest way to run

### Mac / Linux

Open Terminal inside the project folder and run:

```bash
chmod +x start-mac-linux.sh
./start-mac-linux.sh
```

### Windows

Double-click:

```txt
start-windows.bat
```

Or open PowerShell in the project folder and run:

```powershell
.\start-windows.bat
```

Then open:

```txt
http://localhost:3000
```

---

## Manual run steps

Use this if the start file does not work.

### 1. Open the project folder

```bash
cd world-cup-predictor
```

### 2. Install packages

```bash
npm install
```

### 3. Create the `.env` file

A ready `.env` file is already included in this ZIP.

If it is missing, create it from the example:

Mac / Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
copy .env.example .env
```

### 4. Start the server

```bash
npm start
```

### 5. Open the website

```txt
http://localhost:3000
```

Keep the Terminal window open while using the site. Closing it stops the server.

---

## How to use the site

1. Click **Join / Login**.
2. Create a user with:
   - Name
   - Username
   - Password
3. Go to **Matches**.
4. Predict a score before kickoff.
5. Go to **Dashboard** to see your own predictions.
6. Go to **Leaderboard** to see rankings.

Every user starts with **0 points**.

Scoring:

- Exact score = **5 points**
- Correct winner, wrong exact score = **2 points**
- Correct draw, wrong exact score = **2 points**
- Wrong result = **0 points**

Points never go down.

---

## Where data is saved

The app saves everything here:

```txt
data/data.json
```

That file stores:

- Users
- Hashed passwords
- Matches
- Predictions
- Points
- Activity

So if you close the site and reopen it later, the data is still there.

---

## How to test scoring with demo games

The project comes with demo matches.

To test the points system quickly:

1. Start the site.
2. Join with a test user.
3. Make a prediction for a demo match.
4. Stop the server with `Ctrl + C`.
5. Open:

```txt
data/data.json
```

6. Change the match you predicted to `finished` and add scores.

Example:

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

7. Save the file.
8. Start the server again:

```bash
npm start
```

9. Refresh the website.

The server will calculate the points automatically.

---

## Reset the demo database

To reset users, predictions, and matches back to the starting demo data:

```bash
npm run reset-data
```

Then restart the server:

```bash
npm start
```

---

## Connect a real football API

The app works without an API using demo matches.

For real World Cup games, edit `.env`:

```env
FOOTBALL_API_URL=https://your-football-api-url-here
FOOTBALL_API_KEY=your-api-key-here
FOOTBALL_API_HOST=optional-host-if-needed
MATCH_SYNC_INTERVAL_MS=60000
```

The backend file that handles API syncing is:

```txt
services/matchSync.js
```

The app already supports API-Football style responses and a simple generic `matches` array.

After adding API values, restart the server.

---

## Common problems

### “npm is not recognized”

Node.js is not installed, or Terminal was opened before installation.

Install Node.js, then reopen Terminal / PowerShell.

### “Port 3000 is already in use”

Another app is using port 3000.

Change this in `.env`:

```env
PORT=3001
```

Then open:

```txt
http://localhost:3001
```

### Login does not stay after refresh

Make sure you are opening the site from:

```txt
http://localhost:3000
```

Do not open `public/index.html` directly.

### Predictions are locked

Predictions are locked if:

- The game already started
- The match status is not `upcoming`
- The match start time is in the past

This is enforced by the backend so users cannot cheat.

---

## Production checklist

Before putting this online for real users, upgrade these things:

1. Use HTTPS.
2. Replace the JSON file database with PostgreSQL, Supabase, or Firebase.
3. Use a strong unique `SESSION_SECRET`.
4. Add rate limiting to login and join routes.
5. Use a real football API.
6. Deploy to Render, Railway, Vercel, or another hosting service.

For local testing, the project is ready to run as-is.
