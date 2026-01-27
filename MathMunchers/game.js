const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.getElementById("scoreValue");
const livesValue = document.getElementById("livesValue");
const levelValue = document.getElementById("levelValue");
const bestValue = document.getElementById("bestValue");
const ruleName = document.getElementById("ruleName");
const ruleDescription = document.getElementById("ruleDescription");
const modePill = document.getElementById("modePill");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const rerollButton = document.getElementById("rerollButton");
const modeSelect = document.getElementById("modeSelect");
const soundToggle = document.getElementById("soundToggle");
const motionToggle = document.getElementById("motionToggle");
const textToggle = document.getElementById("textToggle");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayBody = document.getElementById("overlayBody");
const overlayButton = document.getElementById("overlayButton");

const touchButtons = document.querySelectorAll(".touch-controls button");

const STORAGE_KEY = "number-crunchers-settings";
const BEST_KEY = "number-crunchers-best";

const SETTINGS_DEFAULT = {
  sound: true,
  reducedMotion: false,
  largeText: false,
  mode: "classic",
};

const MODES = {
  classic: { lives: 3, timeLimit: null, movesLimit: null },
  puzzle: { lives: null, timeLimit: null, movesLimit: 18 },
  challenge: { lives: 3, timeLimit: 60, movesLimit: null },
};

const COLOR = {
  background: "#0b1c2b",
  grid: "#14324d",
  tile: "#0e3d63",
  tileGood: "#1f7a4f",
  tileBad: "#6a1b2a",
  player: "#2ecc71",
  playerShadow: "#1a5c3a",
  enemyRandom: "#ff6b6b",
  enemyChaser: "#5f9dff",
  enemyGuard: "#9b5de5",
  text: "#f5f8ff",
  highlight: "#43d3ff",
};

const input = {
  dir: null,
  lastDir: null,
};

let game = null;
let audioContext = null;
let animationFrame = null;

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...SETTINGS_DEFAULT };
  try {
    return { ...SETTINGS_DEFAULT, ...JSON.parse(raw) };
  } catch (error) {
    return { ...SETTINGS_DEFAULT };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadBestScores() {
  const raw = localStorage.getItem(BEST_KEY);
  if (!raw) return { classic: 0, puzzle: 0, challenge: 0 };
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { classic: 0, puzzle: 0, challenge: 0 };
  }
}

function saveBestScores(best) {
  localStorage.setItem(BEST_KEY, JSON.stringify(best));
}

function hashSeed(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 1;
}

function mulberry32(seed) {
  let t = seed;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

function shuffle(rng, list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  const limit = Math.floor(Math.sqrt(n));
  for (let i = 3; i <= limit; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function sumDigits(n) {
  return Math.abs(n)
    .toString()
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
}

function getDifficulty(level) {
  if (level <= 3) {
    return { range: [1, 50], correctRatio: 0.35, gridSize: 7, speed: 1 };
  }
  if (level <= 7) {
    return { range: [1, 200], correctRatio: 0.2, gridSize: 8, speed: 1.2 };
  }
  return { range: [1, 10000], correctRatio: 0.1, gridSize: 9, speed: 1.4 };
}

function buildRuleFactories() {
  const factories = [];

  factories.push((rng) => {
    return {
      id: "even",
      name: "Even Numbers",
      description: "Crunch numbers divisible by 2 with no remainder.",
      predicate: (n) => n % 2 === 0,
      explain: (n) => `${n} is odd, so it is not divisible by 2.`,
    };
  });

  factories.push((rng) => {
    return {
      id: "odd",
      name: "Odd Numbers",
      description: "Crunch numbers that leave a remainder of 1 when divided by 2.",
      predicate: (n) => n % 2 === 1,
      explain: (n) => `${n} is even, so it does not leave a remainder.`,
    };
  });

  factories.push((rng, difficulty) => {
    const k = pickRandom(rng, [3, 4, 5, 6, 7, 8, 9, 10]);
    return {
      id: "multiples",
      name: `Multiples of ${k}`,
      description: `Crunch numbers that are ${k} times an integer.`,
      predicate: (n) => n % k === 0,
      explain: (n) => `${n} is not evenly divisible by ${k}.`,
      param: k,
    };
  });

  factories.push((rng, difficulty) => {
    const n = Math.floor(rng() * (difficulty.range[1] / 2)) + 12;
    return {
      id: "factors",
      name: `Factors of ${n}`,
      description: `Crunch numbers that divide ${n} evenly.`,
      predicate: (x) => n % x === 0,
      explain: (x) => `${x} does not divide ${n} evenly.`,
      param: n,
    };
  });

  factories.push(() => {
    return {
      id: "prime",
      name: "Prime Numbers",
      description: "Crunch numbers with exactly two factors: 1 and itself.",
      predicate: (n) => isPrime(n),
      explain: (n) => `${n} has more or fewer than two factors.`,
    };
  });

  factories.push(() => {
    return {
      id: "composite",
      name: "Composite Numbers",
      description: "Crunch numbers with more than two factors.",
      predicate: (n) => n > 1 && !isPrime(n),
      explain: (n) => `${n} is not composite.`,
    };
  });

  factories.push((rng, difficulty) => {
    const x = Math.floor(rng() * (difficulty.range[1] * 0.6)) + 3;
    return {
      id: "greater",
      name: `Greater than ${x}`,
      description: `Crunch numbers larger than ${x}.`,
      predicate: (n) => n > x,
      explain: (n) => `${n} is not greater than ${x}.`,
      param: x,
    };
  });

  factories.push((rng, difficulty) => {
    const a = Math.floor(rng() * (difficulty.range[1] * 0.4)) + 3;
    const b = a + Math.floor(rng() * (difficulty.range[1] * 0.4)) + 5;
    return {
      id: "between",
      name: `Between ${a} and ${b}`,
      description: `Crunch numbers strictly between ${a} and ${b}.`,
      predicate: (n) => n > a && n < b,
      explain: (n) => `${n} is not between ${a} and ${b}.`,
      param: { a, b },
    };
  });

  factories.push((rng) => {
    const d = Math.floor(rng() * 9) + 1;
    return {
      id: "ends",
      name: `Ends in ${d}`,
      description: `Crunch numbers whose last digit is ${d}.`,
      predicate: (n) => Math.abs(n) % 10 === d,
      explain: (n) => `${n} does not end with ${d}.`,
      param: d,
    };
  });

  factories.push((rng, difficulty) => {
    const s = Math.floor(rng() * 12) + 6;
    return {
      id: "digit-sum",
      name: `Digit Sum = ${s}`,
      description: `Crunch numbers with digits that add to ${s}.`,
      predicate: (n) => sumDigits(n) === s,
      explain: (n) => `The digits of ${n} do not add up to ${s}.`,
      param: s,
    };
  });

  factories.push((rng) => {
    const d = Math.floor(rng() * 9) + 1;
    return {
      id: "contains",
      name: `Contains ${d}`,
      description: `Crunch numbers that include the digit ${d}.`,
      predicate: (n) => Math.abs(n).toString().includes(String(d)),
      explain: (n) => `${n} does not include the digit ${d}.`,
      param: d,
    };
  });

  factories.push((rng, difficulty) => {
    return {
      id: "square",
      name: "Perfect Squares",
      description: "Crunch numbers that are the square of an integer.",
      predicate: (n) => Number.isInteger(Math.sqrt(n)),
      explain: (n) => `${n} is not a perfect square.`,
    };
  });

  factories.push(() => {
    return {
      id: "cube",
      name: "Perfect Cubes",
      description: "Crunch numbers that are the cube of an integer.",
      predicate: (n) => Number.isInteger(Math.cbrt(n)),
      explain: (n) => `${n} is not a perfect cube.`,
    };
  });

  factories.push((rng, difficulty) => {
    const max = difficulty.range[1];
    const factorials = [];
    let value = 1;
    let i = 1;
    while (value <= max) {
      factorials.push(value);
      i += 1;
      value *= i;
    }
    return {
      id: "factorial",
      name: "Factorials",
      description: "Crunch numbers that are 1!, 2!, 3!, and so on.",
      predicate: (n) => factorials.includes(n),
      explain: (n) => `${n} is not a factorial.`,
    };
  });

  // factories.push((rng, difficulty) => {
  //   const target = Math.floor(rng() * (difficulty.range[1] * 0.8)) + 5;
  //   return {
  //     id: "closest",
  //     name: `Closest to ${target}`,
  //     description: `Crunch the numbers with the smallest distance to ${target}.`,
  //     dynamic: true,
  //     target,
  //     computeCorrect: (numbers) => {
  //       let best = Infinity;
  //       numbers.forEach((n) => {
  //         best = Math.min(best, Math.abs(n - target));
  //       });
  //       return numbers.map((n) => Math.abs(n - target) === best);
  //     },
  //     explain: (n, best) => `${n} is not as close to ${target} as ${best}.`,
  //   };
  // });

  return factories;
}

const RULE_FACTORIES = buildRuleFactories();

function getRuleKey(rule) {
  if (rule.param === undefined) return rule.id;
  if (typeof rule.param === "object") {
    return `${rule.id}-${Object.values(rule.param).join("-")}`;
  }
  return `${rule.id}-${rule.param}`;
}

function pickRule(rng, difficulty, usedRules = new Set()) {
  const options = [...RULE_FACTORIES];
  shuffle(rng, options);

  for (const factory of options) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const rule = factory(rng, difficulty);
      const key = getRuleKey(rule);
      if (!usedRules.has(key)) {
        return rule;
      }
    }
  }

  // Fallback: return any rule if all are used
  return pickRandom(rng, options)(rng, difficulty);
}

function generateIncorrectNumber(rng, rule, range) {
  const [min, max] = range;
  for (let i = 0; i < 40; i += 1) {
    const candidate = Math.floor(rng() * (max - min + 1)) + min;
    if (!rule.predicate(candidate)) return candidate;
  }
  return min;
}

function generateNearMiss(rng, rule, range) {
  const [min, max] = range;
  if (rule.id === "multiples") {
    const base = Math.floor(rng() * (max / rule.param)) * rule.param;
    return clamp(base + (rng() < 0.5 ? 1 : -1), min, max);
  }
  if (rule.id === "factors") {
    return clamp(rule.param + (rng() < 0.5 ? 1 : -1), min, max);
  }
  if (rule.id === "ends") {
    const tens = Math.floor(rng() * (max / 10));
    const candidate = tens * 10 + ((rule.param + 1) % 10);
    return clamp(candidate, min, max);
  }
  return generateIncorrectNumber(rng, rule, range);
}

function buildGrid(rng, rule, difficulty) {
  const size = difficulty.gridSize;
  const total = size * size;
  const range = difficulty.range;

  let numbers = [];
  let correctMask = [];

  if (rule.dynamic) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      numbers = Array.from({ length: total }, () => {
        return Math.floor(rng() * (range[1] - range[0] + 1)) + range[0];
      });
      correctMask = rule.computeCorrect(numbers);
      const count = correctMask.filter(Boolean).length;
      if (count > 0 && count <= total * 0.3) break;
    }
  } else {
    const allCorrect = [];
    for (let n = range[0]; n <= range[1]; n += 1) {
      if (rule.predicate(n)) allCorrect.push(n);
    }
    if (allCorrect.length === 0) return null;

    const targetCount = Math.max(1, Math.round(total * difficulty.correctRatio));
    const countCorrect = Math.min(targetCount, allCorrect.length);

    shuffle(rng, allCorrect);
    const correctNumbers = allCorrect.slice(0, countCorrect);
    const tileTypes = Array.from({ length: total }, (_, i) => i < countCorrect);
    shuffle(rng, tileTypes);

    numbers = tileTypes.map((isCorrect) => {
      if (isCorrect) return correctNumbers.pop();
      if (rng() < 0.35) return generateNearMiss(rng, rule, range);
      return generateIncorrectNumber(rng, rule, range);
    });

    correctMask = numbers.map((n) => rule.predicate(n));
  }

  const tiles = numbers.map((value, index) => ({
    value,
    correct: correctMask[index],
    eaten: false,
    flash: 0,
  }));

  const correctCount = tiles.filter((tile) => tile.correct).length;
  if (correctCount === 0) return null;

  return { size, tiles, correctCount };
}

function createLevel(level, mode, usedRules = new Set()) {
  const difficulty = getDifficulty(level);
  const seed = hashSeed(`${mode}-${level}`);
  const rng = mulberry32(seed);

  let rule = null;
  let grid = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    rule = pickRule(rng, difficulty, usedRules);
    grid = buildGrid(rng, rule, difficulty);
    if (grid) break;
  }

  if (!grid) {
    rule = RULE_FACTORIES[0](rng, difficulty);
    grid = buildGrid(rng, rule, difficulty);
  }

  return { difficulty, rule, grid };
}

function createPlayer(gridSize) {
  const center = Math.floor(gridSize / 2);
  return { x: center, y: center };
}

function placeEnemies(grid, level, difficulty, player) {
  const enemies = [];
  const count = level < 4 ? 1 : level < 8 ? 2 : 3;
  const types = ["random", "chaser", "guard"];
  const forbidden = new Set([`${player.x},${player.y}`]);

  for (let i = 0; i < count; i += 1) {
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      x = Math.floor(Math.random() * grid.size);
      y = Math.floor(Math.random() * grid.size);
      const key = `${x},${y}`;
      if (forbidden.has(key)) continue;
      if (Math.abs(x - player.x) + Math.abs(y - player.y) <= 1) continue;
      forbidden.add(key);
      break;
    }
    const type = types[i % types.length];
    enemies.push({
      x,
      y,
      type,
      target: null,
    });
  }

  return { enemies, forbidden };
}

function getClosestNumbers(target, tiles) {
  let best = Infinity;
  tiles.forEach((tile) => {
    best = Math.min(best, Math.abs(tile.value - target));
  });
  return tiles
    .filter((tile) => Math.abs(tile.value - target) === best)
    .map((tile) => tile.value);
}

function getTileIndex(grid, x, y) {
  return y * grid.size + x;
}

function getTile(gameState, x, y) {
  return gameState.grid.tiles[getTileIndex(gameState.grid, x, y)];
}

function countRemainingCorrect(gameState) {
  return gameState.grid.tiles.filter((tile) => tile.correct && !tile.eaten).length;
}

function setOverlay(title, body, buttonText) {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlayButton.textContent = buttonText;
  overlay.classList.add("active");
}

function clearOverlay() {
  overlay.classList.remove("active");
}

function startLevel(level, mode, preserveScore = false) {
  const usedRules = preserveScore && game?.usedRules ? game.usedRules : new Set();
  const { difficulty, rule, grid } = createLevel(level, mode, usedRules);
  usedRules.add(getRuleKey(rule));

  const player = createPlayer(grid.size);
  const enemiesBundle =
    mode === "puzzle"
      ? { enemies: [], forbidden: new Set([`${player.x},${player.y}`]) }
      : placeEnemies(grid, level, difficulty, player);
  const settings = loadSettings();

  game = {
    mode,
    level,
    difficulty,
    rule,
    grid,
    player,
    enemies: enemiesBundle.enemies,
    score: preserveScore ? game.score : 0,
    streak: preserveScore ? game.streak : 0,
    usedRules,
    lives: MODES[mode].lives,
    attempts: 0,
    correct: 0,
    mistakes: {},
    status: "ready",
    lastMove: 0,
    lastEnemyMove: 0,
    invulnerableUntil: 0,
    moveDelay: 220 / difficulty.speed,
    enemyDelay: 300 / difficulty.speed,
    timeLeft: MODES[mode].timeLimit ? MODES[mode].timeLimit + level * 4 : null,
    movesLeft: MODES[mode].movesLimit
      ? MODES[mode].movesLimit + Math.max(0, grid.correctCount - 3)
      : null,
    message: null,
    messageUntil: 0,
    speedBoostedUntil: 0,
    effects: [],
    sound: settings.sound,
    reducedMotion: settings.reducedMotion,
  };

  updateHud();
  updateRuleBox();
  clearOverlay();
}

function rerollRule() {
  if (!game) return;
  const difficulty = game.difficulty;
  const rng = mulberry32(Date.now());
  let rule = null;
  let grid = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    rule = pickRule(rng, difficulty, game.usedRules);
    grid = buildGrid(rng, rule, difficulty);
    if (grid) break;
  }

  if (!grid) {
    rule = pickRule(rng, difficulty);
    grid = buildGrid(rng, rule, difficulty);
  }

  game.usedRules.add(getRuleKey(rule));

  const player = createPlayer(grid.size);
  const enemiesBundle =
    game.mode === "puzzle"
      ? { enemies: [], forbidden: new Set([`${player.x},${player.y}`]) }
      : placeEnemies(grid, game.level, difficulty, player);

  game.rule = rule;
  game.grid = grid;
  game.player = player;
  game.enemies = enemiesBundle.enemies;
  game.streak = 0;
  game.attempts = 0;
  game.correct = 0;
  game.mistakes = {};
  game.message = null;
  game.messageUntil = 0;
  game.effects = [];
  game.invulnerableUntil = 0;
  game.lastMove = 0;
  game.lastEnemyMove = 0;
  game.moveDelay = 220 / difficulty.speed;
  game.enemyDelay = 300 / difficulty.speed;
  game.timeLeft = MODES[game.mode].timeLimit ? MODES[game.mode].timeLimit + game.level * 4 : null;
  game.movesLeft = MODES[game.mode].movesLimit
    ? MODES[game.mode].movesLimit + Math.max(0, grid.correctCount - 3)
    : null;

  updateHud();
  updateRuleBox();
  clearOverlay();
}

function updateHud() {
  scoreValue.textContent = game.score;
  levelValue.textContent = game.level;
  modePill.textContent = game.mode.charAt(0).toUpperCase() + game.mode.slice(1);
  const bestScores = loadBestScores();
  bestValue.textContent = bestScores[game.mode] || 0;

  if (game.mode === "puzzle") {
    livesValue.textContent = `${game.movesLeft} moves`;
  } else {
    livesValue.textContent = `${game.lives} lives`;
  }
}

function updateRuleBox() {
  ruleName.textContent = game.rule.name;
  ruleDescription.textContent = game.rule.description;
}

function enqueueEffect(text, color) {
  game.effects.push({
    text,
    color,
    start: performance.now(),
  });
}

function playSound(type) {
  if (!game.sound) return;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sine";
  osc.frequency.value = type === "correct" ? 680 : type === "hit" ? 180 : 320;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

function recordMistake(message) {
  game.mistakes[message] = (game.mistakes[message] || 0) + 1;
}

function makeMove(dx, dy) {
  if (game.status !== "playing") return;
  const targetX = clamp(game.player.x + dx, 0, game.grid.size - 1);
  const targetY = clamp(game.player.y + dy, 0, game.grid.size - 1);
  if (targetX === game.player.x && targetY === game.player.y) return;

  game.player.x = targetX;
  game.player.y = targetY;
}

function attemptEat() {
  if (game.status !== "playing") return;
  const tile = getTile(game, game.player.x, game.player.y);
  if (!tile.eaten) {
    game.attempts += 1;
    if (tile.correct) {
      tile.eaten = true;
      let multiplier = 1 + Math.floor(game.streak / 3);
      if (game.mode === "challenge") multiplier += 1;
      game.streak += 1;
      game.correct += 1;
      game.score += 10 * multiplier;
      tile.flash = 1;
      game.message = `${tile.value} fits: ${game.rule.name}.`;
      game.messageUntil = performance.now() + 1400;
      enqueueEffect(`+${10 * multiplier}`, COLOR.highlight);
      playSound("correct");
    } else {
      game.streak = 0;
      game.score -= 15;
      tile.flash = -1;
      const reason = game.rule.dynamic
        ? `Closest numbers to ${game.rule.target} are ${getClosestNumbers(
            game.rule.target,
            game.grid.tiles
          )
            .slice(0, 3)
            .join(", ")}.`
        : game.rule.explain(tile.value);
      recordMistake(reason);
      game.message = reason;
      game.messageUntil = performance.now() + 1800;
      enqueueEffect("-15", COLOR.enemyRandom);
      playSound("wrong");
    }
  }

  if (game.mode === "puzzle") {
    game.movesLeft -= 1;
  }

  checkEndConditions();
  updateHud();
}

function checkEndConditions() {
  const remaining = countRemainingCorrect(game);
  if (remaining === 0) {
    levelComplete();
    return;
  }

  if (game.mode === "puzzle" && game.movesLeft <= 0) {
    gameOver("Out of moves!");
  }
}

function levelComplete() {
  game.status = "paused";
  const accuracy = game.attempts === 0 ? 0 : Math.round((game.correct / game.attempts) * 100);
  const commonMistake = getCommonMistake();
  let bonus = 0;

  if (game.mode === "challenge" && game.timeLeft) {
    bonus = Math.floor(game.timeLeft * 2);
    game.score += bonus;
  }

  updateBestScore();
  updateHud();

  const suggestion = accuracy > 85 ? "Try Challenge Mode for speed bonuses." : "Try Puzzle Mode to plan your routes.";

  setOverlay(
    "Level Complete!",
    `Accuracy: ${accuracy}%. ${
      commonMistake ? `Common mistake: ${commonMistake}` : "Great focus!"} ${
      bonus ? `Time bonus +${bonus}.` : ""
    } Next challenge: ${suggestion}`,
    "Next Level"
  );
}

function gameOver(reason) {
  game.status = "paused";
  updateBestScore();
  setOverlay("Game Over", reason, "Try Again");
}

function updateBestScore() {
  const best = loadBestScores();
  if (game.score > (best[game.mode] || 0)) {
    best[game.mode] = game.score;
    saveBestScores(best);
  }
}

function getCommonMistake() {
  const entries = Object.entries(game.mistakes);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function updateEnemies(delta, now) {
  if (game.mode === "puzzle") return;
  if (now - game.lastEnemyMove < game.enemyDelay) return;

  const accuracy = game.attempts ? game.correct / game.attempts : 1;
  const speedBoost = accuracy > 0.85 ? 0.85 : accuracy < 0.6 ? 1.2 : 1;
  if (accuracy > 0.85 && now > game.speedBoostedUntil) {
    game.speedBoostedUntil = now + 1500;
    enqueueEffect("Enemies speeding up!", COLOR.enemyGuard);
  }

  game.lastEnemyMove = now;
  game.enemyDelay = 300 / game.difficulty.speed * speedBoost;

  game.enemies.forEach((enemy) => {
    const move = chooseEnemyMove(enemy);
    enemy.x = clamp(enemy.x + move.dx, 0, game.grid.size - 1);
    enemy.y = clamp(enemy.y + move.dy, 0, game.grid.size - 1);
  });
}

function chooseEnemyMove(enemy) {
  if (enemy.type === "random") {
    return pickRandomDirection();
  }
  if (enemy.type === "chaser") {
    const dx = game.player.x - enemy.x;
    const dy = game.player.y - enemy.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      return { dx: Math.sign(dx), dy: 0 };
    }
    return { dx: 0, dy: Math.sign(dy) };
  }
  if (enemy.type === "guard") {
    if (!enemy.target || getTile(game, enemy.target.x, enemy.target.y).eaten) {
      const candidates = game.grid.tiles
        .map((tile, index) => ({ tile, index }))
        .filter((entry) => entry.tile.correct && !entry.tile.eaten);
      if (candidates.length) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        enemy.target = {
          x: pick.index % game.grid.size,
          y: Math.floor(pick.index / game.grid.size),
        };
      }
    }
    if (enemy.target) {
      const dx = enemy.target.x - enemy.x;
      const dy = enemy.target.y - enemy.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        return { dx: Math.sign(dx), dy: 0 };
      }
      return { dx: 0, dy: Math.sign(dy) };
    }
  }
  return pickRandomDirection();
}

function pickRandomDirection() {
  const options = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  return options[Math.floor(Math.random() * options.length)];
}

function checkEnemyCollisions(now) {
  if (game.mode === "puzzle") return;
  if (now < game.invulnerableUntil) return;

  const hit = game.enemies.some(
    (enemy) => enemy.x === game.player.x && enemy.y === game.player.y
  );

  if (hit) {
    game.invulnerableUntil = now + 2000;
    playSound("hit");
    enqueueEffect("Ouch!", COLOR.enemyRandom);

    if (!game.lives) game.lives = MODES[game.mode].lives;
    game.lives -= 1;
    if (game.lives <= 0) {
      gameOver("You got tagged!");
    }
  }
}

function updateTime(delta) {
  if (game.mode !== "challenge") return;
  if (game.timeLeft === null) return;

  game.timeLeft -= delta / 1000;
  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    gameOver("Time ran out!");
  }
}

function update(delta, now) {
  if (!game || game.status !== "playing") return;

  if (now - game.lastMove >= game.moveDelay && input.dir) {
    const direction = input.dir;
    input.dir = null;
    game.lastMove = now;
    makeMove(direction.dx, direction.dy);
  }

  updateEnemies(delta, now);
  checkEnemyCollisions(now);
  updateTime(delta);
}

function drawBoard() {
  const now = performance.now();
  ctx.fillStyle = COLOR.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = 30;
  const boardSize = Math.min(canvas.width, canvas.height) - padding * 2;
  const tileSize = boardSize / game.grid.size;
  const offsetX = (canvas.width - boardSize) / 2;
  const offsetY = (canvas.height - boardSize) / 2;

  ctx.strokeStyle = COLOR.grid;
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX - 8, offsetY - 8, boardSize + 16, boardSize + 16);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const largeText = document.body.classList.contains("large-text");
  ctx.font = `${Math.floor(tileSize * (largeText ? 0.42 : 0.35))}px Verdana`;

  for (let y = 0; y < game.grid.size; y += 1) {
    for (let x = 0; x < game.grid.size; x += 1) {
      const tile = getTile(game, x, y);
      const isPlayer = game.player.x === x && game.player.y === y;
      const isEnemy = game.enemies.some((enemy) => enemy.x === x && enemy.y === y);
      const left = offsetX + x * tileSize;
      const top = offsetY + y * tileSize;

      let fill = COLOR.tile;
      if (tile.eaten) fill = "#102636";
      if (tile.flash > 0) fill = COLOR.tileGood;
      if (tile.flash < 0) fill = COLOR.tileBad;

      ctx.fillStyle = fill;
      ctx.fillRect(left + 2, top + 2, tileSize - 4, tileSize - 4);

      ctx.fillStyle = tile.eaten ? "#324b63" : COLOR.text;
      ctx.fillText(tile.value, left + tileSize / 2, top + tileSize / 2);

      if (isEnemy) {
        drawEnemy(left, top, tileSize, game.enemies.find((e) => e.x === x && e.y === y), now);
      }
      if (isPlayer) {
        drawPlayer(left, top, tileSize, now);
      }
    }
  }

  drawHud(tileSize, offsetX, offsetY);
  drawEffects();
}

function drawPlayer(left, top, tileSize, now) {
  const centerX = left + tileSize / 2;
  const centerY = top + tileSize / 2;
  const bodyWidth = tileSize * 0.55;
  const bodyHeight = tileSize * 0.5;
  const isInvulnerable = now < game.invulnerableUntil;

  // Animated mouth opening (chomping)
  const mouthOpen = game.reducedMotion ? 0.3 : 0.15 + 0.15 * Math.abs(Math.sin(now * 0.008));

  if (isInvulnerable) ctx.globalAlpha = 0.65;

  // Shadow
  ctx.fillStyle = COLOR.playerShadow;
  ctx.beginPath();
  ctx.roundRect(centerX - bodyWidth / 2 + 3, centerY - bodyHeight / 2 + 3, bodyWidth, bodyHeight, 6);
  ctx.fill();

  // Robot body
  ctx.fillStyle = COLOR.player;
  ctx.beginPath();
  ctx.roundRect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight, 6);
  ctx.fill();

  // Antenna
  const antennaX = centerX;
  const antennaBaseY = centerY - bodyHeight / 2;
  ctx.strokeStyle = "#1a5c3a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(antennaX, antennaBaseY);
  ctx.lineTo(antennaX, antennaBaseY - 8);
  ctx.stroke();
  // LED tip
  ctx.fillStyle = "#ff4444";
  ctx.beginPath();
  ctx.arc(antennaX, antennaBaseY - 10, 3, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (white LEDs with dark pupils)
  const eyeY = centerY - bodyHeight * 0.12;
  const eyeSpacing = bodyWidth * 0.22;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX - eyeSpacing, eyeY, 5, 0, Math.PI * 2);
  ctx.arc(centerX + eyeSpacing, eyeY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.arc(centerX - eyeSpacing, eyeY, 2.5, 0, Math.PI * 2);
  ctx.arc(centerX + eyeSpacing, eyeY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Chomping mouth
  const mouthY = centerY + bodyHeight * 0.18;
  const mouthWidth = bodyWidth * 0.5;
  const mouthHeight = bodyHeight * mouthOpen;
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.roundRect(centerX - mouthWidth / 2, mouthY - mouthHeight / 2, mouthWidth, mouthHeight, 3);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawEnemy(left, top, tileSize, enemy, now) {
  const centerX = left + tileSize / 2;
  const centerY = top + tileSize / 2;
  const radius = tileSize * 0.27;
  const color =
    enemy.type === "random"
      ? COLOR.enemyRandom
      : enemy.type === "chaser"
      ? COLOR.enemyChaser
      : COLOR.enemyGuard;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  if (now < game.speedBoostedUntil) {
    ctx.strokeStyle = "#f8f4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = "#1b0f1a";
  ctx.beginPath();
  ctx.arc(centerX - 6, centerY - 4, 3, 0, Math.PI * 2);
  ctx.arc(centerX + 6, centerY - 4, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud(tileSize, offsetX, offsetY) {
  ctx.fillStyle = COLOR.text;
  ctx.font = "16px Verdana";
  ctx.textAlign = "left";
  ctx.fillText(`Rule: ${game.rule.name}`, offsetX, offsetY - 18);

  if (game.mode === "challenge") {
    ctx.textAlign = "right";
    ctx.fillStyle = COLOR.highlight;
    ctx.fillText(`Time: ${game.timeLeft.toFixed(0)}s`, offsetX + tileSize * game.grid.size, offsetY - 18);
  }

  if (game.message && performance.now() < game.messageUntil) {
    ctx.textAlign = "left";
    ctx.fillStyle = COLOR.highlight;
    ctx.fillText(game.message, offsetX, offsetY + tileSize * game.grid.size + 18);
  }
}

function drawEffects() {
  const now = performance.now();
  game.effects = game.effects.filter((effect) => now - effect.start < 900);

  game.effects.forEach((effect, index) => {
    const progress = clamp((now - effect.start) / 900, 0, 1);
    const yOffset = game.reducedMotion ? 0 : progress * -18;
    ctx.fillStyle = effect.color;
    ctx.font = "18px Verdana";
    ctx.textAlign = "center";
    ctx.fillText(effect.text, canvas.width / 2, 50 + yOffset + index * 16);
  });
}

function updateTileFlashes(delta) {
  game.grid.tiles.forEach((tile) => {
    if (tile.flash !== 0) {
      tile.flash *= 0.85;
      if (Math.abs(tile.flash) < 0.05) tile.flash = 0;
    }
  });
}

function render(now) {
  const delta = game ? now - (game.lastFrame || now) : 0;
  if (game) {
    game.lastFrame = now;
    update(delta, now);
    updateTileFlashes(delta);
    drawBoard();
  }
  animationFrame = requestAnimationFrame(render);
}

function handleKey(event) {
  const key = event.key.toLowerCase();
  const mapping = {
    arrowup: { dx: 0, dy: -1 },
    w: { dx: 0, dy: -1 },
    arrowdown: { dx: 0, dy: 1 },
    s: { dx: 0, dy: 1 },
    arrowleft: { dx: -1, dy: 0 },
    a: { dx: -1, dy: 0 },
    arrowright: { dx: 1, dy: 0 },
    d: { dx: 1, dy: 0 },
  };
  if (key === " " || key === "spacebar") {
    attemptEat();
    event.preventDefault();
    return;
  }
  if (mapping[key]) {
    input.dir = mapping[key];
    event.preventDefault();
  }
}

function initControls() {
  startButton.addEventListener("click", () => {
    if (!game) return;
    clearOverlay();
    game.status = "playing";
  });

  restartButton.addEventListener("click", () => {
    startLevel(game.level, game.mode);
    game.status = "playing";
  });

  rerollButton.addEventListener("click", () => {
    rerollRule();
    game.status = "playing";
  });

  modeSelect.addEventListener("change", (event) => {
    const mode = event.target.value;
    const settings = loadSettings();
    settings.mode = mode;
    saveSettings(settings);
    startLevel(1, mode);
    game.status = "playing";
  });

  overlayButton.addEventListener("click", () => {
    if (!game) return;
    if (overlayTitle.textContent === "Level Complete!") {
      startLevel(game.level + 1, game.mode, true);
      game.status = "playing";
    } else {
      startLevel(1, game.mode);
      game.status = "playing";
    }
  });

  soundToggle.addEventListener("change", (event) => {
    const settings = loadSettings();
    settings.sound = event.target.checked;
    saveSettings(settings);
    if (game) game.sound = settings.sound;
  });

  motionToggle.addEventListener("change", (event) => {
    const settings = loadSettings();
    settings.reducedMotion = event.target.checked;
    saveSettings(settings);
    if (game) game.reducedMotion = settings.reducedMotion;
    document.body.classList.toggle("reduced-motion", settings.reducedMotion);
  });

  textToggle.addEventListener("change", (event) => {
    const settings = loadSettings();
    settings.largeText = event.target.checked;
    saveSettings(settings);
    document.body.classList.toggle("large-text", settings.largeText);
  });

  touchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const dir = button.dataset.dir;
      const action = button.dataset.action;
      if (action === "eat") {
        attemptEat();
        return;
      }
      if (dir === "up") input.dir = { dx: 0, dy: -1 };
      if (dir === "down") input.dir = { dx: 0, dy: 1 };
      if (dir === "left") input.dir = { dx: -1, dy: 0 };
      if (dir === "right") input.dir = { dx: 1, dy: 0 };
    });
  });

  window.addEventListener("keydown", handleKey, { passive: false });
}

function resizeCanvas() {
  const width = canvas.clientWidth;
  const height = Math.min(850, Math.max(520, width * 0.8));
  canvas.width = Math.floor(width);
  canvas.height = Math.floor(height);
}

function init() {
  const settings = loadSettings();
  soundToggle.checked = settings.sound;
  motionToggle.checked = settings.reducedMotion;
  textToggle.checked = settings.largeText;
  modeSelect.value = settings.mode;
  document.body.classList.toggle("large-text", settings.largeText);
  document.body.classList.toggle("reduced-motion", settings.reducedMotion);

  initControls();
  startLevel(1, settings.mode);
  game.status = "paused";
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  animationFrame = requestAnimationFrame(render);
}

init();
