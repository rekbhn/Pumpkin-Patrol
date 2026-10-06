'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stageEl = document.getElementById('stage');
let DPR = 1, viewScale = 1, uid = 0;

const CANDY_COLORS = ['#ff5fa2', '#7ad0ff', '#ffd65c', '#7aff9a', '#c87aff'];
const CANDY_ICONS = ['🍬', '🍭', '🍫', '🍬'];
const WEAPON_COLORS = { candy: '#ff5fa2', bubble: '#7ad0ff', sparkle: '#c87aff', cupcake: '#ff9ad0', broom: '#c48a52', boomerang: '#9a6ad8', potion: '#7aff9a', rainbow: '#ffd65c' };

// ---------------------------------------------------------------- save data

const Save = {
  d: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem('pumpkinPatrol') || 'null'); } catch (e) { d = null; }
    this.d = Object.assign({ maxLevel: 1, stars: {}, ghosts: {}, items: {}, met: {}, candy: 0, won: false }, d || {});
  },
  write() { try { localStorage.setItem('pumpkinPatrol', JSON.stringify(this.d)); } catch (e) { /* storage full or blocked */ } },
};

// ---------------------------------------------------------------- game state

const G = {
  state: 'title', t: 0, li: 0, lv: null, phase: 'waves', phaseT: 0,
  p: null, enemies: [], pumpkins: [], friends: [], shots: [], eshots: [], items: [], fx: [], parts: [], texts: [],
  houses: [], followers: [], cat: null, boss: null, bossObjs: [], buddy: null, rescue: null,
  score: 0, candy: 0, defeated: 0, goal: 0, spawnT: 0, power: null, oops: 0, captured: 0, rescued: 0,
  timers: {}, shake: 0, aim: { x: W / 2, y: 200 }, firing: false, walkTarget: null, walking: false,
  keys: {}, mouseAim: false,
};

function resize() {
  const sw = stageEl.clientWidth, sh = stageEl.clientHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(sw * DPR);
  canvas.height = Math.round(sh * DPR);
  viewScale = sw / W;
  stageEl.style.setProperty('--u', (sw / W) + 'px');
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- helpers

function say(ent, text, dur = 1.8) { if (ent) ent.say = { text, t: dur, max: dur }; }
function tickSay(ent, dt) { if (ent && ent.say) { ent.say.t -= dt; if (ent.say.t <= 0) ent.say = null; } }
function addText(x, y, text, color = '#fff', size = 20, life = 1.1) {
  G.texts.push({ x: clamp(x, 90, W - 90), y, text, color, size, t: 0, life });
}
function addScore(n, x, y) {
  G.score += n;
  if (x != null) addText(x, y, '+' + n, '#ffe36b', 15, 0.8);
}
function burst(x, y, n, colors, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = o.angle != null ? o.angle + rand(-o.spread, o.spread) : rand(0, TAU);
    const sp = rand(o.min != null ? o.min : 40, o.speed || 220);
    G.parts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 0), t: 0,
      life: rand(o.lifeMin || 0.5, o.life || 1), color: pick(colors), size: rand(o.sizeMin || 3, o.size || 6),
      shape: o.shape || 'circle', grav: o.grav != null ? o.grav : 300, rot: rand(0, 6), spin: rand(-8, 8), text: o.text,
    });
  }
}
function confetti(x, y, n = 40) {
  burst(x, y, n, CANDY_COLORS.concat(['#fff']), { shape: 'confetti', speed: 380, min: 120, grav: 380, size: 9, sizeMin: 5, life: 1.8, up: 120 });
}
function isUnlocked(id) {
  const lvl = Math.max(Save.d.maxLevel, G.lv ? G.lv.id : 1);
  return WEAPON_BY_ID[id].unlock <= lvl;
}
function hittable(e) {
  if (ENEMY_TYPES[e.type].ghost) return e.vis > 0.45;
  if (e.type === 'troll') return !e.hidden;
  if (e.type === 'ghoul') return e.rise > 0.5;
  return true;
}
function enemyY(e) { return e.y + (e.yOff || 0) + (e.hitDy || 0); }
function activeCount() { return G.enemies.filter(e => !ENEMY_TYPES[e.type].minor && !e.minor && !e.kingTarget && !e.orbit).length; }
function minorCount() { return G.enemies.filter(e => e.minor || ENEMY_TYPES[e.type].minor).length; }

// ---------------------------------------------------------------- level setup

function startLevel(i) {
  const lv = LEVELS[i];
  G.li = i; G.lv = lv;
  G.enemies = []; G.pumpkins = []; G.friends = []; G.shots = []; G.eshots = []; G.items = []; G.fx = []; G.parts = []; G.texts = [];
  G.houses = []; G.followers = []; G.boss = null; G.bossObjs = []; G.buddy = null; G.rescue = null;
  const prevWeapon = G.p && WEAPON_BY_ID[G.p.weapon] && WEAPON_BY_ID[G.p.weapon].unlock <= Math.max(Save.d.maxLevel, lv.id) ? G.p.weapon : 'candy';
  G.p = { x: W / 2, y: PLAYER_Y, hearts: 5, max: 5, inv: 0, cool: 0, weapon: prevWeapon, face: 1, moving: 0, aimAng: -Math.PI / 2 };
  G.score = 0; G.candy = 0; G.defeated = 0; G.goal = lv.goal; G.spawnT = 1.2;
  G.power = null; G.oops = 0; G.captured = 0; G.rescued = 0; G.rescueCount = 0; G.newGhosts = 0; G.found = 0;
  G.phase = 'waves'; G.phaseT = 0; G.shake = 0; G.result = null; G.shownComplete = false;
  G.timers = { roll: rand(7, 11), gold: rand(8, 12), baby: rand(15, 20), friend: rand(5, 9) };
  G.firing = false; G.walkTarget = null; G.walking = false;
  placeHouses(lv);
  placePumpkins(lv);
  G.cat = { x: G.p.x - 60, dir: 1, meowT: rand(10, 16), say: null, moving: false, findT: 0, meow: 0, t: 0 };
  BG.prebuild(lv.bg);
  G.state = 'intro';
  UI.showIntro(lv);
  UI.buildWeapons();
  UI.hideBoss();
  Sfx.music('game');
}

function placeHouses(lv) {
  const xs = lv.houses >= 2 ? [78, W - 78] : [W - 80];
  for (const x of xs) G.houses.push({ x, cd: 2, open: 0, say: null, pending: null, tricks: 0, trickT: 0 });
}

function placePumpkins(lv) {
  const n = lv.pumpkins;
  for (let i = 0; i < n; i++) {
    let x = lerp(165, W - 165, n === 1 ? 0.5 : i / (n - 1)) + rand(-22, 22);
    for (const h of G.houses) if (Math.abs(x - h.x) < 118) x = h.x + Math.sign(x - h.x || 1) * 118;
    if (lv.boss === 'king' && Math.abs(x - W / 2) < 120) x = W / 2 + Math.sign(x - W / 2 || 1) * 125;
    const r = rand(22, 30);
    const face = (i === 1 || Math.random() < 0.22) ? 'jack' : (i % 2 ? 'talk' : 'smile');
    G.pumpkins.push({ kind: 'static', x, y: GROUND_Y - r * 0.84, r, face, t: rand(0, 10), sayT: rand(3, 9), harmed: false, sad: 0, jump: 0, oopsCd: 0, celebrateT: 0 });
  }
}

// ---------------------------------------------------------------- spawning

function pickGhostVariant() {
  const r = Math.random();
  if (r < 0.07) return 'giant';
  if (r < 0.14) return 'invisible';
  const common = ['baby', 'sleepy', 'rainbow', 'pirate', 'cowboy', 'princess', 'ninja', 'wizard'];
  const missing = common.filter(v => !Save.d.ghosts[v]);
  if (missing.length && Math.random() < 0.5) return pick(missing);
  return pick(common);
}

function freeGroundX(margin = 70) {
  for (let k = 0; k < 14; k++) {
    const x = rand(110, W - 110);
    if (G.pumpkins.some(pk => pk.kind === 'static' && Math.abs(pk.x - x) < margin)) continue;
    if (G.houses.some(h => Math.abs(h.x - x) < 90)) continue;
    return x;
  }
  return rand(110, W - 110);
}

function spawnEnemy(type, o = {}) {
  const T = ENEMY_TYPES[type];
  const side = Math.random() < 0.5 ? -1 : 1;
  const e = {
    type, id: ++uid, r: T.r, hp: T.hp, t: 0, st: 0, x: 0, y: 0, vx: 0, vy: 0, dir: -side, flash: 0, vis: 1,
    state: 'move', attackT: rand(4, 8), seed: rand(0, 10), yOff: 0, kx: 0, hopCd: 1, hop: 0, entered: false, say: null,
  };
  if (T.walk) { e.x = side < 0 ? -40 : W + 40; e.y = GROUND_Y - e.r * 0.92; }
  else if (T.fly) { e.x = side < 0 ? -40 : W + 40; e.baseY = e.y = rand(90, 320); e.vx = -side * rand(60, 105); }
  switch (type) {
    case 'ghost':
      e.variant = pickGhostVariant();
      if (e.variant === 'giant') e.r = 42;
      e.vis = 0; e.state = 'gone'; e.st = 0.7; break;
    case 'tiny':
      e.variant = Math.random() < 0.5 ? 'baby' : pickGhostVariant();
      if (e.variant === 'giant') e.variant = 'baby';
      e.state = 'move'; e.vx = rand(-120, 120); e.vy = rand(-200, -80); e.entered = true; break;
    case 'blob': e.vis = 1; break;
    case 'spider': e.x = e.ax = rand(90, W - 90); e.y = -30; e.ty = rand(150, 330); e.state = 'drop'; e.drops = 0; break;
    case 'ghoul':
      e.x = freeGroundX(); e.y = GROUND_Y - 22; e.rise = 0; e.state = 'rise'; e.hitDy = -14; e.entered = true;
      e.graveText = pick(['RIP', 'BOO', 'ZZZ', 'LOL', 'HI!', 'YUM']); break;
    case 'goblin': e.throwT = rand(1.5, 2.5); break;
    case 'skeleton':
      e.x = freeGroundX(50); e.danceT = 1.8; e.nextDance = rand(6, 9); e.entered = true;
      burst(e.x, e.y, 12, ['#fff', '#e8e0ff'], { shape: 'puff', speed: 120, grav: -40, size: 12, sizeMin: 5, life: 0.6 });
      say(e, pick(LINES.skeleton), 1.5); break;
    case 'werewolf': e.howlT = rand(3, 5); e.howl = 0; e.embarrassed = 0; break;
    case 'troll': e.state = 'go'; break;
    case 'vbat': e.x = side < 0 ? -30 : W + 30; e.y = rand(50, 130); e.state = 'steal'; break;
    case 'witch': e.baseY = e.y = rand(100, 270); break;
  }
  Object.assign(e, o);
  if (e.baseY == null) e.baseY = e.y;
  G.enemies.push(e);
  return e;
}

function spawnTiny(x, y) {
  return spawnEnemy('tiny', { x, y, baseY: y });
}

function updateSpawner(dt) {
  G.spawnT -= dt;
  const active = activeCount();
  if (G.spawnT <= 0 && active < G.lv.max && G.defeated + active < G.goal + 2) {
    spawnEnemy(pick(G.lv.pool));
    G.spawnT = G.lv.rate * rand(0.7, 1.3);
  }
  const marks = G.lv.id >= 6 ? [0.3, 0.68] : [0.42];
  if (G.rescueCount < marks.length && !G.rescue && G.defeated >= Math.floor(G.goal * marks[G.rescueCount])) {
    G.rescueCount++;
    startRescue();
  }
}

function updateTimers(dt) {
  const T = G.timers;
  T.roll -= dt; if (T.roll <= 0) { T.roll = rand(11, 17); spawnRoller(); }
  T.gold -= dt; if (T.gold <= 0) { T.gold = rand(12, 18); spawnLanePumpkin('golden'); }
  T.baby -= dt; if (T.baby <= 0) { T.baby = rand(20, 30); if (G.followers.length < 5) spawnLanePumpkin('baby'); }
  T.friend -= dt; if (T.friend <= 0) { T.friend = rand(11, 17); spawnFriend(); }
}

function spawnRoller() {
  const side = Math.random() < 0.5 ? -1 : 1, r = 24;
  const pk = { kind: 'roller', x: side < 0 ? -40 : W + 40, y: GROUND_Y - r * 0.84, r, vx: -side * rand(80, 110), rot: 0, face: 'happy', t: 0, sad: 0, oopsCd: 0, jump: 0, celebrateT: 0 };
  G.pumpkins.push(pk);
  say(pk, pick(['Wheee!', 'Rolling through!', 'Beep beep!']), 1.6);
}

function spawnLanePumpkin(kind) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const gold = kind === 'golden';
  const r = gold ? 20 : 15;
  const pk = {
    kind, x: side < 0 ? -30 : W + 30, y: PLAYER_Y - r * 0.84, r, vx: -side * (gold ? 120 : 70), rot: 0,
    face: gold ? 'happy' : 'baby', shootable: false, t: 0, sad: 0, oopsCd: 0, jump: 0, celebrateT: 0, hop: 0,
  };
  G.pumpkins.push(pk);
  say(pk, gold ? 'Catch me for a POWER-UP!' : 'Can I follow you?', 2);
}

function spawnFriend() {
  const types = G.lv.friends;
  if (!types || !types.length || G.friends.length >= 2) return;
  const type = pick(types);
  const side = Math.random() < 0.5 ? -1 : 1;
  const f = { type, r: FRIEND_TYPES[type].r, x: side < 0 ? -40 : W + 40, y: rand(130, 290), vx: -side * rand(45, 70), t: 0, seed: rand(0, 9), say: null, sad: 0, dir: -side, hiT: 1.6 };
  if (type === 'spiderf') { f.x = rand(140, W - 140); f.y = -30; f.state = 'drop'; f.ty = rand(150, 250); f.vx = 0; f.dir = 1; }
  f.baseY = f.y;
  G.friends.push(f);
}

// ---------------------------------------------------------------- pumpkin rescue

function startRescue() {
  const cands = G.pumpkins.filter(pk => pk.kind === 'static');
  if (!cands.length) return;
  const pk = pick(cands);
  const flyers = G.lv.pool.filter(t => ENEMY_TYPES[t].fly && t !== 'vbat');
  const type = flyers.length ? pick(flyers) : 'bat';
  pk.rescue = true;
  G.rescue = { pk, left: 4, failed: false };
  for (let i = 0; i < 4; i++) {
    spawnEnemy(type === 'blob' ? 'ghost' : type, { orbit: pk, orbA: i * TAU / 4, orbR: pk.r + 50, vis: 1, state: 'orbit', x: pk.x, y: pk.y, entered: true });
  }
  UI.banner('🎃 PUMPKIN RESCUE! 🎃<br><small>Bonk the monsters — NOT the pumpkin!</small>', 'purple', 2.6);
  say(pk, 'Help! Help!', 2.5);
  Sfx.bossIntro();
}

function finishRescue() {
  const R = G.rescue; G.rescue = null;
  if (!R) return;
  const pk = R.pk; pk.rescue = false;
  if (!R.failed) {
    G.rescued++;
    say(pk, 'THANK YOU, HERO!', 2.4);
    pk.celebrateT = 2.5;
    addScore(100, pk.x, pk.y - 50);
    if (G.p.hearts < G.p.max) { G.p.hearts++; addText(G.p.x, G.p.y - 115, '+1 ❤️', '#ff8ab3', 22, 1.3); }
    dropCollectible(pk.x, pk.y - 30, 'sticker');
    UI.banner('PUMPKIN SAVED! 🎃💖<br><small>+100 points and a Pumpkin Sticker!</small>', 'gold', 2.2);
    Sfx.yay();
    burst(pk.x, pk.y - 20, 16, ['#ff6aa8', '#ff9ad0', '#fff'], { shape: 'heart', speed: 200, grav: -60, size: 9, sizeMin: 5, life: 1.4 });
  } else {
    say(pk, 'Thanks… but ouch!', 2);
  }
}

// ---------------------------------------------------------------- player & weapons

function clampAim(a) {
  const lo = -Math.PI + 0.1, hi = -0.1;
  if (a > hi && a <= Math.PI / 2) return hi;
  if (a > Math.PI / 2 || a < lo) return lo;
  return a;
}

function updateAim() {
  const p = G.p;
  const a = clampAim(Math.atan2(G.aim.y - (p.y - 36), G.aim.x - (p.x + p.face * 6)));
  p.aimAng = a;
  p.face = Math.cos(a) >= 0 ? 1 : -1;
}

function updatePlayer(dt) {
  const p = G.p, K = G.keys;
  const sugar = G.power && G.power.id === 'sugar';
  const speed = 320 * (sugar ? 2.2 : 1);
  let mv = 0;
  if (K.ArrowLeft || K.KeyA) mv -= 1;
  if (K.ArrowRight || K.KeyD) mv += 1;
  if (mv) { G.walkTarget = null; p.x += mv * speed * dt; }
  else if (G.walkTarget != null) {
    const dx = G.walkTarget - p.x;
    if (Math.abs(dx) < 4) { if (!G.walking) G.walkTarget = null; }
    else { const st = clamp(dx, -speed * dt, speed * dt); p.x += st; mv = Math.sign(st); }
  }
  p.x = clamp(p.x, 28, W - 28);
  p.moving = mv;
  if (sugar && mv && Math.random() < 0.5) burst(p.x - mv * 20, p.y - 20, 1, CANDY_COLORS, { speed: 40, grav: 0, life: 0.4 });
  updateAim();
  p.inv = Math.max(0, p.inv - dt);
  p.cool -= dt;
  if ((G.firing || K.Space) && p.cool <= 0) fire();
}

function setWeapon(id) {
  if (!G.p) return;
  if (!isUnlocked(id)) { addText(G.p.x, G.p.y - 120, `Unlocks in World ${WEAPON_BY_ID[id].unlock}!`, '#ffb3d6', 16, 1.2); return; }
  if (G.p.weapon === id) return;
  G.p.weapon = id;
  Sfx.click();
  addText(G.p.x, G.p.y - 120, `${WEAPON_BY_ID[id].icon} ${WEAPON_BY_ID[id].name}`, '#fff', 17, 1);
  UI.buildWeapons();
}

function cycleWeapon(d) {
  const list = WEAPONS.filter(w => isUnlocked(w.id));
  const i = list.findIndex(w => w.id === G.p.weapon);
  setWeapon(list[(i + d + list.length) % list.length].id);
}

function addShot(kind, x, y, ang, speed, o = {}) {
  const s = Object.assign({ kind, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 9, dmg: 1, t: 0, life: 3, hit: new Set(), trail: [], seed: rand(0, 6) }, o);
  G.shots.push(s);
  return s;
}

function fire() {
  const p = G.p, w = WEAPON_BY_ID[p.weapon];
  const pw = G.power ? G.power.id : null;
  p.cool = w.rate * (pw === 'sugar' ? 0.55 : 1);
  const a = p.aimAng;
  const mx = p.x + p.face * 6 + Math.cos(a) * 38, my = p.y - 36 + Math.sin(a) * 38;
  const spread = pw === 'sparkle' ? [-0.13, 0, 0.13] : [0];
  const ex = pw === 'witch' ? { homing: true, magic: true } : {};
  for (const d of spread) {
    const ang = a + d;
    switch (w.id) {
      case 'candy': addShot('candy', mx, my, ang, 640, Object.assign({ r: 10, color: pick(CANDY_COLORS) }, ex)); break;
      case 'bubble': addShot('bubble', mx, my, ang, 400, Object.assign({ r: 16, trap: true }, ex)); break;
      case 'sparkle': addShot('star', mx, my, ang, 860, Object.assign({ r: 9, hue: rand(0, 360) }, ex)); break;
      case 'cupcake': addShot('cupcake', mx, my, ang, 470, Object.assign({ r: 14, dmg: 2, splash: 75 }, ex)); break;
      case 'broom': for (const s of [-0.17, 0, 0.17]) addShot('leaf', mx, my, ang + s, 580, Object.assign({ r: 9, hue: rand(10, 45) }, ex)); break;
      case 'boomerang': addShot('boomer', mx, my, ang, 620, Object.assign({ r: 17, pierce: true, range: 420, ox: mx, oy: my, life: 4 }, ex, { homing: false })); break;
      case 'potion': addShot('potion', mx, my, ang, 500, Object.assign({ r: 12, tx: G.aim.x, ty: G.aim.y }, ex)); break;
      case 'rainbow': addShot('rainbow', mx, my, ang, 980, Object.assign({ r: 11, rainbow: true }, ex)); break;
    }
  }
  Sfx.shoot(w.id);
  if (pw === 'sparkle' || pw === 'witch') burst(mx, my, 3, ['#fff', '#ffe36b', '#ff9ad0'], { shape: 'star', speed: 80, grav: 0, life: 0.4 });
}

function nearestTarget(x, y, maxD) {
  let best = null, bd = maxD;
  for (const e of G.enemies) {
    if (!hittable(e)) continue;
    const d = dist(x, y, e.x, enemyY(e));
    if (d < bd) { bd = d; best = { x: e.x, y: enemyY(e) }; }
  }
  for (const o of G.bossObjs) {
    const d = dist(x, y, o.x, o.y);
    if (d < bd) { bd = d; best = { x: o.x, y: o.y }; }
  }
  const b = G.boss;
  if (b && !b.defeated && b.type !== 'king' && bossHittable(b)) {
    const d = dist(x, y, b.x, b.y + (b.hy || 0));
    if (d < bd + 200) best = best || { x: b.x, y: b.y + (b.hy || 0) };
  }
  return best;
}

function updateShots(dt) {
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    if (!s) continue;
    s.t += dt;
    let dead = false;
    if (s.homing) {
      const tgt = nearestTarget(s.x, s.y, 420);
      if (tgt) {
        const want = Math.atan2(tgt.y - s.y, tgt.x - s.x);
        let cur = Math.atan2(s.vy, s.vx), d = want - cur;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        cur += clamp(d, -7 * dt, 7 * dt);
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(cur) * sp; s.vy = Math.sin(cur) * sp;
      }
    }
    if (s.kind === 'boomer') {
      if (!s.back && (dist(s.x, s.y, s.ox, s.oy) > s.range || s.t > 0.75)) { s.back = true; s.hit.clear(); }
      if (s.back) {
        const tx = G.p.x, ty = G.p.y - 40, a = Math.atan2(ty - s.y, tx - s.x);
        s.vx = Math.cos(a) * 680; s.vy = Math.sin(a) * 680;
        if (dist(s.x, s.y, tx, ty) < 30) dead = true;
      }
    }
    if (s.kind === 'potion' && dist(s.x, s.y, s.tx, s.ty) < 16) { potionBurst(s.x, s.y); dead = true; }
    if (s.kind === 'rainbow') { s.trail.push([s.x, s.y]); if (s.trail.length > 9) s.trail.shift(); }
    if (!dead) {
      const step = Math.hypot(s.vx, s.vy) * dt;
      const n = Math.max(1, Math.ceil(step / 10));
      for (let k = 0; k < n && !dead; k++) {
        s.x += s.vx * dt / n; s.y += s.vy * dt / n;
        if (collideShot(s)) dead = true;
      }
    }
    if (s.kind !== 'boomer' && (s.x < -60 || s.x > W + 60 || s.y < -80 || s.y > H + 40)) dead = true;
    if (s.t > s.life) dead = true;
    if (dead) { const idx = G.shots.indexOf(s); if (idx >= 0) G.shots.splice(idx, 1); }
  }
}

function collideShot(s) {
  if (!s.magic) {
    for (const pk of G.pumpkins) {
      if (pk.shootable === false || s.hit.has(pk)) continue;
      if (dist(s.x, s.y, pk.x, pk.y) < pk.r * 0.88 + s.r * 0.55) {
        s.hit.add(pk);
        oopsPumpkin(pk);
        burst(s.x, s.y, 6, ['#ffb347', '#fff'], { speed: 120 });
        if (s.kind === 'boomer') { s.back = true; return false; }
        return true;
      }
    }
    for (const f of G.friends) {
      if (s.hit.has(f)) continue;
      if (dist(s.x, s.y, f.x, f.y) < f.r + s.r * 0.55) {
        s.hit.add(f);
        oopsFriend(f);
        if (s.kind === 'boomer') { s.back = true; return false; }
        return true;
      }
    }
    const kb = G.boss;
    if (kb && kb.type === 'king' && !s.hit.has(kb) && dist(s.x, s.y, kb.x, kb.y) < 64) {
      s.hit.add(kb);
      oopsKing(kb);
      if (s.kind === 'boomer') { s.back = true; return false; }
      return true;
    }
  }
  for (const es of G.eshots) {
    if (!es.dead && dist(s.x, s.y, es.x, es.y) < es.r + s.r) { popEnemyShot(es); return !s.pierce; }
  }
  for (const o of G.bossObjs) {
    if (o.dead || s.hit.has(o)) continue;
    if (dist(s.x, s.y, o.x, o.y) < o.r + s.r * 0.6) {
      if (s.pierce) s.hit.add(o);
      if (s.kind === 'potion') { potionBurst(s.x, s.y); return true; }
      hitBossObj(o);
      return !s.pierce;
    }
  }
  const b = G.boss;
  if (b && b.type !== 'king' && !b.defeated && !s.hit.has(b) && (b.type !== 'boo' || b.vis > 0.5)) {
    if (dist(s.x, s.y, b.x, b.y + (b.hy || 0)) < b.hr + s.r * 0.5) {
      if (s.pierce) s.hit.add(b);
      if (s.kind === 'potion') { potionBurst(s.x, s.y); return true; }
      if (b.type === 'count' && b.scared <= 0) { fluffBlock(b, s); return true; }
      hitBoss(b, s);
      return !s.pierce;
    }
  }
  for (const e of G.enemies) {
    if (!hittable(e) || s.hit.has(e)) continue;
    if (dist(s.x, s.y, e.x, enemyY(e)) < e.r * 0.9 + s.r * 0.55) {
      if (s.pierce) s.hit.add(e);
      hitEnemy(e, s);
      return !s.pierce;
    }
  }
  return false;
}

function hitEnemy(e, s) {
  if (s.kind === 'potion') { potionBurst(s.x, s.y); return; }
  if (s.trap) { if (e.type === 'grump') damage(e, 1); else defeat(e, 'trap'); return; }
  if (s.rainbow) { if (e.type === 'grump') damage(e, 2); else defeat(e, 'rainbow'); return; }
  damage(e, s.dmg || 1);
  if (s.splash) {
    burst(s.x, s.y, 14, ['#ff9ad0', '#fff36b', '#7ad0ff', '#7aff9a'], { shape: 'confetti', speed: 220, size: 6, life: 0.7 });
    for (const o of [...G.enemies]) {
      if (o !== e && hittable(o) && dist(s.x, s.y, o.x, enemyY(o)) < s.splash + o.r * 0.5) damage(o, 1);
    }
  }
}

function damage(e, dmg) {
  if (!G.enemies.includes(e)) return;
  if (e.type === 'vampire' && !e.batForm && e.hp - dmg > 0) {
    e.hp -= dmg; e.batForm = true; e.state = 'move'; e.entered = true;
    e.vx = (Math.random() < 0.5 ? -1 : 1) * 170; e.baseY = clamp(e.y - 40, 80, 300); e.r = 24;
    say(e, pick(['Bat-escape!', 'Eep! Bat mode!', 'Poof! Bat time!']), 1.4);
    burst(e.x, e.y, 10, ['#3a2a4a', '#d63a5a', '#fff'], { shape: 'puff', speed: 120, grav: -20, size: 10, life: 0.6 });
    Sfx.poof();
    return;
  }
  e.hp -= dmg; e.flash = 0.15;
  if (e.hp <= 0) { defeat(e); return; }
  Sfx.bonk();
  addText(e.x, e.y - e.r - 10, pick(['Bonk!', 'Boing!', 'Eep!', 'Ow-ee!']), '#fff', 16, 0.7);
  if (ENEMY_TYPES[e.type].walk) e.kx = (e.x < G.p.x ? -1 : 1) * 160;
}

function potionBurst(x, y) {
  G.fx.push({ kind: 'cloud', x, y, cx: x, cy: y, t: 0, life: 1.2, e: null });
  burst(x, y, 16, ['#b8ff8a', '#d8a8ff', '#ff9ad0'], { shape: 'puff', speed: 160, grav: -30, size: 14, sizeMin: 6, life: 0.9 });
  Sfx.poof();
  for (const e of [...G.enemies]) {
    const near = dist(x, y, e.x, enemyY(e)) < 90 + e.r * 0.5;
    if (!near) continue;
    if (e.type === 'grump') { damage(e, 2); continue; }
    if (hittable(e) || e.type === 'troll' || e.type === 'ghoul') defeat(e, 'silly');
  }
  const b = G.boss;
  if (b && !b.defeated && b.type !== 'king' && dist(x, y, b.x, b.y + (b.hy || 0)) < b.hr + 60) {
    if (b.type === 'count' && b.scared <= 0) fluffBlock(b, { x, y });
    else if (bossHittable(b)) hitBoss(b, { dmg: 2, x, y, kind: 'potion' });
  }
  for (const o of G.bossObjs) if (!o.dead && dist(x, y, o.x, o.y) < 90 + o.r) hitBossObj(o);
}

// ---------------------------------------------------------------- defeats

function defeat(e, how, opts = {}) {
  const i = G.enemies.indexOf(e);
  if (i < 0) return;
  G.enemies.splice(i, 1);
  const T = ENEMY_TYPES[e.type];
  const kind = how || T.defeat;
  if (!opts.silent) {
    G.defeated++;
    const mult = (G.power && G.power.id === 'sparkle') ? 2 : 1;
    addScore(T.pts * mult, e.x, e.y - e.r - 20);
    Save.d.met[e.type] = (Save.d.met[e.type] || 0) + 1;
  }
  spawnDefeatFx(e, kind);
  if (kind === 'trap' && T.ghost) captureGhost(e);
  if (e.type === 'blob' && kind !== 'trap' && kind !== 'rainbow' && kind !== 'silly' && !opts.silent) {
    for (const s of [-1, 1]) {
      spawnEnemy('ghost', { x: e.x + s * 14, y: e.y, baseY: e.y, r: 22, vis: 1, state: 'vis', st: 0, visDur: 3.5, vx: s * 60, variant: pickGhostVariant(), entered: true });
    }
    addText(e.x, e.y - 50, 'Split!', '#e0d0ff', 18, 0.8);
  }
  if (!opts.silent) {
    if (Math.random() < 0.4) dropCandy(e.x, e.y, randi(1, 3));
    if (Math.random() < 0.05) dropCollectible(e.x, e.y);
    if (e.type === 'grump') {
      dropCandy(e.x, e.y, 12, 8);
      addText(e.x, e.y - 90, 'Fine… we can SHARE the candy!', '#ffe36b', 18, 2);
    }
  }
  if (e.orbit && G.rescue && G.rescue.pk === e.orbit) {
    G.rescue.left--;
    if (G.rescue.left <= 0) finishRescue();
  }
  if (e.kingTarget && !opts.silent && G.boss && G.boss.type === 'king' && !G.boss.defeated) {
    G.boss.kills++;
    if (G.boss.kills >= G.boss.goal) bossDefeated();
  }
}

function spawnDefeatFx(e, kind) {
  e.say = null; e.flash = 0; e.frozen = false;
  const fx = { kind, e, x: e.x, y: e.y + (e.yOff || 0), cx: e.x, cy: e.y, t: 0, life: 1 };
  const ty = e.y - e.r - 6;
  switch (kind) {
    case 'poof': case 'split':
      fx.kind = 'poof'; fx.life = 0.5;
      addText(e.x, ty, 'POOF!', '#fff', 24, 0.8);
      burst(e.x, e.y, 12, ['#ffffff', '#efe8ff', '#ffe0f0'], { shape: 'puff', speed: 150, grav: -40, size: 13, sizeMin: 6, life: 0.7 });
      Sfx.poof(); break;
    case 'pieces': {
      fx.life = 2.7;
      const cheer = e.type === 'cheer';
      fx.pieces = [
        { part: 'head', ox: 0, oy: -16, vx: rand(-140, -60), vy: rand(-320, -240), vr: rand(-7, 7) },
        { part: 'body', ox: 0, oy: 14, vx: rand(-40, 40), vy: -140, vr: rand(-3, 3) },
        { part: cheer ? 'pompom' : 'teddy', ox: 26, oy: 8, vx: rand(70, 150), vy: rand(-300, -220), vr: rand(-8, 8) },
      ];
      for (const pc of fx.pieces) { pc.x = pc.ox; pc.y = pc.oy; pc.rot = 0; }
      addText(e.x, ty, 'Oopsie! I fell apart!', '#c8ff9a', 16, 1.3);
      Sfx.boing(); break;
    }
    case 'bonk':
      fx.life = 1.8;
      addText(e.x, ty, 'BONK!', '#ffe36b', 26, 0.9);
      burst(e.x, e.y - e.r, 6, ['#ffe36b', '#fff'], { shape: 'star', speed: 160, grav: 200, size: 8 });
      Sfx.bonk(); break;
    case 'witchfly':
      fx.life = 1.6; fx.vx = pick([-1, 1]) * 260;
      addText(e.x, ty, 'Wheee! My broom!', '#e0c8ff', 17, 1.1);
      Sfx.boing(); break;
    case 'skull':
      fx.life = 2.1;
      addText(e.x, ty, 'Oops, my head!', '#fff', 17, 1);
      Sfx.bonk(); break;
    case 'dizzy':
      fx.life = 1.6; fx.vx = rand(-70, 70);
      addText(e.x, ty, 'Dizzy dizzy!', '#e0c8ff', 17, 0.9);
      Sfx.boing(); break;
    case 'scream':
      fx.life = 1.5; fx.vx = (e.x < W / 2 ? -1 : 1) * 560;
      addText(e.x, ty, 'AAAAAH!', '#fff', 22, 0.9);
      Sfx.giggle(); break;
    case 'sink':
      fx.life = 1.0;
      addText(e.x, ty, 'Nap time!', '#d8f0d0', 17, 0.9);
      Sfx.poof(); break;
    case 'trap':
      fx.life = 2.2;
      if (!ENEMY_TYPES[e.type].ghost) addText(e.x, ty, 'Bubbled!', '#bff4ff', 18, 0.9);
      Sfx.capture(); break;
    case 'rainbow':
      fx.life = 2.2;
      addText(e.x, ty, pick(['So pretty!', 'Rainbow-fied!', 'Fabulous!']), '#fff3a0', 18, 1);
      burst(e.x, e.y, 14, ['#ff8aa8', '#ffc08a', '#fff08a', '#9aff9a', '#8ad0ff', '#c08aff'], { shape: 'star', speed: 200, grav: 0, size: 7, life: 0.9 });
      Sfx.yay(); break;
    case 'silly':
      fx.life = 1.3;
      addText(e.x, ty, pick(['Hee hee!', 'Silly dance!', 'Tee-hee!']), '#d8ffb0', 17, 0.9);
      break;
  }
  G.fx.push(fx);
}

function captureGhost(e) {
  const v = e.variant || 'baby';
  const before = Save.d.ghosts[v] || 0;
  Save.d.ghosts[v] = before + 1;
  G.captured++;
  if (!before) {
    G.newGhosts++;
    UI.banner(`NEW GHOST! 👻<br><small>${GHOST_BY_ID[v].name} joined your Ghost Book!</small>`, 'teal', 2.4);
  } else {
    addText(e.x, e.y - 40, `Caught: ${GHOST_BY_ID[v].name}!`, '#bff4ff', 16, 1.2);
  }
  Save.write();
}

function dropCandy(x, y, n, amt = 1) {
  for (let i = 0; i < n; i++) {
    G.items.push({ kind: 'candy', icon: pick(CANDY_ICONS), x, y, vx: rand(-110, 110), vy: rand(-300, -140), t: 0, amt, delay: rand(0.5, 0.9) });
  }
}

function dropCollectible(x, y, id) {
  const c = id ? COL_BY_ID[id] : pick(COLLECTIBLES);
  G.items.push({ kind: 'col', id: c.id, icon: c.icon, x, y, vx: rand(-40, 40), vy: -260, t: 0, delay: 1.0 });
  addText(x, y - 40, `+ ${c.name}!`, '#ffe36b', 18, 1.4);
  return c;
}

// ---------------------------------------------------------------- oops!

function oopsPumpkin(pk) {
  if (pk.oopsCd > 0) return;
  pk.oopsCd = 0.5; pk.harmed = true; pk.sad = 2.4; pk.jump = 0.35;
  if (pk.rescue && G.rescue) G.rescue.failed = true;
  G.oops++;
  G.score = Math.max(0, G.score - 20);
  say(pk, pick(LINES.pumpkinOops), 2);
  UI.banner("DON'T SHOOT THE PUMPKINS! 🎃<br><small>They're on YOUR team!</small>", 'orange', 2.2);
  Sfx.oops();
  G.shake = 0.15;
  addText(pk.x, pk.y - pk.r - 34, '-20', '#ff8a8a', 18);
}

function oopsFriend(f) {
  if ((f.oopsCd || 0) > 0) return;
  f.oopsCd = 0.5; f.sad = 2;
  G.oops++;
  G.score = Math.max(0, G.score - 20);
  say(f, pick(LINES.friendOops), 2);
  UI.banner("OOPS! That's a FRIEND! 💖<br><small>Friends have a pink heart.</small>", 'pink', 2.2);
  Sfx.oops();
}

function oopsKing(b) {
  G.oops++;
  G.score = Math.max(0, G.score - 20);
  b.mood = 'sad'; b.moodT = 1.5;
  say(b, "I'm the KING of your team!", 2);
  UI.banner("DON'T SHOOT THE KING! 👑🎃<br><small>Protect him from the monsters!</small>", 'orange', 2.2);
  Sfx.oops();
}

function hurtPlayer() {
  const p = G.p;
  if (p.inv > 0 || G.state !== 'play' || G.phase === 'done' || G.phase === 'bossDone') return false;
  if (G.power && G.power.id === 'shield') {
    addText(p.x, p.y - 100, 'Pumpkin Shield!', '#ffb347', 18, 0.8);
    p.inv = 0.6; Sfx.bonk();
    return false;
  }
  p.hearts--; p.inv = 2.2; G.shake = 0.3;
  Sfx.hurt();
  addText(p.x, p.y - 110, pick(['Eek!', 'Tee-hee!', 'Gotcha!', 'Boop!']), '#ff8ab3', 20);
  burst(p.x, p.y - 50, 8, ['#ff6aa8', '#ffd0e0'], { shape: 'heart', speed: 160, grav: 200, size: 7 });
  if (p.hearts <= 0) gameOver();
  return true;
}

// ---------------------------------------------------------------- enemy behaviors

function maybeSay(e, dt, lines) {
  e.sayCd = (e.sayCd == null ? rand(2, 6) : e.sayCd) - dt;
  if (e.sayCd <= 0) { e.sayCd = rand(5, 10); if (!e.say && Math.random() < 0.5) say(e, pick(lines), 1.6); }
}

function triWave(x) { const f = ((x / TAU) % 1 + 1) % 1; return f < 0.5 ? f * 4 - 1 : 3 - f * 4; }

function flyerMove(e, dt, o = {}) {
  const p = G.p;
  if (e.state === 'warn') {
    e.st += dt;
    e.x += Math.sin(e.st * 60) * 1.5;
    if (e.st > 0.8) { e.state = 'swoop'; e.st = 0; }
    return;
  }
  if (e.state === 'swoop') {
    const tx = p.x, ty = p.y - 40, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.x += dx / d * 175 * dt; e.y += dy / d * 175 * dt; e.st += dt;
    e.dir = Math.sign(dx) || e.dir;
    if (dist(e.x, e.y, tx, ty) < e.r + 24) {
      if (hurtPlayer()) say(e, pick(['Boo!', 'Tag!', 'Hee hee!']), 1);
      e.state = 'return';
    }
    if (e.st > 2.6) e.state = 'return';
    return;
  }
  if (e.state === 'return') {
    e.y -= 180 * dt; e.x += (e.vx || 60) * dt * 0.5;
    if (e.y <= e.baseY) { e.state = 'move'; e.attackT = rand(7, 12); e.t0 = e.t; }
    return;
  }
  e.x += e.vx * dt;
  if (e.x > 30 && e.x < W - 30) e.entered = true;
  if (e.entered) {
    if (e.x < 40 && e.vx < 0) e.vx = Math.abs(e.vx);
    if (e.x > W - 40 && e.vx > 0) e.vx = -Math.abs(e.vx);
  }
  const ph = e.t * (o.freq || 2) + e.seed;
  e.y = e.baseY + (o.zig ? triWave(ph) : Math.sin(ph)) * (o.wave || 40);
  e.dir = Math.sign(e.vx) || e.dir;
  e.attackT -= dt;
  if (e.attackT <= 0 && e.entered && G.phase !== 'done') {
    if (G.enemies.some(o => o !== e && (o.state === 'warn' || o.state === 'swoop'))) { e.attackT = rand(1, 2.5); return; }
    e.state = 'warn'; e.st = 0;
    say(e, '❗', 0.8);
  }
}

function walkerMove(e, dt, speed) {
  const p = G.p;
  if (e.x > 20 && e.x < W - 20) e.entered = true;
  if (e.hop > 0) {
    e.hop -= dt;
    const k = 1 - Math.max(0, e.hop) / 0.45;
    e.yOff = -Math.sin(k * Math.PI) * 42;
    e.x += e.dir * 90 * dt;
    if (e.hop <= 0) {
      e.hop = 0; e.yOff = 0;
      if (Math.abs(p.x - e.x) < 55 && hurtPlayer()) say(e, pick(['Boop!', 'Tag!', 'Hee hee!']), 1);
      e.kx = -e.dir * 280; e.hopCd = 1.6;
    }
    return;
  }
  e.hopCd -= dt;
  const dx = p.x - e.x;
  e.dir = Math.sign(dx) || e.dir;
  if (Math.abs(dx) > 30) e.x += e.dir * speed * dt;
  if (Math.abs(dx) < 62 && e.hopCd <= 0 && G.phase !== 'done') e.hop = 0.45;
  e.x = clamp(e.x, -60, W + 60);
}

function ghostRelocate(e) {
  const statics = G.pumpkins.filter(pk => pk.kind === 'static');
  e.near = false;
  if (Math.random() < 0.25) {
    e.near = true;
    e.x = clamp(G.p.x + rand(-40, 40), 60, W - 60);
    e.baseY = PLAYER_Y - 150;
  } else if (G.lv && G.lv.bg === 'patch' && statics.length && Math.random() < 0.5) {
    const pk = pick(statics);
    e.x = clamp(pk.x + pick([-1, 1]) * (pk.r + 36), 40, W - 40);
    e.baseY = GROUND_Y - 48;
  } else {
    e.x = rand(70, W - 70);
    e.baseY = rand(90, 370);
  }
  e.y = e.baseY;
  e.visDur = rand(2.2, 3.2);
  e.vx = rand(-25, 25);
}

const AI = {
  ghost(e, dt) {
    e.st += dt;
    switch (e.state) {
      case 'in':
        e.vis = Math.min(1, e.st / 0.35);
        if (e.st >= 0.35) { e.state = 'vis'; e.st = 0; }
        break;
      case 'vis':
        e.vis = 1;
        e.y = e.baseY + Math.sin(e.t * 2.5) * 8;
        e.x = clamp(e.x + e.vx * dt, 30, W - 30);
        e.booing = e.st < 0.5;
        if (e.near && e.st > 2.2) {
          say(e, 'BOO!', 1); Sfx.boo(); e.booing = true;
          if (Math.abs(G.p.x - e.x) < 60) hurtPlayer();
          e.near = false; e.state = 'out'; e.st = 0;
        } else if (e.st > (e.visDur || 2.5)) { e.state = 'out'; e.st = 0; }
        break;
      case 'out':
        e.vis = Math.max(0, 1 - e.st / 0.35);
        if (e.st >= 0.35) { e.state = 'gone'; e.st = 0; }
        break;
      case 'gone':
        e.vis = 0;
        if (e.st > 0.7) {
          ghostRelocate(e);
          e.state = 'in'; e.st = 0;
          say(e, e.near ? 'Peek-a-…' : pick(['Boo!', 'Boo-hoo!', 'Peek-a-BOO!', 'Boo?']), 1.1);
        }
        break;
    }
  },
  tiny(e, dt) {
    e.vis = 1;
    if (e.state === 'warn' || e.state === 'swoop' || e.state === 'return') { flyerMove(e, dt); return; }
    e.vx = clamp(e.vx + rand(-240, 240) * dt, -110, 110);
    e.vy = clamp(e.vy + rand(-240, 240) * dt, -110, 110);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.x < 30) e.vx = Math.abs(e.vx); if (e.x > W - 30) e.vx = -Math.abs(e.vx);
    if (e.y < 60) e.vy = Math.abs(e.vy); if (e.y > 400) e.vy = -Math.abs(e.vy);
    e.dir = Math.sign(e.vx) || 1;
    e.attackT -= dt;
    if (e.attackT <= 0) {
      e.attackT = rand(7, 12);
      if (!G.enemies.some(o => o !== e && (o.state === 'warn' || o.state === 'swoop'))) { e.state = 'warn'; e.st = 0; e.baseY = e.y; say(e, '❗', 0.8); }
    }
  },
  blob(e, dt) { e.vis = 1; flyerMove(e, dt, { wave: 30, freq: 1.4 }); },
  bat(e, dt) { flyerMove(e, dt, { zig: true, wave: 46, freq: 3 }); },
  witch(e, dt) { flyerMove(e, dt, { wave: 60, freq: 1.6 }); maybeSay(e, dt, LINES.witch); },
  vampire(e, dt) {
    flyerMove(e, dt, e.batForm ? { zig: true, wave: 50, freq: 4 } : { wave: 36, freq: 1.8 });
    if (!e.batForm) maybeSay(e, dt, LINES.vampire);
  },
  vbat(e, dt) {
    if (e.state === 'flee') { e.y -= 220 * dt; e.x += e.vx * dt; if (e.y < -60) e.remove = true; return; }
    const tx = G.p.x, ty = G.p.y - 50, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    e.x += dx / d * 95 * dt;
    e.y += dy / d * 95 * dt + Math.sin(e.t * 8) * 40 * dt;
    e.dir = Math.sign(dx) || 1;
    if (d < e.r + 26) {
      const n = Math.min(5, G.candy);
      G.candy -= n;
      e.stole = n > 0;
      say(e, n ? 'Yoink! Candy!' : 'No candy?! Aww.', 1.4);
      if (n) addText(G.p.x, G.p.y - 110, `-${n} 🍬`, '#ff8ab3', 18);
      e.state = 'flee'; e.vx = rand(-60, 60);
      Sfx.giggle();
    }
  },
  spider(e, dt) {
    if (e.state === 'drop') {
      e.y += 230 * dt;
      if (e.y >= e.ty) { e.state = 'giggle'; e.st = 0; say(e, pick(['Hee hee hee!', 'Tee-hee!', 'Giggle giggle!']), 1.5); Sfx.giggle(); }
    } else if (e.state === 'giggle') {
      e.st += dt; e.giggle = true;
      e.x = e.ax + Math.sin(e.t * 4) * 10;
      if (e.st > 1.9) { e.giggle = false; e.state = 'climb'; }
    } else if (e.state === 'climb') {
      e.y -= 300 * dt;
      if (e.y < -40) {
        e.drops++;
        if (e.drops >= 3) e.remove = true;
        else { e.ax = e.x = rand(90, W - 90); e.ty = rand(150, 340); e.state = 'drop'; }
      }
    }
  },
  zombie(e, dt) { walkerMove(e, dt, 30); maybeSay(e, dt, LINES.zombie); },
  cheer(e, dt) { walkerMove(e, dt, 62); maybeSay(e, dt, LINES.cheer); },
  grump(e, dt) { walkerMove(e, dt, 40); maybeSay(e, dt, ['WHO TOOK MY CANDY?!', 'MY CANDY!', 'Grumble grumble!']); },
  goblin(e, dt) {
    if (e.x > 30 && e.x < W - 30) e.entered = true;
    const dx = G.p.x - e.x, ad = Math.abs(dx);
    e.dir = Math.sign(dx) || 1;
    if (e.throwing > 0) { e.throwing -= dt; e.still = true; return; }
    e.still = false;
    if (ad > 280) e.x += e.dir * 60 * dt;
    else if (ad < 180) e.x -= e.dir * 45 * dt;
    if (e.entered) e.x = clamp(e.x, 30, W - 30);
    e.throwT -= dt;
    if (e.throwT <= 0 && e.entered && G.phase !== 'done') {
      e.throwT = rand(3.4, 4.8); e.throwing = 0.35;
      throwArc('wrapper', e.x, e.y - 20, G.p.x + rand(-80, 80), G.p.y - 35, 330);
      if (Math.random() < 0.5) say(e, pick(LINES.goblin), 1.2);
    }
  },
  skeleton(e, dt) {
    if (e.danceT > 0) {
      e.danceT -= dt; e.dancing = true; e.still = true;
      e.noteT = (e.noteT || 0) - dt;
      if (e.noteT <= 0) { e.noteT = 0.35; burst(e.x + rand(-20, 20), e.y - 30, 1, ['#fff', '#ffe36b', '#ff9ad0'], { shape: 'note', speed: 40, grav: -60, life: 1, size: 14, sizeMin: 12 }); }
      return;
    }
    e.dancing = false; e.still = false;
    walkerMove(e, dt, 42);
    e.nextDance -= dt;
    if (e.nextDance <= 0) { e.nextDance = rand(6, 9); e.danceT = 1.8; say(e, pick(LINES.skeleton), 1.5); }
  },
  werewolf(e, dt) {
    if (e.howl > 0) {
      e.howl -= dt; e.still = true;
      if (e.howl <= 0) { e.howl = 0; e.embarrassed = 1.6; say(e, pick(['…oops. Too loud?', '*blush*', 'Sorry! Was that scary?']), 1.6); }
      return;
    }
    if (e.embarrassed > 0) { e.embarrassed -= dt; e.still = true; if (e.embarrassed <= 0) e.embarrassed = 0; return; }
    e.still = false;
    walkerMove(e, dt, 48);
    e.howlT -= dt;
    if (e.howlT <= 0 && e.entered) { e.howlT = rand(4.5, 7); e.howl = 1.2; say(e, 'AWOOOOO!', 1.2); Sfx.boo(); }
  },
  troll(e, dt) {
    if (!e.hideAt || !G.pumpkins.includes(e.hideAt)) {
      const free = G.pumpkins.filter(pk => pk.kind === 'static' && !G.enemies.some(o => o !== e && o.hideAt === pk));
      if (!free.length) { e.hidden = false; e.behind = false; walkerMove(e, dt, 40); return; }
      free.sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x));
      e.hideAt = free[0]; e.state = 'go';
    }
    const pk = e.hideAt;
    e.still = e.state !== 'go';
    if (e.state === 'go') {
      const dx = pk.x - e.x;
      e.dir = Math.sign(dx) || 1;
      e.x += e.dir * Math.min(Math.abs(dx), 75 * dt);
      e.hidden = false;
      if (Math.abs(dx) < 3) { e.state = 'hide'; e.st = 0; e.behind = true; }
    } else if (e.state === 'hide') {
      e.st += dt; e.hidden = true;
      e.x = pk.x; e.y = pk.y - 6;
      if (e.st > 2.2) { e.state = 'peek'; e.st = 0; e.side = pick([-1, 1]); e.dir = e.side; say(e, pick(LINES.troll), 1.3); }
    } else if (e.state === 'peek') {
      e.st += dt; e.hidden = false;
      const k = Math.min(1, e.st / 0.25);
      e.x = pk.x + e.side * (pk.r * 0.9 + 18) * k; e.y = pk.y - 6;
      if (e.st > 1.5) { e.state = 'hide'; e.st = 0; e.x = pk.x; }
    }
  },
  ghoul(e, dt) {
    e.st += dt;
    if (e.state === 'rise') { e.rise = Math.min(1, e.st / 0.8); if (e.rise >= 1) { e.state = 'up'; e.st = 0; if (Math.random() < 0.6) say(e, pick(LINES.ghoul), 1.3); } }
    else if (e.state === 'up') { e.rise = 1; if (e.st > 2.6) { e.state = 'sink'; e.st = 0; } }
    else if (e.state === 'sink') { e.rise = Math.max(0, 1 - e.st / 0.6); if (e.rise <= 0) { e.state = 'wait'; e.st = 0; } }
    else if (e.state === 'wait') { if (e.st > 1.2) { e.state = 'rise'; e.st = 0; } }
  },
};

function orbitMove(e, dt) {
  const pk = e.orbit;
  e.vis = 1;
  e.orbA += 1.4 * dt;
  e.x = pk.x + Math.cos(e.orbA) * e.orbR;
  e.y = pk.y - 8 + Math.sin(e.orbA) * e.orbR * 0.75;
  e.dir = -Math.sin(e.orbA) >= 0 ? 1 : -1;
}

function kingMove(e, dt) {
  const k = G.boss;
  if (!k || k.type !== 'king' || k.defeated) return;
  e.vis = 1;
  const T = ENEMY_TYPES[e.type];
  const tx = k.x, ty = T.walk ? e.y : k.y - 20;
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  const sp = T.walk ? 45 : 62;
  e.x += dx / d * sp * dt;
  e.y += dy / d * sp * dt + (T.walk ? 0 : Math.sin(e.t * 4) * 20 * dt);
  e.dir = Math.sign(dx) || 1;
  if (Math.abs(dx) < 72 && Math.abs(k.y - e.y) < 95) {
    k.happy--; k.mood = 'worried'; k.moodT = 1.5;
    say(k, pick(['Hee hee! That tickles!', 'Eek! Help!', 'Ooh, my crown!']), 1.6);
    defeat(e, 'poof', { silent: true });
    Sfx.giggle();
    if (k.happy <= 0) { k.happy = 3; hurtPlayer(); addText(k.x, k.y - 110, 'Protect the King!', '#ffb347', 22, 1.4); }
  }
}

function updateEnemies(dt) {
  const frozen = G.power && G.power.id === 'moon';
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (!e) continue;
    e.flash -= dt;
    tickSay(e, dt);
    if (frozen) { e.frozen = true; continue; }
    e.frozen = false;
    e.t += dt;
    if (e.kx) { e.x += e.kx * dt; e.kx *= Math.pow(0.02, dt); if (Math.abs(e.kx) < 5) e.kx = 0; }
    if (e.orbit) orbitMove(e, dt);
    else if (e.kingTarget) kingMove(e, dt);
    else AI[e.type](e, dt);
    if (e.remove) { const idx = G.enemies.indexOf(e); if (idx >= 0) G.enemies.splice(idx, 1); }
  }
}

function throwArc(kind, x, y, tx, ty, vy0) {
  const g = 600;
  const disc = vy0 * vy0 - 2 * g * (y - ty);
  const t = (vy0 + Math.sqrt(Math.max(0, disc))) / g;
  G.eshots.push({ kind, x, y, vx: (tx - x) / t, vy: -vy0, g, r: kind === 'cupcake' ? 13 : 10, rot: 0 });
}

function popEnemyShot(es) {
  es.dead = true;
  burst(es.x, es.y, 8, es.kind === 'cupcake' ? ['#ff9ad0', '#fff36b', '#7ad0ff'] : ['#7ad0ff', '#ffe36b', '#ff6aa8'], { shape: 'confetti', speed: 160, size: 6, life: 0.6 });
  addScore(2);
  Sfx.pop();
}

function updateEnemyShots(dt) {
  const frozen = G.power && G.power.id === 'moon';
  for (let i = G.eshots.length - 1; i >= 0; i--) {
    const s = G.eshots[i];
    if (s.dead) { G.eshots.splice(i, 1); continue; }
    if (!frozen) { s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += dt * 8; }
    if (dist(s.x, s.y, G.p.x, G.p.y - 40) < s.r + 16) {
      hurtPlayer();
      burst(s.x, s.y, 8, ['#ff9ad0', '#fff'], { shape: 'confetti', speed: 140, size: 6, life: 0.6 });
      G.eshots.splice(i, 1);
      continue;
    }
    if (s.y > H + 30) G.eshots.splice(i, 1);
  }
}

// ---------------------------------------------------------------- bosses

function spawnBoss(type) {
  const B = BOSSES[type];
  const b = { type, t: 0, hp: B.hp, maxHp: B.hp, flash: 0, say: null, x: W / 2, y: 170, hr: 60, hy: 0, defeated: false, mouth: 0 };
  switch (type) {
    case 'king': Object.assign(b, { y: GROUND_Y - 58, goal: B.hp, kills: 0, happy: 5, mood: 'smile', moodT: 0, summonT: 1.4, lineT: 4 }); say(b, 'Protect me, brave Patroller!', 2.6); break;
    case 'chef': Object.assign(b, { y: 160, hr: 62, hy: -6, throwT: 2, throws: 0 }); say(b, 'Who wants a cupcake?!', 2); break;
    case 'queen': Object.assign(b, { y: 150, hr: 52, hy: -14, portalT: 1.5 }); say(b, 'Mwa-ha-hee!', 2); break;
    case 'count': Object.assign(b, { y: 170, hr: 64, scared: 0, garlicT: 1.2, batT: 3, ph: 0 }); say(b, 'I am too fluffy to bonk!', 2.4); break;
    case 'boo': Object.assign(b, { y: 210, baseY: 210, hr: 84, hy: 8, vis: 0, bstate: 'in', st: 0, booing: false }); break;
    case 'moon': Object.assign(b, { y: 175, hr: 112, eatT: 1.5, spawnT: 3, fed: 0, happy: false }); say(b, 'SO… HUNGRY…', 2.6); break;
  }
  G.boss = b;
  UI.showBoss(B.name);
  burst(b.x, b.y, 30, ['#fff', '#ffe36b', '#ff9ad0'], { shape: 'star', speed: 300, grav: 80, size: 9 });
}

function bossHittable(b) {
  if (b.type === 'count') return b.scared > 0;
  if (b.type === 'boo') return b.vis > 0.5;
  return b.type !== 'king';
}

function fluffBlock(b, s) {
  if (!b.fluffT || G.t - b.fluffT > 0.7) { addText(b.x, b.y - 100, 'Too fluffy! Use the GARLIC!', '#ffd8f0', 17, 0.9); b.fluffT = G.t; }
  burst(s.x, s.y, 5, ['#fff', '#ffe8f8'], { shape: 'puff', speed: 90, grav: 0, size: 8, life: 0.5 });
  Sfx.boing();
}

function hitBoss(b, s) {
  if (b.defeated) return;
  if (b.type === 'moon') {
    b.fed++; b.mouth = 1; b.flash = 0.1;
    addText(b.x + rand(-70, 70), b.y + 50, pick(['Yum!', 'Nom!', 'Tasty!', 'Mmm!', 'MORE!']), '#ffe36b', 18, 0.7);
    burst(s.x, s.y, 4, CANDY_COLORS, { shape: 'candy', speed: 100, grav: 200, size: 8, life: 0.6 });
    Sfx.nom();
    if (b.fed >= b.maxHp) bossDefeated();
    return;
  }
  const dmg = s.kind === 'potion' ? 2 : (s.dmg || 1);
  b.hp -= dmg; b.flash = 0.12;
  Sfx.bonk();
  burst(s.x, s.y, 5, ['#fff', '#ffe36b'], { shape: 'star', speed: 140, size: 7 });
  if (b.hp <= 0) bossDefeated();
}

function hitBossObj(o) {
  if (o.dead) return;
  if (o.kind === 'portal') {
    o.hp--; o.flash = 0.12; Sfx.bonk();
    if (o.hp <= 0) {
      o.dead = true;
      burst(o.x, o.y, 18, ['#c87aff', '#ff9ad0', '#fff'], { shape: 'star', speed: 220, grav: 0, size: 8 });
      addText(o.x, o.y - 40, 'Portal closed!', '#e0c8ff', 18, 0.9);
      addScore(25);
      Sfx.pop();
    }
  } else if (o.kind === 'garlic') {
    o.dead = true;
    burst(o.x, o.y, 12, ['#fff', '#f4f0d0'], { shape: 'puff', speed: 140, grav: -20, size: 10, life: 0.7 });
    Sfx.pop();
    const b = G.boss;
    if (b && b.type === 'count' && !b.defeated) {
      b.scared = 4;
      say(b, pick(LINES.countScared), 1.6);
      UI.banner('EEK! GARLIC! 🧄<br><small>Bonk him now!</small>', 'teal', 1.4);
      Sfx.boing();
    }
  }
}

const BOSS_AI = {
  king(b, dt) {
    b.moodT -= dt;
    if (b.moodT <= 0) b.mood = b.happy <= 2 ? 'worried' : 'smile';
    b.summonT -= dt;
    const active = G.enemies.filter(e => e.kingTarget).length;
    if (b.summonT <= 0 && active < 5 && b.kills + active < b.goal) {
      b.summonT = rand(1.3, 2.0);
      spawnEnemy(pick(['bat', 'ghost', 'zombie', 'bat', 'ghost']), { kingTarget: true, vis: 1, state: 'king' });
      if (Math.random() < 0.35 && !b.say) say(b, pick(LINES.king), 1.8);
    }
    b.lineT -= dt;
    if (b.lineT <= 0) { b.lineT = rand(5, 8); if (!b.say) say(b, pick(LINES.king), 1.8); }
  },
  chef(b, dt) {
    const fast = b.hp < b.maxHp / 2;
    b.x = W / 2 + Math.sin(b.t * 0.7) * 300;
    b.y = 160 + Math.sin(b.t * 1.7) * 18;
    b.mouth = Math.max(0, b.mouth - dt);
    b.throwT -= dt;
    if (b.throwT <= 0) {
      b.throwT = fast ? 1.5 : 2.0; b.throws++; b.mouth = 0.4;
      const n = b.throws % 3 === 0 ? 3 : 1;
      const off = n === 1 ? rand(-50, 50) : 0;
      for (let i = 0; i < n; i++) throwArc('cupcake', b.x, b.y + 30, G.p.x + off + (i - (n - 1) / 2) * 110, G.p.y - 35, 160);
      if (Math.random() < 0.35 && !b.say) say(b, pick(LINES.chef), 1.4);
    }
  },
  queen(b, dt) {
    b.x = W / 2 + Math.sin(b.t * 0.8) * 320;
    b.y = 150 + Math.sin(b.t * 1.6) * 50;
    b.portalT -= dt;
    const portals = G.bossObjs.filter(o => o.kind === 'portal' && !o.dead);
    if (b.portalT <= 0 && portals.length < 3) {
      b.portalT = 4.5;
      G.bossObjs.push({ kind: 'portal', x: rand(120, W - 120), y: rand(110, 330), r: 30, hp: 3, spawnT: 1.2, t: 0, flash: 0 });
      if (!b.say) say(b, pick(LINES.queen), 1.4);
    }
  },
  count(b, dt) {
    b.scared = Math.max(0, b.scared - dt);
    const sp = b.scared > 0 ? 0.35 : 1;
    b.ph += dt * sp;
    b.x = W / 2 + Math.sin(b.ph * 0.9) * 300;
    b.y = 170 + Math.sin(b.ph * 2.1) * 50;
    b.garlicT -= dt;
    if (b.garlicT <= 0 && G.bossObjs.filter(o => o.kind === 'garlic' && !o.dead).length < 2) {
      b.garlicT = rand(2.6, 4);
      G.bossObjs.push({ kind: 'garlic', x: rand(100, W - 100), y: -20, r: 22, t: 0, ty: rand(250, 380), flash: 0 });
    }
    b.batT -= dt;
    if (b.batT <= 0) {
      b.batT = 3.5;
      if (minorCount() < 6) spawnEnemy('bat', { x: b.x, y: b.y, baseY: clamp(b.y + rand(-40, 60), 90, 320), vx: pick([-1, 1]) * 90, entered: true, minor: true });
      if (!b.say && b.scared <= 0 && Math.random() < 0.4) say(b, pick(LINES.count), 1.6);
    }
  },
  boo(b, dt) {
    b.st += dt;
    switch (b.bstate) {
      case 'in':
        b.vis = Math.min(1, b.st / 0.6);
        if (b.st >= 0.6) { b.bstate = 'vis'; b.st = 0; b.booing = true; say(b, pick(LINES.boo), 2.2); Sfx.boo(); }
        break;
      case 'vis':
        b.y = b.baseY + Math.sin(b.t * 2) * 10;
        if (b.st > 0.8) b.booing = false;
        if (b.st > 3.3) { b.bstate = 'out'; b.st = 0; }
        break;
      case 'out':
        b.vis = Math.max(0, 1 - b.st / 0.6);
        if (b.st >= 0.6) {
          b.bstate = 'gone'; b.st = 0;
          if (minorCount() < 10) for (let i = 0; i < 3; i++) spawnTiny(b.x + rand(-60, 60), b.y + rand(-40, 40));
        }
        break;
      case 'gone':
        if (b.st > 1.0) { b.x = rand(180, W - 180); b.baseY = b.y = rand(170, 250); b.bstate = 'in'; b.st = 0; }
        break;
    }
  },
  moon(b, dt) {
    b.mouth = Math.max(0, b.mouth - dt * 2);
    b.x = W / 2 + Math.sin(b.t * 0.5) * 60;
    b.eatT -= dt;
    if (b.eatT <= 0) {
      b.eatT = 1.3; b.mouth = 1;
      if (G.candy > 0) {
        G.candy--;
        const hp = UI.candyPos();
        G.items.push({ kind: 'toMoon', icon: pick(CANDY_ICONS), x: hp.x, y: hp.y, vx: 0, vy: 0, t: 0 });
        Sfx.nom();
        if (Math.random() < 0.3 && !b.say) say(b, pick(LINES.moon), 1.3);
      }
    }
    b.spawnT -= dt;
    if (b.spawnT <= 0) { b.spawnT = rand(2.5, 3.5); if (activeCount() < 4) spawnEnemy(pick(G.lv.pool)); }
  },
};

function updateBossObjs(dt) {
  const frozen = G.power && G.power.id === 'moon';
  for (let i = G.bossObjs.length - 1; i >= 0; i--) {
    const o = G.bossObjs[i];
    if (o.dead) { G.bossObjs.splice(i, 1); continue; }
    o.t += dt; o.flash -= dt;
    if (frozen) continue;
    if (o.kind === 'portal') {
      o.spawnT -= dt;
      if (o.spawnT <= 0) {
        o.spawnT = 2.8;
        if (minorCount() < 8) spawnEnemy('bat', { x: o.x, y: o.y, baseY: o.y, vx: pick([-1, 1]) * 85, entered: true, minor: true });
      }
    } else if (o.kind === 'garlic') {
      if (o.y < o.ty) o.y += 70 * dt;
      o.x += Math.sin(o.t * 2) * 20 * dt;
      if (o.t > 14) o.dead = true;
    }
  }
}

function updateBoss(dt) {
  const b = G.boss;
  if (!b) return;
  b.t += dt; b.flash -= dt;
  tickSay(b, dt);
  updateBossObjs(dt);
  if (b.defeated) { updateBossExit(b, dt); return; }
  if (G.power && G.power.id === 'moon' && b.type !== 'king') { b.frozen = true; return; }
  b.frozen = false;
  BOSS_AI[b.type](b, dt);
}

function bossDefeated() {
  const b = G.boss;
  if (!b || b.defeated) return;
  b.defeated = true; b.exitT = 0;
  G.phase = 'bossDone'; G.phaseT = 0;
  clearMonsters();
  G.bossObjs = []; G.eshots = [];
  addScore(500, b.x, b.y - 60);
  Sfx.fanfare();
  confetti(b.x, b.y, 60);
  UI.hideBoss();
  switch (b.type) {
    case 'king': b.mood = 'happy'; say(b, 'Hooray! My royal hero!', 3); UI.banner('YOU PROTECTED THE KING! 👑🎃', 'gold', 2.6); break;
    case 'chef': say(b, 'My cupcakes! …Want one?', 3); UI.banner('THE ZOMBIE CHEF IS FULL! 🧁', 'gold', 2.6); break;
    case 'queen': say(b, 'My broom! Wheeeee!', 3); UI.banner('THE WITCH QUEEN FLEW AWAY! 🧹', 'gold', 2.6); break;
    case 'count': say(b, "I'll be bat! Bye-bye!", 3); UI.banner('COUNT FLUFFULA FLAPPED OFF! 🦇', 'gold', 2.6); break;
    case 'boo':
      b.vis = 1; b.booing = false;
      say(b, "You're not scared? …Want to be friends?", 3);
      captureGhost({ variant: 'giant', x: b.x, y: b.y });
      break;
    case 'moon':
      b.happy = true; b.mouth = 1;
      say(b, 'BUUUUURRRRP!', 3);
      Sfx.burp();
      G.shake = 1;
      dropCandy(b.x, b.y + 40, 40, 5);
      for (let i = 0; i < 5; i++) burst(b.x, b.y + 40, 30, CANDY_COLORS, { shape: 'candy', speed: 520, min: 150, grav: 300, size: 12, sizeMin: 7, life: 2.2 });
      UI.banner('THE MOON BELCHES OUT ALL THE CANDY! 🍬🍬🍬', 'gold', 3);
      break;
  }
}

function updateBossExit(b, dt) {
  b.exitT += dt;
  switch (b.type) {
    case 'king': b.oy = -Math.abs(Math.sin(b.exitT * 6)) * 20; break;
    case 'chef': b.mouth = 0.3; if (b.exitT > 1.6) b.y -= 260 * dt; break;
    case 'queen': b.rot = b.exitT * 10; b.x += 300 * dt; b.y -= 180 * dt; break;
    case 'count':
      if (b.exitT > 1.2 && !b.batted) {
        b.batted = true; b.exitAlpha = 0;
        burst(b.x, b.y, 10, ['#fff'], { shape: 'emoji', text: '🦇', speed: 320, grav: -80, size: 22, sizeMin: 16, life: 1.6 });
        Sfx.poof();
      }
      break;
    case 'boo': b.vis = 1; b.oy = Math.sin(b.exitT * 3) * 8; break;
    case 'moon': b.mouth = Math.max(0, 1 - b.exitT * 0.4); b.happy = true; break;
  }
}

// ---------------------------------------------------------------- pumpkins, friends, cat, houses, items

function updatePumpkins(dt) {
  const playing = G.state === 'play' && G.phase !== 'done';
  for (let i = G.pumpkins.length - 1; i >= 0; i--) {
    const pk = G.pumpkins[i];
    pk.t += dt; tickSay(pk, dt);
    pk.sad = Math.max(0, pk.sad - dt); pk.oopsCd -= dt; pk.jump = Math.max(0, pk.jump - dt);
    pk.celebrateT = Math.max(0, (pk.celebrateT || 0) - dt);
    if (pk.kind === 'static') {
      if (playing) {
        pk.sayT -= dt;
        if (pk.sayT <= 0) { pk.sayT = rand(8, 15); if (!pk.say && !pk.rescue && (pk.face === 'talk' || Math.random() < 0.3)) say(pk, pick(LINES.pumpkin), 1.8); }
      }
    } else if (pk.kind === 'roller') {
      pk.x += pk.vx * dt; pk.rot += pk.vx * dt / pk.r;
      if (pk.x < -60 || pk.x > W + 60) G.pumpkins.splice(i, 1);
    } else if (pk.kind === 'golden' || pk.kind === 'baby') {
      if (pk.kind === 'golden') { pk.x += pk.vx * dt; pk.rot += pk.vx * dt / pk.r; if (Math.random() < 0.2) burst(pk.x, pk.y, 1, ['#fff3a0', '#fff'], { shape: 'star', speed: 30, grav: -40, life: 0.6, size: 5 }); }
      else { pk.vx = Math.sign(G.p.x - pk.x) * 70; pk.x += pk.vx * dt; pk.hop = Math.abs(Math.sin(pk.t * 8)) * 10; }
      if (playing && Math.abs(pk.x - G.p.x) < pk.r + 22) {
        G.pumpkins.splice(i, 1);
        if (pk.kind === 'golden') {
          applyPower(pick(POWERUPS).id);
          burst(pk.x, pk.y, 20, ['#ffe36b', '#fff', '#ffd23f'], { shape: 'star', speed: 260, grav: 100, size: 9 });
        } else {
          G.followers.push({ x: pk.x, t: rand(0, 3), hop: 0 });
          addText(G.p.x, G.p.y - 120, 'A baby pumpkin is following you! 🎃', '#ffd08a', 17, 1.6);
          Sfx.yay();
          burst(pk.x, pk.y, 10, ['#ff6aa8', '#ff9ad0'], { shape: 'heart', speed: 140, grav: -40, size: 7, life: 1 });
        }
        continue;
      }
      if (pk.x < -60 || pk.x > W + 60) G.pumpkins.splice(i, 1);
    }
  }
}

function updateFollowers(dt) {
  G.followers.forEach((f, i) => {
    const tx = clamp(G.p.x - G.p.face * (100 + i * 30), 14, W - 14);
    f.x += (tx - f.x) * Math.min(1, dt * 5);
    f.t += dt;
    f.hop = Math.abs(Math.sin(f.t * 8 + i)) * (G.state === 'complete' || G.state === 'victory' ? 16 : 6);
  });
}

function updateFriends(dt) {
  for (let i = G.friends.length - 1; i >= 0; i--) {
    const f = G.friends[i];
    f.t += dt; tickSay(f, dt);
    f.sad = Math.max(0, f.sad - dt); f.oopsCd = (f.oopsCd || 0) - dt;
    if (f.hiT > 0) { f.hiT -= dt; if (f.hiT <= 0 && !f.say) say(f, pick(LINES.friendHi), 1.8); }
    if (f.type === 'spiderf') {
      if (f.state === 'drop') { f.y += 160 * dt; if (f.y >= f.ty) { f.state = 'hang'; f.st = 0; } }
      else if (f.state === 'hang') { f.st += dt; f.x += Math.sin(f.t * 2) * 10 * dt; if (f.st > 6) f.state = 'climb'; }
      else if (f.state === 'climb') { f.y -= 200 * dt; if (f.y < -40) G.friends.splice(i, 1); }
      continue;
    }
    f.x += f.vx * dt;
    f.y = f.baseY + Math.sin(f.t * 2 + f.seed) * 16;
    f.dir = Math.sign(f.vx) || 1;
    if ((f.vx < 0 && f.x < -60) || (f.vx > 0 && f.x > W + 60)) G.friends.splice(i, 1);
  }
}

function updateCat(dt) {
  const c = G.cat;
  if (!c) return;
  c.t += dt; tickSay(c, dt);
  const tx = clamp(G.p.x - G.p.face * 58, 20, W - 20);
  const dx = tx - c.x;
  c.moving = Math.abs(dx) > 6;
  if (c.moving) { c.x += clamp(dx, -380 * dt, 380 * dt); c.dir = Math.sign(dx); }
  else c.dir = G.p.face;
  c.meow = Math.max(0, c.meow - dt);
  if (G.state !== 'play' || G.phase === 'done') return;
  c.meowT -= dt;
  if (c.meowT <= 0) { c.meowT = rand(16, 26); say(c, 'MEOW.', 1.6); c.meow = 0.7; Sfx.meow(); c.findT = 0.8; }
  if (c.findT > 0) {
    c.findT -= dt;
    if (c.findT <= 0) {
      dropCollectible(c.x, PLAYER_Y - 40);
      addText(c.x, PLAYER_Y - 95, 'The cat found something!', '#d6f25a', 16, 1.6);
      G.found++;
    }
  }
}

function houseReady(h) { return h.cd <= 0 && !h.pending && G.state === 'play' && (G.phase === 'waves' || G.phase === 'boss'); }

function updateHouses(dt) {
  for (const h of G.houses) {
    tickSay(h, dt);
    h.cd -= dt;
    h.open = Math.max(0, h.open - dt * 0.4);
    if (h.pending) { h.pending.t -= dt; if (h.pending.t <= 0) { const out = h.pending.out; h.pending = null; resolveHouse(h, out); } }
    if (h.tricks > 0) { h.trickT -= dt; if (h.trickT <= 0) { h.trickT = 0.07; h.tricks--; spawnTiny(h.x + rand(-10, 10), GROUND_Y - 40); } }
  }
}

function knockHouse(h) {
  if (!houseReady(h)) { if (!h.say) say(h, h.pending ? 'Coming…' : 'Nobody home yet!', 1.2); return; }
  Sfx.knock();
  say(h, 'TRICK OR TREAT?', 1.4);
  h.cd = 22; h.open = 1;
  const grumpAlive = G.enemies.some(e => e.type === 'grump');
  const r = Math.random();
  let out = r < 0.45 ? 'treat' : r < 0.8 ? 'trick' : 'grump';
  if (out === 'grump' && (grumpAlive || G.phase === 'boss')) out = 'trick';
  h.pending = { t: 0.7, out };
}

function resolveHouse(h, out) {
  if (out === 'treat') {
    UI.banner('TREAT! 🍬<br><small>+50 Candy!</small>', 'pink', 1.6);
    dropCandy(h.x, GROUND_Y - 40, 10, 5);
    say(h, 'Happy Halloween!', 1.6);
    Sfx.yay();
  } else if (out === 'trick') {
    UI.banner('TRICK! 😈<br><small>20 tiny ghosts!</small>', 'purple', 1.6);
    h.tricks = 20; h.trickT = 0;
    Sfx.giggle();
  } else {
    UI.banner('"WHO TOOK MY CANDY?!"<br><small>A Candy Grump appears!</small>', 'orange', 2);
    const e = spawnEnemy('grump', { x: h.x, entered: true });
    e.y = GROUND_Y - e.r * 0.92; e.baseY = e.y;
    say(e, 'WHO TOOK MY CANDY?!', 2.4);
    G.shake = 0.4;
    Sfx.bossIntro();
  }
}

function updateItems(dt) {
  const target = UI.candyPos();
  for (let i = G.items.length - 1; i >= 0; i--) {
    const it = G.items[i];
    it.t += dt;
    if (it.kind === 'toMoon') {
      const b = G.boss;
      if (!b) { G.items.splice(i, 1); continue; }
      const tx = b.x, ty = b.y + 40, a = Math.atan2(ty - it.y, tx - it.x);
      it.x += Math.cos(a) * 520 * dt; it.y += Math.sin(a) * 520 * dt;
      if (dist(it.x, it.y, tx, ty) < 24) { G.items.splice(i, 1); addText(tx, ty - 30, 'Nom!', '#ffe36b', 16, 0.5); }
      continue;
    }
    if (it.t < it.delay) {
      it.vy += 650 * dt; it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.y > GROUND_Y + 30) { it.y = GROUND_Y + 30; it.vy *= -0.45; it.vx *= 0.7; }
      it.x = clamp(it.x, 10, W - 10);
    } else {
      const tx = target.x, ty = target.y, d = dist(it.x, it.y, tx, ty);
      const sp = 300 + (it.t - it.delay) * 1400;
      it.x += (tx - it.x) / (d || 1) * Math.min(d, sp * dt);
      it.y += (ty - it.y) / (d || 1) * Math.min(d, sp * dt);
      if (d < 18) {
        G.items.splice(i, 1);
        if (it.kind === 'candy') { G.candy += it.amt; Sfx.coin(); UI.bumpCandy(); }
        else { Save.d.items[it.id] = (Save.d.items[it.id] || 0) + 1; Save.write(); Sfx.capture(); }
      }
    }
  }
}

// ---------------------------------------------------------------- power-ups

function applyPower(id) {
  const P = POWER_BY_ID[id];
  G.power = { id, t: P.dur, dur: P.dur, acc: 0 };
  G.buddy = id === 'buddy' ? { x: G.p.x, y: G.p.y - 150, t: 0, fireT: 0.5 } : null;
  UI.banner(`${P.icon} ${P.name.toUpperCase()}!<br><small>${P.desc}</small>`, 'gold', 2);
  Sfx.power();
  if (id === 'moon') addText(W / 2, 220, 'Shhh… the monsters are frozen!', '#bfe8ff', 22, 1.6);
}

function updatePower(dt) {
  const P = G.power;
  if (!P) return;
  P.t -= dt;
  if (P.id === 'storm') {
    P.acc += dt;
    while (P.acc > 0.07) {
      P.acc -= 0.07;
      addShot('candy', rand(20, W - 20), -20, Math.PI / 2 + rand(-0.1, 0.1), rand(420, 560), { r: 10, magic: true, color: pick(CANDY_COLORS), life: 2.5 });
    }
  } else if (P.id === 'magnet') {
    for (const e of [...G.enemies]) {
      if (!ENEMY_TYPES[e.type].ghost || !hittable(e)) continue;
      const ty = G.p.y - 60, d = dist(e.x, e.y, G.p.x, ty);
      if (d < 340) {
        const mx = (G.p.x - e.x) / (d || 1) * 300 * dt, my = (ty - e.y) / (d || 1) * 300 * dt;
        e.x += mx; e.y += my; e.baseY += my;
        if (d < 60) defeat(e, 'trap');
      }
    }
  } else if (P.id === 'buddy') updateBuddy(dt);
  if (P.t <= 0) { G.power = null; G.buddy = null; }
}

function updateBuddy(dt) {
  const b = G.buddy;
  if (!b) return;
  b.t += dt;
  const tx = G.p.x + Math.cos(b.t * 1.8) * 90, ty = G.p.y - 170 + Math.sin(b.t * 3.2) * 20;
  b.x += (tx - b.x) * Math.min(1, dt * 4);
  b.y += (ty - b.y) * Math.min(1, dt * 4);
  b.fireT -= dt;
  if (b.fireT <= 0) {
    const tgt = nearestTarget(b.x, b.y, 600);
    if (tgt) { b.fireT = 0.45; addShot('star', b.x, b.y, Math.atan2(tgt.y - b.y, tgt.x - b.x), 700, { r: 9, hue: 320, magic: true, homing: true }); }
    else b.fireT = 0.2;
  }
}

// ---------------------------------------------------------------- effects

function updatePieces(f, dt) {
  const sc = f.e.r / 32;
  const gy = (GROUND_Y - f.y) / sc - 10;
  for (const pc of f.pieces) {
    if (f.t < 1.2) {
      pc.vy += 900 * dt; pc.x += pc.vx * dt; pc.y += pc.vy * dt; pc.rot += pc.vr * dt;
      if (pc.y > gy) { pc.y = gy; pc.vy *= -0.35; pc.vx *= 0.6; pc.vr *= 0.5; }
      pc.rx = pc.x; pc.ry = pc.y; pc.rr = pc.rot;
    } else if (f.t > 1.7) {
      const k = Math.min(1, (f.t - 1.7) / 0.45), s = k * k * (3 - 2 * k);
      pc.x = lerp(pc.rx, pc.ox, s);
      pc.y = lerp(pc.ry, pc.oy, s) - Math.sin(k * Math.PI) * 30;
      pc.rot = lerp(pc.rr, 0, s);
    }
  }
  if (f.t >= 2.15 && !f.said) { f.said = true; addText(f.x, f.y - 50, pick(["I'm OK!", 'Good as new!', 'Ta-da!']), '#c8ff9a', 18, 1); Sfx.boing(); }
}

function updateEffects(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.t += dt;
    switch (f.kind) {
      case 'pieces': updatePieces(f, dt); break;
      case 'trap': f.cx = f.x + Math.sin(f.t * 3) * 14; f.cy = f.y - f.t * f.t * 70; break;
      case 'rainbow': f.cx = f.x + Math.sin(f.t * 2) * 20; f.cy = f.y - f.t * 70; break;
      case 'dizzy': f.cx = f.x + f.vx * f.t + Math.sin(f.t * 8) * 12; f.cy = f.y - f.t * f.t * 90; break;
      case 'witchfly': f.cx = f.x + f.vx * f.t * f.t; f.cy = f.y - f.t * f.t * 160; break;
      case 'scream': {
        const k = Math.min(1, f.t / 0.25);
        f.cx = f.x + f.vx * Math.max(0, f.t - 0.25);
        f.cy = lerp(f.y, GROUND_Y - 20, k);
        break;
      }
      default: f.cx = f.x; f.cy = f.y;
    }
    if (f.t >= f.life) {
      if (f.kind === 'trap') {
        burst(f.cx, f.cy, 12, ['#bff4ff', '#fff', '#d8f8ff'], { speed: 180, grav: 0, size: 5, life: 0.5 });
        Sfx.pop();
      } else if (f.kind === 'silly') {
        burst(f.cx, f.cy, 10, ['#d8ffb0', '#fff', '#ffd8f0'], { shape: 'puff', speed: 140, grav: -40, size: 12, life: 0.6 });
        Sfx.poof();
      } else if (f.kind === 'rainbow') {
        burst(f.cx, f.cy, 10, ['#ff8aa8', '#fff08a', '#8ad0ff', '#c08aff'], { shape: 'star', speed: 160, grav: 0, size: 7, life: 0.7 });
      }
      G.fx.splice(i, 1);
    }
  }
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.t += dt;
    q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.spin * dt;
    q.vx *= Math.pow(0.4, dt);
    if (q.t >= q.life) G.parts.splice(i, 1);
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const tx = G.texts[i];
    tx.t += dt;
    if (tx.t >= tx.life) G.texts.splice(i, 1);
  }
}

function clearMonsters() {
  for (const e of [...G.enemies]) defeat(e, 'poof', { silent: true });
  G.eshots = [];
}

// ---------------------------------------------------------------- flow

function updatePhase() {
  if (G.phase === 'waves' && G.defeated >= G.goal) {
    clearMonsters();
    if (G.rescue) { G.rescue.pk.rescue = false; G.rescue = null; }
    if (G.lv.boss) {
      G.phase = 'bossIntro'; G.phaseT = 0;
      const B = BOSSES[G.lv.boss];
      UI.banner(`${B.name}<br><small>${B.sub}</small>`, 'purple', 3);
      Sfx.bossIntro();
      Sfx.music('boss');
      if (G.p.hearts < G.p.max) {
        G.p.hearts = G.p.max;
        addText(G.p.x, G.p.y - 115, 'Hearts refilled! ❤️', '#ff8ab3', 22, 1.6);
      }
    } else finishLevel();
  } else if (G.phase === 'bossIntro' && G.phaseT > 2.6) {
    spawnBoss(G.lv.boss);
    G.phase = 'boss'; G.phaseT = 0;
  } else if (G.phase === 'bossDone' && G.phaseT > 3.4) {
    finishLevel();
  } else if (G.phase === 'done' && G.phaseT > 1.8 && !G.shownComplete) {
    G.shownComplete = true;
    G.firing = false;
    if (G.lv.id === LEVELS.length) { G.state = 'victory'; UI.showVictory(G.result); Sfx.music('title'); }
    else { G.state = 'complete'; UI.showComplete(G.result); }
  }
}

function finishLevel() {
  G.phase = 'done'; G.phaseT = 0; G.shownComplete = false;
  clearMonsters();
  G.power = null; G.buddy = null;
  if (G.boss && !['king', 'boo', 'moon'].includes(G.boss.type)) G.boss = null;
  const jacks = G.pumpkins.filter(p => p.kind === 'static' && p.face === 'jack' && !p.harmed).length;
  const babies = G.followers.length;
  const stars = G.oops === 0 ? 3 : G.oops <= 2 ? 2 : 1;
  const bonus = jacks * 50 + babies * 50 + (G.oops === 0 ? 200 : 0);
  G.score += bonus;
  G.result = { jacks, babies, stars, bonus, perfect: G.oops === 0 };
  Save.d.maxLevel = Math.max(Save.d.maxLevel, Math.min(LEVELS.length, G.lv.id + 1));
  Save.d.stars[G.lv.id] = Math.max(Save.d.stars[G.lv.id] || 0, stars);
  Save.d.candy += G.candy;
  if (G.lv.id === LEVELS.length) Save.d.won = true;
  Save.write();
  for (const pk of G.pumpkins) {
    pk.celebrateT = 99;
    if (pk.kind === 'static' && Math.random() < 0.7) say(pk, pick(['Yay!', 'Hooray!', 'Thank you!', 'Our hero!', 'Woo-hoo!']), 2.5);
  }
  if (G.cat) say(G.cat, 'MEOW!', 2);
  UI.banner(`${G.lv.icon} WORLD SAVED! ${G.lv.icon}`, 'gold', 1.8);
  Sfx.fanfare();
  for (let i = 0; i < 3; i++) confetti(rand(200, W - 200), rand(150, 300), 30);
}

function gameOver() {
  G.state = 'over';
  G.firing = false;
  Save.d.candy += G.candy;
  Save.write();
  setTimeout(() => { if (G.state === 'over') UI.showGameOver(); }, 700);
}

function update(dt) {
  G.phaseT += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);
  updatePlayer(dt);
  updatePower(dt);
  if (G.phase === 'waves') updateSpawner(dt);
  if (G.phase === 'waves' || G.phase === 'boss') updateTimers(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updatePumpkins(dt);
  updateFollowers(dt);
  updateFriends(dt);
  updateCat(dt);
  updateHouses(dt);
  updateShots(dt);
  updateEnemyShots(dt);
  updateItems(dt);
  updateEffects(dt);
  updatePhase();
}

// ---------------------------------------------------------------- rendering

function drawEnemyArt(e, t, c = ctx) {
  if (e.type === 'vampire' && e.batForm) { ART.vampBat(c, t, e); return; }
  ART[ENEMY_TYPES[e.type].art](c, t, e);
}

function drawEnemy(e, bubbles) {
  const T = ENEMY_TYPES[e.type];
  const sc = e.r / T.base;
  let alpha = e.vis == null ? 1 : e.vis;
  if (e.variant === 'invisible') alpha *= 0.3;
  if (alpha <= 0.01) return;
  let y = e.y + (e.yOff || 0);
  if (T.walk && !e.still && !e.hidden && !e.hop) y -= Math.abs(Math.sin(e.t * 8)) * 2.5;
  if (e.type === 'spider') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
    line(ctx, e.x, -10, e.x, y - 14 * sc);
  }
  if (T.walk && !e.hidden) groundShadow(ctx, e.x, GROUND_Y + 1, e.r * 0.8 * (1 - Math.min(0.5, -(e.yOff || 0) / 80)));
  ctx.save();
  ctx.translate(e.x, y);
  ctx.globalAlpha = alpha;
  if (e.frozen) ctx.filter = 'saturate(0.35) brightness(1.2) hue-rotate(160deg)';
  else if (e.flash > 0) ctx.filter = 'brightness(1.8)';
  ctx.scale(sc * (e.dir < 0 ? -1 : 1), sc);
  drawEnemyArt(e, G.t + (e.seed || 0));
  ctx.restore();
  if (e.frozen) {
    ctx.fillStyle = '#d8f2ff'; ctx.font = `700 15px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('Zzz', e.x + e.r * 0.7, y - e.r);
  }
  if (e.type === 'grump') {
    rrect(ctx, e.x - 34, y - e.r - 22, 68, 9, 4); paint(ctx, 'rgba(0,0,0,0.4)', 2, '#fff');
    rrect(ctx, e.x - 32, y - e.r - 20, 64 * Math.max(0, e.hp) / ENEMY_TYPES.grump.hp, 5, 3); ctx.fillStyle = '#ff6aa8'; ctx.fill();
  }
  if (e.say) bubbles.push([e.x, y - e.r * 1.15, e.say]);
}

function drawPumpkinEnt(pk, bubbles) {
  let y = pk.y;
  if (pk.celebrateT > 0) y -= Math.abs(Math.sin(G.t * 7 + pk.t)) * 16;
  if (pk.jump > 0) y -= Math.sin(pk.jump / 0.35 * Math.PI) * 10;
  if (pk.hop) y -= pk.hop;
  groundShadow(ctx, pk.x, pk.y + pk.r * 0.84 + 1, pk.r * 0.9);
  ctx.save();
  ctx.translate(pk.x, y);
  if (pk.rot) ctx.rotate(pk.rot);
  let face = pk.face;
  if (pk.sad > 0) face = 'sad';
  else if (pk.rescue) face = 'worried';
  else if (pk.celebrateT > 0 || pk.kind === 'roller') face = 'happy';
  ART.pumpkin(ctx, pk.r, { face, t: G.t + pk.t, gold: pk.kind === 'golden', glow: pk.face === 'jack' || pk.kind === 'golden', talking: !!pk.say });
  ctx.restore();
  if (pk.say) bubbles.push([pk.x, y - pk.r * 1.15, pk.say]);
}

function drawBoss(b, bubbles) {
  let alpha = b.type === 'boo' ? b.vis : 1;
  if (b.exitAlpha != null) alpha *= b.exitAlpha;
  if (alpha <= 0.01) return;
  if (b.type === 'king') groundShadow(ctx, b.x, GROUND_Y + 2, 70);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x + (b.ox || 0), b.y + (b.oy || 0));
  if (b.rot) ctx.rotate(b.rot);
  if (b.frozen) ctx.filter = 'saturate(0.35) brightness(1.2) hue-rotate(160deg)';
  else if (b.flash > 0) ctx.filter = 'brightness(1.6)';
  switch (b.type) {
    case 'king': ART.king(ctx, G.t, b); break;
    case 'chef': ART.chef(ctx, G.t, b); break;
    case 'queen': ART.queen(ctx, G.t, b); break;
    case 'count': ART.count(ctx, G.t, b); break;
    case 'boo': ART.bigBoo(ctx, G.t, b); break;
    case 'moon': ART.moonBoss(ctx, G.t, b); break;
  }
  ctx.restore();
  if (b.type === 'count' && b.scared > 0 && !b.defeated) {
    ctx.fillStyle = '#bfffe0'; ctx.font = `700 16px ${FONT}`; ctx.textAlign = 'center';
    ctx.fillText('SCARED! BONK HIM!', b.x, b.y + 95);
  }
  if (b.say && alpha > 0.3) {
    const off = { king: 108, chef: 120, queen: 120, count: 95, boo: 115, moon: 150 }[b.type];
    bubbles.push([b.x, b.y + (b.oy || 0) - off, b.say]);
  }
}

function drawBossObj(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  if (o.flash > 0) ctx.filter = 'brightness(1.8)';
  if (o.kind === 'portal') {
    softGlow(ctx, 0, 0, 60, 'rgba(200,120,255,0.45)');
    ctx.rotate(G.t * 3);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.5; a += 0.2) {
        const rr = a / (TAU * 1.5) * o.r;
        const px = Math.cos(a + i * TAU / 3) * rr, py = Math.sin(a + i * TAU / 3) * rr;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.strokeStyle = ['#c87aff', '#ff9ad0', '#7ad0ff'][i]; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    }
    circle(ctx, 0, 0, o.r); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  } else if (o.kind === 'garlic') {
    ctx.rotate(Math.sin(o.t * 3) * 0.2);
    softGlow(ctx, 0, 0, 40, 'rgba(255,255,220,0.4)');
    ctx.strokeStyle = '#7aa83e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    line(ctx, 0, -18, -3, -28); line(ctx, 0, -18, 4, -27);
    for (const [x, w] of [[-9, 9], [9, 9], [0, 11]]) { ellipse(ctx, x, 0, w, 17); paint(ctx, '#fbf8ea', 2.5); }
    ART.eyes(ctx, 0, -1, 2.8, 5);
    ART.blush(ctx, 0, 4, 9, 2.5);
    ART.mouth(ctx, 0, 6, 4, 'smile');
    ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'round';
    ctx.strokeText('SHOOT ME!', 0, 36);
    ctx.fillStyle = '#fff6a8'; ctx.fillText('SHOOT ME!', 0, 36);
  }
  ctx.restore();
}

function drawFriend(f, bubbles) {
  if (f.type === 'spiderf') { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; line(ctx, f.x, -10, f.x, f.y - 14); }
  ctx.save();
  ctx.translate(f.x, f.y);
  const sc = f.r / 28;
  ctx.scale(sc * (f.dir < 0 ? -1 : 1), sc);
  if (f.sad > 0) ART.face = 'closed';
  ART.friend(ctx, G.t + f.seed, f);
  ART.face = null;
  ctx.restore();
  ART.friendHeart(ctx, f.x, f.y - f.r - 20, G.t + f.seed);
  if (f.say) bubbles.push([f.x, f.y - f.r - 30, f.say]);
}

function drawItem(it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.font = `${it.kind === 'col' ? 30 : 22}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (it.kind === 'col') softGlow(ctx, 0, 0, 30, 'rgba(255,240,150,0.6)');
  ctx.rotate(Math.sin(it.t * 6) * 0.25);
  ctx.fillText(it.icon, 0, 0);
  ctx.restore();
}

function drawEShot(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  if (s.kind === 'cupcake') ART.cupcake(ctx, 13); else ART.wrapper(ctx, 9);
  ctx.restore();
}

function drawShot(s) {
  if (s.kind === 'rainbow') {
    const n = s.trail.length;
    s.trail.forEach(([x, y], i) => {
      circle(ctx, x, y, s.r * (0.3 + 0.7 * i / n));
      ctx.fillStyle = `hsla(${(G.t * 500 + i * 40) % 360},100%,70%,${0.3 + 0.7 * i / n})`; ctx.fill();
    });
  }
  ctx.save();
  ctx.translate(s.x, s.y);
  switch (s.kind) {
    case 'candy': ctx.rotate(s.t * 12 + s.seed); ART.candy(ctx, 8, s.color); break;
    case 'bubble': {
      const wob = Math.sin(s.t * 14) * 0.08;
      ctx.scale(1 + wob, 1 - wob);
      circle(ctx, 0, 0, s.r); ctx.fillStyle = 'rgba(170,230,255,0.28)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,170,230,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, s.r - 3, 0.2, 1.4); ctx.stroke();
      ctx.fillStyle = '#fff'; ellipse(ctx, -s.r * 0.4, -s.r * 0.4, s.r * 0.22, s.r * 0.13, -0.7); ctx.fill();
      break;
    }
    case 'star':
      ctx.rotate(s.t * 10);
      softGlow(ctx, 0, 0, 20, `hsla(${s.hue},100%,75%,0.6)`);
      starShape(ctx, 0, 0, 10, 0.5); paint(ctx, `hsl(${s.hue},100%,72%)`, 2, '#fff');
      break;
    case 'cupcake': ctx.rotate(Math.sin(s.t * 10) * 0.3); ART.cupcake(ctx, 12); break;
    case 'leaf':
      ctx.rotate(s.t * 14 + s.seed);
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(0, -10, 11, 0); ctx.quadraticCurveTo(0, 10, -11, 0);
      paint(ctx, `hsl(${s.hue},90%,55%)`, 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; line(ctx, -9, 0, 9, 0);
      softGlow(ctx, 0, 0, 16, 'rgba(255,230,120,0.35)');
      break;
    case 'boomer':
      ctx.rotate(s.t * 18); ctx.scale(0.55, 0.55);
      ART.bat(ctx, G.t, {}, { color: '#ff9ac8', wing: '#f070aa', light: '#ffd8ea', mouth: 'smile' });
      break;
    case 'potion':
      ctx.rotate(s.t * 9);
      rrect(ctx, -3.5, -16, 7, 9, 2); paint(ctx, '#c8a070', 1.8);
      circle(ctx, 0, 0, 10); paint(ctx, '#9aff7a', 2.5);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; circle(ctx, -3, -3, 3); ctx.fill();
      ctx.fillStyle = '#c87aff'; circle(ctx, 3, 3, 2.5); ctx.fill();
      break;
    case 'rainbow':
      softGlow(ctx, 0, 0, 22, 'rgba(255,255,255,0.7)');
      ctx.fillStyle = '#fff'; sparkleShape(ctx, 0, 0, 11); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawFx(f) {
  if (f.kind === 'cloud') {
    const k = f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - k);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + f.t;
      circle(ctx, f.x + Math.cos(a) * 50 * (0.5 + k), f.y + Math.sin(a) * 34 * (0.5 + k), 30 + k * 20);
      ctx.fillStyle = i % 2 ? '#b8ff8a' : '#d8a8ff'; ctx.fill();
    }
    ctx.restore();
    return;
  }
  const e = f.e, T = ENEMY_TYPES[e.type], sc = e.r / T.base, k = f.t / f.life;
  const fade = k > 0.75 ? (1 - k) / 0.25 : 1;
  const dir = e.dir < 0 ? -1 : 1;
  const t = G.t + (e.seed || 0);
  ctx.save();
  ctx.translate(f.cx, f.cy);
  switch (f.kind) {
    case 'poof':
      if (f.t < 0.15) {
        const q = f.t / 0.15;
        ctx.globalAlpha = (1 - q) * (e.variant === 'invisible' ? 0.3 : 1);
        ctx.scale(sc * dir * (1 + q * 0.6), sc * (1 - q * 0.6));
        drawEnemyArt(e, t);
      }
      break;
    case 'pieces': {
      const cheer = e.type === 'cheer';
      ctx.scale(sc, sc);
      if (f.t >= 2.15) {
        ctx.globalAlpha = Math.max(0, 1 - (f.t - 2.15) / 0.5);
        ctx.scale(dir, 1);
        e.still = true;
        drawEnemyArt(e, t);
        break;
      }
      for (const pc of f.pieces) {
        ctx.save();
        ctx.translate(pc.x, pc.y); ctx.rotate(pc.rot); ctx.translate(-pc.ox, -pc.oy);
        if (pc.part === 'head') { ART.face = f.t < 1.7 ? 'dizzy' : null; ART.zombieHead(ctx, t, { cheer }); ART.face = null; }
        else if (pc.part === 'body') ART.zombieBody(ctx, t, { cheer });
        else if (pc.part === 'teddy') { ctx.translate(26, 8); ART.teddy(ctx); }
        else { ctx.translate(26, 8); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; circle(ctx, Math.cos(a) * 6, Math.sin(a) * 6, 5); ctx.fillStyle = '#ff6aa8'; ctx.fill(); } }
        ctx.restore();
      }
      break;
    }
    case 'bonk':
      ctx.globalAlpha = fade;
      ctx.rotate(Math.sin(f.t * 5) * 0.12);
      ctx.scale(sc * dir, sc);
      ART.face = 'dizzy'; e.still = true; e.throwing = 0; e.howl = 0;
      drawEnemyArt(e, t);
      ART.face = null;
      for (let i = 0; i < 3; i++) {
        const a = f.t * 6 + i * TAU / 3;
        ctx.fillStyle = '#ffe36b';
        starShape(ctx, Math.cos(a) * 24, -42 + Math.sin(a) * 6, 6); paint(ctx, '#ffe36b', 1.5);
      }
      break;
    case 'witchfly':
      ctx.globalAlpha = fade;
      ctx.rotate(f.t * 9);
      ctx.scale(sc * dir * (1 - k * 0.4), sc * (1 - k * 0.4));
      ART.face = 'dizzy'; drawEnemyArt(e, t); ART.face = null;
      break;
    case 'skull': {
      ctx.globalAlpha = f.t > 1.85 ? Math.max(0, 1 - (f.t - 1.85) / 0.25) : 1;
      ctx.scale(sc, sc);
      const gy = (GROUND_Y - f.y) / sc - 14;
      let hx, hy, hr;
      if (f.t < 0.9) { const q = f.t / 0.9; hx = 36 * q; hy = lerp(-20, gy, q) - Math.sin(q * Math.PI) * 70; hr = q * 6; }
      else if (f.t < 1.3) { hx = 36; hy = gy; hr = 6; }
      else { const q = Math.min(1, (f.t - 1.3) / 0.5); hx = lerp(36, 0, q); hy = lerp(gy, -20, q) - Math.sin(q * Math.PI) * 40; hr = lerp(6, 0, q); }
      e.noHead = true; e.dancing = false;
      ART.skeleton(ctx, t, e);
      e.noHead = false;
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(hr);
      if (f.t < 1.3) ART.face = 'dizzy';
      ART.skull(ctx, 0, 0);
      ART.face = null;
      ctx.restore();
      if (f.t > 1.0 && f.t < 1.4 && !f.said) { f.said = true; addText(f.x, f.y - 50, 'Hold on… got it!', '#fff', 16, 1); }
      break;
    }
    case 'dizzy':
      ctx.globalAlpha = fade;
      ctx.rotate(f.t * 12);
      ctx.scale(sc, sc);
      ART.face = 'dizzy'; drawEnemyArt(e, t); ART.face = null;
      break;
    case 'scream':
      ctx.globalAlpha = fade;
      ctx.scale(sc * Math.sign(f.vx), sc);
      e.running = true; e.giggle = false;
      drawEnemyArt(e, t);
      break;
    case 'sink':
      ctx.globalAlpha = fade;
      ctx.scale(sc, sc);
      e.rise = Math.max(0, 1 - k * 1.3);
      ART.face = 'closed'; drawEnemyArt(e, t); ART.face = null;
      break;
    case 'trap': {
      const br = e.r * 1.25;
      ctx.save();
      ctx.scale(sc * 0.8 * dir, sc * 0.8);
      ctx.globalAlpha = e.variant === 'invisible' ? 0.35 : 1;
      ART.face = ENEMY_TYPES[e.type].ghost ? 'closed' : 'wide';
      drawEnemyArt(e, t);
      ART.face = null;
      ctx.restore();
      const wob = Math.sin(f.t * 8) * 0.06;
      ctx.scale(1 + wob, 1 - wob);
      circle(ctx, 0, 0, br); ctx.fillStyle = 'rgba(170,230,255,0.25)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,170,230,0.6)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, br - 4, 0.2, 1.5); ctx.stroke();
      ctx.fillStyle = '#fff'; ellipse(ctx, -br * 0.4, -br * 0.45, br * 0.2, br * 0.11, -0.7); ctx.fill();
      break;
    }
    case 'rainbow':
      ctx.globalAlpha = fade;
      ctx.filter = `hue-rotate(${(f.t * 360) % 360}deg) saturate(1.8) brightness(1.15)`;
      ctx.scale(sc * dir, sc);
      ART.face = 'closed'; e.still = true; drawEnemyArt(e, t); ART.face = null;
      break;
    case 'silly':
      ctx.rotate(Math.sin(f.t * 18) * 0.35);
      ctx.translate(0, -Math.abs(Math.sin(f.t * 12)) * 10);
      ctx.scale(sc * dir, sc);
      ART.face = 'closed'; drawEnemyArt(e, t); ART.face = null;
      if (Math.random() < 0.15) burst(f.cx, f.cy - 30, 1, ['#fff', '#ffe36b', '#d8ffb0'], { shape: 'note', speed: 50, grav: -60, life: 0.9, size: 14, sizeMin: 12 });
      break;
  }
  ctx.restore();
}

function drawParticles() {
  for (const q of G.parts) {
    const a = 1 - q.t / q.life;
    ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.3));
    switch (q.shape) {
      case 'circle': circle(ctx, q.x, q.y, q.size); ctx.fillStyle = q.color; ctx.fill(); break;
      case 'puff': circle(ctx, q.x, q.y, q.size * (1 + q.t / q.life)); ctx.fillStyle = q.color; ctx.fill(); break;
      case 'star': ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.color; sparkleShape(ctx, 0, 0, q.size); ctx.fill(); ctx.restore(); break;
      case 'heart': heartShape(ctx, q.x, q.y, q.size); ctx.fillStyle = q.color; ctx.fill(); break;
      case 'confetti': ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.color; ctx.fillRect(-q.size / 2, -q.size / 4, q.size, q.size / 2); ctx.restore(); break;
      case 'candy': ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(q.size / 9, q.size / 9); ART.candy(ctx, 8, q.color); ctx.restore(); break;
      case 'note':
        ctx.fillStyle = q.color; ctx.font = `700 ${q.size}px ${FONT}`; ctx.textAlign = 'center';
        ctx.fillText('♪', q.x, q.y); break;
      case 'emoji':
        ctx.font = `${q.size}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(q.text, q.x, q.y); break;
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  for (const tx of G.texts) {
    const k = tx.t / tx.life;
    const pop = tx.t < 0.12 ? 0.6 + tx.t / 0.12 * 0.6 : tx.t < 0.2 ? 1.2 - (tx.t - 0.12) / 0.08 * 0.2 : 1;
    ctx.save();
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    ctx.translate(tx.x, tx.y - k * 30);
    ctx.scale(pop, pop);
    ctx.font = `700 ${tx.size}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = INK;
    ctx.strokeText(tx.text, 0, 0);
    ctx.fillStyle = tx.color; ctx.fillText(tx.text, 0, 0);
    ctx.restore();
  }
}

function drawPlayer() {
  const p = G.p;
  const pw = G.power ? G.power.id : null;
  ctx.save();
  if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.translate(p.x, p.y);
  const w = WEAPON_BY_ID[p.weapon];
  ART.player(ctx, p, G.t, { witch: pw === 'witch', icon: w.icon, weaponColor: WEAPON_COLORS[w.id] });
  ctx.restore();
  if (pw === 'shield') {
    for (let i = 0; i < 3; i++) {
      const a = G.t * 3 + i * TAU / 3;
      ctx.save(); ctx.translate(p.x + Math.cos(a) * 50, p.y - 45 + Math.sin(a) * 30);
      ART.pumpkin(ctx, 13, { face: 'happy', t: G.t });
      ctx.restore();
    }
  }
  if (pw === 'sugar') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) line(ctx, p.x - p.face * (30 + i * 4), p.y - 20 - i * 18, p.x - p.face * (55 + i * 6), p.y - 20 - i * 18);
  }
}

function drawCat(bubbles) {
  const c = G.cat;
  if (!c) return;
  ctx.save();
  ctx.translate(c.x, PLAYER_Y);
  ctx.scale(c.dir < 0 ? -1 : 1, 1);
  ART.cat(ctx, G.t, { moving: c.moving, meow: c.meow > 0 });
  ctx.restore();
  if (c.say) bubbles.push([c.x, PLAYER_Y - 52, c.say]);
}

function drawFollowers() {
  for (const f of G.followers) {
    groundShadow(ctx, f.x, PLAYER_Y + 1, 12);
    ctx.save();
    ctx.translate(f.x, PLAYER_Y - 12 - f.hop);
    ART.pumpkin(ctx, 14, { face: G.state === 'play' ? 'baby' : 'happy', t: G.t + f.t });
    ctx.restore();
  }
}

function drawBuddy() {
  const b = G.buddy;
  if (!b) return;
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(0.8, 0.8);
  ART.bat(ctx, G.t, {}, { color: '#ffb3d6', wing: '#ff7ab8', light: '#ffe0f0', mouth: 'smile' });
  ctx.restore();
  ART.friendHeart(ctx, b.x, b.y - 32, G.t);
}

function drawOverlays() {
  const pw = G.power ? G.power.id : null;
  if (pw === 'moon') {
    ctx.fillStyle = 'rgba(150,200,255,0.16)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(W / 2, 0, W / 2, H);
    g.addColorStop(0, 'rgba(220,240,255,0.35)'); g.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(W / 2 - 60, 0); ctx.lineTo(W / 2 + 60, 0); ctx.lineTo(W / 2 + 300, H); ctx.lineTo(W / 2 - 300, H); ctx.fill();
  }
  if (pw === 'sparkle' || pw === 'witch') {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 18; i++) {
      const x = (i * 211 + G.t * 40) % W, y = (i * 137 + Math.sin(G.t + i) * 40 + 600) % H;
      const s = 3 + Math.abs(Math.sin(G.t * 4 + i)) * 6;
      ctx.globalAlpha = 0.7; ctx.fillStyle = pw === 'witch' ? '#e0c8ff' : ['#fff', '#ffe36b', '#ff9ad0', '#7ad0ff'][i % 4];
      sparkleShape(ctx, x, y, s); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (G.p && G.p.inv > 1.3) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(255,100,160,0)'); g.addColorStop(1, `rgba(255,100,160,${(G.p.inv - 1.3) * 1.2})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

function drawReticle() {
  if (G.state !== 'play' || !G.mouseAim || G.aim.y >= TAP_WALK_Y) return;
  const { x, y } = G.aim;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(G.t * 1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
  circle(ctx, 0, 0, 16); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffe36b'; sparkleShape(ctx, 0, 0, 6); ctx.fill();
  ctx.restore();
}

function drawWalkMarker() {
  if (G.walkTarget == null || G.state !== 'play') return;
  const a = 0.5 + Math.sin(G.t * 8) * 0.3;
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ellipse(ctx, G.walkTarget, PLAYER_Y + 4, 16, 5); ctx.fill();
}

function drawHint() {
  if (G.state !== 'play' || G.lv.id !== 1 || G.phaseT > 9 || G.phase !== 'waves') return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, (9 - G.phaseT) / 1.5);
  ctx.font = `700 17px ${FONT}`;
  ctx.textAlign = 'center';
  const msg = '👆 Tap the sky to shoot   •   Tap the path to walk 👣';
  const w = ctx.measureText(msg).width + 30;
  rrect(ctx, W / 2 - w / 2, 455, w, 30, 15); paint(ctx, 'rgba(40,18,70,0.8)', 2.5, '#ffb35c');
  ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, 476);
  ctx.restore();
}

function drawWorld() {
  BG.draw(ctx, G.lv.bg, G.t);
  const bubbles = [];
  for (const h of G.houses) {
    const ready = houseReady(h);
    ART.house(ctx, h, G.t, ready);
    if (h.say) bubbles.push([h.x, GROUND_Y - 150, h.say]);
    else if (ready && (G.t % 7) < 2.2) bubbles.push([h.x, GROUND_Y - 150, { text: 'Trick or treat? Tap me!', t: 1 }]);
  }
  for (const e of G.enemies) if (e.behind) drawEnemy(e, bubbles);
  for (const pk of G.pumpkins) if (pk.kind === 'static' || pk.kind === 'roller') drawPumpkinEnt(pk, bubbles);
  if (G.boss && G.boss.type === 'king') drawBoss(G.boss, bubbles);
  for (const e of G.enemies) if (!e.behind) drawEnemy(e, bubbles);
  for (const o of G.bossObjs) drawBossObj(o);
  if (G.boss && G.boss.type !== 'king') drawBoss(G.boss, bubbles);
  for (const f of G.friends) drawFriend(f, bubbles);
  for (const s of G.eshots) drawEShot(s);
  drawWalkMarker();
  for (const pk of G.pumpkins) if (pk.kind === 'golden' || pk.kind === 'baby') drawPumpkinEnt(pk, bubbles);
  drawFollowers();
  drawCat(bubbles);
  if (G.p) drawPlayer();
  drawBuddy();
  for (const s of G.shots) drawShot(s);
  for (const f of G.fx) drawFx(f);
  for (const it of G.items) drawItem(it);
  drawParticles();
  drawTexts();
  for (const [x, y, s] of bubbles) ART.speech(ctx, x, y, s.text, Math.min(1, s.t * 4));
  drawOverlays();
  drawHint();
  drawReticle();
}

function drawTitle() {
  BG.draw(ctx, 'patch', G.t);
  const t = G.t;
  const pumpkins = [[110, 26, 'smile'], [215, 22, 'jack'], [750, 24, 'talk'], [860, 30, 'happy']];
  pumpkins.forEach(([x, r, face], i) => {
    const y = GROUND_Y - r * 0.84 - (face === 'happy' ? Math.abs(Math.sin(t * 5)) * 12 : 0);
    groundShadow(ctx, x, GROUND_Y + 1, r * 0.9);
    ctx.save(); ctx.translate(x, y);
    ART.pumpkin(ctx, r, { face, t: t + i, glow: face === 'jack', talking: true });
    ctx.restore();
  });
  const sprite = (fn, x, y, s, dir = 1) => { ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s); fn(); ctx.restore(); };
  sprite(() => ART.ghost(ctx, t, { variant: 'wizard' }), 150, 200 + Math.sin(t * 2) * 12, 1.1);
  sprite(() => ART.bat(ctx, t, {}), 820, 230 + Math.sin(t * 3) * 20, 1);
  sprite(() => ART.witch(ctx, t, {}), ((t * 70) % (W + 300)) - 150, 70 + Math.sin(t * 2) * 15, 0.9);
  sprite(() => ART.zombie(ctx, t, {}), 40 + Math.sin(t * 0.5) * 20, GROUND_Y + 50, 1, Math.cos(t * 0.5) >= 0 ? 1 : -1);
  sprite(() => ART.skeleton(ctx, t, { dancing: true }), 920, GROUND_Y + 50, 1);
  sprite(() => ART.ghost(ctx, t, { variant: 'princess', seed: 3 }), 860, 140 + Math.sin(t * 1.6) * 10, 0.8, -1);
  ctx.save(); ctx.translate(480 + Math.sin(t * 0.7) * 260, PLAYER_Y + 10); ctx.scale(Math.cos(t * 0.7) >= 0 ? 1 : -1, 1);
  ART.cat(ctx, t, { moving: true });
  ctx.restore();
  drawParticles();
}

function render() {
  ctx.setTransform(viewScale * DPR, 0, 0, viewScale * DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (G.shake > 0) ctx.translate(rand(-1, 1) * G.shake * 10, rand(-1, 1) * G.shake * 10);
  if (G.state === 'title' || !G.lv) drawTitle();
  else drawWorld();
  ctx.restore();
}

// ---------------------------------------------------------------- main loop

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  G.t += dt;
  if (G.state === 'play') update(dt);
  else if (G.state === 'complete' || G.state === 'victory') {
    updatePumpkins(dt); updateFollowers(dt); updateCat(dt); updateEffects(dt); updateItems(dt);
    if (G.boss) { G.boss.t += dt; tickSay(G.boss, dt); updateBossExit(G.boss, dt); }
    if (Math.random() < 0.03) confetti(rand(100, W - 100), rand(100, 250), 12);
  } else if (G.state === 'title') updateEffects(dt);
  render();
  UI.hud();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- input

function toLogical(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
}

canvas.addEventListener('pointerdown', ev => {
  Sfx.init();
  if (G.state !== 'play') return;
  ev.preventDefault();
  const pt = toLogical(ev);
  G.mouseAim = ev.pointerType === 'mouse';
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not supported */ }
  for (const h of G.houses) {
    if (pt.x > h.x - 58 && pt.x < h.x + 58 && pt.y > GROUND_Y - 150 && pt.y < GROUND_Y + 12) { knockHouse(h); return; }
  }
  if (pt.y > TAP_WALK_Y) { G.walkTarget = pt.x; G.walking = true; return; }
  G.aim.x = pt.x; G.aim.y = pt.y;
  G.firing = true;
  updateAim();
  if (G.p.cool <= 0) fire();
});

canvas.addEventListener('pointermove', ev => {
  const pt = toLogical(ev);
  G.mouseAim = ev.pointerType === 'mouse';
  if (G.walking) { G.walkTarget = pt.x; return; }
  if (pt.y < TAP_WALK_Y || G.firing) { G.aim.x = pt.x; G.aim.y = Math.min(pt.y, TAP_WALK_Y); }
});

function endPointer() { G.firing = false; G.walking = false; }
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', ev => ev.preventDefault());

window.addEventListener('keydown', ev => {
  G.keys[ev.code] = true;
  if (ev.code === 'Space' || ev.code.startsWith('Arrow')) ev.preventDefault();
  Sfx.init();
  if (G.state === 'play') {
    const n = parseInt(ev.key, 10);
    if (n >= 1 && n <= WEAPONS.length) setWeapon(WEAPONS[n - 1].id);
    if (ev.code === 'KeyQ') cycleWeapon(-1);
    if (ev.code === 'KeyE') cycleWeapon(1);
    if (ev.code === 'KeyP' || ev.code === 'Escape') UI.pause();
  } else if (G.state === 'paused' && (ev.code === 'KeyP' || ev.code === 'Escape')) UI.resume();
  if (ev.code === 'KeyM') UI.toggleMute();
});
window.addEventListener('keyup', ev => { G.keys[ev.code] = false; });
window.addEventListener('blur', () => {
  G.keys = {}; endPointer();
  if (G.state === 'play') UI.pause();
});
