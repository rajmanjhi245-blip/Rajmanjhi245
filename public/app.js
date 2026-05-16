const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = { user: null, settings: {}, puzzles: [], tournaments: [], leaderboard: {}, selectedPuzzle: null, selectedTournament: null, pieces: [], dragging: null, startedAt: 0, timer: null, completed: false, adsShownAt: 0, levelPage: 0, levelsPerPage: 40 };
const board = $('#board');
const ctx = board.getContext('2d');

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(message) { const t = $('#toast'); t.textContent = message; t.classList.add('show'); clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2600); }
function fmt(ms) { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function money(n) { return `$${Number(n || 0).toFixed(2)}`; }

async function loadState() {
  const data = await api('/api/state');
  Object.assign(state, data);
  $('#appName').textContent = state.settings.appName || 'Jigsaw Arena';
  renderAccount(); renderPuzzles(); renderTournaments(); renderWallet(); renderAdminShell(); draw();
}
function renderAccount() {
  $('#authPanel').hidden = Boolean(state.user);
  $('#adminNav').hidden = state.user?.role !== 'admin';
  $('#accountBox').innerHTML = state.user ? `<span class="pill">${state.user.role}</span><strong>${state.user.displayName || state.user.username}</strong><button id="logoutBtn">Logout</button>` : '<span class="hint">Guest mode</span>';
  $('#logoutBtn')?.addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }); location.reload(); });
}
function renderPuzzles() {
  const levels = [...state.puzzles].sort((a, b) => (a.difficultyScore || a.level || 0) - (b.difficultyScore || b.level || 0));
  const totalPages = Math.max(1, Math.ceil(levels.length / state.levelsPerPage));
  state.levelPage = Math.max(0, Math.min(state.levelPage, totalPages - 1));
  const pageLevels = levels.slice(state.levelPage * state.levelsPerPage, (state.levelPage + 1) * state.levelsPerPage);
  $('#puzzleList').innerHTML = pageLevels.map(p => `<article class="item ${state.selectedPuzzle?.id === p.id ? 'selected' : ''}"><h3>${p.title}</h3><span class="pill">Level ${p.level || 'Custom'}</span><span class="pill">Difficulty ${p.difficultyScore || p.difficulty}</span><span class="pill">${p.rows * p.cols} pieces</span>${p.locked ? '<span class="pill">Coin unlock</span>' : ''}<p class="hint">${p.category} • ${p.rows}×${p.cols} • Target ${p.targetSeconds || 0}s • Snap ${(p.snapTolerance || .28).toFixed(2)}</p><button data-puzzle="${p.id}">Play level</button></article>`).join('');
  $$('[data-puzzle]').forEach(btn => btn.addEventListener('click', () => startPuzzle(btn.dataset.puzzle)));
  $('#adminPuzzleSelect').innerHTML = levels.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
  $('#levelJump').value = String(state.levelPage * state.levelsPerPage + 1);
  $('#prevLevelsBtn').disabled = state.levelPage === 0;
  $('#nextLevelsBtn').disabled = state.levelPage >= totalPages - 1;
}
function renderTournaments() {
  $('#tournamentList').innerHTML = state.tournaments.map(t => {
    const puzzle = state.puzzles.find(p => p.id === t.puzzleId);
    const rows = (state.leaderboard[t.id] || []).map((s, i) => `<li>#${i + 1} ${s.username} — ${fmt(s.durationMs)}</li>`).join('') || '<li>No scores yet</li>';
    return `<article class="item"><h3>${t.name}</h3><span class="pill">${t.status}</span><span class="pill">Prize ${t.prizeCoins} coins</span><p>${puzzle?.title || 'Puzzle'} • ends ${new Date(t.endsAt).toLocaleString()}</p><button data-tour="${t.id}">Enter tournament</button><ol>${rows}</ol></article>`;
  }).join('');
  $$('[data-tour]').forEach(btn => btn.addEventListener('click', () => { const t = state.tournaments.find(x => x.id === btn.dataset.tour); state.selectedTournament = t; showView('play'); startPuzzle(t.puzzleId); }));
}
function renderWallet() {
  const coins = state.user?.coins || 0;
  const earnings = state.user?.earnings || 0;
  $('#walletInfo').innerHTML = `<span>Coins: ${coins}</span><span>Reward earnings: ${money(earnings)}</span><span>Puzzle reward: ${state.settings.coinsPerPuzzle} coins</span><span>Ad reward: ${state.settings.coinsPerAd} coins</span>`;
}
function renderAdminShell() {
  if (state.user?.role !== 'admin') return;
  api('/api/admin').then(data => {
    $('#adminStats').innerHTML = `<span class="pill">Users: ${data.users.length}</span><span class="pill">Puzzles: ${data.puzzles.length}</span><span class="pill">Tournaments: ${data.tournaments.length}</span><span class="pill">Ad events: ${data.adEvents.length}</span><span class="pill">Ad revenue: ${money(data.totalRevenue)}</span>`;
  }).catch(() => {});
}
function showView(id) { $$('.view').forEach(v => v.classList.toggle('active', v.id === id)); $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === id)); }
$$('nav button').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
$('#prevLevelsBtn').addEventListener('click', () => { state.levelPage -= 1; renderPuzzles(); });
$('#nextLevelsBtn').addEventListener('click', () => { state.levelPage += 1; renderPuzzles(); });
$('#jumpLevelBtn').addEventListener('click', () => { const requested = Math.max(1, Math.min(Number($('#levelJump').value || 1), state.puzzles.length)); state.levelPage = Math.floor((requested - 1) / state.levelsPerPage); renderPuzzles(); });

function startPuzzle(id) {
  if (!state.user) return toast('Please register or login first.');
  const puzzle = state.puzzles.find(p => p.id === id);
  if (!puzzle) return;
  if (puzzle.locked && state.user.coins < 50) return toast('This premium puzzle needs at least 50 coins.');
  state.selectedPuzzle = puzzle; state.completed = false; state.startedAt = Date.now(); state.adsShownAt = 0;
  makePieces(puzzle); renderPuzzles(); $('#puzzleTitle').textContent = puzzle.title; $('#gameMeta').textContent = `${puzzle.category} • ${puzzle.difficulty} • ${puzzle.rows}×${puzzle.cols} • difficulty score ${puzzle.difficultyScore || puzzle.level || 'custom'}`;
  clearInterval(state.timer); state.timer = setInterval(() => $('#timer').textContent = fmt(Date.now() - state.startedAt), 500);
  updatePieceCount(); draw(); toast('Puzzle started! Drag each piece into its glowing home.');
}
function makePieces(p) {
  const margin = 24, targetW = Math.min(420, board.width * .48), targetH = Math.min(420, board.height - margin * 2);
  const size = Math.min(targetW / p.cols, targetH / p.rows);
  const ox = margin, oy = (board.height - size * p.rows) / 2;
  state.target = { x: ox, y: oy, w: size * p.cols, h: size * p.rows, size };
  state.pieces = [];
  for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++) state.pieces.push({ r, c, x: board.width * .58 + Math.random() * (board.width * .34), y: margin + Math.random() * (board.height - size - margin * 2), homeX: ox + c * size, homeY: oy + r * size, size, placed: false, rot: 0 });
}
function colorFor(p, r, c) { const pal = p.palette || ['#7c5cff', '#21d4a7']; return pal[(r + c) % pal.length]; }
function drawArt(x, y, w, h, p, clipR, clipC) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h); (p.palette || []).forEach((col, i, arr) => grad.addColorStop(arr.length === 1 ? 0 : i / (arr.length - 1), col)); ctx.fillStyle = grad; ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = .25; ctx.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(x + (i * 97 + clipC * 33) % w, y + (i * 61 + clipR * 43) % h, 28 + (i % 3) * 18, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffffcc'; ctx.font = 'bold 34px system-ui'; ctx.fillText(p.title.slice(0, 1), x + w * .45, y + h * .54);
}
function drawPiece(piece, p) {
  const s = piece.size;
  ctx.save(); ctx.translate(piece.x + s / 2, piece.y + s / 2); ctx.rotate(piece.rot); ctx.translate(-s / 2, -s / 2);
  ctx.shadowColor = '#0008'; ctx.shadowBlur = piece.placed ? 0 : 12; ctx.fillStyle = colorFor(p, piece.r, piece.c); ctx.fillRect(0, 0, s, s);
  drawArt(0, 0, s, s, p, piece.r, piece.c);
  ctx.strokeStyle = piece.placed ? '#21d4a7' : '#ffffff'; ctx.lineWidth = piece.placed ? 4 : 2; ctx.strokeRect(1, 1, s - 2, s - 2); ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, board.width, board.height); ctx.fillStyle = '#0b1020'; ctx.fillRect(0, 0, board.width, board.height);
  if (!state.selectedPuzzle) { ctx.fillStyle = '#aab4d4'; ctx.font = '24px system-ui'; ctx.fillText('Register/login and choose a puzzle to begin.', 42, 80); return; }
  const p = state.selectedPuzzle, t = state.target;
  ctx.save(); ctx.globalAlpha = .32; drawArt(t.x, t.y, t.w, t.h, p, 0, 0); ctx.globalAlpha = 1; ctx.strokeStyle = '#21d4a7'; ctx.setLineDash([8, 10]); ctx.strokeRect(t.x, t.y, t.w, t.h); ctx.restore();
  state.pieces.forEach(piece => drawPiece(piece, p));
}
function pointer(evt) { const rect = board.getBoundingClientRect(); return { x: (evt.clientX - rect.left) * board.width / rect.width, y: (evt.clientY - rect.top) * board.height / rect.height }; }
board.addEventListener('pointerdown', e => { const pos = pointer(e); const piece = [...state.pieces].reverse().find(pc => !pc.placed && pos.x >= pc.x && pos.x <= pc.x + pc.size && pos.y >= pc.y && pos.y <= pc.y + pc.size); if (!piece) return; state.dragging = { piece, dx: pos.x - piece.x, dy: pos.y - piece.y }; board.setPointerCapture(e.pointerId); });
board.addEventListener('pointermove', e => { if (!state.dragging) return; const pos = pointer(e); state.dragging.piece.x = pos.x - state.dragging.dx; state.dragging.piece.y = pos.y - state.dragging.dy; draw(); });
board.addEventListener('pointerup', async () => { if (!state.dragging) return; const piece = state.dragging.piece; state.dragging = null; if (Math.hypot(piece.x - piece.homeX, piece.y - piece.homeY) < piece.size * (state.selectedPuzzle.snapTolerance || .28)) { piece.x = piece.homeX; piece.y = piece.homeY; piece.placed = true; const placed = state.pieces.filter(p => p.placed).length; if (placed - state.adsShownAt >= Number(state.settings.adEveryPieces || 99)) { state.adsShownAt = placed; await showAd('between-pieces'); } } updatePieceCount(); draw(); if (state.pieces.every(p => p.placed)) completePuzzle(); });
function updatePieceCount() { $('#pieceCount').textContent = `${state.pieces.filter(p => p.placed).length}/${state.pieces.length}`; }
async function completePuzzle() { if (state.completed) return; state.completed = true; clearInterval(state.timer); await showAd('completion'); toast('Puzzle complete! Submit your score.'); }
async function showAd(placement) { $('#adModal').hidden = false; await new Promise(r => setTimeout(r, 2100)); $('#adModal').hidden = true; const data = await api('/api/ad-event', { method: 'POST', body: { placement } }); state.user = data.user; renderWallet(); }
$('#shuffleBtn').addEventListener('click', () => state.selectedPuzzle && startPuzzle(state.selectedPuzzle.id));
$('#hintBtn').addEventListener('click', () => { const piece = state.pieces.find(p => !p.placed); if (!piece) return; piece.x = piece.homeX; piece.y = piece.homeY; piece.placed = true; updatePieceCount(); draw(); });
$('#submitScoreBtn').addEventListener('click', async () => { if (!state.completed) return toast('Complete the puzzle first.'); const data = await api('/api/complete', { method: 'POST', body: { puzzleId: state.selectedPuzzle.id, tournamentId: state.selectedTournament?.id, durationMs: Date.now() - state.startedAt } }); state.user = data.user; toast(`Score saved! +${data.score.reward} coins`); await loadState(); });
$('#watchAdBtn').addEventListener('click', () => state.user ? showAd('wallet') : toast('Login first.'));
$('#registerForm').addEventListener('submit', async e => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/register', { method: 'POST', body }); toast('Player created. Please login.'); e.target.reset(); });
$('#loginForm').addEventListener('submit', async e => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/login', { method: 'POST', body }); await loadState(); toast('Logged in.'); });
$('#settingsForm').addEventListener('submit', async e => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/settings', { method: 'PUT', body }); await loadState(); toast('Settings saved.'); });
$('#puzzleForm').addEventListener('submit', async e => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); body.palette = String(body.palette || '').split(',').map(s => s.trim()).filter(Boolean); await api('/api/admin/puzzles', { method: 'POST', body }); await loadState(); toast('Puzzle saved.'); e.target.reset(); });
$('#tournamentForm').addEventListener('submit', async e => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); await api('/api/admin/tournaments', { method: 'POST', body }); await loadState(); toast('Tournament saved.'); e.target.reset(); });
loadState().catch(err => toast(err.message));
