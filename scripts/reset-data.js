const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'data.json');

const demoData = {
  users: [],
  matches: [
    {
      id: 'demo-1',
      homeTeam: 'Brazil',
      awayTeam: 'Germany',
      homeFlag: '🇧🇷',
      awayFlag: '🇩🇪',
      startTime: '2026-07-10T19:00:00.000Z',
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      venue: 'Demo Stadium',
      externalId: 'demo-1',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-2',
      homeTeam: 'Argentina',
      awayTeam: 'France',
      homeFlag: '🇦🇷',
      awayFlag: '🇫🇷',
      startTime: '2026-07-11T20:00:00.000Z',
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      venue: 'Demo Arena',
      externalId: 'demo-2',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-3',
      homeTeam: 'Spain',
      awayTeam: 'England',
      homeFlag: '🇪🇸',
      awayFlag: '🏴',
      startTime: '2026-07-12T18:00:00.000Z',
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      venue: 'Demo Park',
      externalId: 'demo-3',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-4',
      homeTeam: 'Portugal',
      awayTeam: 'Netherlands',
      homeFlag: '🇵🇹',
      awayFlag: '🇳🇱',
      startTime: '2026-07-13T21:00:00.000Z',
      status: 'upcoming',
      homeScore: null,
      awayScore: null,
      venue: 'Demo National Stadium',
      externalId: 'demo-4',
      updatedAt: new Date().toISOString()
    }
  ],
  predictions: [],
  activity: []
};

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(demoData, null, 2));
console.log('Demo database reset successfully.');
