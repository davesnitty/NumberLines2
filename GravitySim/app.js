// Gravity Jump Lab — front-end only

const G_EARTH  = 9.80;
const G_MOON   = 1.62;
const G_SATURN = 10.44;
const IN_PER_M = 39.3701;

const G_JUPITER = 24.79;
const G_MERCURY = 3.70;
const G_URANUS  = 8.87;

const ENVS = {
  moon:    { name: "Moon",    emoji: "🌕", g: G_MOON },
  mercury: { name: "Mercury", emoji: "☿️", g: G_MERCURY },
  saturn:  { name: "Saturn",  emoji: "🪐", g: G_SATURN },
  jupiter: { name: "Jupiter", emoji: "🟠", g: G_JUPITER },
  uranus:  { name: "Uranus",  emoji: "🔵", g: G_URANUS },
};

// Pick a fixed scale (px per meter) so even a big Moon jump fits the stage.
// Stage height = 460px, ground occupies bottom 35% (~161px), so ~299px is air.
// Max jump we plan for: 60 in leap → v0 = sqrt(2·9.8·1.524) ≈ 5.47 m/s
//   → Moon h_max = v0² / (2·1.62) ≈ 9.23 m. We'll cap visual at 9.5 m → ~30 px/m.
// But that makes Earth jumps look tiny. Compromise: scale to fit the
// CURRENT-input Moon jump per render, recomputed when leap changes.
function computeScale(leapIn) {
  const h_m = Math.max(0.05, leapIn / IN_PER_M);
  const v0 = Math.sqrt(2 * G_EARTH * h_m);
  const gOther = (ENVS[currentEnvKey] || ENVS.moon).g;
  const gMin = Math.min(G_EARTH, gOther);
  const tallestJump = (v0 * v0) / (2 * gMin);
  const airPx = 280;
  return airPx / Math.max(tallestJump, 0.5);
}

const els = {
  leap:    document.getElementById("leap-in"),
  jump:    document.getElementById("jump-btn"),
  status:  document.getElementById("status"),
  envSel:  document.getElementById("env-select"),
  scrub:   document.getElementById("scrub"),
  scrubTime: document.getElementById("scrub-time"),
  panels: {
    L: document.querySelector('.panel.earth'),
    R: document.querySelector('.panel.other'),
  },
  fig: {
    L: document.querySelector('#stage-L .figure'),
    R: document.querySelector('#stage-R .figure'),
  },
  kid: {
    L: document.querySelector('#stage-L .kid'),
    R: document.querySelector('#stage-R .kid'),
  },
  math: {
    L: document.getElementById("math-L"),
    R: document.getElementById("math-R"),
  },
  ruler: {
    L: document.querySelector('#stage-L .ruler'),
    R: document.querySelector('#stage-R .ruler'),
  },
  bind: {
    L: {
      g: document.querySelector('.panel.earth [data-bind="g"]'),
    },
    R: {
      g:     document.querySelector('.panel.other [data-bind="g"]'),
      name:  document.querySelector('.panel.other [data-bind="name"]'),
      emoji: document.querySelector('.panel.other [data-bind="emoji"]'),
    },
  },
};

let currentEnvKey = "moon";
let jumping = false;
let animRAF = null;
// Current jump parameters — recomputed whenever leap or env changes.
let jumpParams = { v0: 0, gL: G_EARTH, gR: G_MOON, tTotalMax: 0 };
let scale = computeScale(parseFloat(els.leap.value) || 20);

function recomputeJumpParams() {
  const leap = parseFloat(els.leap.value) || 0;
  const h_m = Math.max(0, leap / IN_PER_M);
  const v0 = Math.sqrt(2 * G_EARTH * h_m);
  const gL = G_EARTH;
  const gR = ENVS[currentEnvKey].g;
  const tTotalMax = v0 > 0 ? Math.max(2 * v0 / gL, 2 * v0 / gR) : 0;
  jumpParams = { v0, gL, gR, tTotalMax };
  if (els.scrub) {
    els.scrub.max = tTotalMax > 0 ? tTotalMax.toFixed(3) : 1;
    els.scrub.value = 0;
    if (els.scrubTime) els.scrubTime.textContent = "t = 0.000 s";
  }
}

function setEnv(key) {
  currentEnvKey = key;
  const env = ENVS[key];
  els.panels.R.dataset.env = key;
  els.bind.R.g.textContent = env.g.toFixed(2);
  els.bind.R.name.textContent = env.name;
  els.bind.R.emoji.textContent = env.emoji;
  scale = computeScale(parseFloat(els.leap.value) || 20);
  drawRulers();
  resetMath();
}

function buildMath(side) {
  els.math[side].innerHTML = `
    <div class="facts">
      <span class="k">takeoff speed v₀</span><span class="v" data-f="v0">—</span>
      <span class="k">time to apex t<sub>apex</sub></span><span class="v" data-f="tapex">—</span>
      <span class="k">peak height h<sub>max</sub></span><span class="v" data-f="hmax">—</span>
      <span class="k">total air time t<sub>total</sub></span><span class="v" data-f="ttotal">—</span>
    </div>
    <div class="row" data-row="g">
      <span class="label">g <em>gravity</em></span>
      <span class="expr">
        <span class="formula">strength of gravity</span>
        <span class="val" data-r="g">—</span>
      </span>
    </div>
    <div class="row" data-row="t">
      <span class="label">t <em>time</em></span>
      <span class="expr">
        <span class="formula">seconds since takeoff</span>
        <span class="val" data-r="t">—</span>
      </span>
    </div>
    <div class="row" data-row="y">
      <span class="label">y(t) <em>position</em></span>
      <span class="expr">
        <span class="formula">v₀·t − ½·g·t²</span>
        <span class="sub" data-r="ysub"></span>
        <span class="val" data-r="y">—</span>
      </span>
    </div>
    <div class="row" data-row="v">
      <span class="label">v(t) <em>velocity</em></span>
      <span class="expr">
        <span class="formula">v₀ − g·t</span>
        <span class="sub" data-r="vsub"></span>
        <span class="val" data-r="v">—</span>
      </span>
    </div>
    <div class="row" data-row="a">
      <span class="label">a(t) <em>acceleration</em></span>
      <span class="expr">
        <span class="formula">−g</span>
        <span class="val" data-r="a">—</span>
      </span>
    </div>
  `;
}

function fmt(x, unit, digits = 2) {
  if (!isFinite(x)) return "—";
  const sign = x < 0 ? "−" : "";
  return sign + Math.abs(x).toFixed(digits) + " " + unit;
}

function setVal(side, key, valText) {
  const el = els.math[side].querySelector(`[data-r="${key}"]`);
  if (el) el.textContent = valText;
}

function updateFacts() {
  const { v0 } = jumpParams;
  for (const side of ["L", "R"]) {
    const g = side === "L" ? jumpParams.gL : jumpParams.gR;
    const tapex = v0 / g;
    const ttotal = 2 * tapex;
    const hmax = (v0 * v0) / (2 * g);
    const m = els.math[side];
    m.querySelector('[data-f="v0"]').textContent = fmt(v0, "m/s");
    m.querySelector('[data-f="tapex"]').textContent = fmt(tapex, "s", 3);
    m.querySelector('[data-f="hmax"]').textContent = fmt(hmax, "m");
    m.querySelector('[data-f="ttotal"]').textContent = fmt(ttotal, "s", 3);
  }
}

// Render both panels at a given time t (seconds since takeoff).
// Used by both the live animation and the scrubber.
function renderAt(t, opts = {}) {
  const { v0 } = jumpParams;
  const showSubs = opts.showSubs !== false; // default true; reset() passes false
  const pulse = !!opts.pulse;
  for (const side of ["L", "R"]) {
    const g = side === "L" ? jumpParams.gL : jumpParams.gR;
    const ttotal = v0 > 0 ? 2 * v0 / g : 0;
    const tt = Math.max(0, Math.min(t, ttotal));
    const y = v0 * tt - 0.5 * g * tt * tt;
    const v = v0 - g * tt;
    const inAir = tt > 0 && tt < ttotal;
    setFigure(side, Math.max(0, y), !inAir);

    setVal(side, "g", fmt(g, "m/s²"));
    setVal(side, "t", fmt(tt, "s", 3));
    setVal(side, "y", fmt(y, "m"));
    setVal(side, "v", fmt(v, "m/s"));
    setVal(side, "a", fmt(-g, "m/s²"));
    if (showSubs && tt > 0) {
      setVal(side, "ysub", `= (${v0.toFixed(2)})(${tt.toFixed(3)}) − ½(${g.toFixed(2)})(${tt.toFixed(3)})²`);
      setVal(side, "vsub", `= ${v0.toFixed(2)} − (${g.toFixed(2)})(${tt.toFixed(3)})`);
    } else {
      setVal(side, "ysub", "");
      setVal(side, "vsub", "");
    }
    const rows = els.math[side].querySelectorAll('.row');
    rows.forEach(r => r.classList.toggle('pulse', pulse));
  }
  if (els.scrubTime) els.scrubTime.textContent = `t = ${t.toFixed(3)} s`;
}

function resetMath() {
  recomputeJumpParams();
  updateFacts();
  renderAt(0, { showSubs: false });
}

function setFigure(side, y_m, crouched) {
  const px = y_m * scale;
  els.fig[side].style.transform = `translate(-50%, ${-px}px)`;
  const kid = els.kid[side];
  // Crouch: shorten body & bend legs by adjusting via class
  if (crouched) kid.classList.add("crouch"); else kid.classList.remove("crouch");
  // Arms up while in air
  const armL = kid.querySelector('.arm-l');
  const armR = kid.querySelector('.arm-r');
  if (crouched) {
    armL.setAttribute('x2', '-10'); armL.setAttribute('y2', '-28');
    armR.setAttribute('x2',  '10'); armR.setAttribute('y2', '-28');
  } else {
    // arms raised
    armL.setAttribute('x2', '-9'); armL.setAttribute('y2', '-52');
    armR.setAttribute('x2',  '9'); armR.setAttribute('y2', '-52');
  }
}

function drawRulers() {
  for (const side of ["L", "R"]) {
    const r = els.ruler[side];
    r.innerHTML = "";
    const stage = r.parentElement;
    const airPx = stage.clientHeight * 0.65;
    const maxM = airPx / scale;
    // tick every 1m for low-g, finer for small ranges
    const step = maxM > 4 ? 1 : (maxM > 1.5 ? 0.5 : 0.25);
    for (let m = 0; m <= maxM; m += step) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.bottom = (m * scale) + "px";
      tick.textContent = (Math.round(m * 100) / 100) + "m";
      r.appendChild(tick);
    }
  }
}

function stopAnim() {
  if (animRAF != null) cancelAnimationFrame(animRAF);
  animRAF = null;
  jumping = false;
  els.jump.disabled = false;
}

function jump() {
  if (jumping) return;
  const leap = parseFloat(els.leap.value);
  if (!leap || leap <= 0) {
    els.status.textContent = "Enter a leap > 0.";
    return;
  }
  scale = computeScale(leap);
  drawRulers();
  recomputeJumpParams();
  updateFacts();

  jumping = true;
  els.jump.disabled = true;
  els.status.textContent = "Jumping!";

  const { tTotalMax } = jumpParams;
  const t0 = performance.now();
  let pulseToggle = false;

  function frame(now) {
    const t = (now - t0) / 1000;
    pulseToggle = !pulseToggle;
    const tClamped = Math.min(t, tTotalMax);
    renderAt(tClamped, { pulse: pulseToggle });
    if (els.scrub) els.scrub.value = tClamped;

    if (t < tTotalMax) {
      animRAF = requestAnimationFrame(frame);
    } else {
      animRAF = null;
      jumping = false;
      els.jump.disabled = false;
      els.status.textContent = "Landed. Drag the slider or press space to jump again.";
    }
  }
  animRAF = requestAnimationFrame(frame);
}

// Wiring

els.jump.addEventListener("click", jump);
els.envSel.addEventListener("change", e => {
  stopAnim();
  setEnv(e.target.value);
});
els.leap.addEventListener("input", () => {
  stopAnim();
  scale = computeScale(parseFloat(els.leap.value) || 20);
  drawRulers();
  resetMath();
  els.status.textContent = "Ready.";
});
els.scrub.addEventListener("input", () => {
  stopAnim();
  const t = parseFloat(els.scrub.value) || 0;
  renderAt(t, { showSubs: true });
  els.status.textContent = "Scrubbing.";
});
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && document.activeElement !== els.leap && document.activeElement !== els.scrub) {
    e.preventDefault();
    jump();
  }
});

// Init
buildMath("L");
buildMath("R");
setEnv("moon");
els.bind.L.g.textContent = G_EARTH.toFixed(2);
resetMath();
