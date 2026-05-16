const STORAGE_KEY = 'raj-ludo-arena-state-v1';
const ADMIN_EMAIL = 'admin@raj-ludo.local';
const ADMIN_PASSWORD = 'ChangeMe@123';
const COLORS = ['Crimson', 'Emerald', 'Sapphire', 'Amber'];
const BOARD_SIZE = 15;
const TRACK = [201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228];
const SAFE_STEPS = [0, 7, 14, 21];

let state = loadState();
let session = null;
let view = 'home';

function defaultState() {
  return {
    users: [{ id: 'admin', name: 'Owner Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', wallet: 0, kyc: 'verified', createdAt: new Date().toISOString() }],
    tournaments: [{ id: crypto.randomUUID(), title: 'Weekend Crown Tournament', entryFee: 50, maxPlayers: 4, prizePool: 180, status: 'open', participants: [], winnerId: '', createdAt: new Date().toISOString() }],
    transactions: [],
    withdrawals: [],
    appSettings: {
      brand: 'Raj Ludo Arena',
      paymentMode: 'Compliance demo wallet',
      gatewayProvider: 'Connect licensed PSP after legal approval',
      maintenance: false,
      announcement: 'Play tournaments with skill, strategy, and fair dice. Real-money mode is disabled until licensing, KYC, AML, tax, and payment compliance are complete.'
    },
    games: []
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return { ...defaultState(), ...JSON.parse(raw) }; } catch { return defaultState(); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid() { return crypto.randomUUID(); }
function money(amount) { return `₹${Number(amount || 0).toLocaleString('en-IN')}`; }
function currentUser() { return state.users.find((user) => user.id === session?.userId) || null; }
function esc(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function mutate(fn) { fn(state); saveState(); render(); }
function setView(next) { view = next; render(); }
function login(email, password) {
  const user = state.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password);
  if (!user) return false;
  session = { userId: user.id, role: user.role };
  view = user.role === 'admin' ? 'admin' : 'dashboard';
  render();
  return true;
}
function logout() { session = null; view = 'home'; render(); }

function register(form) {
  if (state.users.some((user) => user.email.toLowerCase() === form.email.toLowerCase())) return false;
  const user = { id: uid(), name: form.name, email: form.email, password: form.password, role: 'player', wallet: 250, kyc: 'pending', createdAt: new Date().toISOString() };
  mutate((draft) => {
    draft.users.push(user);
    draft.transactions.push({ id: uid(), userId: user.id, type: 'welcome_bonus', amount: 250, status: 'approved', createdAt: new Date().toISOString() });
  });
  session = { userId: user.id, role: user.role };
  view = 'dashboard';
  render();
  return true;
}

function render() {
  const user = currentUser();
  document.querySelector('#root').innerHTML = `${header(user)}<main>${body(user)}</main>`;
  bindGlobalEvents();
  if (view === 'login' || view === 'register') bindAuth();
  if (view === 'dashboard' && user) bindPlayer(user);
  if (view === 'admin' && user?.role === 'admin') bindAdmin();
}

function header(user) {
  return `<header class="topbar"><button class="brand" data-go="${user ? (user.role === 'admin' ? 'admin' : 'dashboard') : 'home'}">🎲 ${esc(state.appSettings.brand)}</button><nav>${!user ? `<button data-go="login">Login</button><button class="primary" data-go="register">Register</button>` : `<span class="wallet-chip">${user.role === 'admin' ? 'Admin' : money(user.wallet)}</span><button data-go="${user.role === 'admin' ? 'admin' : 'dashboard'}">Dashboard</button><button data-action="logout">Logout</button>`}</nav></header>`;
}

function body(user) {
  if (state.appSettings.maintenance && user?.role !== 'admin') return notice('Maintenance mode', 'The admin has paused player access while updates are being completed.');
  if (view === 'home') return home();
  if (view === 'login' || view === 'register') return auth(view);
  if (view === 'dashboard' && user) return playerDashboard(user);
  if (view === 'admin' && user?.role === 'admin') return adminPanel();
  return home();
}

function home() {
  const demoPlayers = COLORS.map((color, index) => ({ id: color, name: color, color, step: index * 7, home: false }));
  return `<section class="hero grid-two"><div><p class="eyebrow">Original Ludo-style tournament app</p><h1>Play private rooms, four-player matches, and knockout tournaments.</h1><p>${esc(state.appSettings.announcement)}</p><div class="actions"><button class="primary large" data-go="register">Create player account</button><button class="large" data-go="login">Owner / player login</button></div><div class="compliance-card"><strong>Legal safety:</strong> This build uses a demo wallet only. Do not process real deposits or withdrawals until your business has legal approval, gambling/skill-game licensing where required, KYC/AML, tax reporting, payment-provider approval, and responsible-gaming controls.</div></div>${ludoBoard(demoPlayers, 'Crimson')}</section>`;
}

function auth(mode) {
  return `<section class="auth-card"><h2>${mode === 'login' ? 'Login' : 'Player registration'}</h2><form id="auth-form">${mode === 'register' ? '<label>Name<input name="name" required /></label>' : ''}<label>Email<input type="email" name="email" required /></label><label>Password<input type="password" name="password" required /></label><p class="error" id="auth-error"></p><button class="primary" type="submit">${mode === 'login' ? 'Login' : 'Register'}</button></form><button class="link" data-go="${mode === 'login' ? 'register' : 'login'}">${mode === 'login' ? 'Need a player account?' : 'Already registered?'}</button></section>`;
}

function playerDashboard(user) {
  const activeGame = state.games.find((game) => game.players.some((player) => player.id === user.id) && game.status === 'playing');
  return `<section class="dashboard"><div class="panel hero-panel"><h2>Welcome, ${esc(user.name)}</h2><p class="balance">Wallet: ${money(user.wallet)}</p><p>KYC: <strong>${esc(user.kyc)}</strong></p><div class="wallet-actions"><input id="wallet-amount" type="number" min="10" value="100" /><button data-player-action="deposit">Demo add money</button><button data-player-action="withdraw">Request withdrawal</button></div></div><div class="grid-two"><div class="panel"><h3>Tournaments</h3>${state.tournaments.map((t) => tournamentCard(t, user)).join('')}</div><div class="panel"><h3>Live Game</h3>${activeGame ? gameTable(activeGame, user) : '<p>No active match yet. Join a tournament and wait for admin to launch it.</p>'}</div></div></section>`;
}
function tournamentCard(t, user) {
  return `<article class="tournament"><h4>${esc(t.title)}</h4><p>${esc(t.status)} • Entry ${money(t.entryFee)} • Prize ${money(t.prizePool)}</p><p>${t.participants.length}/${t.maxPlayers} players</p><button class="primary" data-join="${t.id}" ${t.status !== 'open' || t.participants.includes(user.id) ? 'disabled' : ''}>Join</button></article>`;
}

function gameTable(game, user) {
  const active = game.players[game.turnIndex];
  const winner = game.players.find((player) => player.id === game.winnerId);
  return `<div>${ludoBoard(game.players, active?.color)}<p>Turn: <strong>${esc(active?.name || '')}</strong></p><button class="primary large" data-roll="${game.id}" ${active?.id !== user.id || game.status !== 'playing' ? 'disabled' : ''}>Roll dice</button>${game.status === 'finished' ? `<p class="success">Winner: ${esc(winner?.name || '')}</p>` : ''}<ul class="log">${game.log.slice(0, 6).map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul></div>`;
}

function adminPanel() {
  return `<section class="admin-grid"><div class="panel"><h2>Owner Admin Panel</h2><label>Brand<input id="set-brand" value="${esc(state.appSettings.brand)}" /></label><label>Payment mode<input id="set-payment" value="${esc(state.appSettings.paymentMode)}" /></label><label>Gateway provider<input id="set-gateway" value="${esc(state.appSettings.gatewayProvider)}" /></label><label>Announcement<textarea id="set-announcement">${esc(state.appSettings.announcement)}</textarea></label><label class="checkbox"><input id="set-maintenance" type="checkbox" ${state.appSettings.maintenance ? 'checked' : ''} /> Maintenance mode</label><button class="primary" data-admin-action="save-settings">Save settings</button></div><div class="panel"><h3>Create tournament</h3><form id="tournament-form"><label>Title<input name="title" required /></label><label>Entry fee<input name="entryFee" type="number" min="0" value="50" /></label><label>Max players<input name="maxPlayers" type="number" min="2" max="4" value="4" /></label><label>Starting prize<input name="prizePool" type="number" min="0" value="0" /></label><button class="primary" type="submit">Create</button></form></div><div class="panel wide"><h3>Manage tournaments</h3><div class="table-list">${state.tournaments.map(tournamentRow).join('')}</div></div><div class="panel wide"><h3>Players, KYC, and withdrawals</h3><div class="table-list">${state.users.filter((u) => u.role === 'player').map(playerRow).join('')}${state.withdrawals.map(withdrawalRow).join('')}</div></div></section>`;
}
function tournamentRow(t) { return `<div class="row"><span>${esc(t.title)}</span><span>${esc(t.status)}</span><span>${t.participants.length}/${t.maxPlayers}</span><span>${money(t.prizePool)}</span><button data-launch="${t.id}" ${t.status !== 'open' || t.participants.length < 2 ? 'disabled' : ''}>Launch</button></div>`; }
function playerRow(user) { return `<div class="row"><span>${esc(user.name)}</span><span>${esc(user.email)}</span><span>${money(user.wallet)}</span><span>${esc(user.kyc)}</span><button data-kyc="${user.id}">Verify KYC</button></div>`; }
function withdrawalRow(item) { const user = state.users.find((entry) => entry.id === item.userId); return `<div class="row"><span>${esc(user?.name || '')}</span><span>${money(item.amount)}</span><span>${esc(item.status)}</span><button data-withdraw-ok="${item.id}">Approve demo payout</button><button data-withdraw-no="${item.id}">Reject</button></div>`; }

function ludoBoard(players, activeColor) {
  const pieces = new Map();
  players.forEach((player) => {
    const cell = player.home ? 112 : TRACK[Math.max(0, Math.min(player.step, TRACK.length - 1))];
    pieces.set(cell, [...(pieces.get(cell) || []), player]);
  });
  let cells = '';
  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const isTrack = TRACK.includes(index) || [112, 96, 98, 126, 128].includes(index);
    const tokens = (pieces.get(index) || []).map((player) => `<span class="piece ${player.color.toLowerCase()} ${activeColor === player.color ? 'active' : ''}" title="${esc(player.name)}">${player.color[0]}</span>`).join('');
    cells += `<div class="cell ${isTrack ? 'track' : ''} ${index === 112 ? 'home-cell' : ''}">${tokens}</div>`;
  }
  return `<div class="board" aria-label="Ludo board">${cells}</div>`;
}
function notice(title, text) { return `<div class="notice"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`; }

function bindGlobalEvents() {
  document.querySelectorAll('[data-go]').forEach((btn) => btn.addEventListener('click', () => setView(btn.dataset.go)));
  document.querySelector('[data-action="logout"]')?.addEventListener('click', logout);
}
function bindAuth() {
  document.querySelector('#auth-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const ok = view === 'login' ? login(data.email, data.password) : data.password.length >= 6 && register(data);
    if (!ok) document.querySelector('#auth-error').textContent = view === 'login' ? 'Invalid credentials. Admin: admin@raj-ludo.local / ChangeMe@123' : 'Use a unique email and a 6+ character password.';
  });
}
function bindPlayer(user) {
  document.querySelector('[data-player-action="deposit"]')?.addEventListener('click', () => addFunds(user));
  document.querySelector('[data-player-action="withdraw"]')?.addEventListener('click', () => requestWithdraw(user));
  document.querySelectorAll('[data-join]').forEach((btn) => btn.addEventListener('click', () => joinTournament(btn.dataset.join, user)));
  document.querySelectorAll('[data-roll]').forEach((btn) => btn.addEventListener('click', () => rollDice(btn.dataset.roll, user)));
}
function addFunds(user) { const amount = Number(document.querySelector('#wallet-amount')?.value || 0); mutate((draft) => { const player = draft.users.find((entry) => entry.id === user.id); player.wallet += amount; draft.transactions.push({ id: uid(), userId: user.id, type: 'demo_deposit', amount, status: 'approved', createdAt: new Date().toISOString() }); }); }
function requestWithdraw(user) { const amount = Number(document.querySelector('#wallet-amount')?.value || 0); mutate((draft) => draft.withdrawals.push({ id: uid(), userId: user.id, amount, status: 'pending_compliance_review', createdAt: new Date().toISOString() })); }
function joinTournament(tournamentId, user) { mutate((draft) => { const t = draft.tournaments.find((entry) => entry.id === tournamentId); const player = draft.users.find((entry) => entry.id === user.id); if (!t || t.status !== 'open' || t.participants.includes(user.id) || t.participants.length >= t.maxPlayers || player.wallet < t.entryFee) return; player.wallet -= t.entryFee; t.prizePool += t.entryFee; t.participants.push(user.id); draft.transactions.push({ id: uid(), userId: user.id, type: 'entry_fee', amount: -t.entryFee, status: 'approved', createdAt: new Date().toISOString() }); }); }
function rollDice(gameId, user) { mutate((draft) => { const game = draft.games.find((entry) => entry.id === gameId); if (!game || game.status !== 'playing') return; const player = game.players[game.turnIndex]; if (player.id !== user.id) return; const roll = Math.floor(Math.random() * 6) + 1; player.lastRoll = roll; player.step = Math.min(player.step + roll, TRACK.length); player.home = player.step >= TRACK.length; if (!SAFE_STEPS.includes(player.step)) game.players.forEach((other) => { if (other.id !== player.id && other.step === player.step && !other.home) other.step = 0; }); game.log.unshift(`${player.name} rolled ${roll}.`); if (player.home) settleWin(draft, game, player); else game.turnIndex = (game.turnIndex + 1) % game.players.length; }); }
function settleWin(draft, game, player) { game.status = 'finished'; game.winnerId = player.id; const t = draft.tournaments.find((entry) => entry.id === game.tournamentId); if (t) { t.status = 'finished'; t.winnerId = player.id; const winner = draft.users.find((entry) => entry.id === player.id); winner.wallet += t.prizePool; draft.transactions.push({ id: uid(), userId: player.id, type: 'prize', amount: t.prizePool, status: 'approved', createdAt: new Date().toISOString() }); } }
function bindAdmin() {
  document.querySelector('[data-admin-action="save-settings"]')?.addEventListener('click', () => mutate((draft) => { draft.appSettings = { brand: document.querySelector('#set-brand').value, paymentMode: document.querySelector('#set-payment').value, gatewayProvider: document.querySelector('#set-gateway').value, announcement: document.querySelector('#set-announcement').value, maintenance: document.querySelector('#set-maintenance').checked }; }));
  document.querySelector('#tournament-form')?.addEventListener('submit', (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); mutate((draft) => draft.tournaments.push({ id: uid(), title: data.title, entryFee: Number(data.entryFee), maxPlayers: Number(data.maxPlayers), prizePool: Number(data.prizePool), status: 'open', participants: [], winnerId: '', createdAt: new Date().toISOString() })); });
  document.querySelectorAll('[data-launch]').forEach((btn) => btn.addEventListener('click', () => launchTournament(btn.dataset.launch)));
  document.querySelectorAll('[data-kyc]').forEach((btn) => btn.addEventListener('click', () => mutate((draft) => { draft.users.find((entry) => entry.id === btn.dataset.kyc).kyc = 'verified'; })));
  document.querySelectorAll('[data-withdraw-ok]').forEach((btn) => btn.addEventListener('click', () => settleWithdrawal(btn.dataset.withdrawOk, 'approved_demo_payout')));
  document.querySelectorAll('[data-withdraw-no]').forEach((btn) => btn.addEventListener('click', () => settleWithdrawal(btn.dataset.withdrawNo, 'rejected')));
}
function launchTournament(tournamentId) { mutate((draft) => { const t = draft.tournaments.find((entry) => entry.id === tournamentId); if (!t || t.participants.length < 2) return; t.status = 'playing'; const players = t.participants.map((id, index) => { const user = draft.users.find((entry) => entry.id === id); return { id, name: user.name, color: COLORS[index % COLORS.length], step: 0, home: false, lastRoll: 0 }; }); draft.games.push({ id: uid(), tournamentId, status: 'playing', players, turnIndex: 0, winnerId: '', log: ['Tournament launched by admin.'], createdAt: new Date().toISOString() }); }); }
function settleWithdrawal(id, status) { mutate((draft) => { const withdrawal = draft.withdrawals.find((entry) => entry.id === id); if (!withdrawal || withdrawal.status !== 'pending_compliance_review') return; withdrawal.status = status; if (status === 'approved_demo_payout') { const user = draft.users.find((entry) => entry.id === withdrawal.userId); if (user.wallet >= withdrawal.amount) { user.wallet -= withdrawal.amount; draft.transactions.push({ id: uid(), userId: user.id, type: 'demo_withdrawal', amount: -withdrawal.amount, status: 'approved', createdAt: new Date().toISOString() }); } else withdrawal.status = 'rejected_insufficient_balance'; } }); }

render();
