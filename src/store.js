import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createColoringLevels } from './levelFactory.js';

const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'owner';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'db.json');

const originalPages = createColoringLevels(540);

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

export async function ensureDatabase() {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  const now = new Date().toISOString();
  if (!existsSync(DB_PATH)) {
    await saveDb({
      users: [{ id: crypto.randomUUID(), username: DEFAULT_ADMIN_USERNAME, passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD), role: 'admin', createdAt: now }],
      pages: originalPages.map((page) => ({ ...page, createdAt: now, updatedAt: now })),
      progress: []
    });
    return;
  }

  const db = JSON.parse(await readFile(DB_PATH, 'utf8'));
  const existingIds = new Set((db.pages || []).map((page) => page.id));
  const missingSeedPages = originalPages
    .filter((page) => !existingIds.has(page.id))
    .map((page) => ({ ...page, createdAt: now, updatedAt: now }));
  if (missingSeedPages.length > 0) {
    db.pages = [...(db.pages || []), ...missingSeedPages];
    db.users ||= [];
    db.progress ||= [];
    await saveDb(db);
  }
}

export async function loadDb() {
  await ensureDatabase();
  return JSON.parse(await readFile(DB_PATH, 'utf8'));
}

export async function saveDb(db) {
  await writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, createdAt: user.createdAt };
}

export const seedInfo = { adminUsername: DEFAULT_ADMIN_USERNAME, adminPassword: DEFAULT_ADMIN_PASSWORD };
