(() => {
  class MusicLanesAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.musicEl = null;
      this.musicSrc = "";
      this.useHtmlAudioFallback = false;
      this.fallbackUnlocked = false;
      this.lastError = "";
      this.toneCache = new Map();
      this.startedAtAudioTime = 0;
      this.startedAtPerfTime = 0;
      this.offsetMs = 0;
      this.isRunning = false;
    }

    setMusicTrack(src) {
      const nextSrc = src || "";
      if (nextSrc === this.musicSrc) {
        return;
      }
      if (this.musicEl) {
        this.musicEl.pause();
      }
      this.musicSrc = nextSrc;
      if (!nextSrc) {
        this.musicEl = null;
        return;
      }
      this.musicEl = new Audio(nextSrc);
      this.musicEl.preload = "auto";
      this.musicEl.loop = false;
      this.musicEl.volume = 0.65;
    }

    syncMusicPositionMs(positionMs) {
      if (!this.musicEl) {
        return;
      }
      const targetSeconds = Math.max(0, positionMs / 1000);
      try {
        if (Number.isFinite(this.musicEl.duration) && this.musicEl.duration > 0) {
          this.musicEl.currentTime = Math.min(targetSeconds, Math.max(0, this.musicEl.duration - 0.05));
        } else {
          this.musicEl.currentTime = targetSeconds;
        }
      } catch (err) {
        this.lastError = `Seek failed: ${err && err.message ? err.message : "unknown"}`;
      }
    }

    async playMusicFromMs(positionMs) {
      if (!this.musicEl) {
        return;
      }
      this.syncMusicPositionMs(positionMs);
      const playResult = this.musicEl.play();
      if (playResult && typeof playResult.then === "function") {
        await playResult;
      }
    }

    canUseWebAudio() {
      return Boolean(window.AudioContext || window.webkitAudioContext);
    }

    createWebAudioContext() {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) {
        this.useHtmlAudioFallback = true;
        this.lastError = "WebAudio unsupported";
        return false;
      }
      try {
        this.ctx = new Ctor();
        return true;
      } catch (err) {
        this.useHtmlAudioFallback = true;
        this.lastError = `WebAudio create failed: ${err && err.message ? err.message : "unknown"}`;
        return false;
      }
    }

    ensureContext() {
      if (!this.ctx) {
        if (!this.createWebAudioContext()) {
          return;
        }
      }
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = 1.0;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    }

    async init() {
      if (!this.ctx) {
        if (!this.createWebAudioContext()) {
          return;
        }
      }
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
    }

    async start(offsetMs = 0) {
      await this.init();
      this.offsetMs = offsetMs;
      this.startedAtPerfTime = performance.now();
      this.startedAtAudioTime = this.ctx ? this.ctx.currentTime : 0;
      this.isRunning = true;
      await this.playMusicFromMs(offsetMs);
    }

    getState() {
      if (this.useHtmlAudioFallback) {
        if (this.lastError) {
          return `html-fallback (${this.lastError})`;
        }
        return "html-fallback";
      }
      if (!this.ctx) {
        return "not-created";
      }
      return this.ctx.state;
    }

    async unlock() {
      if (!this.canUseWebAudio()) {
        this.useHtmlAudioFallback = true;
        this.fallbackUnlocked = true;
        this.playStartCue();
        return true;
      }
      try {
        await this.init();
        if (this.musicEl) {
          try {
            const originalTime = this.musicEl.currentTime || 0;
            this.musicEl.muted = true;
            const playResult = this.musicEl.play();
            if (playResult && typeof playResult.then === "function") {
              await playResult;
            }
            this.musicEl.pause();
            this.musicEl.currentTime = originalTime;
            this.musicEl.muted = false;
          } catch (err) {
            this.lastError = `Music unlock failed: ${err && err.message ? err.message : "unknown"}`;
          }
        }
        this.playStartCue();
        this.fallbackUnlocked = true;
        return this.getState() === "running";
      } catch (err) {
        this.useHtmlAudioFallback = true;
        this.fallbackUnlocked = true;
        this.lastError = `Unlock failed: ${err && err.message ? err.message : "unknown"}`;
        this.playStartCue();
        return true;
      }
    }

    toneDataUrl(freq, durationMs, gainValue) {
      const key = `${freq}:${durationMs}:${gainValue}`;
      if (this.toneCache.has(key)) {
        return this.toneCache.get(key);
      }
      const sampleRate = 22050;
      const samples = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
      const data = new Int16Array(samples);
      const amplitude = Math.floor(32767 * Math.min(1, Math.max(0.01, gainValue)));
      for (let i = 0; i < samples; i += 1) {
        const t = i / sampleRate;
        const env = Math.max(0, 1 - i / samples);
        data[i] = Math.floor(Math.sin(2 * Math.PI * freq * t) * amplitude * env);
      }

      const bytesPerSample = 2;
      const blockAlign = bytesPerSample;
      const byteRate = sampleRate * blockAlign;
      const dataSize = data.length * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      function writeString(offset, str) {
        for (let i = 0; i < str.length; i += 1) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      }

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      let offset = 44;
      for (let i = 0; i < data.length; i += 1) {
        view.setInt16(offset, data[i], true);
        offset += 2;
      }

      const blob = new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      this.toneCache.set(key, url);
      return url;
    }

    playFallback(freq, durationMs, gainValue) {
      if (!this.fallbackUnlocked) {
        return;
      }
      const url = this.toneDataUrl(freq, durationMs, gainValue);
      const a = new Audio(url);
      a.volume = 1;
      a.play().catch(() => {});
    }

    stop() {
      this.isRunning = false;
      if (this.musicEl) {
        this.musicEl.pause();
      }
    }

    getSongTimeMs() {
      if (!this.isRunning) {
        return 0;
      }
      if (!this.ctx) {
        return Math.max(0, performance.now() - this.startedAtPerfTime) + this.offsetMs;
      }
      const nowMs = (this.ctx.currentTime - this.startedAtAudioTime) * 1000;
      return nowMs + this.offsetMs;
    }

    click(freq, durationMs, gainValue) {
      if (this.useHtmlAudioFallback) {
        this.playFallback(freq, durationMs, gainValue);
        return;
      }
      this.ensureContext();
      if (!this.ctx || this.ctx.state === "closed") {
        this.useHtmlAudioFallback = true;
        this.playFallback(freq, durationMs, gainValue);
        return;
      }
      if (this.ctx.state !== "running") {
        this.ctx.resume().then(() => {
          this.click(freq, durationMs, gainValue);
        }).catch(() => {
          this.useHtmlAudioFallback = true;
          this.playFallback(freq, durationMs, gainValue);
        });
        return;
      }
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = gainValue;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
      osc.stop(t0 + durationMs / 1000);
    }

    rawBeep(freq, durationMs, gainValue) {
      this.ensureContext();
      if (!this.ctx || this.ctx.state !== "running") {
        return;
      }
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(Math.min(1, Math.max(0.01, gainValue)), t0);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
      osc.stop(t0 + durationMs / 1000);
    }

    playHit() {
      this.click(560, 110, 0.26);
    }

    playGood() {
      this.click(430, 120, 0.22);
    }

    playMiss() {
      this.click(180, 150, 0.22);
    }

    playBeatTick(isDownbeat) {
      if (isDownbeat) {
        this.click(520, 120, 0.22);
      } else {
        this.click(360, 90, 0.18);
      }
    }

    playStartCue() {
      this.click(330, 130, 0.2);
      this.click(500, 140, 0.18);
    }

    playTestTone() {
      if (this.useHtmlAudioFallback) {
        this.playFallback(260, 550, 0.9);
        setTimeout(() => this.playFallback(390, 550, 0.9), 300);
        setTimeout(() => this.playFallback(520, 700, 0.9), 600);
        return;
      }
      this.rawBeep(260, 550, 0.7);
      setTimeout(() => this.rawBeep(390, 550, 0.7), 300);
      setTimeout(() => this.rawBeep(520, 700, 0.7), 600);
    }
  }

  window.MusicLanesAudio = MusicLanesAudio;
})();
