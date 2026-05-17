import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ensureDatabase, hashPassword, loadDb, publicUser, saveDb, seedInfo, verifyPassword } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const sessions = new Map();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', ...headers });
  res.end(body);
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').filter(Boolean).map((cookie) => {
    const [key, ...value] = cookie.trim().split('=');
    return [key, decodeURIComponent(value.join('='))];
  }));
}

async function parseBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('Request body is too large.');
  }
  return raw ? JSON.parse(raw) : {};
}

async function currentUser(req) {
  const sid = parseCookies(req).sid;
  const session = sid && sessions.get(sid);
  if (!session || session.expiresAt < Date.now()) return null;
  const db = await loadDb();
  return db.users.find((user) => user.id === session.userId) || null;
}

function setSession(res, userId) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions.set(sid, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  res.setHeader('Set-Cookie', `sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
}

function clearSession(req, res) {
  const sid = parseCookies(req).sid;
  if (sid) sessions.delete(sid);
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function sanitizePageInput(input) {
  const palette = Array.isArray(input.palette) ? input.palette.map(String).filter(Boolean).slice(0, 12) : [];
  const svg = String(input.svg || '').trim();
  if (!String(input.title || '').trim()) throw new Error('Title is required.');
  if (!svg.includes('class="paint-region"') && !svg.includes("class='paint-region'")) throw new Error('SVG must include at least one paint-region shape.');
  if (palette.length === 0) throw new Error('At least one palette color is required.');
  return {
    title: String(input.title).trim().slice(0, 80),
    category: String(input.category || 'New').trim().slice(0, 40),
    difficulty: String(input.difficulty || 'Easy').trim().slice(0, 20),
    description: String(input.description || '').trim().slice(0, 220),
    palette,
    svg
  };
}

async function handleApi(req, res, url) {
  const user = await currentUser(req);
  const requireAuth = () => { if (!user) throw Object.assign(new Error('Please sign in first.'), { status: 401 }); };
  const requireAdmin = () => { requireAuth(); if (user.role !== 'admin') throw Object.assign(new Error('Owner admin access is required.'), { status: 403 }); };

  if (req.method === 'GET' && url.pathname === '/api/me') return send(res, 200, { user: publicUser(user), seedAdmin: process.env.NODE_ENV === 'production' ? undefined : { username: seedInfo.adminUsername, password: seedInfo.adminPassword } });

  if (req.method === 'POST' && url.pathname === '/api/register') {
    const body = await parseBody(req);
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) throw Object.assign(new Error('Username must be 3-20 letters, numbers, or underscores.'), { status: 400 });
    if (password.length < 6) throw Object.assign(new Error('Password must be at least 6 characters.'), { status: 400 });
    const db = await loadDb();
    if (db.users.some((existing) => existing.username === username)) throw Object.assign(new Error('Username is already registered.'), { status: 409 });
    const newUser = { id: crypto.randomUUID(), username, passwordHash: hashPassword(password), role: 'player', createdAt: new Date().toISOString() };
    db.users.push(newUser);
    await saveDb(db);
    setSession(res, newUser.id);
    return send(res, 201, { user: publicUser(newUser) });
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = await parseBody(req);
    const db = await loadDb();
    const found = db.users.find((candidate) => candidate.username === String(body.username || '').trim().toLowerCase());
    if (!found || !verifyPassword(String(body.password || ''), found.passwordHash)) throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
    setSession(res, found.id);
    return send(res, 200, { user: publicUser(found) });
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    clearSession(req, res);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/pages') {
    requireAuth();
    const db = await loadDb();
    return send(res, 200, { pages: db.pages });
  }

  const pageMatch = url.pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (req.method === 'POST' && url.pathname === '/api/pages') {
    requireAdmin();
    const db = await loadDb();
    const page = { id: crypto.randomUUID(), ...sanitizePageInput(await parseBody(req)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.pages.push(page);
    await saveDb(db);
    return send(res, 201, { page });
  }
  if (pageMatch && req.method === 'PUT') {
    requireAdmin();
    const db = await loadDb();
    const index = db.pages.findIndex((page) => page.id === pageMatch[1]);
    if (index === -1) throw Object.assign(new Error('Coloring page not found.'), { status: 404 });
    db.pages[index] = { ...db.pages[index], ...sanitizePageInput(await parseBody(req)), updatedAt: new Date().toISOString() };
    await saveDb(db);
    return send(res, 200, { page: db.pages[index] });
  }
  if (pageMatch && req.method === 'DELETE') {
    requireAdmin();
    const db = await loadDb();
    db.pages = db.pages.filter((page) => page.id !== pageMatch[1]);
    db.progress = db.progress.filter((item) => item.pageId !== pageMatch[1]);
    await saveDb(db);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/progress') {
    requireAuth();
    const db = await loadDb();
    return send(res, 200, { progress: db.progress.filter((item) => item.userId === user.id) });
  }
  if (req.method === 'POST' && url.pathname === '/api/progress') {
    requireAuth();
    const body = await parseBody(req);
    const db = await loadDb();
    const page = db.pages.find((candidate) => candidate.id === body.pageId);
    if (!page) throw Object.assign(new Error('Coloring page not found.'), { status: 404 });
    const record = { userId: user.id, pageId: page.id, fills: body.fills && typeof body.fills === 'object' ? body.fills : {}, updatedAt: new Date().toISOString() };
    db.progress = db.progress.filter((item) => !(item.userId === user.id && item.pageId === page.id));
    db.progress.push(record);
    await saveDb(db);
    return send(res, 200, { progress: record });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/users') {
    requireAdmin();
    const db = await loadDb();
    return send(res, 200, { users: db.users.map(publicUser), progress: db.progress });
  }

  return send(res, 404, { error: 'Not found.' });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) return send(res, 404, 'Not found.');
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  res.end(await readFile(filePath));
}

export async function createServer() {
  await ensureDatabase();
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
      return await serveStatic(req, res, url);
    } catch (error) {
      return send(res, error.status || 500, { error: error.message || 'Server error.' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await createServer();
  server.listen(PORT, () => {
    console.log(`ColorQuest Studio running at http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') console.log(`Default admin: ${seedInfo.adminUsername} / ${seedInfo.adminPassword}`);
  });
}
