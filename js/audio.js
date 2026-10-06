'use strict';

// Tiny synthesized sound effects and music (no audio files needed).
const Sfx = (() => {
  let ac = null, master = null, sfx = null, music = null, noiseBuf = null;
  let muted = localStorage.getItem('pp_muted') === '1';
  let musicMode = null, musicTimer = null, nextTime = 0, step = 0;
  const lastPlayed = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
    music = ac.createGain(); music.gain.value = 0.13; music.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (musicMode) startMusic(musicMode, true);
  }

  function throttle(name, gap) {
    const now = performance.now();
    if (lastPlayed[name] && now - lastPlayed[name] < gap) return false;
    lastPlayed[name] = now; return true;
  }

  function tone(f, dur, o = {}) {
    if (!ac) return;
    const t0 = (o.at || ac.currentTime) + (o.delay || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = o.vol || 0.25;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.out || sfx);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, o = {}) {
    if (!ac) return;
    const t0 = ac.currentTime + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = o.filter || 'bandpass'; f.frequency.value = o.freq || 1200; f.Q.value = o.q || 1;
    const g = ac.createGain();
    g.gain.setValueAtTime(o.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(sfx);
    src.start(t0, Math.random() * 0.5, dur + 0.05);
  }

  const NOTE = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };
  function nf(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) - 4) * 12) / 12);
  }

  const SONGS = {
    title: {
      step: 0.17,
      mel: ['E5', null, 'G5', null, 'B5', null, 'A5', 'G5', 'E5', null, 'D5', null, 'E5', null, null, null,
            'C5', null, 'E5', null, 'G5', null, 'F#5', 'E5', 'D#5', null, 'B4', null, 'E5', null, null, null],
      bass: ['E3', 'B3', 'E3', 'B3', 'C3', 'G3', 'B2', 'F#3'],
    },
    game: {
      step: 0.145,
      mel: ['A4', null, 'C5', 'E5', null, 'C5', 'D5', null, 'B4', null, 'G4', 'B4', null, 'A4', null, null,
            'A4', null, 'C5', 'E5', null, 'G5', 'F5', 'E5', 'D5', null, 'B4', 'C5', null, 'A4', null, null],
      bass: ['A2', 'E3', 'F2', 'C3', 'G2', 'D3', 'E2', 'B2'],
    },
    boss: {
      step: 0.12,
      mel: ['E5', 'E5', null, 'G5', null, 'E5', 'D5', null, 'C5', 'C5', null, 'D5', null, 'B4', null, null,
            'E5', 'E5', null, 'G5', null, 'A5', 'G5', null, 'F#5', null, 'D#5', null, 'E5', null, null, null],
      bass: ['E2', 'E2', 'C2', 'C2', 'D2', 'D2', 'B1', 'B1'],
    },
  };

  function scheduleMusic() {
    if (!ac || !musicMode) return;
    const song = SONGS[musicMode];
    while (nextTime < ac.currentTime + 0.25) {
      const n = song.mel[step % song.mel.length];
      if (n) tone(nf(n), song.step * 1.6, { type: 'triangle', vol: 0.5, at: nextTime, out: music, attack: 0.01 });
      if (step % 4 === 0) {
        const b = song.bass[Math.floor(step / 4) % song.bass.length];
        tone(nf(b), song.step * 3.5, { type: 'sine', vol: 0.75, at: nextTime, out: music, attack: 0.02 });
      }
      if (step % 2 === 1) tone(2400, 0.03, { type: 'square', vol: 0.06, at: nextTime, out: music });
      nextTime += song.step;
      step++;
    }
  }

  function startMusic(mode, force) {
    if (musicMode === mode && !force && musicTimer) return;
    musicMode = mode;
    if (!ac) return;
    clearInterval(musicTimer);
    step = 0; nextTime = ac.currentTime + 0.1;
    musicTimer = setInterval(scheduleMusic, 60);
  }

  function stopMusic() { musicMode = null; clearInterval(musicTimer); musicTimer = null; }

  return {
    init,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('pp_muted', muted ? '1' : '0');
      if (master) master.gain.value = muted ? 0 : 0.6;
      return muted;
    },
    music: startMusic,
    stopMusic,
    shoot(id) {
      if (!throttle('shoot', 60)) return;
      switch (id) {
        case 'candy': tone(520, 0.1, { type: 'square', vol: 0.06, to: 900 }); break;
        case 'bubble': tone(280, 0.18, { vol: 0.18, to: 620 }); break;
        case 'sparkle': tone(1300, 0.08, { type: 'triangle', vol: 0.08, to: 2000 }); break;
        case 'cupcake': tone(180, 0.2, { type: 'triangle', vol: 0.25, to: 420 }); break;
        case 'broom': noise(0.14, { freq: 3500, vol: 0.12 }); tone(700, 0.1, { type: 'triangle', vol: 0.06, to: 1100 }); break;
        case 'boomerang': tone(420, 0.3, { type: 'sawtooth', vol: 0.04, to: 260 }); break;
        case 'potion': tone(340, 0.18, { type: 'square', vol: 0.05, to: 760 }); break;
        case 'rainbow': tone(600, 0.22, { vol: 0.12, to: 1600 }); tone(900, 0.22, { vol: 0.06, to: 2200, delay: 0.03 }); break;
        default: tone(900, 0.08, { type: 'triangle', vol: 0.06, to: 1400 });
      }
    },
    pop() { if (throttle('pop', 40)) { tone(900, 0.09, { vol: 0.18, to: 220 }); noise(0.06, { freq: 2500, vol: 0.1 }); } },
    poof() { if (throttle('poof', 50)) { noise(0.32, { freq: 700, vol: 0.28, q: 0.7 }); tone(500, 0.2, { vol: 0.08, to: 900 }); } },
    bonk() { if (throttle('bonk', 50)) { tone(320, 0.12, { type: 'square', vol: 0.1, to: 140 }); tone(1600, 0.05, { vol: 0.05, delay: 0.02 }); } },
    boing() { if (throttle('boing', 80)) tone(200, 0.3, { type: 'sine', vol: 0.18, to: 520 }); },
    boo() { if (throttle('boo', 200)) { tone(330, 0.5, { vol: 0.13, to: 220 }); tone(336, 0.5, { vol: 0.08, to: 226, type: 'triangle' }); } },
    giggle() {
      if (!throttle('giggle', 300)) return;
      [900, 1100, 950, 1200, 1000].forEach((f, i) => tone(f, 0.07, { type: 'triangle', vol: 0.07, delay: i * 0.07 }));
    },
    oops() { tone(420, 0.16, { type: 'square', vol: 0.09, to: 330 }); tone(330, 0.32, { type: 'square', vol: 0.09, to: 200, delay: 0.16 }); },
    coin() { if (throttle('coin', 45)) { tone(988, 0.07, { type: 'square', vol: 0.045 }); tone(1319, 0.16, { type: 'square', vol: 0.045, delay: 0.06 }); } },
    capture() { [660, 880, 1100, 1320].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.1, delay: i * 0.06 })); },
    power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, { type: 'square', vol: 0.06, delay: i * 0.07 })); },
    meow() { tone(520, 0.12, { type: 'triangle', vol: 0.14, to: 820 }); tone(820, 0.32, { type: 'triangle', vol: 0.14, to: 430, delay: 0.11 }); },
    hurt() { tone(520, 0.3, { type: 'triangle', vol: 0.2, to: 160 }); },
    knock() { [0, 0.16, 0.32].forEach(d => noise(0.06, { freq: 260, vol: 0.6, q: 2, delay: d })); },
    yay() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, delay: i * 0.08 })); },
    fanfare() {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.52], [1047, 0.64]].forEach(([f, d]) =>
        tone(f, 0.28, { type: 'square', vol: 0.07, delay: d }));
    },
    bossIntro() { [196, 185, 175, 165].forEach((f, i) => tone(f, 0.4, { type: 'sawtooth', vol: 0.07, delay: i * 0.25 })); },
    burp() { tone(110, 1.1, { type: 'sawtooth', vol: 0.3, to: 55 }); noise(1.0, { freq: 220, vol: 0.4, q: 0.6 }); },
    nom() { if (throttle('nom', 150)) tone(240, 0.12, { type: 'square', vol: 0.08, to: 120 }); },
    click() { tone(800, 0.05, { type: 'triangle', vol: 0.08 }); },
  };
})();
