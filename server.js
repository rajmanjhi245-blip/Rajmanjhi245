const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ADMIN_USER = process.env.ADMIN_USER || 'owner';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Owner@12345';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8' };

function now() { return new Date().toISOString(); }
function ensureDataDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function uid(prefix = 'id') { return `${prefix}_${crypto.randomBytes(8).toString('hex')}`; }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function levelPalette(level) {
  const palettes = [
    ['#ff9f1c', '#ffbf69', '#2ec4b6', '#cbf3f0'],
    ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c'],
    ['#240046', '#5a189a', '#9d4edd', '#ff8500'],
    ['#004e92', '#000428', '#7f7fd5', '#91eae4'],
    ['#11998e', '#38ef7d', '#f8ffae', '#43c6ac'],
    ['#fc466b', '#3f5efb', '#fddb92', '#d1fdff'],
    ['#00c6ff', '#0072ff', '#f7971e', '#ffd200'],
    ['#c31432', '#240b36', '#ff9966', '#ff5e62']
  ];
  return palettes[(level - 1) % palettes.length];
}
function difficultyName(level) {
  if (level <= 100) return 'Beginner';
  if (level <= 250) return 'Easy';
  if (level <= 450) return 'Medium';
  if (level <= 650) return 'Hard';
  if (level <= 850) return 'Expert';
  return 'Master';
}
function createLevel(level, daily) {
  const theme = ['Sunrise', 'Garden', 'Neon', 'Ocean', 'Forest', 'Desert', 'Mountain', 'Galaxy', 'Festival', 'Castle'][(level - 1) % 10];
  const category = ['Nature', 'Flowers', 'Art', 'Travel', 'Animals', 'Fantasy', 'Classic', 'Space'][(level - 1) % 8];
  const tier = Math.floor((level - 1) / 50);
  const rows = 3 + Math.min(9, Math.floor(tier / 2)) + (level % 5 === 0 ? 1 : 0);
  const cols = 3 + Math.min(9, Math.ceil(tier / 2)) + (level % 7 === 0 ? 1 : 0);
  const difficultyScore = level;
  return {
    id: `level_${String(level).padStart(4, '0')}`,
    level,
    title: `Level ${String(level).padStart(4, '0')} - ${theme} Quest`,
    category,
    difficulty: `${difficultyName(level)} ${level}`,
    difficultyScore,
    rows,
    cols,
    targetSeconds: Number(Math.max(90, 720 - level * 0.5).toFixed(1)),
    snapTolerance: Number(Math.max(0.12, 0.32 - level * 0.00018).toFixed(4)),
    palette: levelPalette(level),
    active: true,
    daily,
    locked: level > 25 && level % 10 === 0
  };
}
function generateLevels(count = 1000, daily = new Date().toISOString().slice(0, 10)) {
  return Array.from({ length: count }, (_, index) => createLevel(index + 1, daily));
}
function ensureLevelCatalog(db) {
  const daily = new Date().toISOString().slice(0, 10);
  const generated = generateLevels(1000, daily);
  const generatedIds = new Set(generated.map(p => p.id));
  const customPuzzles = Array.isArray(db.puzzles) ? db.puzzles.filter(p => !generatedIds.has(p.id) && !/^level_\d{4}$/.test(p.id)) : [];
  const existingById = new Map((db.puzzles || []).map(p => [p.id, p]));
  db.puzzles = generated.map(level => ({ ...level, ...(existingById.get(level.id) || {}), level: level.level, difficultyScore: level.difficultyScore })).concat(customPuzzles);
  return db;
}
function defaultDb() {
  const adminId = uid('usr');
  const daily = new Date().toISOString().slice(0, 10);
  return ensureLevelCatalog({
    settings: {
      appName: 'Jigsaw Arena',
      coinsPerPuzzle: 25,
      coinsPerAd: 5,
      entryFee: 10,
      adEveryPieces: 6,
      adminUser: ADMIN_USER,
      createdAt: now(),
      updatedAt: now()
    },
    users: [{ id: adminId, username: ADMIN_USER, displayName: 'Owner Admin', passwordHash: hashPassword(ADMIN_PASS), role: 'admin', coins: 10000, earnings: 0, createdAt: now() }],
    puzzles: generateLevels(1000, daily),
    tournaments: [{ id: 'tour_daily', name: 'Daily Speed Challenge', puzzleId: 'level_0050', status: 'open', prizeCoins: 250, startsAt: now(), endsAt: new Date(Date.now() + 86400000).toISOString(), createdAt: now() }],
    scores: [],
    adEvents: [],
    sessions: []
  });
}
function loadDb() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) saveDb(defaultDb());
  const db = ensureLevelCatalog(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  saveDb(db);
  return db;
}
function saveDb(db) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) { reject(new Error('Payload too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}
function cookieMap(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const [k, ...v] = part.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
}
function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
function getSessionUser(req, db) {
  const sid = cookieMap(req).sid;
  if (!sid) return null;
  const session = db.sessions.find(s => s.id === sid && new Date(s.expiresAt).getTime() > Date.now());
  if (!session) return null;
  return db.users.find(u => u.id === session.userId) || null;
}
function requireUser(req, res, db) {
  const user = getSessionUser(req, db);
  if (!user) json(res, 401, { error: 'Login required' });
  return user;
}
function requireAdmin(req, res, db) {
  const user = requireUser(req, res, db);
  if (!user) return null;
  if (user.role !== 'admin') { json(res, 403, { error: 'Admin access required' }); return null; }
  return user;
}
function serveStatic(req, res, pathname) {
  const safe = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, safe));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}
function leaderboard(db, tournamentId) {
  return db.scores.filter(s => s.tournamentId === tournamentId).sort((a, b) => a.durationMs - b.durationMs || b.completedPieces - a.completedPieces).slice(0, 50).map(s => ({ ...s, username: db.users.find(u => u.id === s.userId)?.username || 'Player' }));
}
async function handleApi(req, res, pathname) {
  const db = loadDb();
  try {
    if (req.method === 'GET' && pathname === '/api/state') {
      const user = getSessionUser(req, db);
      return json(res, 200, { user: publicUser(user), settings: db.settings, puzzles: db.puzzles.filter(p => p.active), tournaments: db.tournaments, scores: db.scores, leaderboard: Object.fromEntries(db.tournaments.map(t => [t.id, leaderboard(db, t.id)])) });
    }
    if (req.method === 'POST' && pathname === '/api/register') {
      const body = await readBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.displayName || username).trim().slice(0, 40);
      if (!/^[a-z0-9_]{3,24}$/.test(username)) return json(res, 400, { error: 'Username must be 3-24 lowercase letters, numbers, or underscores.' });
      if (password.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters.' });
      if (db.users.some(u => u.username === username)) return json(res, 409, { error: 'Username already exists.' });
      const user = { id: uid('usr'), username, displayName, passwordHash: hashPassword(password), role: 'player', coins: 100, earnings: 0, createdAt: now() };
      db.users.push(user); saveDb(db);
      return json(res, 201, { user: publicUser(user) });
    }
    if (req.method === 'POST' && pathname === '/api/login') {
      const body = await readBody(req);
      const username = String(body.username || '').trim().toLowerCase();
      const user = db.users.find(u => u.username === username);
      if (!user || !verifyPassword(String(body.password || ''), user.passwordHash)) return json(res, 401, { error: 'Invalid username or password.' });
      const sid = uid('ses');
      db.sessions = db.sessions.filter(s => new Date(s.expiresAt).getTime() > Date.now());
      db.sessions.push({ id: sid, userId: user.id, createdAt: now(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
      saveDb(db);
      return json(res, 200, { user: publicUser(user) }, { 'set-cookie': `sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}` });
    }
    if (req.method === 'POST' && pathname === '/api/logout') {
      const sid = cookieMap(req).sid;
      db.sessions = db.sessions.filter(s => s.id !== sid); saveDb(db);
      return json(res, 200, { ok: true }, { 'set-cookie': 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
    }
    if (req.method === 'POST' && pathname === '/api/complete') {
      const user = requireUser(req, res, db); if (!user) return;
      const body = await readBody(req);
      const puzzle = db.puzzles.find(p => p.id === body.puzzleId && p.active);
      if (!puzzle) return json(res, 404, { error: 'Puzzle not found.' });
      const durationMs = Math.max(1000, Math.min(Number(body.durationMs || 0), 24 * 60 * 60 * 1000));
      const completedPieces = puzzle.rows * puzzle.cols;
      const reward = Number(db.settings.coinsPerPuzzle || 0);
      user.coins += reward;
      const score = { id: uid('sco'), userId: user.id, puzzleId: puzzle.id, tournamentId: body.tournamentId || null, durationMs, completedPieces, reward, createdAt: now() };
      db.scores.push(score); saveDb(db);
      return json(res, 200, { score, user: publicUser(user), leaderboard: score.tournamentId ? leaderboard(db, score.tournamentId) : [] });
    }
    if (req.method === 'POST' && pathname === '/api/ad-event') {
      const user = requireUser(req, res, db); if (!user) return;
      const body = await readBody(req);
      const coins = Number(db.settings.coinsPerAd || 0);
      user.coins += coins;
      user.earnings += 0.01;
      const event = { id: uid('ad'), userId: user.id, placement: String(body.placement || 'game'), coins, revenue: 0.01, createdAt: now() };
      db.adEvents.push(event); saveDb(db);
      return json(res, 200, { event, user: publicUser(user) });
    }
    if (req.method === 'GET' && pathname === '/api/admin') {
      if (!requireAdmin(req, res, db)) return;
      const totalRevenue = db.adEvents.reduce((sum, e) => sum + Number(e.revenue || 0), 0);
      return json(res, 200, { ...db, users: db.users.map(publicUser), totalRevenue });
    }
    if (req.method === 'PUT' && pathname === '/api/admin/settings') {
      if (!requireAdmin(req, res, db)) return;
      const body = await readBody(req);
      db.settings = { ...db.settings, appName: String(body.appName || db.settings.appName).slice(0, 60), coinsPerPuzzle: Number(body.coinsPerPuzzle ?? db.settings.coinsPerPuzzle), coinsPerAd: Number(body.coinsPerAd ?? db.settings.coinsPerAd), entryFee: Number(body.entryFee ?? db.settings.entryFee), adEveryPieces: Number(body.adEveryPieces ?? db.settings.adEveryPieces), updatedAt: now() };
      saveDb(db); return json(res, 200, { settings: db.settings });
    }
    if (req.method === 'POST' && pathname === '/api/admin/puzzles') {
      if (!requireAdmin(req, res, db)) return;
      const body = await readBody(req);
      const puzzle = { id: body.id || uid('puz'), title: String(body.title || 'New Puzzle').slice(0, 80), category: String(body.category || 'Custom').slice(0, 40), difficulty: String(body.difficulty || 'Easy').slice(0, 20), rows: Math.max(2, Math.min(8, Number(body.rows || 3))), cols: Math.max(2, Math.min(8, Number(body.cols || 3))), palette: Array.isArray(body.palette) && body.palette.length >= 2 ? body.palette.slice(0, 6) : ['#4568dc', '#b06ab3', '#ffffff'], active: body.active !== false, daily: String(body.daily || new Date().toISOString().slice(0,10)), locked: Boolean(body.locked) };
      const index = db.puzzles.findIndex(p => p.id === puzzle.id);
      if (index >= 0) db.puzzles[index] = puzzle; else db.puzzles.push(puzzle);
      saveDb(db); return json(res, 200, { puzzle });
    }
    if (req.method === 'POST' && pathname === '/api/admin/tournaments') {
      if (!requireAdmin(req, res, db)) return;
      const body = await readBody(req);
      const tournament = { id: body.id || uid('tour'), name: String(body.name || 'Tournament').slice(0, 80), puzzleId: String(body.puzzleId || db.puzzles[0]?.id), status: String(body.status || 'open'), prizeCoins: Number(body.prizeCoins || 100), startsAt: String(body.startsAt || now()), endsAt: String(body.endsAt || new Date(Date.now() + 86400000).toISOString()), createdAt: body.createdAt || now() };
      const index = db.tournaments.findIndex(t => t.id === tournament.id);
      if (index >= 0) db.tournaments[index] = tournament; else db.tournaments.push(tournament);
      saveDb(db); return json(res, 200, { tournament });
    }
    return json(res, 404, { error: 'API route not found' });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}
function createServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) return handleApi(req, res, url.pathname);
    return serveStatic(req, res, url.pathname);
  });
}
if (require.main === module) createServer().listen(PORT, () => console.log(`Jigsaw Arena running at http://localhost:${PORT}`));
module.exports = { createServer, defaultDb, generateLevels, hashPassword, verifyPassword, loadDb };
