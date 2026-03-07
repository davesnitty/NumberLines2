(() => {
  const STORAGE_KEY = "make_a_zoo_state_v1";
  const MAX_ANIMALS = 50;
  const MAX_FOOD = 40;
  const STARTING_FOOD = 16;
  const FOOD_ADD_BATCH = 5;
  const HUD_UPDATE_INTERVAL = 0.25;
  const AVAILABLE_BEHAVIORS = ["wander", "idle", "eat", "sleep", "social"];

  const speciesCatalog = [
    {
      id: "bluejay",
      name: "Bluejay",
      image: "animals/bluejay.png",
      trait: "Quick and noisy",
      movementProfile: "air",
      size: 84,
      baseSpeed: 62,
      behaviorWeights: { wander: 0.52, idle: 0.1, eat: 0.08, sleep: 0.06, social: 0.24 },
    },
    {
      id: "elephant",
      name: "Elephant",
      image: "animals/elephant.png",
      trait: "Calm and steady",
      size: 92,
      baseSpeed: 28,
      behaviorWeights: { wander: 0.5, idle: 0.2, eat: 0.16, sleep: 0.09, social: 0.05 },
    },
    {
      id: "giraffe",
      name: "Giraffe",
      image: "animals/giraffe.png",
      trait: "Curious lookouts",
      size: 90,
      baseSpeed: 34,
      behaviorWeights: { wander: 0.5, idle: 0.17, eat: 0.15, sleep: 0.08, social: 0.1 },
    },
    {
      id: "hawk",
      name: "Hawk",
      image: "animals/hawk.png",
      trait: "Sharp-eyed glider",
      movementProfile: "air",
      size: 86,
      baseSpeed: 66,
      behaviorWeights: { wander: 0.56, idle: 0.08, eat: 0.08, sleep: 0.06, social: 0.22 },
    },
    {
      id: "lion",
      name: "Lion",
      image: "animals/lion.png",
      trait: "Proud prowler",
      size: 88,
      baseSpeed: 46,
      behaviorWeights: { wander: 0.54, idle: 0.19, eat: 0.1, sleep: 0.1, social: 0.07 },
    },
    {
      id: "monkey",
      name: "Monkey",
      image: "animals/monkey.png",
      trait: "Playful and social",
      size: 80,
      baseSpeed: 58,
      behaviorWeights: { wander: 0.46, idle: 0.1, eat: 0.1, sleep: 0.06, social: 0.28 },
    },
    {
      id: "panda",
      name: "Panda",
      image: "animals/panda.png",
      trait: "Relaxed snacker",
      size: 88,
      baseSpeed: 26,
      behaviorWeights: { wander: 0.38, idle: 0.21, eat: 0.24, sleep: 0.11, social: 0.06 },
    },
    {
      id: "parrot",
      name: "Parrot",
      image: "animals/parrot.png",
      trait: "Chatty flock flyer",
      movementProfile: "air",
      size: 82,
      baseSpeed: 64,
      behaviorWeights: { wander: 0.5, idle: 0.09, eat: 0.1, sleep: 0.06, social: 0.25 },
    },
    {
      id: "tiger",
      name: "Tiger",
      image: "animals/tiger.png",
      trait: "Fast and focused",
      size: 86,
      baseSpeed: 54,
      behaviorWeights: { wander: 0.56, idle: 0.13, eat: 0.11, sleep: 0.12, social: 0.08 },
    },
    {
      id: "zebra",
      name: "Zebra",
      image: "animals/zebra.png",
      trait: "Energetic herd runner",
      size: 86,
      baseSpeed: 49,
      behaviorWeights: { wander: 0.56, idle: 0.11, eat: 0.1, sleep: 0.08, social: 0.15 },
    },
  ];

  const speciesById = new Map(speciesCatalog.map((spec) => [spec.id, spec]));

  const ui = {
    animalList: document.getElementById("animalList"),
    zooField: document.getElementById("zooField"),
    totalCount: document.getElementById("totalCount"),
    speciesCount: document.getElementById("speciesCount"),
    foodCount: document.getElementById("foodCount"),
    addFoodBtn: document.getElementById("addFoodBtn"),
    pauseBtn: document.getElementById("pauseBtn"),
    resetBtn: document.getElementById("resetBtn"),
    speedControl: document.getElementById("speedControl"),
    behaviorToggles: document.getElementById("behaviorToggles"),
    foodLayer: document.getElementById("foodLayer"),
    toast: document.getElementById("toast"),
    infoBubble: document.getElementById("infoBubble"),
  };

  const zoo = {
    animals: [],
    foods: [],
    paused: false,
    nextId: 1,
    nextFoodId: 1,
    speedMultiplier: 1,
    enabledBehaviors: new Set(["wander"]),
    lastHudUpdate: 0,
    lastTimeMs: performance.now(),
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomInRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function toTitleCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function pickWeightedState(weights, enabledBehaviors) {
    const filtered = [];
    let total = 0;

    for (const behavior of enabledBehaviors) {
      const weight = Number(weights[behavior] || 0);
      if (weight > 0) {
        filtered.push([behavior, weight]);
        total += weight;
      }
    }

    if (!filtered.length || total <= 0) {
      return "wander";
    }

    let roll = Math.random() * total;
    for (const [state, weight] of filtered) {
      roll -= weight;
      if (roll <= 0) {
        return state;
      }
    }

    return filtered[0][0];
  }

  function randomStateDuration(state) {
    switch (state) {
      case "wander":
        return randomInRange(2, 6);
      case "idle":
        return randomInRange(1, 3);
      case "eat":
        return randomInRange(2, 4);
      case "sleep":
        return randomInRange(3, 6);
      case "social":
        return randomInRange(1.5, 3.5);
      default:
        return randomInRange(1, 3);
    }
  }

  function showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add("visible");
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => {
      ui.toast.classList.remove("visible");
    }, 1400);
  }

  function updateHud() {
    ui.totalCount.textContent = String(zoo.animals.length);
    const uniqueSpecies = new Set(zoo.animals.map((animal) => animal.speciesId));
    ui.speciesCount.textContent = String(uniqueSpecies.size);
    ui.foodCount.textContent = String(zoo.foods.length);
  }

  function renderSidebar() {
    const fragment = document.createDocumentFragment();

    speciesCatalog.forEach((spec) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "animal-card";
      card.setAttribute("role", "listitem");
      card.setAttribute("aria-label", `Add ${spec.name}`);
      card.innerHTML = `
        <img class="animal-thumb" src="${spec.image}" alt="${spec.name}" />
        <div>
          <div class="animal-name">${spec.name}</div>
          <div class="animal-trait">${spec.trait}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        spawnAnimal(spec.id);
      });

      fragment.appendChild(card);
    });

    ui.animalList.appendChild(fragment);
  }

  function renderBehaviorToggles() {
    const fragment = document.createDocumentFragment();

    AVAILABLE_BEHAVIORS.forEach((behavior) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "behavior-toggle";
      btn.dataset.behavior = behavior;
      btn.textContent = toTitleCase(behavior);
      btn.setAttribute("aria-pressed", "true");

      btn.addEventListener("click", () => {
        zoo.enabledBehaviors = new Set([behavior]);
        syncBehaviorToggleButtons();
        saveZooState();
      });

      fragment.appendChild(btn);
    });

    ui.behaviorToggles.replaceChildren(fragment);
    syncBehaviorToggleButtons();
  }

  function syncBehaviorToggleButtons() {
    const buttons = ui.behaviorToggles.querySelectorAll(".behavior-toggle");
    buttons.forEach((btn) => {
      const behavior = btn.dataset.behavior;
      const active = zoo.enabledBehaviors.has(behavior);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function createAnimalElement(animal) {
    const wrapper = document.createElement("button");
    wrapper.type = "button";
    wrapper.className = "animal";
    wrapper.setAttribute("aria-label", `${animal.species.name} in ${animal.state} state`);

    const img = document.createElement("img");
    img.src = animal.species.image;
    img.alt = animal.species.name;
    wrapper.appendChild(img);

    wrapper.addEventListener("click", () => showAnimalInfo(animal));

    return wrapper;
  }

  function showAnimalInfo(animal) {
    const stateLabel = toTitleCase(animal.state);
    ui.infoBubble.textContent = `${animal.species.name} - ${stateLabel}`;
    ui.infoBubble.style.left = `${animal.x + animal.size * 0.5}px`;
    ui.infoBubble.style.top = `${animal.y - 6}px`;
    ui.infoBubble.classList.add("visible");
    clearTimeout(showAnimalInfo.timeoutId);
    showAnimalInfo.timeoutId = setTimeout(() => {
      ui.infoBubble.classList.remove("visible");
    }, 1300);
  }

  function computeSpawnPosition(size) {
    const width = ui.zooField.clientWidth;
    const height = ui.zooField.clientHeight;

    const maxX = Math.max(0, width - size);
    const maxY = Math.max(0, height - size);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const x = randomInRange(0, maxX);
      const y = randomInRange(0, maxY);
      const tooClose = zoo.animals.some((other) => {
        const dx = other.x - x;
        const dy = other.y - y;
        const minDist = (other.size + size) * 0.38;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (!tooClose) {
        return { x, y };
      }
    }

    return { x: randomInRange(0, maxX), y: randomInRange(0, maxY) };
  }

  function createFoodElement(food) {
    const foodEl = document.createElement("div");
    foodEl.className = "food";
    foodEl.style.left = `${food.x}px`;
    foodEl.style.top = `${food.y}px`;
    return foodEl;
  }

  function computeFoodPosition(size) {
    const width = ui.zooField.clientWidth;
    const height = ui.zooField.clientHeight;
    const maxX = Math.max(0, width - size);
    const maxY = Math.max(0, height - size);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const x = randomInRange(0, maxX);
      const y = randomInRange(0, maxY);
      const tooClose = zoo.foods.some((food) => {
        const dx = food.x - x;
        const dy = food.y - y;
        const minDist = (food.size + size) * 1.1;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (!tooClose) {
        return { x, y };
      }
    }

    return { x: randomInRange(0, maxX), y: randomInRange(0, maxY) };
  }

  function spawnFood(restoreData = null) {
    if (zoo.foods.length >= MAX_FOOD) {
      return null;
    }

    const size = 14;
    const pos = restoreData
      ? { x: Number(restoreData.x) || 0, y: Number(restoreData.y) || 0 }
      : computeFoodPosition(size);

    const food = {
      id: zoo.nextFoodId++,
      x: pos.x,
      y: pos.y,
      size,
      domEl: null,
    };

    food.domEl = createFoodElement(food);
    ui.foodLayer.appendChild(food.domEl);
    zoo.foods.push(food);
    updateHud();
    return food;
  }

  function removeFoodById(foodId) {
    const index = zoo.foods.findIndex((food) => food.id === foodId);
    if (index < 0) {
      return false;
    }
    const [food] = zoo.foods.splice(index, 1);
    food.domEl.remove();
    updateHud();
    return true;
  }

  function removeAllFood() {
    zoo.foods.forEach((food) => food.domEl.remove());
    zoo.foods = [];
    updateHud();
  }

  function addFoodBatch(count = FOOD_ADD_BATCH) {
    let added = 0;
    for (let i = 0; i < count; i += 1) {
      const created = spawnFood();
      if (!created) {
        break;
      }
      added += 1;
    }
    if (added === 0) {
      showToast(`Food is full (${MAX_FOOD} max)`);
    } else {
      showToast(`Added ${added} food`);
      saveZooState();
    }
  }

  function findNearestFood(animal) {
    let best = null;
    let bestDistSq = Infinity;
    for (const food of zoo.foods) {
      const targetX = food.x + food.size * 0.5;
      const targetY = food.y + food.size * 0.5;
      const dx = targetX - (animal.x + animal.size * 0.5);
      const dy = targetY - (animal.y + animal.size * 0.5);
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        best = food;
        bestDistSq = distSq;
      }
    }
    return best;
  }

  function spawnAnimal(speciesId, restoreData = null) {
    if (zoo.animals.length >= MAX_ANIMALS) {
      showToast(`Zoo full (${MAX_ANIMALS} animals max)`);
      return null;
    }

    const species = speciesById.get(speciesId);
    if (!species) {
      return null;
    }

    const size = species.size;
    const spawn = restoreData
      ? { x: Number(restoreData.x) || 0, y: Number(restoreData.y) || 0 }
      : computeSpawnPosition(size);

    const angle = randomInRange(0, Math.PI * 2);
    const speed = species.baseSpeed * randomInRange(0.72, 1.12);

    const restoredState = restoreData?.state;
    const state = zoo.enabledBehaviors.has(restoredState) ? restoredState : "wander";

    const animal = {
      id: zoo.nextId++,
      speciesId,
      species,
      size,
      x: spawn.x,
      y: spawn.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      movementProfile: species.movementProfile || "ground",
      state,
      stateTimeRemaining: restoreData?.stateTimeRemaining ?? randomStateDuration(state),
      targetId: null,
      foodTargetId: null,
      bobPhase: Math.random() * Math.PI * 2,
      hoverPhase: Math.random() * Math.PI * 2,
      hoverOffset: randomInRange(8, 18),
      dirX: Math.cos(angle),
      domEl: null,
    };

    animal.domEl = createAnimalElement(animal);
    animal.domEl.style.width = `${size}px`;
    animal.domEl.style.height = `${size}px`;
    animal.domEl.dataset.id = String(animal.id);
    ui.zooField.appendChild(animal.domEl);

    zoo.animals.push(animal);
    updateHud();
    saveZooState();

    return animal;
  }

  function removeAllAnimals() {
    zoo.animals.forEach((animal) => animal.domEl.remove());
    zoo.animals = [];
    updateHud();
  }

  function chooseSocialTarget(animal) {
    let best = null;
    let bestDistSq = Infinity;
    for (const other of zoo.animals) {
      if (other.id === animal.id || other.speciesId !== animal.speciesId) {
        continue;
      }
      const dx = other.x - animal.x;
      const dy = other.y - animal.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        best = other;
        bestDistSq = distSq;
      }
    }
    return best;
  }

  function transitionAnimalState(animal) {
    const nextState = pickWeightedState(animal.species.behaviorWeights, zoo.enabledBehaviors);
    animal.state = nextState;
    animal.stateTimeRemaining = randomStateDuration(nextState);

    if (nextState === "social") {
      const target = chooseSocialTarget(animal);
      animal.targetId = target ? target.id : null;
    } else {
      animal.targetId = null;
    }

    if (nextState !== "eat") {
      animal.foodTargetId = null;
    }
  }

  function getSeparationForce(animal) {
    let fx = 0;
    let fy = 0;

    for (const other of zoo.animals) {
      if (other.id === animal.id) {
        continue;
      }
      const dx = animal.x - other.x;
      const dy = animal.y - other.y;
      const distSq = dx * dx + dy * dy;
      const minDist = (animal.size + other.size) * 0.38;
      if (distSq > 0.0001 && distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist) * 0.9;
        fx += (dx / dist) * push;
        fy += (dy / dist) * push;
      }
    }

    return { fx, fy };
  }

  function steerAnimal(animal, dt) {
    const isBird = animal.movementProfile === "air";
    const randomTurn = randomInRange(-1, 1);
    const targetSpeed = animal.speed * zoo.speedMultiplier * (isBird ? 1.18 : 1);

    if (animal.state === "idle") {
      const damping = isBird ? 0.95 : 0.86;
      animal.vx *= damping;
      animal.vy *= damping;
      if (isBird) {
        const driftAngle = Math.atan2(animal.vy, animal.vx) + randomTurn * 0.45 * dt;
        animal.vx += Math.cos(driftAngle) * 10 * dt;
        animal.vy += Math.sin(driftAngle) * 10 * dt;
      }
      return;
    }

    if (animal.state === "sleep") {
      const damping = isBird ? 0.9 : 0.76;
      animal.vx *= damping;
      animal.vy *= damping;
      return;
    }

    if (animal.state === "eat") {
      const foodTarget = zoo.foods.find((food) => food.id === animal.foodTargetId) || findNearestFood(animal);
      animal.foodTargetId = foodTarget ? foodTarget.id : null;

      if (foodTarget) {
        const targetX = foodTarget.x + foodTarget.size * 0.5;
        const targetY = foodTarget.y + foodTarget.size * 0.5;
        const dx = targetX - (animal.x + animal.size * 0.5);
        const dy = targetY - (animal.y + animal.size * 0.5);
        const distance = Math.hypot(dx, dy);

        const angle = Math.atan2(dy, dx) + randomTurn * (isBird ? 0.1 : 0.06);
        const accel = isBird ? 64 : 52;
        animal.vx += Math.cos(angle) * accel * dt;
        animal.vy += Math.sin(angle) * accel * dt;

        const eatSpeedCap = targetSpeed * (isBird ? 0.95 : 0.82);
        const eatSpeed = Math.hypot(animal.vx, animal.vy);
        if (eatSpeed > eatSpeedCap) {
          animal.vx = (animal.vx / eatSpeed) * eatSpeedCap;
          animal.vy = (animal.vy / eatSpeed) * eatSpeedCap;
        }

        const eatReach = animal.size * (isBird ? 0.2 : 0.24) + foodTarget.size;
        if (distance <= eatReach) {
          if (removeFoodById(foodTarget.id)) {
            animal.foodTargetId = null;
            animal.vx *= 0.72;
            animal.vy *= 0.72;
            animal.stateTimeRemaining = Math.max(animal.stateTimeRemaining, 0.55);
          }
        }
      } else {
        const damping = isBird ? 0.95 : 0.9;
        animal.vx *= damping;
        animal.vy *= damping;
      }
      return;
    }

    let targetX = animal.x + animal.vx;
    let targetY = animal.y + animal.vy;

    if (animal.state === "social" && animal.targetId) {
      const target = zoo.animals.find((candidate) => candidate.id === animal.targetId);
      if (target) {
        targetX = target.x;
        targetY = target.y;
      }
    }

    const desiredAngle = Math.atan2(targetY - animal.y, targetX - animal.x);
    const sway = animal.state === "wander"
      ? randomTurn * (isBird ? 0.62 : 0.44)
      : randomTurn * (isBird ? 0.2 : 0.12);
    const angle = desiredAngle + sway;

    const accel = animal.state === "social" ? (isBird ? 72 : 54) : (isBird ? 58 : 40);
    animal.vx += Math.cos(angle) * accel * dt;
    animal.vy += Math.sin(angle) * accel * dt;

    const speed = Math.hypot(animal.vx, animal.vy);
    const maxSpeed = animal.state === "social"
      ? targetSpeed * (isBird ? 1.12 : 1.05)
      : targetSpeed;
    if (speed > maxSpeed) {
      animal.vx = (animal.vx / speed) * maxSpeed;
      animal.vy = (animal.vy / speed) * maxSpeed;
    }

    const separation = getSeparationForce(animal);
    const separationInfluence = isBird ? 10 : 18;
    animal.vx += separation.fx * dt * separationInfluence;
    animal.vy += separation.fy * dt * separationInfluence;
  }

  function constrainToBounds(animal) {
    const maxX = ui.zooField.clientWidth - animal.size;
    const maxY = ui.zooField.clientHeight - animal.size;

    if (animal.x < 0) {
      animal.x = 0;
      animal.vx = Math.abs(animal.vx) * 0.9;
    }
    if (animal.x > maxX) {
      animal.x = maxX;
      animal.vx = -Math.abs(animal.vx) * 0.9;
    }

    if (animal.y < 0) {
      animal.y = 0;
      animal.vy = Math.abs(animal.vy) * 0.9;
    }
    if (animal.y > maxY) {
      animal.y = maxY;
      animal.vy = -Math.abs(animal.vy) * 0.9;
    }
  }

  function updateAnimal(animal, dt) {
    animal.stateTimeRemaining -= dt;
    if (animal.stateTimeRemaining <= 0 || !zoo.enabledBehaviors.has(animal.state)) {
      transitionAnimalState(animal);
    }

    steerAnimal(animal, dt);

    animal.x += animal.vx * dt;
    animal.y += animal.vy * dt;

    constrainToBounds(animal);

    if (Math.abs(animal.vx) > 0.4) {
      animal.dirX = animal.vx;
    }

    animal.bobPhase += dt * (3.5 + Math.hypot(animal.vx, animal.vy) * 0.04);
    if (animal.movementProfile === "air") {
      animal.hoverPhase += dt * 2.4;
    }
  }

  function renderAnimal(animal) {
    const isBird = animal.movementProfile === "air";
    const facing = animal.dirX < 0 ? -1 : 1;
    const bobScale = isBird ? (animal.state === "idle" || animal.state === "sleep" ? 0.5 : 1.4) : (animal.state === "idle" || animal.state === "sleep" ? 0.8 : 2.4);
    const bob = Math.sin(animal.bobPhase) * bobScale;
    const hover = isBird ? Math.sin(animal.hoverPhase) * animal.hoverOffset : 0;
    animal.domEl.style.transform = `translate(${animal.x}px, ${animal.y + bob + hover}px) scaleX(${facing})`;
    animal.domEl.classList.toggle("eat", animal.state === "eat");
    animal.domEl.classList.toggle("sleep", animal.state === "sleep");
    animal.domEl.setAttribute("aria-label", `${animal.species.name} in ${animal.state} state`);
  }

  function saveZooState() {
    const payload = {
      animals: zoo.animals.map((animal) => ({
        speciesId: animal.speciesId,
        x: animal.x,
        y: animal.y,
        state: animal.state,
        stateTimeRemaining: clamp(animal.stateTimeRemaining, 0.2, 8),
      })),
      foods: zoo.foods.map((food) => ({
        x: food.x,
        y: food.y,
      })),
      speedMultiplier: zoo.speedMultiplier,
      enabledBehaviors: Array.from(zoo.enabledBehaviors),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures in private browsing or quota errors.
    }
  }

  function loadZooState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw);
      if (!parsed) {
        return;
      }

      if (typeof parsed.speedMultiplier === "number") {
        zoo.speedMultiplier = clamp(parsed.speedMultiplier, 0.5, 2);
      }

      if (Array.isArray(parsed.enabledBehaviors)) {
        const next = parsed.enabledBehaviors.filter((behavior) => AVAILABLE_BEHAVIORS.includes(behavior));
        if (next.length > 0) {
          zoo.enabledBehaviors = new Set([next[0]]);
        }
      }

      ui.speedControl.value = String(zoo.speedMultiplier);
      syncBehaviorToggleButtons();

      if (Array.isArray(parsed.foods)) {
        parsed.foods.slice(0, MAX_FOOD).forEach((food) => {
          spawnFood(food);
        });
      }

      if (Array.isArray(parsed.animals)) {
        parsed.animals.slice(0, MAX_ANIMALS).forEach((item) => {
          if (!speciesById.has(item.speciesId)) {
            return;
          }
          spawnAnimal(item.speciesId, {
            x: item.x,
            y: item.y,
            state: item.state,
            stateTimeRemaining: item.stateTimeRemaining,
          });
        });
      }
    } catch {
      // Ignore malformed data.
    }
  }

  function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function handleControls() {
    ui.pauseBtn.addEventListener("click", () => {
      zoo.paused = !zoo.paused;
      ui.pauseBtn.textContent = zoo.paused ? "Resume" : "Pause";
      showToast(zoo.paused ? "Simulation paused" : "Simulation resumed");
      if (!zoo.paused) {
        zoo.lastTimeMs = performance.now();
      }
    });

    ui.resetBtn.addEventListener("click", () => {
      removeAllAnimals();
      removeAllFood();
      for (let i = 0; i < STARTING_FOOD; i += 1) {
        spawnFood();
      }
      clearSavedState();
      showToast("Zoo reset");
    });

    ui.addFoodBtn.addEventListener("click", () => {
      addFoodBatch();
    });

    ui.speedControl.addEventListener("input", (event) => {
      zoo.speedMultiplier = clamp(Number(event.target.value), 0.5, 2);
      saveZooState();
    });
  }

  function frame(nowMs) {
    const rawDt = (nowMs - zoo.lastTimeMs) / 1000;
    const dt = clamp(rawDt, 0, 0.05);
    zoo.lastTimeMs = nowMs;

    if (!zoo.paused) {
      for (const animal of zoo.animals) {
        updateAnimal(animal, dt);
        renderAnimal(animal);
      }

      zoo.lastHudUpdate += dt;
      if (zoo.lastHudUpdate >= HUD_UPDATE_INTERVAL) {
        updateHud();
        zoo.lastHudUpdate = 0;
      }
    }

    requestAnimationFrame(frame);
  }

  function addKeyboardSupport() {
    ui.zooField.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        ui.pauseBtn.click();
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        ui.resetBtn.click();
      }
    });
  }

  function init() {
    renderSidebar();
    renderBehaviorToggles();
    handleControls();
    addKeyboardSupport();
    loadZooState();
    if (zoo.foods.length === 0) {
      for (let i = 0; i < STARTING_FOOD; i += 1) {
        spawnFood();
      }
    }
    updateHud();

    if (zoo.animals.length === 0) {
      // Seed the field so first-time users see movement immediately.
      spawnAnimal("giraffe");
      spawnAnimal("zebra");
      spawnAnimal("panda");
    }

    setInterval(saveZooState, 3500);
    requestAnimationFrame((now) => {
      zoo.lastTimeMs = now;
      requestAnimationFrame(frame);
    });
  }

  init();
})();
