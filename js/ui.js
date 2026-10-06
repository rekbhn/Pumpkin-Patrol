'use strict';

const UI = (() => {
  const $ = id => document.getElementById(id);
  const SCREENS = ['scr-title', 'scr-help', 'scr-levels', 'scr-book', 'scr-album', 'scr-intro', 'scr-pause', 'scr-complete', 'scr-over', 'scr-victory'];
  const cache = {};
  let current = 'scr-title';
  let backTo = 'scr-title';
  let bannerTimer = null;
  let candyPosCache = null;

  function show(id) {
    SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id));
    current = id;
  }
  function hideAll() { SCREENS.forEach(s => $(s).classList.add('hidden')); current = null; }
  function setHud(on) { $('hud').classList.toggle('hidden', !on); candyPosCache = null; }
  function set(id, v) {
    if (cache[id] === v) return;
    cache[id] = v;
    $(id).textContent = v;
  }

  function openSub(id) { backTo = current || 'scr-title'; show(id); }

  function act(name, el) {
    Sfx.init();
    Sfx.click();
    switch (name) {
      case 'play': startLevel(Math.min(Save.d.maxLevel, LEVELS.length) - 1); break;
      case 'levels': renderLevels(); openSub('scr-levels'); break;
      case 'book': renderBook(); openSub('scr-book'); break;
      case 'album': renderAlbum(); openSub('scr-album'); break;
      case 'help': openSub('scr-help'); break;
      case 'back': show(backTo); break;
      case 'go': hideAll(); setHud(true); G.state = 'play'; G.phaseT = 0; break;
      case 'pause': pause(); break;
      case 'resume': resume(); break;
      case 'restart': startLevel(G.li); break;
      case 'menu': toTitle(); break;
      case 'next': if (G.li + 1 < LEVELS.length) startLevel(G.li + 1); else toTitle(); break;
      case 'mute': toggleMute(); break;
      case 'level': startLevel(parseInt(el.dataset.i, 10)); break;
    }
  }

  function pause() {
    if (G.state !== 'play') return;
    G.state = 'paused';
    G.firing = false;
    show('scr-pause');
  }
  function resume() {
    if (G.state !== 'paused') return;
    hideAll();
    G.state = 'play';
  }

  function toTitle() {
    G.state = 'title';
    G.lv = null;
    G.parts = []; G.texts = [];
    setHud(false);
    hideBoss();
    $('banner').classList.add('hidden');
    show('scr-title');
    Sfx.music('title');
  }

  function toggleMute() {
    const m = Sfx.toggleMute();
    $('btn-mute-hud').textContent = m ? '🔇' : '🔊';
    $('btn-mute-title').textContent = m ? '🔇 Sound' : '🔊 Sound';
  }

  function banner(html, color = 'orange', dur = 2) {
    const b = $('banner');
    b.innerHTML = html;
    b.className = color;
    b.style.animation = 'none';
    void b.offsetHeight;
    b.style.animation = '';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  }

  function buildWeapons() {
    const box = $('weapons');
    box.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const b = document.createElement('button');
      const unlocked = isUnlocked(w.id);
      b.className = 'wbtn' + (G.p && G.p.weapon === w.id ? ' active' : '') + (unlocked ? '' : ' locked');
      b.innerHTML = `<span class="key">${i + 1}</span>${unlocked ? w.icon : '🔒'}`;
      b.title = unlocked ? `${w.name}: ${w.desc}` : `Unlocks in World ${w.unlock}`;
      b.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); Sfx.init(); setWeapon(w.id); });
      box.appendChild(b);
    });
  }

  function showBoss(name) { $('bossbar').classList.remove('hidden'); set('boss-name', name); }
  function hideBoss() { $('bossbar').classList.add('hidden'); }

  function hud() {
    if (G.state !== 'play' && G.state !== 'paused') return;
    const p = G.p;
    set('hearts', '❤️'.repeat(Math.max(0, p.hearts)) + '🤍'.repeat(Math.max(0, p.max - p.hearts)));
    set('candy', String(G.candy));
    set('score', String(G.score));
    let label = `${G.lv.icon} World ${G.lv.id}: ${G.lv.name}`;
    let prog = G.phase === 'waves' ? Math.min(1, G.defeated / G.goal) : 1;
    if (G.phase === 'waves') label += `  (${Math.min(G.defeated, G.goal)}/${G.goal})`;
    set('lvl-name', label);
    const pw = Math.round(prog * 100) + '%';
    if (cache.lvlbar !== pw) { cache.lvlbar = pw; $('lvl-bar').style.width = pw; }
    if (G.power) {
      const P = POWER_BY_ID[G.power.id];
      $('power').classList.remove('hidden');
      set('power', `${P.icon} ${P.name} ${Math.ceil(G.power.t)}s`);
    } else $('power').classList.add('hidden');
    const b = G.boss;
    if (b && !b.defeated) {
      let f, txt;
      if (b.type === 'king') { f = b.kills / b.goal; txt = `${BOSSES.king.name} — Protect him! ${b.kills}/${b.goal}  ${'💛'.repeat(Math.max(0, b.happy))}`; }
      else if (b.type === 'moon') { f = b.fed / b.maxHp; txt = `${BOSSES.moon.name} — Feed it! ${b.fed}/${b.maxHp}`; }
      else { f = Math.max(0, b.hp) / b.maxHp; txt = BOSSES[b.type].name; }
      set('boss-name', txt);
      const w = Math.round(f * 100) + '%';
      if (cache.bossfill !== w) { cache.bossfill = w; $('boss-fill').style.width = w; }
    }
  }

  function candyPos() {
    if (!candyPosCache) {
      const el = $('candy-pill'), st = $('stage').getBoundingClientRect(), r = el.getBoundingClientRect();
      if (!r.width) return { x: W - 230, y: 28 };
      candyPosCache = { x: (r.left + r.width / 2 - st.left) / st.width * W, y: (r.top + r.height / 2 - st.top) / st.height * H };
    }
    return candyPosCache;
  }

  function bumpCandy() {
    const el = $('candy-pill');
    el.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 200 });
  }

  function showIntro(lv) {
    setHud(false);
    $('intro-num').textContent = `WORLD ${lv.id} OF ${LEVELS.length}`;
    $('intro-icon').textContent = lv.icon;
    $('intro-name').textContent = lv.name;
    $('intro-tip').textContent = lv.tip;
    let html = '';
    const unique = [...new Set(lv.pool)];
    if (unique.length > 8) html += '<span class="chip">😱 EVERY monster!</span>';
    else html += unique.map(t => `<span class="chip">${ENEMY_TYPES[t].name}</span>`).join('');
    const nw = WEAPONS.find(w => w.unlock === lv.id && lv.id > 1);
    if (nw) html += `<div><span class="chip new">NEW WEAPON: ${nw.icon} ${nw.name}! (press ${WEAPONS.indexOf(nw) + 1})</span></div>`;
    if (lv.boss) html += `<div><span class="chip bossc">BOSS: ${BOSSES[lv.boss].name}</span></div>`;
    $('intro-extra').innerHTML = html;
    show('scr-intro');
  }

  function statRow(label, value) { return `<div class="row"><span>${label}</span><b>${value}</b></div>`; }

  function showComplete(r) {
    setHud(false);
    $('complete-title').textContent = `${G.lv.icon} ${G.lv.name} Saved!`;
    $('complete-stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < r.stars ? '' : 'off'}">🎃</span>`).join('');
    $('complete-stats').innerHTML =
      statRow('Monsters bonked', G.defeated) +
      statRow('Candy collected', `🍬 ${G.candy}`) +
      statRow('Ghosts caught', `👻 ${G.captured}`) +
      (G.rescued ? statRow('Pumpkins rescued', `🎃 ${G.rescued}`) : '') +
      (r.jacks ? statRow("Happy jack-o'-lanterns", `+${r.jacks * 50}`) : '') +
      (r.babies ? statRow('Baby pumpkins following you', `+${r.babies * 50}`) : '') +
      statRow('Pumpkin protection', r.perfect ? 'PERFECT! +200' : `${G.oops} oops`) +
      statRow('Score', `⭐ ${G.score}`);
    show('scr-complete');
  }

  function showGameOver() { setHud(false); hideBoss(); show('scr-over'); }

  function showVictory() {
    setHud(false);
    const ghosts = GHOSTS.filter(g => Save.d.ghosts[g.id]).length;
    $('victory-stats').innerHTML =
      statRow('Final score', `⭐ ${G.score}`) +
      statRow('Candy in your bag (all time)', `🍬 ${Save.d.candy}`) +
      statRow('Ghost Book', `👻 ${ghosts}/${GHOSTS.length}`);
    show('scr-victory');
  }

  function renderLevels() {
    const g = $('level-grid');
    g.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const unlocked = lv.id <= Save.d.maxLevel;
      const st = Save.d.stars[lv.id] || 0;
      const b = document.createElement('button');
      b.className = 'lvl' + (unlocked ? '' : ' locked');
      b.innerHTML = `<div class="lnum">World ${lv.id}</div><div class="li">${unlocked ? lv.icon : '🔒'}</div><div class="ln">${lv.name}</div><div class="ls">${'🎃'.repeat(st) || '&nbsp;'}</div>`;
      if (unlocked) { b.dataset.act = 'level'; b.dataset.i = i; }
      g.appendChild(b);
    });
  }

  function thumb(size, fn, silhouette, scale, dy = 0) {
    const cv = document.createElement('canvas');
    cv.width = size * 2; cv.height = size * 2;
    const x = cv.getContext('2d');
    x.translate(cv.width / 2, cv.height / 2 + dy * 2);
    x.scale(scale * 2, scale * 2);
    if (silhouette) x.filter = 'brightness(0) opacity(0.4)';
    fn(x);
    return cv;
  }

  function renderBook() {
    const g = $('book-grid');
    g.innerHTML = '';
    let n = 0;
    GHOSTS.forEach(gh => {
      const c = Save.d.ghosts[gh.id] || 0;
      if (c) n++;
      const card = document.createElement('div');
      card.className = 'gcard' + (c ? '' : ' unknown');
      card.appendChild(thumb(84, x => {
        if (gh.id === 'invisible' && c) x.globalAlpha = 0.35;
        ART.ghost(x, 0.5, { variant: gh.id });
      }, !c, gh.id === 'giant' ? 1.25 : 1.05, 10));
      card.insertAdjacentHTML('beforeend',
        `<b>${c ? gh.name : '???'}</b><div>${c ? gh.desc : 'Catch ghosts with the 🫧 Bubble Blaster!'}</div>${c ? `<div class="cnt">Caught ×${c}</div>` : ''}`);
      g.appendChild(card);
    });
    $('book-count').textContent = `You've collected ${n} of ${GHOSTS.length} ghosts!`;
  }

  function renderAlbum() {
    const totalGhosts = Object.values(Save.d.ghosts).reduce((a, b) => a + b, 0);
    const items = [
      { icon: '🍬', name: 'Candy', n: Save.d.candy },
      { icon: '👻', name: 'Ghost Cards', n: totalGhosts },
      ...COLLECTIBLES.map(c => ({ icon: c.icon, name: c.name, n: Save.d.items[c.id] || 0 })),
    ];
    $('album-items').innerHTML = items.map(it =>
      `<div class="aitem ${it.n ? '' : 'none'}"><div class="ai">${it.icon}</div><b>${it.n}</b>${it.name}</div>`).join('');
    const box = $('bestiary');
    box.innerHTML = '';
    BESTIARY_ORDER.forEach(type => {
      const T = ENEMY_TYPES[type];
      const met = Save.d.met[type] || 0;
      const row = document.createElement('div');
      row.className = 'beast' + (met ? '' : ' unknown');
      row.appendChild(thumb(58, x => {
        ART[T.art](x, 0.5, { variant: 'baby', rise: 1, seed: 0 });
      }, !met, type === 'tiny' ? 0.6 : type === 'witch' ? 0.62 : 0.75, type === 'ghoul' ? -6 : 0));
      row.insertAdjacentHTML('beforeend', `<div><b>${met ? T.name : '???'}</b>${met ? `${T.desc}<br>Bonked ×${met}` : 'Not met yet!'}</div>`);
      box.appendChild(row);
    });
  }

  function init() {
    document.addEventListener('click', ev => {
      const b = ev.target.closest('[data-act]');
      if (b) act(b.dataset.act, b);
    });
    $('btn-mute-hud').textContent = Sfx.muted ? '🔇' : '🔊';
    $('btn-mute-title').textContent = Sfx.muted ? '🔇 Sound' : '🔊 Sound';
    window.addEventListener('resize', () => { candyPosCache = null; });
  }

  return {
    init, show, hideAll, banner, buildWeapons, showBoss, hideBoss, hud, candyPos, bumpCandy,
    showIntro, showComplete, showGameOver, showVictory, pause, resume, toggleMute, toTitle,
  };
})();

// ---------------------------------------------------------------- boot

Save.load();
resize();
UI.init();
BG.prebuild('patch');
UI.toTitle();
requestAnimationFrame(frame);
document.addEventListener('pointerdown', () => Sfx.init(), { once: true });
