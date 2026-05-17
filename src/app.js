(function (global) {
  'use strict';

  const STORAGE_KEY = 'multiplyMastersState.v1';
  const ADMIN_USERNAME = 'owner';
  const ADMIN_PASSWORD = 'Owner@12345';

  const defaultState = {
    settings: {
      appTitle: 'Multiply Masters Academy',
      welcomeText: 'Practice tables, solve colorful challenges, collect coins, and become a multiplication master!',
      activeTables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      adsEnabled: true,
      coinsPerCorrect: 10,
      bonusEveryStreak: 5,
      adRewardCoins: 25,
      maintenanceMode: false,
      announcement: 'New 700-level multiplication journey is live today!',
      maxLevels: 700
    },
    users: [],
    sessions: {
      currentUserId: null,
      adminAuthed: false
    },
    ads: [
      {
        id: 'starter-banner',
        title: 'Sponsor Space',
        copy: 'Connect your AdMob or sponsor creative from the admin panel.',
        cta: 'Practice More'
      }
    ],
    auditLog: []
  };

  const gameModes = [
    {
      id: 'flashcards',
      title: 'Flash Cards',
      icon: '🃏',
      description: 'Fast multiplication drills with instant feedback.'
    },
    {
      id: 'always-adding',
      title: 'Always Adding',
      icon: '➕',
      description: 'Understand multiplication as repeated addition.'
    },
    {
      id: 'see-multiply',
      title: 'See & Multiply',
      icon: '🧩',
      description: 'Count bright groups to solve each picture puzzle.'
    },
    {
      id: 'flower-table',
      title: 'Flower Table',
      icon: '🌼',
      description: 'Grow petals by completing times-table sequences.'
    },
    {
      id: 'tile-challenge',
      title: 'Tile Challenge',
      icon: '🔢',
      description: 'Pick the right product tile before the timer runs out.'
    },
    {
      id: 'quiz',
      title: 'Quiz Quest',
      icon: '🏆',
      description: 'Ten mixed questions with coins and leaderboard points.'
    }
  ];

  const levelWorlds = [
    { name: 'Space Station', icon: '🚀', object: 'stars', fact: 'Astronauts use multiplication to count supplies for every crew member' },
    { name: 'Ocean Reef', icon: '🐠', object: 'coral branches', fact: 'Marine scientists multiply groups to estimate reef life quickly' },
    { name: 'Dinosaur Valley', icon: '🦕', object: 'fossil bones', fact: 'Paleontologists group fossils by layers to compare discoveries' },
    { name: 'Robot Lab', icon: '🤖', object: 'microchips', fact: 'Robots repeat instructions, just like multiplication repeats equal groups' },
    { name: 'Jungle Trek', icon: '🌴', object: 'bananas', fact: 'Rangers count animals in equal zones to protect habitats' },
    { name: 'Rainbow Farm', icon: '🌈', object: 'seed rows', fact: 'Farmers use arrays to plan rows, seeds, and harvest baskets' },
    { name: 'Castle Quest', icon: '🏰', object: 'castle bricks', fact: 'Builders multiply rows and columns to plan strong walls' },
    { name: 'Music Studio', icon: '🎵', object: 'beats', fact: 'Musicians count beats in repeated measures to keep rhythm' },
    { name: 'Sports Arena', icon: '🏀', object: 'training cones', fact: 'Coaches multiply drills, teams, and rounds to plan practice' },
    { name: 'Art Gallery', icon: '🎨', object: 'paint tiles', fact: 'Artists use grids to scale patterns without losing shape' },
    { name: 'Weather Tower', icon: '⛅', object: 'cloud sensors', fact: 'Meteorologists compare repeated readings to understand weather' },
    { name: 'Treasure Island', icon: '🏝️', object: 'gold shells', fact: 'Explorers group treasures to share and record findings fairly' },
    { name: 'Train Depot', icon: '🚂', object: 'train wheels', fact: 'Rail planners multiply cars and wheels to check safe travel' },
    { name: 'Garden Grove', icon: '🌻', object: 'flower petals', fact: 'Gardeners count petals, pots, and rows with multiplication arrays' },
    { name: 'Mountain Camp', icon: '⛰️', object: 'trail flags', fact: 'Hikers multiply distance markers to estimate the whole journey' },
    { name: 'Kitchen Lab', icon: '🧁', object: 'cupcakes', fact: 'Chefs multiply recipes when more friends come to eat' },
    { name: 'Safari School', icon: '🦁', object: 'animal tracks', fact: 'Wildlife guides count tracks in equal groups to follow herds' },
    { name: 'City Builder', icon: '🏙️', object: 'windows', fact: 'Architects multiply floors and rooms to design buildings' },
    { name: 'Library Planet', icon: '📚', object: 'book stacks', fact: 'Librarians multiply shelves and books to organize knowledge' },
    { name: 'Magic Forest', icon: '🪄', object: 'glowing mushrooms', fact: 'Patterns feel magical when repeated groups reveal the total' },
    { name: 'Science Fair', icon: '🔬', object: 'test tubes', fact: 'Scientists repeat trials and multiply samples for reliable results' },
    { name: 'Animal Clinic', icon: '🐾', object: 'paw prints', fact: 'Vets multiply doses carefully by groups and schedules' },
    { name: 'Coding Cave', icon: '💻', object: 'code blocks', fact: 'Programmers use loops to repeat actions like multiplication' },
    { name: 'Solar Garden', icon: '☀️', object: 'solar panels', fact: 'Engineers multiply panels and power to estimate clean energy' },
    { name: 'Bakery Street', icon: '🥐', object: 'pastry trays', fact: 'Bakers multiply trays by pieces to fill big orders' },
    { name: 'Puzzle Museum', icon: '🧠', object: 'puzzle pieces', fact: 'Puzzle solvers use factors to break big problems into parts' },
    { name: 'Firefly Park', icon: '✨', object: 'fireflies', fact: 'Naturalists count glowing insects in sample squares' },
    { name: 'Sky Harbor', icon: '🛩️', object: 'flight tickets', fact: 'Pilots and planners multiply seats, rows, and flights' }
  ];

  const levelMissions = [
    { title: 'Array Explorer', action: 'build equal rows', skill: 'array thinking', tip: 'Rows times columns gives the total items in an array.' },
    { title: 'Skip-Count Sprint', action: 'jump through skip counts', skill: 'skip counting', tip: 'Skip counting is multiplication said as a rhythm.' },
    { title: 'Factor Finder', action: 'spot factor pairs', skill: 'factor pairs', tip: 'Factors are numbers that multiply together to make a product.' },
    { title: 'Double Detective', action: 'use doubles', skill: 'doubling', tip: 'Doubling a known fact can reveal a harder fact.' },
    { title: 'Half-and-Double Hero', action: 'halve one side and double the other', skill: 'equivalent products', tip: 'Halving one factor and doubling the other can keep the product equal.' },
    { title: 'Product Pilot', action: 'land on the product', skill: 'product fluency', tip: 'The answer to a multiplication problem is called the product.' },
    { title: 'Commutative Captain', action: 'flip factor order', skill: 'commutative property', tip: 'Changing factor order does not change the product.' },
    { title: 'Repeated Addition Ranger', action: 'turn groups into addition', skill: 'repeated addition', tip: 'Multiplication is a shortcut for adding equal groups.' },
    { title: 'Word Problem Wizard', action: 'translate a story into factors', skill: 'modeling stories', tip: 'Find groups and items per group before multiplying.' },
    { title: 'Pattern Painter', action: 'continue number patterns', skill: 'pattern recognition', tip: 'Products often form patterns in their ones digits.' },
    { title: 'Missing Factor Mystery', action: 'discover the hidden factor', skill: 'inverse reasoning', tip: 'Division can help find a missing multiplication factor.' },
    { title: 'Square Number Safari', action: 'hunt square products', skill: 'square numbers', tip: 'A number times itself makes a square number.' },
    { title: 'Ten Trick Trail', action: 'use tens and place value', skill: 'place value', tip: 'Multiplying by 10 shifts a whole number one place left.' },
    { title: 'Nine Pattern Ninja', action: 'decode nines patterns', skill: 'nine facts', tip: 'The digits in many 9-times facts add up to 9.' },
    { title: 'Table Builder', action: 'complete a times table', skill: 'table fluency', tip: 'A times table is a map of related products.' },
    { title: 'Estimate Engineer', action: 'estimate before solving', skill: 'estimation', tip: 'A quick estimate helps you notice unreasonable answers.' },
    { title: 'Equal Groups Guardian', action: 'protect equal groups', skill: 'equal grouping', tip: 'Multiplication needs groups that are the same size.' },
    { title: 'Mental Math Maker', action: 'solve without paper', skill: 'mental strategies', tip: 'Break a factor into friendly parts to multiply mentally.' },
    { title: 'Speedy Recall Rally', action: 'recall facts quickly', skill: 'fact recall', tip: 'Short daily practice builds fast and confident recall.' },
    { title: 'Compare Products Coach', action: 'compare two products', skill: 'comparison', tip: 'Products grow when one factor grows and the other stays positive.' },
    { title: 'Distributive Diver', action: 'split a factor apart', skill: 'distributive property', tip: 'You can multiply parts separately, then add the products.' },
    { title: 'Zero-One Zone', action: 'master zero and one', skill: 'identity facts', tip: 'Any number times 1 stays itself; any number times 0 becomes 0.' },
    { title: 'Real-Life Planner', action: 'plan supplies with math', skill: 'real-world multiplication', tip: 'Multiplication helps plan fair shares and enough materials.' },
    { title: 'Fraction Bridge', action: 'connect products to fractions', skill: 'fraction readiness', tip: 'Knowing products helps later with common denominators.' },
    { title: 'Champion Challenge', action: 'mix every strategy', skill: 'strategy selection', tip: 'Strong mathematicians choose the best strategy for each problem.' }
  ];

  function createLevelCatalog() {
    const levels = [];
    levelWorlds.forEach((world, worldIndex) => {
      levelMissions.forEach((mission, missionIndex) => {
        const number = worldIndex * levelMissions.length + missionIndex + 1;
        const difficulty = Math.floor((number - 1) / 70) + 1;
        const table = 2 + ((number + worldIndex + missionIndex) % 19);
        const multiplierMin = 2 + Math.floor((difficulty - 1) / 2);
        const multiplierMax = 6 + difficulty + (missionIndex % 5) + Math.floor(worldIndex / 4);
        levels.push({
          id: `level-${String(number).padStart(3, '0')}`,
          number,
          title: `${world.name}: ${mission.title}`,
          icon: world.icon,
          world: world.name,
          object: world.object,
          mode: gameModes[(number - 1) % gameModes.length].id,
          table,
          difficulty,
          multiplierMin,
          multiplierMax,
          mission: `Level ${number}: ${mission.action} with ${world.object}.`,
          knowledgeTip: `${mission.tip} ${world.fact}.`,
          objective: `Master the ${table} times table while practicing ${mission.skill}.`,
          badge: `${world.icon} ${mission.skill}`
        });
      });
    });
    return levels;
  }

  const levelCatalog = createLevelCatalog();


  const runtime = {
    state: null,
    selectedMode: 'flashcards',
    selectedLevel: 1,
    currentQuestion: null,
    feedback: '',
    feedbackType: '',
    choices: []
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    if (!global.localStorage) {
      return clone(defaultState);
    }

    const stored = global.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const seeded = clone(defaultState);
      saveState(seeded);
      return seeded;
    }

    try {
      return mergeState(clone(defaultState), JSON.parse(stored));
    } catch (error) {
      console.warn('Saved data was reset because it could not be read.', error);
      const seeded = clone(defaultState);
      saveState(seeded);
      return seeded;
    }
  }

  function normalizeUser(user) {
    return {
      currentLevel: 1,
      unlockedLevel: 1,
      completedLevels: [],
      ...user,
      currentLevel: Number(user.currentLevel) || 1,
      unlockedLevel: Number(user.unlockedLevel) || 1,
      completedLevels: Array.isArray(user.completedLevels) ? user.completedLevels : []
    };
  }

  function mergeState(base, incoming) {
    const incomingUsers = Array.isArray(incoming.users) ? incoming.users.map(normalizeUser) : base.users;
    return {
      ...base,
      ...incoming,
      settings: { ...base.settings, ...(incoming.settings || {}) },
      sessions: { ...base.sessions, ...(incoming.sessions || {}) },
      ads: Array.isArray(incoming.ads) && incoming.ads.length ? incoming.ads : base.ads,
      users: incomingUsers,
      auditLog: Array.isArray(incoming.auditLog) ? incoming.auditLog : base.auditLog
    };
  }

  function saveState(state) {
    if (global.localStorage) {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function sanitize(input) {
    return String(input || '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[char]);
  }

  function getCurrentUser() {
    return runtime.state.users.find((user) => user.id === runtime.state.sessions.currentUserId) || null;
  }

  function registerPlayer(name, email, password) {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2) {
      return { ok: false, message: 'Player name must be at least 2 characters.' };
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return { ok: false, message: 'Enter a valid email address.' };
    }
    if (password.length < 6) {
      return { ok: false, message: 'Password must be at least 6 characters.' };
    }
    if (runtime.state.users.some((user) => user.email === cleanEmail)) {
      return { ok: false, message: 'That email is already registered.' };
    }

    const user = {
      id: uid('player'),
      name: cleanName,
      email: cleanEmail,
      password,
      coins: 0,
      score: 0,
      correct: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
      adViews: 0,
      currentLevel: 1,
      unlockedLevel: 1,
      completedLevels: [],
      createdAt: new Date().toISOString(),
      role: 'player'
    };
    runtime.state.users.push(user);
    runtime.state.sessions.currentUserId = user.id;
    logAudit(`Player registered: ${cleanEmail}`);
    persistAndRender();
    return { ok: true, message: `Welcome, ${cleanName}!` };
  }

  function loginPlayer(email, password) {
    const user = runtime.state.users.find((item) => item.email === email.trim().toLowerCase() && item.password === password);
    if (!user) {
      return { ok: false, message: 'Invalid player email or password.' };
    }
    runtime.state.sessions.currentUserId = user.id;
    persistAndRender();
    return { ok: true, message: `Welcome back, ${user.name}!` };
  }

  function loginAdmin(username, password) {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      runtime.state.sessions.adminAuthed = true;
      logAudit('Admin signed in.');
      persistAndRender();
      return { ok: true, message: 'Admin panel unlocked.' };
    }
    return { ok: false, message: 'Admin access denied.' };
  }

  function logout() {
    runtime.state.sessions.currentUserId = null;
    runtime.state.sessions.adminAuthed = false;
    persistAndRender();
  }

  function logAudit(message) {
    runtime.state.auditLog.unshift({ id: uid('log'), message, at: new Date().toISOString() });
    runtime.state.auditLog = runtime.state.auditLog.slice(0, 25);
  }

  function resolveLevel(levelNumber) {
    const number = Math.min(levelCatalog.length, Math.max(1, Number(levelNumber) || 1));
    return levelCatalog[number - 1];
  }

  function generateQuestion(mode, tables, levelNumber) {
    const level = resolveLevel(levelNumber);
    const activeTables = tables && tables.length ? tables : defaultState.settings.activeTables;
    const a = activeTables.includes(level.table) ? level.table : level.table;
    const range = Math.max(1, level.multiplierMax - level.multiplierMin + 1);
    const b = level.multiplierMin + Math.floor(Math.random() * range);
    const answer = a * b;
    const questionMode = mode || level.mode;
    const question = {
      mode: questionMode,
      level,
      a,
      b,
      answer,
      prompt: `${level.icon} Level ${level.number}: ${a} × ${b} = ?`,
      visual: `${level.mission} ${level.object} are arranged in ${b} equal groups of ${a}.`
    };

    if (questionMode === 'always-adding') {
      question.prompt = `${level.icon} ${level.title}: ${a} added ${b} times equals what?`;
      question.visual = Array.from({ length: Math.min(b, 8) }, () => a).join(' + ') + (b > 8 ? ' + …' : '');
    }
    if (questionMode === 'see-multiply') {
      question.prompt = `${level.icon} ${level.title}: There are ${b} groups with ${a} ${level.object}. How many?`;
      question.visual = Array.from({ length: Math.min(b, 8) }, () => '⭐'.repeat(Math.min(a, 8))).join('  ');
    }
    if (questionMode === 'flower-table') {
      question.prompt = `${level.icon} Complete the ${a} times-table for ${level.title}`;
      question.visual = '🌼 ' + Array.from({ length: Math.min(b, 10) }, (_, index) => a * (index + 1)).join(' • ');
    }
    if (questionMode === 'tile-challenge') {
      question.prompt = `${level.icon} Tap the tile for ${a} × ${b} in ${level.world}`;
    }
    if (questionMode === 'quiz') {
      question.prompt = `${level.icon} Quiz Quest Level ${level.number}: ${a} × ${b}`;
    }

    return question;
  }

  function buildChoices(answer) {
    const choices = new Set([answer]);
    while (choices.size < 4) {
      const offset = Math.floor(Math.random() * 25) - 12;
      const candidate = Math.max(1, answer + offset);
      choices.add(candidate);
    }
    return Array.from(choices).sort(() => Math.random() - 0.5);
  }

  function startQuestion(mode, levelNumber) {
    const user = getCurrentUser();
    const requestedLevel = Number(levelNumber || runtime.selectedLevel || (user && user.currentLevel) || 1);
    const maxUnlocked = user ? user.unlockedLevel : levelCatalog.length;
    const safeLevel = Math.min(Math.max(1, requestedLevel), maxUnlocked, levelCatalog.length);
    const level = resolveLevel(safeLevel);
    runtime.selectedLevel = safeLevel;
    runtime.selectedMode = mode || level.mode;
    if (user) user.currentLevel = safeLevel;
    runtime.currentQuestion = generateQuestion(runtime.selectedMode, runtime.state.settings.activeTables, safeLevel);
    runtime.choices = buildChoices(runtime.currentQuestion.answer);
    runtime.feedback = '';
    runtime.feedbackType = '';
    saveState(runtime.state);
    render();
  }

  function completeLevelForUser(user, levelNumber) {
    if (!user.completedLevels.includes(levelNumber)) {
      user.completedLevels.push(levelNumber);
      user.completedLevels.sort((a, b) => a - b);
    }
    if (levelNumber >= user.unlockedLevel && user.unlockedLevel < levelCatalog.length) {
      user.unlockedLevel = levelNumber + 1;
      user.currentLevel = user.unlockedLevel;
    }
  }

  function answerQuestion(value) {

    const user = getCurrentUser();
    if (!user || !runtime.currentQuestion) return;

    const guess = Number(value);
    user.attempts += 1;
    if (guess === runtime.currentQuestion.answer) {
      user.correct += 1;
      user.streak += 1;
      user.bestStreak = Math.max(user.bestStreak, user.streak);
      const bonus = user.streak % runtime.state.settings.bonusEveryStreak === 0 ? runtime.state.settings.adRewardCoins : 0;
      const earned = runtime.state.settings.coinsPerCorrect + bonus;
      user.coins += earned;
      user.score += 100 + earned;
      completeLevelForUser(user, runtime.currentQuestion.level.number);
      runtime.selectedLevel = user.currentLevel;
      runtime.feedback = `Correct! Level ${runtime.currentQuestion.level.number} complete. You earned ${earned} coins${bonus ? ' with a streak bonus' : ''}.`;
      runtime.feedbackType = 'success';
    } else {
      user.streak = 0;
      runtime.feedback = `Try again! The answer was ${runtime.currentQuestion.answer}.`;
      runtime.feedbackType = 'error';
    }
    saveState(runtime.state);
    render();
  }

  function rewardAdView() {
    const user = getCurrentUser();
    if (!user || !runtime.state.settings.adsEnabled) return;
    user.adViews += 1;
    user.coins += runtime.state.settings.adRewardCoins;
    user.score += 25;
    logAudit(`${user.email} watched a rewarded ad placeholder.`);
    persistAndRender();
  }

  function updateSettings(form) {
    const data = new FormData(form);
    runtime.state.settings.appTitle = data.get('appTitle').trim() || defaultState.settings.appTitle;
    runtime.state.settings.welcomeText = data.get('welcomeText').trim() || defaultState.settings.welcomeText;
    runtime.state.settings.announcement = data.get('announcement').trim();
    runtime.state.settings.coinsPerCorrect = Math.max(1, Number(data.get('coinsPerCorrect')) || 10);
    runtime.state.settings.adRewardCoins = Math.max(0, Number(data.get('adRewardCoins')) || 0);
    runtime.state.settings.adsEnabled = data.get('adsEnabled') === 'on';
    runtime.state.settings.maintenanceMode = data.get('maintenanceMode') === 'on';
    runtime.state.settings.activeTables = String(data.get('activeTables') || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0 && value <= 20);
    if (!runtime.state.settings.activeTables.length) runtime.state.settings.activeTables = clone(defaultState.settings.activeTables);
    runtime.state.ads[0] = {
      id: 'starter-banner',
      title: data.get('adTitle').trim() || 'Sponsor Space',
      copy: data.get('adCopy').trim() || 'Add your advertisement text here.',
      cta: data.get('adCta').trim() || 'Learn More'
    };
    logAudit('Admin updated game settings.');
    persistAndRender();
  }

  function resetPlayer(userId) {
    const user = runtime.state.users.find((item) => item.id === userId);
    if (!user) return;
    user.coins = 0;
    user.score = 0;
    user.correct = 0;
    user.attempts = 0;
    user.streak = 0;
    user.bestStreak = 0;
    user.currentLevel = 1;
    user.unlockedLevel = 1;
    user.completedLevels = [];
    logAudit(`Admin reset ${user.email}.`);
    persistAndRender();
  }

  function deletePlayer(userId) {
    const user = runtime.state.users.find((item) => item.id === userId);
    runtime.state.users = runtime.state.users.filter((item) => item.id !== userId);
    if (runtime.state.sessions.currentUserId === userId) runtime.state.sessions.currentUserId = null;
    logAudit(`Admin deleted ${user ? user.email : userId}.`);
    persistAndRender();
  }

  function persistAndRender() {
    saveState(runtime.state);
    render();
  }

  function statCard(label, value, icon) {
    return `<article class="stat-card"><span>${icon}</span><strong>${sanitize(value)}</strong><small>${sanitize(label)}</small></article>`;
  }

  function renderAuth() {
    return `
      <section class="auth-grid">
        <form class="panel" data-action="register">
          <p class="eyebrow">Player Registration</p>
          <h2>Create player account</h2>
          <label>Name<input name="name" required minlength="2" placeholder="Student name" /></label>
          <label>Email<input name="email" type="email" required placeholder="player@example.com" /></label>
          <label>Password<input name="password" type="password" required minlength="6" placeholder="6+ characters" /></label>
          <button type="submit">Register & Play</button>
          <p class="hint">Players can only access the learning game after signing in.</p>
        </form>
        <form class="panel" data-action="login">
          <p class="eyebrow">Player Login</p>
          <h2>Continue learning</h2>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" required /></label>
          <button type="submit">Login Player</button>
        </form>
        <form class="panel admin-card" data-action="admin-login">
          <p class="eyebrow">Owner Only</p>
          <h2>Admin access</h2>
          <label>Username<input name="username" required placeholder="owner" /></label>
          <label>Password<input name="password" type="password" required placeholder="Owner@12345" /></label>
          <button type="submit">Open Admin Panel</button>
          <p class="hint">Change these credentials before production deployment.</p>
        </form>
      </section>`;
  }

  function renderLevelOptions(user) {
    return levelCatalog.map((level) => {
      const locked = level.number > user.unlockedLevel;
      const completed = user.completedLevels.includes(level.number);
      const label = `${String(level.number).padStart(3, '0')} ${completed ? '✓' : locked ? '🔒' : '▶'} ${level.title} • ${level.object}`;
      return `<option value="${level.number}" ${level.number === user.currentLevel ? 'selected' : ''} ${locked ? 'disabled' : ''}>${sanitize(label)}</option>`;
    }).join('');
  }

  function renderLevelJourney(user) {
    const level = resolveLevel(user.currentLevel || 1);
    const progress = Math.round((user.completedLevels.length / levelCatalog.length) * 100);
    const nextLevel = user.unlockedLevel < levelCatalog.length ? user.unlockedLevel : levelCatalog.length;
    return `
      <section class="panel level-panel">
        <div class="level-summary">
          <p class="eyebrow">700 Level Journey</p>
          <h2>${level.icon} Level ${level.number}: ${sanitize(level.title)}</h2>
          <p>${sanitize(level.objective)}</p>
          <p class="knowledge-tip"><strong>Knowledge tip:</strong> ${sanitize(level.knowledgeTip)}</p>
          <div class="level-meta">
            <span>Difficulty ${level.difficulty}/10</span>
            <span>Table ×${level.table}</span>
            <span>${sanitize(level.badge)}</span>
          </div>
        </div>
        <div class="level-controls">
          <label>Choose unlocked level
            <select data-change="level-select">${renderLevelOptions(user)}</select>
          </label>
          <div class="progress-track"><span style="width: ${progress}%"></span></div>
          <small>${user.completedLevels.length} of ${levelCatalog.length} levels complete • next unlock: ${nextLevel}</small>
        </div>
      </section>`;
  }

  function renderGame(user) {
    const settings = runtime.state.settings;
    if (!runtime.currentQuestion) {
      runtime.currentQuestion = generateQuestion(runtime.selectedMode, settings.activeTables, user.currentLevel || runtime.selectedLevel);
      runtime.choices = buildChoices(runtime.currentQuestion.answer);
    }

    const accuracy = user.attempts ? Math.round((user.correct / user.attempts) * 100) : 0;
    return `
      <section class="dashboard">
        <div class="welcome panel">
          <p class="eyebrow">Hello ${sanitize(user.name)}</p>
          <h2>${sanitize(settings.announcement || 'Ready for a new challenge?')}</h2>
          <p>${sanitize(settings.welcomeText)}</p>
          <div class="stats-row">
            ${statCard('Coins', user.coins, '🪙')}
            ${statCard('Score', user.score, '⭐')}
            ${statCard('Accuracy', `${accuracy}%`, '🎯')}
            ${statCard('Best streak', user.bestStreak, '🔥')}
            ${statCard('Unlocked', `${user.unlockedLevel}/700`, '🗺️')}
          </div>
        </div>
        <aside class="panel ad-panel ${settings.adsEnabled ? '' : 'muted'}">
          <p class="eyebrow">Monetise Ads</p>
          <h3>${sanitize(runtime.state.ads[0].title)}</h3>
          <p>${sanitize(settings.adsEnabled ? runtime.state.ads[0].copy : 'Ads are currently disabled by admin.')}</p>
          <button data-click="reward-ad" ${settings.adsEnabled ? '' : 'disabled'}>${sanitize(runtime.state.ads[0].cta)} +${settings.adRewardCoins} coins</button>
          <small>Placeholder ready for AdMob / sponsor SDK integration.</small>
        </aside>
      </section>
      ${renderLevelJourney(user)}
      <section class="mode-grid">
        ${gameModes.map((mode) => `
          <button class="mode-card ${runtime.selectedMode === mode.id ? 'active' : ''}" data-mode="${mode.id}">
            <span>${mode.icon}</span><strong>${mode.title}</strong><small>${mode.description}</small>
          </button>`).join('')}
      </section>
      <section class="game-board panel">
        <div>
          <p class="eyebrow">${sanitize(gameModes.find((mode) => mode.id === runtime.selectedMode).title)}</p>
          <h2>${sanitize(runtime.currentQuestion.prompt)}</h2>
          ${runtime.currentQuestion.visual ? `<div class="visual-box">${sanitize(runtime.currentQuestion.visual)}</div>` : ''}
          <p class="knowledge-tip compact-tip"><strong>Mission:</strong> ${sanitize(runtime.currentQuestion.level.mission)} <strong>Tip:</strong> ${sanitize(runtime.currentQuestion.level.knowledgeTip)}</p>
        </div>
        <div class="choices">
          ${runtime.choices.map((choice) => `<button data-answer="${choice}">${choice}</button>`).join('')}
        </div>
        ${runtime.feedback ? `<p class="feedback ${runtime.feedbackType}">${sanitize(runtime.feedback)}</p>` : ''}
        <button class="secondary" data-click="next-question">Next Question</button>
      </section>`;
  }

  function renderAdmin() {
    const settings = runtime.state.settings;
    const totalCoins = runtime.state.users.reduce((sum, user) => sum + user.coins, 0);
    const totalAdViews = runtime.state.users.reduce((sum, user) => sum + user.adViews, 0);
    return `
      <section class="admin-layout">
        <form class="panel" data-action="settings">
          <p class="eyebrow">Admin Panel</p>
          <h2>Game, earning, and ad controls</h2>
          <label>App title<input name="appTitle" value="${sanitize(settings.appTitle)}" /></label>
          <label>Welcome text<textarea name="welcomeText">${sanitize(settings.welcomeText)}</textarea></label>
          <label>Announcement<textarea name="announcement">${sanitize(settings.announcement)}</textarea></label>
          <label>Active tables (comma separated)<input name="activeTables" value="${settings.activeTables.join(', ')}" /></label>
          <div class="two-col">
            <label>Coins per correct<input name="coinsPerCorrect" type="number" min="1" value="${settings.coinsPerCorrect}" /></label>
            <label>Rewarded ad coins<input name="adRewardCoins" type="number" min="0" value="${settings.adRewardCoins}" /></label>
          </div>
          <label>Ad title<input name="adTitle" value="${sanitize(runtime.state.ads[0].title)}" /></label>
          <label>Ad copy<textarea name="adCopy">${sanitize(runtime.state.ads[0].copy)}</textarea></label>
          <label>Ad button<input name="adCta" value="${sanitize(runtime.state.ads[0].cta)}" /></label>
          <div class="switches">
            <label><input name="adsEnabled" type="checkbox" ${settings.adsEnabled ? 'checked' : ''} /> Ads enabled</label>
            <label><input name="maintenanceMode" type="checkbox" ${settings.maintenanceMode ? 'checked' : ''} /> Maintenance mode</label>
          </div>
          <button type="submit">Save Admin Updates</button>
        </form>
        <div class="panel">
          <p class="eyebrow">Earnings Dashboard</p>
          <div class="stats-row compact">
            ${statCard('Players', runtime.state.users.length, '👥')}
            ${statCard('Coins issued', totalCoins, '🪙')}
            ${statCard('Ad views', totalAdViews, '📣')}
            ${statCard('Levels', levelCatalog.length, '🗺️')}
          </div>
          <h3>Player controls</h3>
          <div class="player-list">
            ${runtime.state.users.length ? runtime.state.users.map((user) => `
              <article>
                <strong>${sanitize(user.name)}</strong><small>${sanitize(user.email)}</small>
                <span>${user.score} score • ${user.coins} coins • ${user.adViews} ads • ${user.completedLevels.length}/${levelCatalog.length} levels</span>
                <div><button class="secondary" data-reset="${user.id}">Reset</button><button class="danger" data-delete="${user.id}">Delete</button></div>
              </article>`).join('') : '<p>No players registered yet.</p>'}
          </div>
          <h3>Audit log</h3>
          <ul class="audit-log">
            ${runtime.state.auditLog.map((log) => `<li><span>${new Date(log.at).toLocaleString()}</span>${sanitize(log.message)}</li>`).join('') || '<li>No admin activity yet.</li>'}
          </ul>
        </div>
      </section>`;
  }

  function render() {
    const app = global.document && global.document.getElementById('app');
    if (!app) return;

    const user = getCurrentUser();
    const adminAuthed = runtime.state.sessions.adminAuthed;
    const settings = runtime.state.settings;
    const body = settings.maintenanceMode && !adminAuthed
      ? `<section class="panel maintenance"><h2>Maintenance mode</h2><p>The owner is updating lessons. Please come back soon.</p></section>`
      : adminAuthed
        ? renderAdmin()
        : user
          ? renderGame(user)
          : renderAuth();

    app.innerHTML = `
      <header class="hero">
        <nav>
          <div class="brand"><span>✖️</span><strong>${sanitize(settings.appTitle)}</strong></div>
          <div class="nav-actions">
            ${user ? `<span class="pill">${sanitize(user.name)}</span>` : ''}
            ${adminAuthed ? '<span class="pill admin">Admin</span>' : ''}
            ${(user || adminAuthed) ? '<button class="ghost" data-click="logout">Logout</button>' : ''}
          </div>
        </nav>
        <div class="hero-copy">
          <p class="eyebrow">Original multiplication learning game</p>
          <h1>Play, practice, earn coins, and master times tables.</h1>
          <p>Includes protected player accounts, an owner admin panel, configurable rewards, ad placeholders, and multiple practice modes.</p>
        </div>
      </header>
      <main>${body}</main>
      <footer>Built as an original educational app inspired by common multiplication practice mechanics. Replace demo auth/storage with a secure backend before publishing.</footer>`;
  }

  function bindEvents() {
    global.document.addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-action]');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      let result = { ok: true, message: '' };
      if (form.dataset.action === 'register') result = registerPlayer(data.get('name'), data.get('email'), data.get('password'));
      if (form.dataset.action === 'login') result = loginPlayer(data.get('email'), data.get('password'));
      if (form.dataset.action === 'admin-login') result = loginAdmin(data.get('username'), data.get('password'));
      if (form.dataset.action === 'settings') updateSettings(form);
      if (result.message) notify(result.message, result.ok);
    });

    global.document.addEventListener('change', (event) => {
      const levelSelect = event.target.closest('[data-change="level-select"]');
      if (levelSelect) {
        startQuestion(null, levelSelect.value);
      }
    });

    global.document.addEventListener('click', (event) => {
      const answer = event.target.closest('[data-answer]');
      const mode = event.target.closest('[data-mode]');
      const click = event.target.closest('[data-click]');
      const reset = event.target.closest('[data-reset]');
      const remove = event.target.closest('[data-delete]');
      if (answer) answerQuestion(answer.dataset.answer);
      if (mode) startQuestion(mode.dataset.mode, runtime.selectedLevel);
      if (click && click.dataset.click === 'next-question') startQuestion(runtime.selectedMode);
      if (click && click.dataset.click === 'reward-ad') rewardAdView();
      if (click && click.dataset.click === 'logout') logout();
      if (reset) resetPlayer(reset.dataset.reset);
      if (remove && confirm('Delete this player account?')) deletePlayer(remove.dataset.delete);
    });
  }

  function notify(message, ok) {
    const toast = global.document.createElement('div');
    toast.className = `toast ${ok ? 'success' : 'error'}`;
    toast.textContent = message;
    global.document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  function init() {
    runtime.state = loadState();
    bindEvents();
    render();
  }

  const api = {
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    STORAGE_KEY,
    defaultState,
    gameModes,
    levelCatalog,
    resolveLevel,
    generateQuestion,
    buildChoices,
    mergeState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.MultiplyMasters = api;
    global.addEventListener('DOMContentLoaded', init);
  }
})(typeof window !== 'undefined' ? window : globalThis);
