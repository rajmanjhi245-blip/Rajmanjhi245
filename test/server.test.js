const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jigsaw-arena-'));
process.env.DB_FILE = path.join(tmp, 'db.json');
process.env.ADMIN_USER = 'owner';
process.env.ADMIN_PASS = 'Owner@12345';
const { createServer, defaultDb, generateLevels, verifyPassword, hashPassword } = require('../server');

function listen(server) {
  return new Promise(resolve => server.listen(0, () => resolve(server.address().port)));
}
async function request(base, route, options = {}) {
  const res = await fetch(`${base}${route}`, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json();
  return { res, data, cookie: res.headers.get('set-cookie') };
}

test('password hashing verifies correctly', () => {
  const stored = hashPassword('secret-password');
  assert.equal(verifyPassword('secret-password', stored), true);
  assert.equal(verifyPassword('wrong-password', stored), false);
});

test('default catalog has 1000 increasingly difficult levels', () => {
  const levels = generateLevels();
  assert.equal(levels.length, 1000);
  assert.equal(levels[0].level, 1);
  assert.equal(levels[999].level, 1000);
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(levels[i].difficultyScore > levels[i - 1].difficultyScore);
    assert.ok(levels[i].targetSeconds < levels[i - 1].targetSeconds);
    assert.ok(levels[i].snapTolerance <= levels[i - 1].snapTolerance);
  }
  const db = defaultDb();
  assert.equal(db.puzzles.length, 1000);
  assert.equal(db.tournaments[0].puzzleId, 'level_0050');
});

test('registration, login, score, ad rewards, and admin protection work', async () => {
  const server = createServer();
  const port = await listen(server);
  const base = `http://127.0.0.1:${port}`;
  try {
    let r = await request(base, '/api/register', { method: 'POST', body: { username: 'player1', password: 'password123', displayName: 'Player One' } });
    assert.equal(r.res.status, 201);
    r = await request(base, '/api/login', { method: 'POST', body: { username: 'player1', password: 'password123' } });
    assert.equal(r.res.status, 200);
    const playerCookie = r.cookie.split(';')[0];
    r = await request(base, '/api/ad-event', { method: 'POST', headers: { cookie: playerCookie }, body: { placement: 'test' } });
    assert.equal(r.data.user.coins, 105);
    r = await request(base, '/api/complete', { method: 'POST', headers: { cookie: playerCookie }, body: { puzzleId: 'level_0001', tournamentId: 'tour_daily', durationMs: 12345 } });
    assert.equal(r.res.status, 200);
    assert.equal(r.data.user.coins, 130);
    r = await request(base, '/api/admin', { headers: { cookie: playerCookie } });
    assert.equal(r.res.status, 403);
    r = await request(base, '/api/login', { method: 'POST', body: { username: 'owner', password: 'Owner@12345' } });
    const adminCookie = r.cookie.split(';')[0];
    r = await request(base, '/api/admin', { headers: { cookie: adminCookie } });
    assert.equal(r.res.status, 200);
    assert.equal(r.data.users.length, 2);
    assert.ok(r.data.totalRevenue >= 0.01);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
