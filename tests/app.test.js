const assert = require('node:assert/strict');
const app = require('../src/app.js');

assert.equal(app.ADMIN_USERNAME, 'owner');
assert.equal(app.ADMIN_PASSWORD.length >= 10, true);
assert.equal(app.gameModes.length >= 6, true);
assert.equal(app.levelCatalog.length, 700);
assert.equal(new Set(app.levelCatalog.map((level) => level.id)).size, 700);
assert.equal(new Set(app.levelCatalog.map((level) => level.title)).size, 700);
assert.equal(new Set(app.levelCatalog.map((level) => level.mission)).size, 700);

for (const level of [app.levelCatalog[0], app.levelCatalog[99], app.levelCatalog[349], app.levelCatalog[699]]) {
  assert.equal(level.number >= 1 && level.number <= 700, true);
  assert.equal(level.knowledgeTip.length > 60, true);
  assert.equal(level.objective.includes(String(level.table)), true);

  const question = app.generateQuestion(level.mode, [2], level.number);
  assert.equal(question.level.number, level.number);
  assert.equal(question.a, level.table);
  assert.equal(question.answer, question.a * question.b);
  assert.equal(question.b >= level.multiplierMin, true);
  assert.equal(question.b <= level.multiplierMax, true);
  assert.equal(typeof question.prompt, 'string');
  assert.equal(question.prompt.length > 0, true);

  const choices = app.buildChoices(question.answer);
  assert.equal(choices.length, 4);
  assert.equal(choices.includes(question.answer), true);
}

for (const mode of app.gameModes) {
  const question = app.generateQuestion(mode.id, [2], 1);
  assert.equal(question.answer, question.a * question.b);
  assert.equal(typeof question.prompt, 'string');
  assert.equal(question.prompt.length > 0, true);
}

const merged = app.mergeState(app.defaultState, {
  settings: { appTitle: 'Custom', coinsPerCorrect: 12 },
  sessions: { adminAuthed: true },
  users: [{ id: 'u1' }]
});

assert.equal(merged.settings.appTitle, 'Custom');
assert.equal(merged.settings.coinsPerCorrect, 12);
assert.equal(merged.sessions.adminAuthed, true);
assert.equal(merged.users.length, 1);
assert.equal(merged.users[0].currentLevel, 1);
assert.equal(merged.users[0].unlockedLevel, 1);
assert.equal(Array.isArray(merged.users[0].completedLevels), true);
assert.equal(Array.isArray(merged.ads), true);

console.log('All app tests passed.');
