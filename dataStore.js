const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'data.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ users: [], matches: [], predictions: [], activity: [] }, null, 2)
    );
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(raw || '{}');
}

function writeData(data) {
  ensureDataFile();
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function mutateData(mutator) {
  const data = readData();
  const result = mutator(data);
  writeData(data);
  return result;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    points: user.points || 0,
    exactCount: user.exactCount || 0,
    winnerCount: user.winnerCount || 0,
    createdAt: user.createdAt
  };
}

module.exports = {
  readData,
  writeData,
  mutateData,
  publicUser
};
