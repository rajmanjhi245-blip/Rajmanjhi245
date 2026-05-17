const palettes = [
  ['#87ceeb', '#2f80ed', '#2e7d32', '#f2c94c', '#8d6e63', '#ffffff'],
  ['#f6d365', '#fda085', '#6a0572', '#ab83a1', '#3b1f2b', '#fff4e6'],
  ['#b8e1ff', '#48cae4', '#0077b6', '#023e8a', '#ffd166', '#06d6a0'],
  ['#ffe5ec', '#ff8fab', '#fb6f92', '#bde0fe', '#a2d2ff', '#5a189a'],
  ['#d8f3dc', '#95d5b2', '#52b788', '#2d6a4f', '#fefae0', '#bc6c25'],
  ['#f8f9fa', '#ced4da', '#6c757d', '#343a40', '#f77f00', '#d62828'],
  ['#fff3b0', '#e09f3e', '#9e2a2b', '#540b0e', '#335c67', '#eae2b7'],
  ['#caf0f8', '#90e0ef', '#00b4d8', '#0077b6', '#03045e', '#ffd60a']
];

const descriptors = ['Golden', 'Crystal', 'Velvet', 'Sunny', 'Moonlit', 'Emerald', 'Sapphire', 'Peaceful', 'Radiant', 'Dreamy', 'Royal', 'Hidden', 'Happy', 'Mystic', 'Cozy', 'Brilliant', 'Gentle', 'Festival'];
const subjects = ['Valley', 'Tiger', 'Harbor', 'Garden', 'Castle', 'Forest', 'Village', 'Peacock', 'Temple', 'Waterfall', 'Market', 'Elephant', 'Lagoon', 'Bouquet', 'Desert', 'Island', 'Panda', 'Lighthouse'];
const categories = ['Nature', 'Animals', 'Travel', 'Fantasy', 'Flowers', 'Ocean', 'City', 'Food', 'Festival', 'Mandala'];
const difficulties = ['Easy', 'Medium', 'Hard', 'Expert'];

function palette(index) {
  return palettes[index % palettes.length];
}

function label(x, y, number) {
  return `<text x="${x}" y="${y}">${number}</text>`;
}

function svgWrap(title, body) {
  return `<svg viewBox="0 0 320 320" role="img" aria-label="${title} color by number">${body}</svg>`;
}

function landscape(level, title) {
  const sunX = 58 + (level * 37) % 205;
  const ridge = 74 + (level * 11) % 32;
  const treeX = 38 + (level * 17) % 228;
  return svgWrap(title, [
    `<rect class="paint-region" data-region="r${level}_sky" data-color="1" x="14" y="18" width="292" height="136" rx="20"/>`,
    `<circle class="paint-region" data-region="r${level}_sun" data-color="4" cx="${sunX}" cy="58" r="24"/>`,
    `<path class="paint-region" data-region="r${level}_mountain_a" data-color="5" d="M28 166 ${92 + level % 38} ${ridge} ${168 + level % 18} 166Z"/>`,
    `<path class="paint-region" data-region="r${level}_mountain_b" data-color="2" d="M124 166 ${224 - level % 28} ${56 + level % 40} 296 166Z"/>`,
    `<path class="paint-region" data-region="r${level}_meadow" data-color="3" d="M14 154c70 22 173 22 292 0v64H14z"/>`,
    `<path class="paint-region" data-region="r${level}_water" data-color="2" d="M14 214h292v82H14z"/>`,
    `<path class="paint-region" data-region="r${level}_tree" data-color="3" d="M${treeX} 208l20-58 22 58z"/>`,
    label(96, 56, 1), label(218, 132, 2), label(160, 192, 3), label(sunX, 58, 4), label(105, 138, 5)
  ].join(''));
}

function animal(level, title) {
  const ear = 54 + (level % 16);
  const tail = 224 + (level % 34);
  return svgWrap(title, [
    `<ellipse class="paint-region" data-region="r${level}_body" data-color="1" cx="160" cy="178" rx="78" ry="70"/>`,
    `<circle class="paint-region" data-region="r${level}_head" data-color="1" cx="160" cy="100" r="52"/>`,
    `<path class="paint-region" data-region="r${level}_ear_l" data-color="2" d="M118 76 96 ${ear} 112 114Z"/>`,
    `<path class="paint-region" data-region="r${level}_ear_r" data-color="2" d="M202 76 224 ${ear} 208 114Z"/>`,
    `<circle class="paint-region" data-region="r${level}_eye_l" data-color="4" cx="140" cy="96" r="10"/>`,
    `<circle class="paint-region" data-region="r${level}_eye_r" data-color="4" cx="180" cy="96" r="10"/>`,
    `<ellipse class="paint-region" data-region="r${level}_belly" data-color="6" cx="160" cy="190" rx="42" ry="48"/>`,
    `<path class="paint-region" data-region="r${level}_tail" data-color="3" d="M226 170c${tail - 210} 8 36 40 6 62-18 13-38-8-24-24"/>`,
    label(160, 105, 1), label(108, 78, 2), label(242, 206, 3), label(140, 96, 4), label(160, 190, 6)
  ].join(''));
}

function city(level, title) {
  const tower = 64 + (level % 48);
  const roof = 48 + (level % 26);
  return svgWrap(title, [
    `<rect class="paint-region" data-region="r${level}_sky" data-color="1" x="12" y="18" width="296" height="132" rx="18"/>`,
    `<rect class="paint-region" data-region="r${level}_tower_a" data-color="2" x="38" y="${tower}" width="48" height="172"/>`,
    `<rect class="paint-region" data-region="r${level}_tower_b" data-color="3" x="104" y="88" width="62" height="148"/>`,
    `<path class="paint-region" data-region="r${level}_roof" data-color="4" d="M198 236V${roof}l42-34 42 34v184z"/>`,
    `<rect class="paint-region" data-region="r${level}_street" data-color="5" x="12" y="236" width="296" height="62"/>`,
    `<circle class="paint-region" data-region="r${level}_moon" data-color="6" cx="262" cy="58" r="22"/>`,
    `<rect class="paint-region" data-region="r${level}_window_a" data-color="6" x="52" y="122" width="18" height="28"/>`,
    `<rect class="paint-region" data-region="r${level}_window_b" data-color="6" x="126" y="128" width="22" height="26"/>`,
    label(78, 54, 1), label(62, 190, 2), label(136, 190, 3), label(240, 156, 4), label(160, 268, 5), label(262, 58, 6)
  ].join(''));
}

function ocean(level, title) {
  const boatX = 64 + (level * 19) % 142;
  const fishY = 210 + (level % 42);
  return svgWrap(title, [
    `<rect class="paint-region" data-region="r${level}_horizon" data-color="1" x="14" y="20" width="292" height="126" rx="20"/>`,
    `<path class="paint-region" data-region="r${level}_sea" data-color="2" d="M14 144h292v154H14z"/>`,
    `<path class="paint-region" data-region="r${level}_wave" data-color="3" d="M20 190c46-26 78 26 124 0s82-20 154 8v48H20z"/>`,
    `<path class="paint-region" data-region="r${level}_boat" data-color="5" d="M${boatX} 166h118l-18 34H${boatX + 16}z"/>`,
    `<path class="paint-region" data-region="r${level}_sail" data-color="6" d="M${boatX + 58} 164V78l62 86z"/>`,
    `<path class="paint-region" data-region="r${level}_fish" data-color="4" d="M110 ${fishY}c28-22 58-22 86 0-28 22-58 22-86 0Zm-8 0-26-18v36z"/>`,
    label(74, 58, 1), label(248, 244, 2), label(150, 218, 3), label(150, fishY, 4), label(boatX + 54, 186, 5), label(boatX + 82, 126, 6)
  ].join(''));
}

function flower(level, title) {
  const cx = 116 + (level * 13) % 92;
  const cy = 116 + (level * 7) % 34;
  return svgWrap(title, [
    `<rect class="paint-region" data-region="r${level}_background" data-color="6" x="18" y="18" width="284" height="284" rx="28"/>`,
    `<path class="paint-region" data-region="r${level}_stem" data-color="3" d="M160 288c-14-70 0-122 0-166 14 48 16 98 0 166Z"/>`,
    `<ellipse class="paint-region" data-region="r${level}_petal_a" data-color="1" cx="${cx}" cy="${cy}" rx="34" ry="54" transform="rotate(-42 ${cx} ${cy})"/>`,
    `<ellipse class="paint-region" data-region="r${level}_petal_b" data-color="2" cx="${cx + 76}" cy="${cy}" rx="34" ry="54" transform="rotate(42 ${cx + 76} ${cy})"/>`,
    `<ellipse class="paint-region" data-region="r${level}_petal_c" data-color="4" cx="160" cy="${cy - 36}" rx="34" ry="54"/>`,
    `<ellipse class="paint-region" data-region="r${level}_petal_d" data-color="5" cx="160" cy="${cy + 48}" rx="34" ry="54"/>`,
    `<circle class="paint-region" data-region="r${level}_center" data-color="4" cx="160" cy="${cy + 8}" r="28"/>`,
    label(cx, cy, 1), label(cx + 76, cy, 2), label(160, 230, 3), label(160, cy + 8, 4), label(160, cy + 58, 5), label(58, 52, 6)
  ].join(''));
}

function mandala(level, title) {
  const petals = 8 + (level % 5);
  const petalShapes = Array.from({ length: petals }, (_, i) => {
    const angle = Math.round((360 / petals) * i);
    const color = (i % 5) + 1;
    return `<ellipse class="paint-region" data-region="r${level}_petal_${i}" data-color="${color}" cx="160" cy="72" rx="24" ry="50" transform="rotate(${angle} 160 160)"/>`;
  }).join('');
  return svgWrap(title, [
    `<circle class="paint-region" data-region="r${level}_outer" data-color="6" cx="160" cy="160" r="140"/>`,
    petalShapes,
    `<circle class="paint-region" data-region="r${level}_ring" data-color="2" cx="160" cy="160" r="72"/>`,
    `<circle class="paint-region" data-region="r${level}_core" data-color="4" cx="160" cy="160" r="38"/>`,
    label(160, 42, 6), label(160, 78, 1), label(214, 160, 2), label(160, 160, 4), label(106, 160, 5)
  ].join(''));
}

function food(level, title) {
  const toppingX = 86 + (level * 23) % 148;
  return svgWrap(title, [
    `<circle class="paint-region" data-region="r${level}_plate" data-color="6" cx="160" cy="172" r="126"/>`,
    `<circle class="paint-region" data-region="r${level}_base" data-color="1" cx="160" cy="172" r="92"/>`,
    `<path class="paint-region" data-region="r${level}_slice" data-color="2" d="M160 172 246 136c16 40-2 84-38 108z"/>`,
    `<circle class="paint-region" data-region="r${level}_top_a" data-color="4" cx="${toppingX}" cy="132" r="14"/>`,
    `<circle class="paint-region" data-region="r${level}_top_b" data-color="5" cx="210" cy="196" r="16"/>`,
    `<path class="paint-region" data-region="r${level}_leaf" data-color="3" d="M92 222c28-42 66-24 78 20-36 12-62 6-78-20z"/>`,
    label(160, 96, 1), label(214, 176, 2), label(128, 230, 3), label(toppingX, 132, 4), label(210, 196, 5), label(62, 72, 6)
  ].join(''));
}

function fantasy(level, title) {
  const towerX = 64 + (level % 50);
  return svgWrap(title, [
    `<rect class="paint-region" data-region="r${level}_sky" data-color="1" x="16" y="18" width="288" height="282" rx="26"/>`,
    `<path class="paint-region" data-region="r${level}_hill" data-color="3" d="M16 224c78-42 186-42 288 0v76H16z"/>`,
    `<rect class="paint-region" data-region="r${level}_keep" data-color="2" x="112" y="112" width="96" height="118"/>`,
    `<path class="paint-region" data-region="r${level}_roof" data-color="4" d="M96 112 160 54l64 58z"/>`,
    `<rect class="paint-region" data-region="r${level}_tower_l" data-color="5" x="${towerX}" y="128" width="42" height="104"/>`,
    `<rect class="paint-region" data-region="r${level}_tower_r" data-color="5" x="224" y="128" width="42" height="104"/>`,
    `<path class="paint-region" data-region="r${level}_door" data-color="6" d="M144 230v-46c0-22 32-22 32 0v46z"/>`,
    label(72, 60, 1), label(160, 156, 2), label(166, 260, 3), label(160, 94, 4), label(towerX + 20, 178, 5), label(160, 210, 6)
  ].join(''));
}

const templateFns = [landscape, animal, city, ocean, flower, mandala, food, fantasy];

export function createColoringLevels(count = 540) {
  return Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    const descriptor = descriptors[index % descriptors.length];
    const subject = subjects[(index * 7) % subjects.length];
    const category = categories[index % categories.length];
    const difficulty = difficulties[Math.floor(index / 45) % difficulties.length];
    const title = `Level ${String(level).padStart(3, '0')} ${descriptor} ${subject}`;
    return {
      id: `level-${String(level).padStart(3, '0')}-${descriptor.toLowerCase()}-${subject.toLowerCase()}`,
      title,
      category,
      difficulty,
      description: `${difficulty} ${category.toLowerCase()} coloring challenge with original numbered regions and an attractive ${descriptor.toLowerCase()} ${subject.toLowerCase()} theme.`,
      palette: palette(index),
      svg: templateFns[index % templateFns.length](level, title)
    };
  });
}
