const state = { user: null, pages: [], progress: [], activePage: null, activeColor: 1, fills: {}, galleryPage: 1, pageSize: 48 };
const $ = (selector) => document.querySelector(selector);
const api = async (path, options = {}) => {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request failed.');
  return payload;
};

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  $('#toast').append(node);
  setTimeout(() => node.remove(), 3200);
}

function setAuthView() {
  $('#sessionLabel').textContent = state.user ? `${state.user.username} (${state.user.role})` : 'Guest';
  $('#logoutBtn').classList.toggle('hidden', !state.user);
  $('#authView').classList.toggle('hidden', Boolean(state.user));
  $('#gameView').classList.toggle('hidden', !state.user);
  $('#adminPanel').classList.toggle('hidden', state.user?.role !== 'admin');
}

async function refreshData() {
  if (!state.user) return;
  const [pagesPayload, progressPayload] = await Promise.all([api('/api/pages'), api('/api/progress')]);
  state.pages = pagesPayload.pages;
  state.progress = progressPayload.progress;
  renderGallery();
  if (state.user.role === 'admin') await renderAdmin();
}

function pageProgress(pageId) {
  return state.progress.find((item) => item.pageId === pageId)?.fills || {};
}

function renderGallery() {
  const query = $('#searchInput').value.toLowerCase();
  const pages = state.pages.filter((page) => [page.title, page.category, page.difficulty].join(' ').toLowerCase().includes(query));
  const totalPages = Math.max(1, Math.ceil(pages.length / state.pageSize));
  state.galleryPage = Math.min(state.galleryPage, totalPages);
  const start = (state.galleryPage - 1) * state.pageSize;
  const visiblePages = pages.slice(start, start + state.pageSize);
  $('#galleryCount').textContent = `${pages.length} available levels`;
  $('#galleryPageLabel').textContent = `Page ${state.galleryPage} of ${totalPages}`;
  $('#prevPage').disabled = state.galleryPage <= 1;
  $('#nextPage').disabled = state.galleryPage >= totalPages;
  $('#gallery').innerHTML = visiblePages.map((page) => {
    const fillCount = Object.keys(pageProgress(page.id)).length;
    return `<article class="page-card">
      <div class="thumb">${page.svg}</div>
      <div><h3>${escapeHtml(page.title)}</h3><p>${escapeHtml(page.description || '')}</p></div>
      <div class="meta"><span class="pill">${escapeHtml(page.category)}</span><span class="pill">${escapeHtml(page.difficulty)}</span><span class="pill">${fillCount} saved fills</span></div>
      <button data-open="${page.id}">Start coloring</button>
    </article>`;
  }).join('') || '<p>No coloring pages found.</p>';
  document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => openPainter(button.dataset.open)));
}

function openPainter(pageId) {
  state.activePage = state.pages.find((page) => page.id === pageId);
  state.activeColor = 1;
  state.fills = { ...pageProgress(pageId) };
  $('#activeTitle').textContent = state.activePage.title;
  $('#activeCategory').textContent = `${state.activePage.category} • ${state.activePage.difficulty}`;
  $('#activeDescription').textContent = state.activePage.description || '';
  $('#canvasWrap').innerHTML = state.activePage.svg;
  $('#playerPanel').classList.remove('hidden');
  renderPalette();
  applyFills();
  updateProgress();
  $('#playerPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPalette() {
  $('#palette').innerHTML = state.activePage.palette.map((color, index) => `<button class="swatch ${index + 1 === state.activeColor ? 'active' : ''}" data-color="${index + 1}"><span class="color-dot" style="background:${escapeHtml(color)}"></span><strong>${index + 1}</strong><span>${escapeHtml(color)}</span></button>`).join('');
  document.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => {
    state.activeColor = Number(button.dataset.color);
    renderPalette();
  }));
}

function applyFills() {
  $('#canvasWrap').querySelectorAll('.paint-region').forEach((region) => {
    const saved = state.fills[region.dataset.region];
    if (saved) region.style.fill = saved;
    region.addEventListener('click', () => {
      const required = Number(region.dataset.color);
      if (required !== state.activeColor) return toast(`Pick color number ${required} for this region.`);
      const color = state.activePage.palette[required - 1];
      region.style.fill = color;
      state.fills[region.dataset.region] = color;
      updateProgress();
    });
  });
}

function updateProgress() {
  const total = $('#canvasWrap').querySelectorAll('.paint-region').length || 1;
  const done = Object.keys(state.fills).length;
  const percent = Math.round((done / total) * 100);
  $('#progressBar').style.width = `${percent}%`;
  $('#progressText').textContent = `${percent}% complete (${done}/${total} regions)`;
}

async function saveProgress() {
  if (!state.activePage) return;
  await api('/api/progress', { method: 'POST', body: JSON.stringify({ pageId: state.activePage.id, fills: state.fills }) });
  toast('Progress saved.');
  await refreshData();
}

async function renderAdmin() {
  const payload = await api('/api/admin/users');
  $('#adminPages').innerHTML = state.pages.map((page) => `<div class="admin-item"><span><strong>${escapeHtml(page.title)}</strong><br><small>${escapeHtml(page.category)} • ${escapeHtml(page.difficulty)}</small></span><span><button class="ghost" data-edit="${page.id}">Edit</button> <button class="danger" data-delete="${page.id}">Delete</button></span></div>`).join('');
  $('#adminUsers').innerHTML = payload.users.map((user) => `<div class="admin-item"><span><strong>${escapeHtml(user.username)}</strong><br><small>${escapeHtml(user.role)} • ${new Date(user.createdAt).toLocaleDateString()}</small></span></div>`).join('');
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => loadPageForm(button.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => deletePage(button.dataset.delete)));
}

function loadPageForm(pageId) {
  const page = pageId ? state.pages.find((item) => item.id === pageId) : { id: '', title: '', category: '', difficulty: 'Easy', description: '', palette: ['#7c3aed', '#06b6d4'], svg: '<svg viewBox="0 0 320 320"><circle class="paint-region" data-region="new1" data-color="1" cx="160" cy="160" r="100"/><text x="160" y="160">1</text></svg>' };
  const form = $('#pageForm');
  form.id.value = page.id;
  form.title.value = page.title;
  form.category.value = page.category;
  form.difficulty.value = page.difficulty;
  form.description.value = page.description || '';
  form.palette.value = page.palette.join(', ');
  form.svg.value = page.svg;
}

async function deletePage(pageId) {
  if (!confirm('Delete this coloring page for all players?')) return;
  await api(`/api/pages/${pageId}`, { method: 'DELETE' });
  toast('Page deleted.');
  await refreshData();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

$('#registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.user = (await api('/api/register', { method: 'POST', body: JSON.stringify(formJson(event.target)) })).user;
  setAuthView();
  await refreshData();
});
$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  state.user = (await api('/api/login', { method: 'POST', body: JSON.stringify(formJson(event.target)) })).user;
  setAuthView();
  await refreshData();
});
$('#logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  Object.assign(state, { user: null, pages: [], progress: [], activePage: null, fills: {} });
  setAuthView();
});
$('#searchInput').addEventListener('input', () => { state.galleryPage = 1; renderGallery(); });
$('#prevPage').addEventListener('click', () => { state.galleryPage = Math.max(1, state.galleryPage - 1); renderGallery(); });
$('#nextPage').addEventListener('click', () => { state.galleryPage += 1; renderGallery(); });
$('#closePainter').addEventListener('click', () => $('#playerPanel').classList.add('hidden'));
$('#saveProgress').addEventListener('click', saveProgress);
$('#resetProgress').addEventListener('click', () => { state.fills = {}; openPainter(state.activePage.id); });
$('#newPageBtn').addEventListener('click', () => loadPageForm());
$('#pageForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = formJson(event.target);
  const payload = { ...data, palette: data.palette.split(',').map((color) => color.trim()).filter(Boolean) };
  const id = data.id;
  delete payload.id;
  await api(id ? `/api/pages/${id}` : '/api/pages', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
  toast('Page saved.');
  event.target.reset();
  await refreshData();
});

(async function boot() {
  const payload = await api('/api/me');
  state.user = payload.user;
  if (payload.seedAdmin) $('#devAdminHint').textContent = `Development owner login: ${payload.seedAdmin.username} / ${payload.seedAdmin.password}. Change ADMIN_USERNAME and ADMIN_PASSWORD in production.`;
  setAuthView();
  await refreshData();
})();
