import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'colorquest-'));
process.env.DB_PATH = path.join(tempDir, 'db.json');
process.env.ADMIN_USERNAME = 'owner';
process.env.ADMIN_PASSWORD = 'ChangeMe123!';
const { createServer } = await import('../src/server.js');
const { createColoringLevels } = await import('../src/levelFactory.js');

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0] || '';
}

test('level factory creates 500+ unique attractive coloring pages', () => {
  const levels = createColoringLevels();
  assert.ok(levels.length >= 500);
  assert.equal(new Set(levels.map((level) => level.id)).size, levels.length);
  assert.equal(new Set(levels.map((level) => level.title)).size, levels.length);
  assert.ok(levels.every((level) => level.svg.includes('paint-region') && level.palette.length >= 6));
});

test('player registration, page access, and progress saving work', async (t) => {
  const server = await createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(tempDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const register = await fetch(`${base}/api/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'player_one', password: 'secret1' }) });
  assert.equal(register.status, 201);
  const playerCookie = cookieFrom(register);

  const pagesResponse = await fetch(`${base}/api/pages`, { headers: { cookie: playerCookie } });
  assert.equal(pagesResponse.status, 200);
  const { pages } = await pagesResponse.json();
  assert.ok(pages.length >= 500);

  const save = await fetch(`${base}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: playerCookie }, body: JSON.stringify({ pageId: pages[0].id, fills: { m1: '#ffcf33' } }) });
  assert.equal(save.status, 200);

  const denied = await fetch(`${base}/api/admin/users`, { headers: { cookie: playerCookie } });
  assert.equal(denied.status, 403);
});

test('admin can create and delete coloring pages', async (t) => {
  const server = await createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(async () => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;

  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'owner', password: 'ChangeMe123!' }) });
  assert.equal(login.status, 200);
  const adminCookie = cookieFrom(login);

  const create = await fetch(`${base}/api/pages`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: adminCookie }, body: JSON.stringify({ title: 'Test Star', category: 'Test', difficulty: 'Easy', description: 'Test art', palette: ['#ffffff'], svg: '<svg viewBox="0 0 10 10"><circle class="paint-region" data-region="s1" data-color="1" cx="5" cy="5" r="4"/><text x="5" y="5">1</text></svg>' }) });
  assert.equal(create.status, 201);
  const { page } = await create.json();

  const remove = await fetch(`${base}/api/pages/${page.id}`, { method: 'DELETE', headers: { cookie: adminCookie } });
  assert.equal(remove.status, 200);
});
