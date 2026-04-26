(() => {
  const LANE_COUNT = 4;
  const APPROACH_MS = 1700;
  const PERFECT_MS = 70;
  const GOOD_MS = 130;
  const MISS_MS = 160;
  const HOLD_BONUS = 60;
  const STORAGE_KEY = "musiclanes_best_scores_v1";

  const KEY_TO_LANE = {
    d: 0,
    f: 1,
    j: 2,
    k: 3,
  };

  const songBlueprints = [
    {
      id: "neon-walk",
      title: "Neon Walk",
      bpm: 110,
      audioSrc: "./assets/audio/be-jammin-demo.mp3",
      musicOffsetMs: 0,
      beatMarkers: {
        easy: [2, 4, 6, 8, 10, 11, 12, 14, 16, 17, 18, 20, 22, 24, 26, 28, 30, 31, 32],
        normal: [
          2, 3, 4, 5, 6, 7, 8, 8.5, 9, 10, 11, 12, 12.5, 13, 14, 15, 16, 16.5, 17, 18, 19,
          20, 21, 22, 23, 24, 24.5, 25, 26, 27, 28, 29, 30, 31, 32,
        ],
        hard: [
          2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 11.5, 12, 12.5,
          13, 13.5, 14, 14.5, 15, 16, 16.5, 17, 17.5, 18, 18.5, 19, 20, 20.5, 21, 21.5, 22, 23,
          23.5, 24, 24.5, 25, 26, 26.5, 27, 27.5, 28, 29, 30, 30.5, 31, 31.5, 32,
        ],
      },
      holdHints: {
        normal: [8, 16, 24, 31],
        hard: [6, 10, 14, 18, 22, 26, 30],
      },
      laneSeed: [0, 1, 2, 3, 2, 1, 0, 3],
      previewLengthBeats: 36,
    },
  ];

  function generateChartFromBeatMarkers(blueprint, difficulty) {
    const beatMs = 60000 / blueprint.bpm;
    const beats = blueprint.beatMarkers[difficulty];
    const holdSet = new Set(blueprint.holdHints[difficulty] || []);
    const notes = [];
    let laneIndex = 0;

    for (const beat of beats) {
      const lane = blueprint.laneSeed[laneIndex % blueprint.laneSeed.length];
      laneIndex += 1;
      const timeMs = beat * beatMs;
      if (holdSet.has(beat)) {
        notes.push({
          lane,
          timeMs,
          type: "hold",
          endMs: timeMs + beatMs * 1.5,
          judged: false,
          state: "pending",
        });
      } else {
        notes.push({
          lane,
          timeMs,
          type: "tap",
          judged: false,
          state: "pending",
        });
      }
    }

    return {
      id: `${blueprint.id}-${difficulty}`,
      songId: blueprint.id,
      songTitle: blueprint.title,
      audioSrc: blueprint.audioSrc || "",
      musicOffsetMs: blueprint.musicOffsetMs || 0,
      bpm: blueprint.bpm,
      difficulty,
      lengthMs: blueprint.previewLengthBeats * beatMs,
      notes,
    };
  }

  function allCharts() {
    const charts = [];
    for (const blueprint of songBlueprints) {
      for (const difficulty of ["easy", "normal", "hard"]) {
        charts.push(generateChartFromBeatMarkers(blueprint, difficulty));
      }
    }
    return charts;
  }

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const audioTestBtn = document.getElementById("audioTestBtn");
  const songSelect = document.getElementById("songSelect");
  const difficultySelect = document.getElementById("difficultySelect");

  const scoreValue = document.getElementById("scoreValue");
  const comboValue = document.getElementById("comboValue");
  const bestValue = document.getElementById("bestValue");
  const healthValue = document.getElementById("healthValue");
  const statusValue = document.getElementById("statusValue");
  const audioStateValue = document.getElementById("audioStateValue");

  const audio = new window.MusicLanesAudio();
  const charts = allCharts();
  const pointerDownByLane = new Map();
  const pressedKeys = new Set();

  const state = {
    running: false,
    paused: false,
    ended: false,
    chart: null,
    score: 0,
    combo: 0,
    health: 100,
    feedback: "",
    pausedAtMs: 0,
    startedAtPerfMs: 0,
    muted: false,
    lastTickBeat: -1,
    lastFrame: 0,
    bestScores: loadBestScores(),
  };

  function getSongTimeMs() {
    if (state.paused) {
      return state.pausedAtMs || 0;
    }
    if (!state.running) {
      return state.pausedAtMs || 0;
    }
    return Math.max(0, performance.now() - state.startedAtPerfMs);
  }

  function tryEnableAudio() {
    if (!state.running || !state.muted) {
      return;
    }
    const musicOffsetMs = state.chart ? state.chart.musicOffsetMs || 0 : 0;
    audio.unlock().then(() => audio.start(getSongTimeMs() + musicOffsetMs)).then(() => {
      state.muted = false;
      audio.playStartCue();
      setFeedback("Playing");
    }).catch(() => {});
  }

  function loadBestScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (err) {
      return {};
    }
  }

  function saveBestScoreIfNeeded() {
    const key = `${state.chart.songId}:${state.chart.difficulty}`;
    const current = state.bestScores[key] || 0;
    if (state.score > current) {
      state.bestScores[key] = state.score;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bestScores));
    }
  }

  function laneWidth() {
    return canvas.width / LANE_COUNT;
  }

  function hitLineY() {
    return canvas.height - 120;
  }

  function noteY(songTimeMs, noteTimeMs) {
    const spawnY = -60;
    const lineY = hitLineY();
    const t = 1 - (noteTimeMs - songTimeMs) / APPROACH_MS;
    return spawnY + t * (lineY - spawnY);
  }

  function selectChart() {
    const songId = songSelect.value;
    const diff = difficultySelect.value;
    return charts.find((chart) => chart.songId === songId && chart.difficulty === diff) || charts[0];
  }

  function refreshSongSelect() {
    const seen = new Set();
    for (const chart of charts) {
      if (seen.has(chart.songId)) {
        continue;
      }
      seen.add(chart.songId);
      const opt = document.createElement("option");
      opt.value = chart.songId;
      opt.textContent = chart.songTitle;
      songSelect.appendChild(opt);
    }
  }

  function updateHud() {
    const chartKey = state.chart ? `${state.chart.songId}:${state.chart.difficulty}` : null;
    const best = chartKey ? state.bestScores[chartKey] || 0 : 0;
    scoreValue.textContent = String(state.score);
    comboValue.textContent = String(state.combo);
    bestValue.textContent = String(best);
    healthValue.textContent = String(Math.max(0, Math.round(state.health)));
    statusValue.textContent = state.feedback;
    audioStateValue.textContent = state.muted ? `muted (${audio.getState()})` : audio.getState();
  }

  function setFeedback(text) {
    state.feedback = text;
    updateHud();
  }

  function resetForStart() {
    const chosen = selectChart();
    state.chart = {
      ...chosen,
      notes: chosen.notes.map((n) => ({ ...n })),
    };
    state.score = 0;
    state.combo = 0;
    state.health = 100;
    state.ended = false;
  }

  async function startGame() {
    resetForStart();
    state.pausedAtMs = 0;
    state.lastTickBeat = -1;
    state.startedAtPerfMs = performance.now();
    state.muted = false;
    audio.setMusicTrack(state.chart.audioSrc);
    try {
      await audio.unlock();
      await audio.start(state.chart.musicOffsetMs || 0);
      audio.playStartCue();
    } catch (err) {
      state.muted = true;
    }
    state.running = true;
    state.paused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pause";
    setFeedback(state.muted ? "Playing (muted)" : "Playing");
    updateHud();
  }

  function endGame(message) {
    state.running = false;
    state.paused = false;
    state.ended = true;
    audio.stop();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    saveBestScoreIfNeeded();
    setFeedback(message);
  }

  function togglePause() {
    if (!state.running) {
      return;
    }
    state.paused = !state.paused;
    if (state.paused) {
      state.pausedAtMs = getSongTimeMs();
      audio.stop();
      pauseBtn.textContent = "Resume";
      setFeedback("Paused");
    } else {
      state.startedAtPerfMs = performance.now() - state.pausedAtMs;
      if (!state.muted) {
        const musicOffsetMs = state.chart ? state.chart.musicOffsetMs || 0 : 0;
        audio.start(state.pausedAtMs + musicOffsetMs).then(() => {
          updateHud();
        }).catch(() => {
          state.muted = true;
          setFeedback("Playing (muted)");
        });
      }
      pauseBtn.textContent = "Pause";
      setFeedback(state.muted ? "Playing (muted)" : "Playing");
    }
  }

  function scoreHit(delta) {
    if (Math.abs(delta) <= PERFECT_MS) {
      state.score += 120 + state.combo * 2;
      state.combo += 1;
      state.health = Math.min(100, state.health + 1.6);
      audio.playHit();
      setFeedback("Perfect");
      return;
    }
    state.score += 80 + state.combo;
    state.combo += 1;
    state.health = Math.min(100, state.health + 0.8);
    audio.playGood();
    setFeedback("Good");
  }

  function scoreMiss() {
    state.combo = 0;
    state.health -= 8;
    audio.playMiss();
    setFeedback("Miss");
    if (state.health <= 0) {
      endGame("Game Over");
    }
  }

  function judgeLaneHit(lane) {
    if (!state.running || state.paused || !state.chart) {
      return;
    }
    const now = getSongTimeMs();
    const candidate = state.chart.notes.find(
      (note) => note.state === "pending" && note.lane === lane && Math.abs(note.timeMs - now) <= MISS_MS
    );
    if (!candidate) {
      scoreMiss();
      return;
    }
    const delta = now - candidate.timeMs;
    candidate.state = "hit";
    candidate.judged = true;
    scoreHit(delta);

    if (candidate.type === "hold") {
      candidate.holdAwarded = false;
    }
  }

  function judgeMissedNotes() {
    if (!state.chart) {
      return;
    }
    const now = getSongTimeMs();
    for (const note of state.chart.notes) {
      if (note.state !== "pending") {
        continue;
      }
      if (now - note.timeMs > MISS_MS) {
        note.state = "missed";
        note.judged = true;
        scoreMiss();
      }
    }
  }

  function processHoldBonuses() {
    if (!state.chart) {
      return;
    }
    const now = getSongTimeMs();
    for (const note of state.chart.notes) {
      if (note.type !== "hold" || note.state !== "hit" || note.holdAwarded) {
        continue;
      }
      if (now >= note.endMs) {
        note.holdAwarded = true;
        state.score += HOLD_BONUS;
        setFeedback("Hold +");
      }
    }
  }

  function hasChartFinished() {
    if (!state.chart) {
      return false;
    }
    const now = getSongTimeMs();
    return now > state.chart.lengthMs + 1000;
  }

  function update() {
    if (!state.running || state.paused || !state.chart) {
      return;
    }
    playBeatTickIfNeeded();
    judgeMissedNotes();
    processHoldBonuses();
    if (hasChartFinished()) {
      endGame("Song Complete");
    }
    updateHud();
  }

  function playBeatTickIfNeeded() {
    if (!state.chart) {
      return;
    }
    if (state.chart.audioSrc) {
      return;
    }
    const now = getSongTimeMs();
    const beatMs = 60000 / state.chart.bpm;
    const beatIndex = Math.floor(now / beatMs);
    if (beatIndex <= state.lastTickBeat) {
      return;
    }
    state.lastTickBeat = beatIndex;
    const isDownbeat = beatIndex % 4 === 0;
    audio.playBeatTick(isDownbeat);
  }

  function drawLaneBackground() {
    const w = laneWidth();
    const h = canvas.height;
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const x = lane * w;
      ctx.fillStyle = lane % 2 ? "#0d1430" : "#0a1028";
      ctx.fillRect(x, 0, w, h);

      ctx.strokeStyle = "rgba(8, 232, 255, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(8, 232, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, h);
    ctx.stroke();
  }

  function drawHitLine() {
    const y = hitLineY();
    ctx.fillStyle = "rgba(8, 232, 255, 0.55)";
    ctx.fillRect(0, y - 3, canvas.width, 6);
    ctx.shadowColor = "#08e8ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.fillRect(0, y - 1, canvas.width, 2);
    ctx.shadowBlur = 0;
  }

  function drawLaneHighlights() {
    const y = hitLineY() - 60;
    const w = laneWidth();
    for (const lane of pointerDownByLane.keys()) {
      const x = lane * w;
      ctx.fillStyle = "rgba(255, 60, 247, 0.22)";
      ctx.fillRect(x + 3, y, w - 6, 80);
    }
  }

  function drawNotes() {
    if (!state.chart) {
      return;
    }
    const now = state.running ? getSongTimeMs() : 0;
    const w = laneWidth();

    for (const note of state.chart.notes) {
      if (note.state === "hit" || note.state === "missed") {
        continue;
      }
      const y = noteY(now, note.timeMs);
      if (y < -80 || y > canvas.height + 90) {
        continue;
      }
      const x = note.lane * w + 6;
      const noteWidth = w - 12;

      if (note.type === "hold") {
        const tailEndY = noteY(now, note.endMs);
        ctx.fillStyle = "rgba(54, 251, 168, 0.30)";
        ctx.fillRect(x + noteWidth * 0.3, y, noteWidth * 0.4, Math.max(8, tailEndY - y));
      }

      ctx.shadowColor = "#ff3cf7";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#0f1b3f";
      ctx.fillRect(x, y - 16, noteWidth, 30);
      ctx.strokeStyle = note.type === "hold" ? "#36fba8" : "#ff3cf7";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y - 16, noteWidth, 30);
      ctx.shadowBlur = 0;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLaneBackground();
    drawHitLine();
    drawNotes();
    drawLaneHighlights();
  }

  function frame(ts) {
    state.lastFrame = ts;
    update();
    draw();
    requestAnimationFrame(frame);
  }

  function laneFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const lane = Math.floor((x / rect.width) * LANE_COUNT);
    return Math.max(0, Math.min(LANE_COUNT - 1, lane));
  }

  function onPointerDown(evt) {
    evt.preventDefault();
    tryEnableAudio();
    const lane = laneFromClientX(evt.clientX);
    pointerDownByLane.set(lane, true);
    judgeLaneHit(lane);
  }

  function onPointerUp(evt) {
    evt.preventDefault();
    pointerDownByLane.clear();
  }

  function onKeyDown(evt) {
    tryEnableAudio();
    const lane = KEY_TO_LANE[evt.key.toLowerCase()];
    if (lane === undefined) {
      return;
    }
    if (pressedKeys.has(evt.key.toLowerCase())) {
      return;
    }
    pressedKeys.add(evt.key.toLowerCase());
    pointerDownByLane.set(lane, true);
    judgeLaneHit(lane);
  }

  function onKeyUp(evt) {
    const key = evt.key.toLowerCase();
    const lane = KEY_TO_LANE[key];
    if (lane === undefined) {
      return;
    }
    pressedKeys.delete(key);
    pointerDownByLane.delete(lane);
  }

  function setupEvents() {
    startBtn.addEventListener("click", () => {
      startGame().catch(() => setFeedback("Audio permission blocked"));
    });
    pauseBtn.addEventListener("click", togglePause);
    audioTestBtn.addEventListener("click", () => {
      audio.unlock().then(() => {
        state.muted = false;
        audio.playTestTone();
        setFeedback("Audio test played (3-tone burst)");
        updateHud();
      }).catch(() => {
        setFeedback("Audio still blocked");
        updateHud();
      });
    });
    songSelect.addEventListener("change", () => {
      state.chart = selectChart();
      updateHud();
    });
    difficultySelect.addEventListener("change", () => {
      state.chart = selectChart();
      updateHud();
    });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("pointerup", () => pointerDownByLane.clear());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
  }

  function boot() {
    refreshSongSelect();
    state.chart = selectChart();
    setFeedback("Ready");
    setupEvents();
    updateHud();
    requestAnimationFrame(frame);
  }

  boot();
})();
