import { readFileSync } from 'node:fs';

const files = ['index.html', 'src/main.js', 'src/styles.css', 'README.md'];
for (const file of files) {
  const body = readFileSync(file, 'utf8');
  if (!body.trim()) throw new Error(`${file} is empty`);
}

const app = readFileSync('src/main.js', 'utf8');
const required = ['adminPanel', 'playerDashboard', 'ludoBoard', 'joinTournament', 'rollDice', 'withdrawals', 'transactions'];
for (const token of required) {
  if (!app.includes(token)) throw new Error(`Missing required app token: ${token}`);
}

console.log('Smoke test passed: core application files and features are present.');
