const fs = require('fs');
const path = require('path');

const required = [
  'server.js',
  'dataStore.js',
  'package.json',
  '.env',
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'data/data.json',
  'services/matchSync.js'
];

let ok = true;
for (const file of required) {
  const exists = fs.existsSync(path.join(__dirname, '..', file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) ok = false;
}

const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) {
  console.log(`✅ Node.js ${process.version}`);
} else {
  console.log(`❌ Node.js ${process.version} is too old. Install Node.js 18+.`);
  ok = false;
}

if (!ok) {
  process.exit(1);
}

console.log('\nReady. Run: npm start');
console.log('Then open: http://localhost:3000');
