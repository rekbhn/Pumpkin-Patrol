'use strict';

// Painted backgrounds for all 10 worlds. Each scene is drawn once to an
// offscreen canvas, then animated details (twinkles, fog, fireflies...) are layered on top.
const BG = (() => {
  const cache = {};
  const RES = 2;

  function seeded(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }
  function sky(ctx, stops, y1 = H) { ctx.fillStyle = vgrad(ctx, 0, y1, stops); ctx.fillRect(0, 0, W, H); }

  function stars(ctx, R, n, maxY, color = '#fff') {
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.35 + R() * 0.65;
      circle(ctx, R() * W, R() * maxY, R() * 1.5 + 0.4); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function makeTwinkles(R, n, maxY, minY = 0) {
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({ x: R() * W, y: minY + R() * (maxY - minY), s: 1 + R() * 3, p: R() * 10, r: 3 + R() * 4 });
    return arr;
  }

  function moonFace(ctx, x, y, r, o = {}) {
    softGlow(ctx, x, y, r * 2.6, o.glow || 'rgba(255,240,180,0.35)');
    circle(ctx, x, y, r); ctx.fillStyle = shade(ctx, x, y, r, '#ffffff', o.color || '#fff1b8'); ctx.fill();
    ctx.fillStyle = 'rgba(190,160,110,0.18)';
    circle(ctx, x - r * 0.45, y - r * 0.35, r * 0.16); ctx.fill();
    circle(ctx, x + r * 0.5, y + r * 0.4, r * 0.12); ctx.fill();
    circle(ctx, x + r * 0.3, y - r * 0.55, r * 0.08); ctx.fill();
    if (o.face !== false) {
      ctx.save(); ctx.globalAlpha = 0.75;
      ART.eyes(ctx, x, y - r * 0.05, r * 0.11, r * 0.32, { closed: true, color: '#c8a060' });
      ART.blush(ctx, x, y + r * 0.18, r * 0.45, r * 0.12, 0.35);
      ART.mouth(ctx, x, y + r * 0.3, r * 0.22, 'smile', '#c8a060');
      ctx.restore();
    }
  }

  function hills(ctx, baseY, amp, color, seed) {
    const R = seeded(seed);
    const ph = R() * 10, f1 = 0.004 + R() * 0.004, f2 = 0.011 + R() * 0.006;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, baseY - Math.sin(x * f1 + ph) * amp - Math.sin(x * f2 + ph * 2) * amp * 0.35);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  }

  function ground(ctx, y, top, bottom, wav = 4) {
    ctx.fillStyle = vgrad(ctx, y, H, [[0, top], [1, bottom]]);
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y);
    for (let x = 0; x <= W; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.03) * wav);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  function pathGlow(ctx) {
    ctx.fillStyle = 'rgba(255,240,255,0.07)';
    ellipse(ctx, W / 2, PLAYER_Y - 4, W * 0.58, 28); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,255,0.05)';
    ellipse(ctx, W / 2, PLAYER_Y - 4, W * 0.4, 18); ctx.fill();
  }

  function cloud(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    [[0, 0, 1], [-0.95, 0.28, 0.68], [0.95, 0.25, 0.74], [-0.42, -0.36, 0.7], [0.45, -0.3, 0.66]].forEach(([dx, dy, r]) => {
      circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill();
    });
  }

  function batSil(ctx, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.quadraticCurveTo(-10, -14, -24, -6); ctx.quadraticCurveTo(-18, -2, -16, 4); ctx.quadraticCurveTo(-10, 0, -6, 6);
    ctx.quadraticCurveTo(0, 2, 6, 6); ctx.quadraticCurveTo(10, 0, 16, 4); ctx.quadraticCurveTo(18, -2, 24, -6);
    ctx.quadraticCurveTo(10, -14, 0, -4); ctx.fill();
    circle(ctx, 0, 0, 5); ctx.fill();
    ctx.restore();
  }

  function tufts(ctx, R, n, y0, y1, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = y0 + R() * (y1 - y0), s = 4 + R() * 5;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.6, y); ctx.quadraticCurveTo(x - s * 0.8, y - s, x - s * 1.2, y - s * 1.3);
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - s * 1.2, x + s * 0.2, y - s * 1.7);
      ctx.moveTo(x + s * 0.6, y); ctx.quadraticCurveTo(x + s * 0.8, y - s, x + s * 1.3, y - s * 1.2);
      ctx.stroke();
    }
  }

  function dimPumpkin(ctx, x, y, r) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#4a7a3a'; ctx.fillRect(-r * 0.12, -r * 1.05, r * 0.24, r * 0.4);
    ctx.fillStyle = '#d0702a';
    ellipse(ctx, -r * 0.4, 0, r * 0.55, r * 0.8); ctx.fill();
    ellipse(ctx, r * 0.4, 0, r * 0.55, r * 0.8); ctx.fill();
    ctx.fillStyle = '#e8843a'; ellipse(ctx, 0, 0, r * 0.5, r * 0.84); ctx.fill();
    ctx.restore();
  }

  function mushroom(ctx, x, y, s, cap = '#ff5a7a', glowC = 'rgba(255,120,160,0.35)') {
    softGlow(ctx, x, y - s, s * 3, glowC);
    rrect(ctx, x - s * 0.35, y - s * 1.0, s * 0.7, s * 1.0, s * 0.3); paint(ctx, '#fff3e0', 2);
    ctx.beginPath(); ctx.arc(x, y - s * 0.95, s, Math.PI, 0); ctx.closePath(); paint(ctx, cap, 2);
    ctx.fillStyle = '#fff';
    circle(ctx, x - s * 0.45, y - s * 1.3, s * 0.18); ctx.fill();
    circle(ctx, x + s * 0.3, y - s * 1.55, s * 0.14); ctx.fill();
    circle(ctx, x + s * 0.55, y - s * 1.15, s * 0.12); ctx.fill();
  }

  function web(ctx, cx, cy, r, a0, a1, color = 'rgba(255,255,255,0.35)') {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      line(ctx, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    for (let k = 1; k <= 4; k++) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n, rr = r * k / 4.3;
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        i ? ctx.quadraticCurveTo(cx + Math.cos(a - (a1 - a0) / n / 2) * rr * 0.85, cy + Math.sin(a - (a1 - a0) / n / 2) * rr * 0.85, px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  }

  function blobTree(ctx, x, y, s, color, trunk, light) {
    ctx.fillStyle = trunk || color;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.09, y); ctx.quadraticCurveTo(x - s * 0.03, y - s * 0.4, x - s * 0.05, y - s * 0.8);
    ctx.lineTo(x + s * 0.05, y - s * 0.8); ctx.quadraticCurveTo(x + s * 0.03, y - s * 0.4, x + s * 0.09, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    const puffs = [[0, -1.25, 0.5], [-0.4, -1.02, 0.38], [0.42, -1.04, 0.4], [-0.2, -0.82, 0.34], [0.22, -0.82, 0.34]];
    for (const [dx, dy, r] of puffs) { circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
    if (light) {
      ctx.fillStyle = light;
      circle(ctx, x - s * 0.14, y - s * 1.4, s * 0.22); ctx.fill();
      circle(ctx, x - s * 0.5, y - s * 1.12, s * 0.14); ctx.fill();
    }
  }

  function pine(ctx, x, y, s, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - s * 0.08, y - s * 0.3, s * 0.16, s * 0.3);
    for (let i = 0; i < 3; i++) {
      const yy = y - s * 0.25 - i * s * 0.38, w = s * (0.55 - i * 0.12);
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.quadraticCurveTo(x, yy - s * 0.75, x + w, yy); ctx.closePath(); ctx.fill();
    }
  }

  // ---------- Scenes ----------

  const SCENES = {
    patch(ctx, R, A) {
      sky(ctx, [[0, '#1e0f45'], [0.42, '#4b2276'], [0.66, '#b04a86'], [0.8, '#f28a5b']], 470);
      stars(ctx, R, 110, 280);
      A.twinkles = makeTwinkles(R, 22, 260);
      cloud(ctx, 170, 120, 26, 'rgba(255,200,230,0.16)');
      cloud(ctx, 560, 70, 20, 'rgba(255,200,230,0.12)');
      moonFace(ctx, 780, 108, 56);
      batSil(ctx, 690, 80, 1, '#2a1240'); batSil(ctx, 735, 150, 0.7, '#2a1240'); batSil(ctx, 865, 62, 0.8, '#2a1240');
      hills(ctx, 360, 26, '#5a2a7a', 7);
      for (let i = 0; i < 9; i++) dimPumpkin(ctx, 40 + i * 110 + R() * 40, 370 + R() * 18, 6 + R() * 4);
      hills(ctx, 394, 20, '#43205e', 19);
      ctx.fillStyle = '#5a3428';
      rrect(ctx, 0, 392, W, 7, 3); ctx.fill(); rrect(ctx, 0, 410, W, 7, 3); ctx.fill();
      for (let x = 6; x < W; x += 52) { rrect(ctx, x, 380, 13, 46, 5); paint(ctx, '#8a5a40', 2, '#3a1c18'); }
      ground(ctx, 436, '#5a3270', '#22102f');
      ctx.strokeStyle = '#4f7a3a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 452);
      for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, 440 + R() * 20, x + 40, 452);
      ctx.stroke();
      for (let x = 30; x < W; x += 70) {
        ctx.fillStyle = '#6aa040';
        ctx.save(); ctx.translate(x + R() * 30, 448); ctx.rotate(R() * 2 - 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(8, -9, 16, 0); ctx.quadraticCurveTo(8, 6, 0, 0); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = '#6aa040'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x + 40, 446, 5, 0, Math.PI * 1.5); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,10,40,0.35)';
      for (let i = 0; i < 7; i++) { ellipse(ctx, 60 + i * 140, 520 + (i % 2) * 18, 70, 10); ctx.fill(); }
      ctx.save(); ctx.translate(902, 430);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-4, -90, 8, 100); ctx.fillRect(-40, -62, 80, 7);
      rrect(ctx, -22, -66, 44, 40, 8); paint(ctx, '#d8504a', 2.5);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { line(ctx, i * 12, -66, i * 12, -26); }
      line(ctx, -22, -46, 22, -46);
      ctx.fillStyle = '#f5c84a';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, -62); ctx.lineTo(s * 50, -66); ctx.lineTo(s * 48, -54); ctx.closePath(); ctx.fill(); }
      circle(ctx, 0, -86, 18); paint(ctx, '#e8c890', 2.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      line(ctx, -9, -91, -3, -85); line(ctx, -3, -91, -9, -85); line(ctx, 3, -91, 9, -85); line(ctx, 9, -91, 3, -85);
      ctx.beginPath(); ctx.arc(0, -82, 7, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      ART.blush(ctx, 0, -80, 11, 3);
      ellipse(ctx, 0, -100, 30, 6); paint(ctx, '#e8b850', 2.5);
      rrect(ctx, -14, -120, 28, 20, 6); paint(ctx, '#e8b850', 2.5);
      ctx.restore();
      tufts(ctx, R, 40, 460, 600, 'rgba(120,200,110,0.35)');
      pathGlow(ctx);
    },

    forest(ctx, R, A) {
      sky(ctx, [[0, '#0d1f38'], [0.5, '#1d4a5e'], [0.8, '#3f7d72']], 470);
      stars(ctx, R, 70, 230);
      A.twinkles = makeTwinkles(R, 16, 200);
      moonFace(ctx, 210, 108, 44, { color: '#e9fff0', glow: 'rgba(190,255,220,0.3)' });
      for (let x = -20; x < W + 40; x += 38 + R() * 26) pine(ctx, x, 420, 120 + R() * 90, '#1f4656');
      ctx.fillStyle = 'rgba(160,230,210,0.06)'; ctx.fillRect(0, 300, W, 150);
      for (let x = -10; x < W + 60; x += 95 + R() * 50) blobTree(ctx, x, 446, 80 + R() * 35, '#16343f', '#122630', 'rgba(120,200,180,0.10)');
      ctx.fillStyle = 'rgba(160,230,210,0.08)'; ctx.fillRect(0, 380, W, 70);
      ground(ctx, 440, '#2f5a4a', '#122a22');
      for (const [x, dir] of [[50, 1], [910, -1]]) {
        ctx.save(); ctx.translate(x, 470); ctx.scale(dir, 1);
        ctx.beginPath(); ctx.moveTo(-34, 0); ctx.quadraticCurveTo(-18, -160, -26, -330); ctx.lineTo(30, -330); ctx.quadraticCurveTo(20, -160, 36, 0); ctx.closePath();
        paint(ctx, shade(ctx, 0, -200, 120, '#6a5070', '#3a2a40'), 3);
        ctx.strokeStyle = '#3a2a40'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(10, -230); ctx.quadraticCurveTo(70, -260, 90, -230); ctx.quadraticCurveTo(100, -210, 80, -205); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(4, -150); ctx.quadraticCurveTo(60, -160, 70, -130); ctx.stroke();
        ellipse(ctx, 0, -110, 12, 16); ctx.fillStyle = '#1a1020'; ctx.fill();
        ctx.globalAlpha = 0.9;
        ART.eyes(ctx, 0, -150, 4, 9, { closed: true, color: '#1a1020' });
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      web(ctx, 0, 0, 120, 0, Math.PI / 2);
      web(ctx, W, 0, 110, Math.PI / 2, Math.PI);
      mushroom(ctx, 130, 462, 13); mushroom(ctx, 156, 466, 8, '#ffa84a', 'rgba(255,180,90,0.3)');
      mushroom(ctx, 610, 458, 10, '#9a7aff', 'rgba(170,140,255,0.35)'); mushroom(ctx, 820, 464, 14);
      mushroom(ctx, 400, 470, 7, '#ffa84a', 'rgba(255,180,90,0.3)');
      tufts(ctx, R, 50, 452, 600, 'rgba(140,230,170,0.3)');
      pathGlow(ctx);
      A.fireflies = '#d8ff8a';
      A.fog = 'rgba(190,240,230,0.10)';
    },

    candy(ctx, R, A) {
      sky(ctx, [[0, '#3b1f6e'], [0.45, '#8a46b8'], [0.75, '#ff8fc8'], [0.9, '#ffc0a0']], 470);
      stars(ctx, R, 50, 200);
      A.twinkles = makeTwinkles(R, 14, 180);
      moonFace(ctx, 830, 96, 44, { color: '#fff0f8', glow: 'rgba(255,200,240,0.35)' });
      cloud(ctx, 140, 110, 30, 'rgba(255,190,230,0.5)');
      cloud(ctx, 500, 80, 22, 'rgba(190,220,255,0.45)');
      ctx.fillStyle = '#c25aa8';
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(i * 120 + R() * 40, 400, 60 + R() * 30, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#e07ac0';
      for (let i = 0; i < 7; i++) { ctx.fillStyle = pick(['#ff7ab8', '#7ad0ff', '#ffd65c', '#9aff9a']); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(60 + i * 150, 408, 30 + R() * 15, Math.PI, 0); ctx.fill(); }
      ctx.globalAlpha = 1;
      const lolli = (x, y, r, c) => {
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y, 6, 90);
        circle(ctx, x, y, r); paint(ctx, c, 3);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.22;
        ctx.beginPath();
        for (let a = 0; a < TAU * 2.2; a += 0.2) { const rr = a / (TAU * 2.2) * r * 0.85; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.stroke();
      };
      lolli(60, 330, 30, '#ff5fa2'); lolli(420, 320, 24, '#7ad0ff'); lolli(905, 340, 28, '#9a6aff');
      const house = (x, y, w, h, roof) => {
        rrect(ctx, x - w / 2, y - h, w, h, 6); paint(ctx, shade(ctx, x, y - h / 2, w, '#e8a868', '#b8743a'), 3);
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, y - h + 4); ctx.quadraticCurveTo(x, y - h - w * 0.75, x + w / 2 + 14, y - h + 4); ctx.closePath();
        paint(ctx, roof, 3);
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, y - h + 4);
        for (let i = 0; i <= 8; i++) { const px = x - w / 2 - 14 + i * (w + 28) / 8; ctx.quadraticCurveTo(px - (w + 28) / 16, y - h + 18, px, y - h + 4); }
        ctx.lineTo(x + w / 2 + 14, y - h); ctx.lineTo(x - w / 2 - 14, y - h); ctx.fill();
        ['#ff5fa2', '#7ad0ff', '#ffd65c', '#7aff9a'].forEach((c, i) => { circle(ctx, x - w / 3 + i * w / 4.5, y - h - 14, 5); paint(ctx, c, 1.5); });
        rrect(ctx, x - w * 0.32, y - h * 0.7, w * 0.22, w * 0.22, 4); paint(ctx, '#ffe36b', 2.5);
        rrect(ctx, x + w * 0.1, y - h * 0.7, w * 0.22, w * 0.22, 4); paint(ctx, '#ffe36b', 2.5);
        ctx.beginPath(); ctx.moveTo(x - w * 0.12, y); ctx.lineTo(x - w * 0.12, y - h * 0.32); ctx.arc(x, y - h * 0.32, w * 0.12, Math.PI, 0); ctx.lineTo(x + w * 0.12, y); ctx.closePath();
        paint(ctx, '#ff5fa2', 2.5);
      };
      house(230, 438, 110, 90, '#ff8ac2');
      house(680, 438, 130, 100, '#9a7aff');
      house(500, 430, 80, 64, '#7ad0ff');
      const cane = (x, y) => {
        softGlow(ctx, x + 18, y - 104, 50, 'rgba(255,240,170,0.45)');
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 100); ctx.arc(x + 14, y - 100, 14, Math.PI, 0);
        ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.stroke();
        ctx.setLineDash([9, 9]); ctx.strokeStyle = '#ff3a5a'; ctx.stroke(); ctx.setLineDash([]);
        circle(ctx, x + 28, y - 92, 8); paint(ctx, '#fff3a0', 2.5);
      };
      cane(120, 450); cane(820, 450);
      ground(ctx, 446, '#a0507a', '#4a2242');
      const cols = ['#ffb3d6', '#b3e0ff', '#fff0a8', '#c8ffc8', '#e0c8ff'];
      for (let row = 0; row < 3; row++) {
        for (let x = -20; x < W; x += 44) {
          ctx.fillStyle = cols[(Math.floor(x / 44) + row) % cols.length]; ctx.globalAlpha = 0.25;
          rrect(ctx, x + (row % 2) * 22, 520 + row * 22, 38, 16, 8); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 16; i++) {
        ctx.save(); ctx.translate(R() * W, 456 + R() * 40); ctx.rotate(R() * 6); ctx.scale(0.6, 0.6);
        ART.candy(ctx, 8, pick(['#ff5fa2', '#7ad0ff', '#ffd65c', '#7aff9a']));
        ctx.restore();
      }
      pathGlow(ctx);
    },

    garden(ctx, R, A) {
      sky(ctx, [[0, '#140c33'], [0.5, '#3a1f66'], [0.82, '#2e7a64']], 470);
      stars(ctx, R, 90, 250);
      A.twinkles = makeTwinkles(R, 18, 230);
      moonFace(ctx, 150, 96, 42, { color: '#f4fff0', glow: 'rgba(200,255,210,0.3)' });
      hills(ctx, 384, 18, '#22405a', 5);
      ctx.save(); ctx.translate(800, 424);
      rrect(ctx, -60, -90, 120, 90, 8); paint(ctx, shade(ctx, 0, -50, 80, '#8a6aa8', '#5a3a7a'), 3);
      ctx.strokeStyle = 'rgba(40,20,60,0.35)'; ctx.lineWidth = 2;
      for (let x = -50; x < 60; x += 14) line(ctx, x, -88, x + 2, -2);
      ctx.beginPath(); ctx.moveTo(-80, -82); ctx.quadraticCurveTo(-20, -110, 10, -190); ctx.quadraticCurveTo(30, -150, 26, -150); ctx.quadraticCurveTo(50, -110, 84, -84); ctx.closePath();
      paint(ctx, '#3a2a5a', 3);
      rrect(ctx, -30, -70, 26, 26, 13); paint(ctx, '#b8ff8a', 3);
      softGlow(ctx, -17, -57, 40, 'rgba(180,255,140,0.35)');
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(14, -46); ctx.arc(30, -46, 16, Math.PI, 0); ctx.lineTo(46, 0); ctx.closePath(); paint(ctx, '#6a3a2a', 3);
      circle(ctx, 40, -24, 3); paint(ctx, '#ffd65c', 1.5);
      rrect(ctx, 34, -150, 16, 40, 4); paint(ctx, '#5a4a6a', 2.5);
      ctx.restore();
      const flower = (x, y, h, c, s) => {
        ctx.strokeStyle = '#4a9a5a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x - 20, y - h * 0.4, x + 20, y - h * 0.7, x, y - h); ctx.stroke();
        ctx.fillStyle = '#5ab86a';
        ctx.save(); ctx.translate(x - 6, y - h * 0.4); ctx.rotate(-0.8); ellipse(ctx, 0, 0, 14, 6); ctx.fill(); ctx.restore();
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ellipse(ctx, x + Math.cos(a) * s * 0.9, y - h + Math.sin(a) * s * 0.9, s * 0.7, s * 0.45, a); paint(ctx, c, 2); }
        circle(ctx, x, y - h, s * 0.6); paint(ctx, '#ffe36b', 2);
        ART.eyes(ctx, x, y - h - 1, s * 0.12, s * 0.22, { closed: true });
        ART.mouth(ctx, x, y - h + s * 0.22, s * 0.25, 'smile');
      };
      flower(80, 452, 120, '#c87aff', 22); flower(340, 448, 80, '#ff7ab8', 16); flower(660, 450, 100, '#7ad0ff', 18); flower(920, 452, 70, '#ff9a3d', 14);
      ctx.save(); ctx.translate(520, 444);
      ctx.fillStyle = '#ff9a3d'; ctx.globalAlpha = 0.85;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12 - 7, 4); ctx.quadraticCurveTo(i * 12, -24, i * 12 + 7, 4); ctx.fill(); }
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, -30, 44, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath(); paint(ctx, '#2a2238', 3);
      ellipse(ctx, 0, -30, 46, 12); paint(ctx, '#3a3248', 3);
      ellipse(ctx, 0, -30, 38, 8); ctx.fillStyle = '#8aff6a'; ctx.fill();
      softGlow(ctx, 0, -40, 80, 'rgba(140,255,110,0.35)');
      ctx.restore();
      A.cauldron = { x: 520, y: 412 };
      ground(ctx, 446, '#2f5e3e', '#13281a');
      for (let i = 0; i < 9; i++) { ellipse(ctx, 60 + i * 105 + R() * 20, 528 + (i % 2) * 14, 26, 9); paint(ctx, 'rgba(160,180,200,0.25)', 0); }
      mushroom(ctx, 250, 462, 9, '#c87aff', 'rgba(200,140,255,0.3)'); mushroom(ctx, 430, 468, 7); mushroom(ctx, 760, 466, 10, '#7ad0ff', 'rgba(140,210,255,0.3)');
      tufts(ctx, R, 46, 452, 600, 'rgba(150,240,160,0.3)');
      pathGlow(ctx);
      A.fireflies = '#b8ff8a';
    },

    school(ctx, R, A) {
      ctx.fillStyle = vgrad(ctx, 0, 440, [[0, '#2e2050'], [1, '#4f3a7a']]); ctx.fillRect(0, 0, W, 440);
      ctx.fillStyle = '#241840'; ctx.fillRect(0, 0, W, 22);
      for (const wx of [70, 820]) {
        rrect(ctx, wx, 46, 90, 120, 44); paint(ctx, vgrad(ctx, 46, 166, [[0, '#1a2a6a'], [1, '#3a2a7a']]), 5, '#7a5a3a');
        ctx.save(); rrect(ctx, wx, 46, 90, 120, 44); ctx.clip();
        stars(ctx, R, 14, 170, '#fff');
        if (wx === 70) { circle(ctx, wx + 58, 86, 18); ctx.fillStyle = '#fff3c4'; ctx.fill(); }
        else batSil(ctx, wx + 45, 100, 0.8, '#120a2a');
        ctx.restore();
        ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 4; line(ctx, wx + 45, 46, wx + 45, 166); line(ctx, wx, 110, wx + 90, 110);
      }
      rrect(ctx, 300, 50, 360, 140, 10); paint(ctx, '#a8703c', 3);
      rrect(ctx, 312, 60, 336, 120, 6); paint(ctx, '#2f5a48', 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = `600 28px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('Happy Halloween!', 480, 102);
      ctx.font = `500 18px ${FONT}`; ctx.fillText('BOO + BOO = 2 BOO 👻', 480, 140);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
      ctx.save(); ctx.translate(600, 152); ctx.scale(0.4, 0.4); ART.ghostPath(ctx, 30, 0); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.translate(360, 152); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke(); ctx.restore();
      rrect(ctx, 330, 186, 80, 6, 3); ctx.fillStyle = '#fff'; ctx.fill();
      circle(ctx, 720, 80, 28); paint(ctx, '#fff', 4, '#7a5a3a');
      ctx.strokeStyle = INK; ctx.lineWidth = 3; line(ctx, 720, 80, 720, 62); line(ctx, 720, 80, 732, 86);
      ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 30); ctx.quadraticCurveTo(240, 70, 480, 30); ctx.quadraticCurveTo(720, 70, W, 30); ctx.stroke();
      for (let i = 0; i < 16; i++) {
        const x = 20 + i * 60, tt = x / W, y = 30 + Math.sin(tt * TAU) * 0 + (Math.sin((x % 480) / 480 * Math.PI) * 20);
        ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x, y + 22); ctx.closePath();
        paint(ctx, i % 2 ? '#ff9a3d' : '#9a6ad8', 2);
      }
      const lockerCols = ['#ff9a3d', '#9a6ad8', '#3ab8a8', '#ff6aa8'];
      for (let i = 0; i < 16; i++) {
        const x = i * 60, c = lockerCols[i % 4];
        rrect(ctx, x + 3, 220, 54, 212, 6); paint(ctx, shade(ctx, x + 30, 300, 120, c, c), 3);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let v = 0; v < 4; v++) rrect(ctx, x + 14, 236 + v * 8, 32, 4, 2), ctx.fill();
        rrect(ctx, x + 44, 320, 6, 22, 3); paint(ctx, '#e8e0f0', 1.5);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = `700 12px ${FONT}`; ctx.fillText(String(100 + i), x + 30, 290);
        if (i % 5 === 2) { ctx.save(); ctx.translate(x + 26, 380); ctx.scale(0.35, 0.35); ART.pumpkin(ctx, 26, { face: 'smile' }); ctx.restore(); }
        if (i % 7 === 4) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = `20px ${EMOJI_FONT}`; ctx.fillText('⭐', x + 26, 384); }
      }
      rrect(ctx, 543, 220, 54, 212, 6); paint(ctx, '#140a24', 3);
      ART.eyes(ctx, 570, 300, 5, 9, { color: '#ffe36b' });
      ctx.fillStyle = '#2a1a40'; ctx.fillRect(0, 430, W, 14);
      ground(ctx, 442, '#3e2e66', '#1e1438', 0);
      for (let row = 0; row < 6; row++) {
        const y0 = 444 + row * row * 4.2 + row * 6, y1 = 444 + (row + 1) * (row + 1) * 4.2 + (row + 1) * 6;
        const n = 12 + row * 0;
        for (let i = -1; i < n + 1; i++) {
          if ((i + row) % 2) continue;
          const xa = (i / n) * W, xb = ((i + 1) / n) * W;
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(xa, y0, xb - xa, y1 - y0);
        }
      }
      pathGlow(ctx);
    },

    graveyard(ctx, R, A) {
      sky(ctx, [[0, '#081230'], [0.55, '#1d3266'], [0.85, '#4a5c96']], 470);
      stars(ctx, R, 150, 320);
      A.twinkles = makeTwinkles(R, 26, 300);
      moonFace(ctx, 300, 150, 88, { color: '#f6f4ff', glow: 'rgba(200,210,255,0.35)' });
      cloud(ctx, 210, 200, 28, 'rgba(120,130,190,0.55)');
      cloud(ctx, 420, 120, 22, 'rgba(120,130,190,0.45)');
      hills(ctx, 380, 16, '#1a2550', 4);
      ctx.save(); ctx.translate(820, 430); ctx.strokeStyle = '#121a3a'; ctx.lineCap = 'round';
      ctx.lineWidth = 26; line(ctx, 0, 0, 6, -150);
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(4, -120); ctx.quadraticCurveTo(-70, -150, -90, -190); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-90, -190); ctx.arc(-80, -195, 10, Math.PI, Math.PI * 2.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -140); ctx.quadraticCurveTo(80, -170, 110, -220); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(110, -220); ctx.arc(100, -226, 10, 0, Math.PI * 1.6); ctx.stroke();
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(6, -150); ctx.quadraticCurveTo(10, -200, -20, -230); ctx.stroke();
      ctx.restore();
      ctx.save(); ctx.translate(752, 296);
      ellipse(ctx, 0, 0, 14, 17); paint(ctx, '#8a6a5a', 2.5);
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-12, -22); ctx.lineTo(-4, -15); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(12, -22); ctx.lineTo(4, -15); ctx.fill();
      ellipse(ctx, 0, 4, 8, 9); ctx.fillStyle = '#c8a890'; ctx.fill();
      for (const s of [-1, 1]) { circle(ctx, s * 6, -5, 6); paint(ctx, '#ffe36b', 2); circle(ctx, s * 6, -5, 3); ctx.fillStyle = INK; ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(2, 0); ctx.lineTo(0, 4); ctx.fillStyle = '#ff9a3d'; ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#141c3c'; ctx.lineWidth = 4;
      line(ctx, 0, 392, W, 392); line(ctx, 0, 420, W, 420);
      for (let x = 10; x < W; x += 26) {
        line(ctx, x, 380, x, 432);
        ctx.fillStyle = '#141c3c'; ctx.beginPath(); ctx.moveTo(x - 5, 382); ctx.lineTo(x, 370); ctx.lineTo(x + 5, 382); ctx.fill();
      }
      ground(ctx, 440, '#2c3a66', '#121834');
      const texts = ['RIP', 'BOO', 'ZZZ', 'LOL', 'HI!', 'RIP', 'YUM'];
      for (let i = 0; i < 7; i++) {
        ctx.save(); ctx.globalAlpha = 0.75;
        ART.gravestone(ctx, 70 + i * 140 + R() * 30, 452 + R() * 6, texts[i], 0.75 + R() * 0.2);
        ctx.restore();
      }
      tufts(ctx, R, 40, 456, 600, 'rgba(150,180,240,0.25)');
      pathGlow(ctx);
      A.fog = 'rgba(200,210,255,0.13)';
    },

    castle(ctx, R, A) {
      sky(ctx, [[0, '#1c0a2e'], [0.5, '#5a1a4e'], [0.85, '#d0507a']], 470);
      stars(ctx, R, 90, 260);
      A.twinkles = makeTwinkles(R, 18, 240);
      moonFace(ctx, 760, 116, 70, { color: '#ffd8e8', glow: 'rgba(255,170,200,0.35)' });
      hills(ctx, 400, 50, '#3a1448', 31);
      const cx = 450, base = 380;
      ctx.fillStyle = '#2a1238';
      ctx.fillRect(cx - 150, base - 150, 300, 160);
      for (let i = 0; i < 10; i++) ctx.fillRect(cx - 150 + i * 31, base - 166, 18, 18);
      const tower = (x, w, h, roofH) => {
        ctx.fillStyle = '#331848'; ctx.fillRect(x - w / 2, base - h, w, h + 10);
        ctx.fillStyle = '#4a1f5e';
        ctx.beginPath(); ctx.moveTo(x - w / 2 - 10, base - h); ctx.quadraticCurveTo(x, base - h - roofH * 0.6, x + 4, base - h - roofH); ctx.quadraticCurveTo(x + 4, base - h - roofH * 0.5, x + w / 2 + 10, base - h); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffd65c'; ctx.lineWidth = 2; line(ctx, x + 4, base - h - roofH, x + 4, base - h - roofH - 22);
        ctx.fillStyle = '#ff5f8a'; ctx.beginPath(); ctx.moveTo(x + 4, base - h - roofH - 22); ctx.lineTo(x + 24, base - h - roofH - 16); ctx.lineTo(x + 4, base - h - roofH - 10); ctx.fill();
        for (let k = 0; k < 2; k++) {
          const wy = base - h + 30 + k * 50;
          if (wy > base - 20) continue;
          softGlow(ctx, x, wy, 22, 'rgba(255,220,120,0.45)');
          ctx.fillStyle = '#ffd86a'; rrect(ctx, x - 7, wy - 10, 14, 20, 7); ctx.fill();
        }
      };
      tower(cx - 165, 56, 210, 90); tower(cx + 165, 56, 200, 86); tower(cx - 60, 50, 250, 100); tower(cx + 70, 46, 230, 92);
      for (let i = 0; i < 5; i++) {
        const wx = cx - 110 + i * 55;
        softGlow(ctx, wx, base - 80, 20, 'rgba(255,220,120,0.4)');
        ctx.fillStyle = '#ffd86a'; rrect(ctx, wx - 8, base - 92, 16, 24, 8); ctx.fill();
      }
      ctx.fillStyle = '#1a0a24'; ctx.beginPath(); ctx.moveTo(cx - 24, base + 10); ctx.lineTo(cx - 24, base - 30); ctx.arc(cx, base - 30, 24, Math.PI, 0); ctx.lineTo(cx + 24, base + 10); ctx.fill();
      for (let i = 0; i < 9; i++) batSil(ctx, 120 + R() * 720, 60 + R() * 200, 0.4 + R() * 0.5, '#2a0f30');
      hills(ctx, 420, 14, '#4a1a52', 12);
      ground(ctx, 442, '#4a2050', '#1e0c26');
      for (let row = 0; row < 3; row++) for (let x = -30; x < W; x += 60) {
        rrect(ctx, x + (row % 2) * 30, 506 + row * 28, 54, 22, 8); ctx.fillStyle = 'rgba(255,200,230,0.07)'; ctx.fill();
      }
      for (const x of [70, 890]) {
        ctx.fillStyle = '#3a2a3a'; rrect(ctx, x - 6, 380, 12, 80, 4); ctx.fill();
        softGlow(ctx, x, 372, 50, 'rgba(255,180,90,0.45)');
        ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(x - 8, 382); ctx.quadraticCurveTo(x, 350, x + 8, 382); ctx.fill();
        ctx.fillStyle = '#ffe36b'; ctx.beginPath(); ctx.moveTo(x - 4, 382); ctx.quadraticCurveTo(x, 362, x + 4, 382); ctx.fill();
      }
      pathGlow(ctx);
      A.flames = [[70, 372], [890, 372]];
    },

    carnival(ctx, R, A) {
      sky(ctx, [[0, '#160b3a'], [0.5, '#3f1f78'], [0.85, '#b04a8a']], 470);
      stars(ctx, R, 100, 260);
      A.twinkles = makeTwinkles(R, 18, 240);
      ctx.strokeStyle = '#2a1650'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      line(ctx, 220, 260, 150, 440); line(ctx, 220, 260, 290, 440);
      A.ferris = { x: 220, y: 260, r: 150 };
      const tent = (x, y, w, h, c1, c2) => {
        ctx.save(); ctx.translate(x, y);
        rrect(ctx, -w / 2, -h * 0.5, w, h * 0.5, 4); paint(ctx, c1, 3);
        for (let i = 0; i < 6; i++) { if (i % 2) continue; ctx.fillStyle = c2; ctx.fillRect(-w / 2 + i * w / 6, -h * 0.5, w / 6, h * 0.5); }
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(-w / 2, -h * 0.5, w, h * 0.5);
        ctx.beginPath(); ctx.moveTo(-w / 2 - 14, -h * 0.5); ctx.quadraticCurveTo(-w * 0.2, -h * 0.75, 0, -h); ctx.quadraticCurveTo(w * 0.2, -h * 0.75, w / 2 + 14, -h * 0.5); ctx.closePath();
        paint(ctx, c2, 3);
        ctx.save(); ctx.clip();
        for (let i = -3; i <= 3; i += 2) { ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(i * w / 7, -h * 0.5); ctx.lineTo((i + 1) * w / 7, -h * 0.5); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#ffd65c';
        ctx.beginPath(); ctx.moveTo(-w / 2 - 14, -h * 0.5);
        for (let i = 0; i <= 8; i++) { const px = -w / 2 - 14 + i * (w + 28) / 8; ctx.quadraticCurveTo(px - (w + 28) / 16, -h * 0.5 + 14, px, -h * 0.5); }
        ctx.fill(); ctx.stroke();
        ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, 0, -h, 0, -h - 24);
        ctx.fillStyle = '#7aff9a'; ctx.beginPath(); ctx.moveTo(0, -h - 24); ctx.lineTo(18, -h - 18); ctx.lineTo(0, -h - 12); ctx.fill();
        ctx.fillStyle = '#2a1030'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(0, -h * 0.42); ctx.lineTo(18, 0); ctx.fill();
        ctx.restore();
      };
      tent(640, 438, 220, 200, '#ff9a3d', '#9a5ad8');
      tent(880, 440, 130, 130, '#ff6aa8', '#fff');
      for (let i = 0; i < 6; i++) {
        const bx = 420 + i * 22 + R() * 10, by = 140 + R() * 50;
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; line(ctx, bx, by + 18, 470, 300);
        ellipse(ctx, bx, by, 14, 17); paint(ctx, pick(['#ff5fa2', '#7ad0ff', '#ffd65c', '#9aff9a', '#c87aff']), 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(ctx, bx - 5, by - 6, 3, 5, 0.4); ctx.fill();
      }
      rrect(ctx, 440, 380, 70, 70, 6); paint(ctx, '#ff5f6d', 3);
      rrect(ctx, 432, 366, 86, 18, 6); paint(ctx, '#ffd65c', 3);
      ctx.fillStyle = INK; ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('TICKETS', 475, 379);
      rrect(ctx, 452, 396, 46, 30, 6); paint(ctx, '#2a1030', 2);
      A.bulbs = [];
      ctx.strokeStyle = '#1a0a30'; ctx.lineWidth = 2;
      for (const [x0, x1, sag] of [[0, 480, 60], [480, W, 50]]) {
        ctx.beginPath(); ctx.moveTo(x0, 20); ctx.quadraticCurveTo((x0 + x1) / 2, 20 + sag * 2, x1, 20); ctx.stroke();
        for (let i = 1; i < 12; i++) {
          const tt = i / 12, x = lerp(x0, x1, tt), y = 20 + 2 * tt * (1 - tt) * sag * 2;
          A.bulbs.push([x, y + 6]);
        }
      }
      ground(ctx, 444, '#4a2a66', '#1e0e30');
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = pick(['#ff5fa2', '#7ad0ff', '#ffd65c', '#9aff9a', '#c87aff']); ctx.globalAlpha = 0.6;
        ctx.save(); ctx.translate(R() * W, 452 + R() * 148); ctx.rotate(R() * 6); ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
      }
      ctx.globalAlpha = 1;
      pathGlow(ctx);
    },

    clouds(ctx, R, A) {
      sky(ctx, [[0, '#8fb4ff'], [0.5, '#d6c2ff'], [0.85, '#ffd4ec']], 480);
      ctx.save(); ctx.globalAlpha = 0.35;
      ['#ff8aa8', '#ffc08a', '#fff08a', '#9aff9a', '#8ad0ff', '#c08aff'].forEach((c, i) => {
        ctx.beginPath(); ctx.arc(480, 560, 470 - i * 16, Math.PI, 0); ctx.strokeStyle = c; ctx.lineWidth = 16; ctx.stroke();
      });
      ctx.restore();
      moonFace(ctx, 820, 90, 40, { color: '#fffaf0', glow: 'rgba(255,255,255,0.5)' });
      A.twinkles = makeTwinkles(R, 14, 260);
      cloud(ctx, 120, 90, 30, 'rgba(255,255,255,0.7)'); cloud(ctx, 580, 60, 24, 'rgba(255,255,255,0.6)');
      const island = (x, y, s) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
        ctx.fillStyle = '#c8b8ff';
        ctx.beginPath(); ctx.moveTo(-80, 0); ctx.quadraticCurveTo(-40, 70, 0, 80); ctx.quadraticCurveTo(40, 70, 80, 0); ctx.closePath(); ctx.fill();
        cloud(ctx, 0, 0, 40, '#ffffff');
        for (const [tx, th] of [[-30, 60], [0, 90], [30, 60]]) {
          rrect(ctx, tx - 12, -th, 24, th, 6); paint(ctx, '#fff', 2.5, '#b8a8e8');
          ctx.beginPath(); ctx.moveTo(tx - 16, -th); ctx.quadraticCurveTo(tx, -th - 30, tx + 2, -th - 40); ctx.quadraticCurveTo(tx + 4, -th - 20, tx + 16, -th); ctx.closePath();
          paint(ctx, '#c8a8ff', 2.5, '#9a88d8');
          ctx.fillStyle = '#ffe9a0'; rrect(ctx, tx - 5, -th + 14, 10, 14, 5); ctx.fill();
        }
        ctx.save(); ctx.translate(2, -150); ctx.strokeStyle = '#9a88d8'; ctx.lineWidth = 2; line(ctx, 0, 0, 0, 22);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, 2, 22, 6); ctx.quadraticCurveTo(14, 10, 0, 12); ctx.fill();
        ctx.restore();
        ctx.restore();
      };
      island(200, 290, 0.9); island(720, 260, 1.05); island(470, 330, 0.6);
      for (const [x, y, s] of [[110, 250, 0.35], [300, 230, 0.3], [640, 200, 0.32], [830, 210, 0.36]]) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha = 0.85; ART.ghost(ctx, 0, { seed: x }); ctx.restore();
      }
      for (let x = -40; x < W + 60; x += 70) cloud(ctx, x, 440 + R() * 10, 46 + R() * 16, '#f2eaff');
      ctx.fillStyle = vgrad(ctx, 440, H, [[0, '#f2eaff'], [1, '#c8b8f0']]); ctx.fillRect(0, 460, W, H - 460);
      for (let x = -20; x < W + 40; x += 90) cloud(ctx, x + R() * 30, 540 + R() * 30, 30 + R() * 12, 'rgba(255,255,255,0.5)');
      ctx.fillStyle = 'rgba(150,120,220,0.12)'; ellipse(ctx, W / 2, PLAYER_Y - 4, W * 0.55, 24); ctx.fill();
      A.drift = true;
    },

    moon(ctx, R, A) {
      sky(ctx, [[0, '#05041a'], [0.5, '#1a1050'], [0.85, '#46207a']], 480);
      softGlow(ctx, 260, 200, 260, 'rgba(200,100,255,0.16)');
      softGlow(ctx, 700, 300, 240, 'rgba(255,120,200,0.12)');
      stars(ctx, R, 240, 440);
      A.twinkles = makeTwinkles(R, 34, 420);
      ctx.save(); ctx.translate(120, 110);
      ctx.beginPath(); ctx.ellipse(0, 0, 60, 14, -0.3, Math.PI, TAU); ctx.strokeStyle = '#ffd65c'; ctx.lineWidth = 5; ctx.stroke();
      ART.pumpkin(ctx, 34, { face: 'happy', t: 0 });
      ctx.beginPath(); ctx.ellipse(0, 0, 60, 14, -0.3, 0, Math.PI); ctx.strokeStyle = '#ffd65c'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      circle(ctx, 860, 90, 22); paint(ctx, shade(ctx, 860, 90, 22, '#9affe0', '#3ab8a8'), 3);
      ART.eyes(ctx, 860, 88, 3, 6, { closed: true }); ART.mouth(ctx, 860, 96, 4, 'smile');
      circle(ctx, 60, 330, 10); paint(ctx, '#ff9ad0', 2);
      ctx.save();
      for (const [x0, x1, y0] of [[0, 300, 300], [660, W, 300]]) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 60, x1, y0 - 10); ctx.stroke();
        for (let i = 1; i < 9; i++) {
          const tt = i / 9, x = lerp(x0, x1, tt), y = (1 - tt) * (1 - tt) * y0 + 2 * tt * (1 - tt) * (y0 + 60) + tt * tt * (y0 - 10);
          ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 20); ctx.closePath();
          paint(ctx, ['#ff9a3d', '#9a6ad8', '#7ad0ff', '#ff6aa8'][i % 4], 1.5);
        }
      }
      ctx.restore();
      for (const [x, y, c] of [[80, 380, '#ff9a3d'], [880, 370, '#c87aff'], [930, 400, '#7ad0ff']]) {
        softGlow(ctx, x, y, 40, 'rgba(255,200,120,0.35)');
        ellipse(ctx, x, y, 14, 18); paint(ctx, c, 2.5);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; line(ctx, x - 14, y, x + 14, y);
      }
      ctx.fillStyle = 'rgba(200,120,255,0.25)'; ellipse(ctx, W / 2, 470, W * 0.62, 40); ctx.fill();
      ground(ctx, 446, '#7a5ab0', '#2a1a4e', 0);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 444, W, 8);
      for (let x = 0; x < W; x += 28) { ctx.fillStyle = '#ff6aa8'; ctx.beginPath(); ctx.moveTo(x, 444); ctx.lineTo(x + 14, 444); ctx.lineTo(x + 6, 452); ctx.lineTo(x - 8, 452); ctx.fill(); }
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = pick(['#ff5fa2', '#7ad0ff', '#ffd65c', '#9aff9a', '#c87aff']); ctx.globalAlpha = 0.45;
        ctx.save(); ctx.translate(R() * W, 460 + R() * 140); ctx.rotate(R() * 6); ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
      }
      ctx.globalAlpha = 1;
      pathGlow(ctx);
      A.shooting = true;
    },
  };

  function build(id) {
    const c = document.createElement('canvas');
    c.width = W * RES; c.height = H * RES;
    const ctx = c.getContext('2d');
    ctx.scale(RES, RES);
    const A = {};
    const seed = [...id].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 100000 + 1;
    SCENES[id](ctx, seeded(seed), A);
    cache[id] = { canvas: c, anim: A };
    return cache[id];
  }

  function drawFerris(ctx, F, t) {
    const rot = t * 0.25;
    ctx.save(); ctx.translate(F.x, F.y);
    ctx.strokeStyle = '#3a2470'; ctx.lineWidth = 3;
    for (let i = 0; i < 10; i++) { const a = rot + i / 10 * TAU; line(ctx, 0, 0, Math.cos(a) * F.r, Math.sin(a) * F.r); }
    circle(ctx, 0, 0, F.r); ctx.strokeStyle = '#4a2a8a'; ctx.lineWidth = 6; ctx.stroke();
    circle(ctx, 0, 0, F.r * 0.6); ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = rot + i / 24 * TAU;
      ctx.fillStyle = (Math.floor(t * 4) + i) % 3 === 0 ? '#fff3a0' : 'rgba(255,200,120,0.55)';
      circle(ctx, Math.cos(a) * F.r, Math.sin(a) * F.r, 3.5); ctx.fill();
    }
    const cols = ['#ff5fa2', '#7ad0ff', '#ffd65c', '#9aff9a', '#c87aff'];
    for (let i = 0; i < 10; i++) {
      const a = rot + i / 10 * TAU, x = Math.cos(a) * F.r, y = Math.sin(a) * F.r;
      ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, x, y, x, y + 10);
      rrect(ctx, x - 13, y + 8, 26, 18, 7); paint(ctx, cols[i % 5], 2.5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 9, y + 11, 18, 5);
    }
    circle(ctx, 0, 0, 12); paint(ctx, '#ffd65c', 3);
    ctx.restore();
  }

  function drawAnimated(ctx, id, t) {
    const A = cache[id].anim;
    if (A.twinkles) {
      ctx.fillStyle = '#fff';
      for (const s of A.twinkles) {
        const a = Math.max(0, Math.sin(t * s.s + s.p));
        if (a < 0.05) continue;
        ctx.globalAlpha = a * 0.9;
        sparkleShape(ctx, s.x, s.y, s.r * a); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (A.ferris) drawFerris(ctx, A.ferris, t);
    if (A.bulbs) {
      const cols = ['#ff5fa2', '#7ad0ff', '#ffd65c', '#9aff9a'];
      A.bulbs.forEach(([x, y], i) => {
        const on = (Math.floor(t * 3) + i) % 2 === 0;
        if (on) softGlow(ctx, x, y, 16, 'rgba(255,240,180,0.5)');
        circle(ctx, x, y, 5); paint(ctx, on ? cols[i % 4] : '#5a4a7a', 1.5);
      });
    }
    if (A.cauldron) {
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.7 + i / 7) % 1;
        const x = A.cauldron.x + Math.sin(i * 3 + t * 1.5) * 18, y = A.cauldron.y - ph * 70;
        ctx.globalAlpha = 1 - ph;
        circle(ctx, x, y, 3 + ph * 6); paint(ctx, '#9cff7a', 1.5, '#4a9a3a');
      }
      ctx.globalAlpha = 1;
    }
    if (A.flames) {
      for (const [x, y] of A.flames) {
        const f = Math.sin(t * 12 + x) * 3;
        ctx.fillStyle = 'rgba(255,230,120,0.9)';
        ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.quadraticCurveTo(x + f, y - 14, x + 5, y + 10); ctx.fill();
      }
    }
    if (A.fireflies) {
      for (let i = 0; i < 16; i++) {
        const x = ((i * 137 + t * 12 * ((i % 3) - 1) + Math.sin(t * 0.6 + i) * 60) % W + W) % W;
        const y = 300 + Math.sin(t * 0.8 + i * 2.1) * 90 + (i % 5) * 14;
        const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
        ctx.globalAlpha = a;
        softGlow(ctx, x, y, 12, 'rgba(220,255,140,0.6)');
        circle(ctx, x, y, 2.2); ctx.fillStyle = A.fireflies; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (A.fog) {
      ctx.fillStyle = A.fog;
      for (let i = 0; i < 6; i++) {
        const x = ((t * (10 + i * 3) + i * 230) % (W + 500)) - 250;
        ellipse(ctx, x, 448 + (i % 3) * 16, 220, 26); ctx.fill();
      }
    }
    if (A.drift) {
      for (let i = 0; i < 5; i++) {
        const x = ((t * (8 + i * 4) + i * 260) % (W + 300)) - 150;
        cloud(ctx, x, 140 + i * 50, 14 + i * 3, 'rgba(255,255,255,0.55)');
      }
    }
    if (A.shooting) {
      const ph = (t % 5) / 5;
      if (ph < 0.2) {
        const k = ph / 0.2;
        const x = 700 - k * 400, y = 40 + k * 140;
        const g = ctx.createLinearGradient(x, y, x + 80, y - 28);
        g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; line(ctx, x, y, x + 80, y - 28);
        ctx.fillStyle = '#fff'; sparkleShape(ctx, x, y, 6); ctx.fill();
      }
    }
  }

  return {
    draw(ctx, id, t) {
      const c = cache[id] || build(id);
      ctx.drawImage(c.canvas, 0, 0, W, H);
      drawAnimated(ctx, id, t);
    },
    prebuild(id) { if (!cache[id]) build(id); },
  };
})();
