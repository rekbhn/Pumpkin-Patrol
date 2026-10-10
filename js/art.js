'use strict';

// Kawaii art: big heads, tiny bodies, enormous eyes, rounded shapes, soft outlines.
const INK = '#2a1838';
const FONT = 'Fredoka, "Comic Sans MS", "Trebuchet MS", sans-serif';
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function paint(ctx, fill, lw = 3, stroke = INK) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function shade(ctx, x, y, r, light, dark) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.15);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  return g;
}
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function sparkleShape(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.closePath();
}
function heartShape(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y + s * 0.05, x - s * 0.6, y - s * 1.0, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y + s * 0.05, x, y + s * 0.9);
  ctx.closePath();
}
function starShape(ctx, x, y, r, inner = 0.45, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n;
    const rr = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function softGlow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function groundShadow(ctx, x, y, rx) {
  ctx.fillStyle = 'rgba(15,0,30,0.32)';
  ellipse(ctx, x, y, rx, rx * 0.25); ctx.fill();
}

function teamGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.42, '#a855e8');
  g.addColorStop(1, '#3dce68');
  return g;
}

function cheerBow(ctx, swing) {
  ctx.save();
  ctx.translate(0, -50);
  ctx.rotate(swing * 0.04);
  const g = teamGradient(ctx, -22, -10, 22, 16);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 11, 0);
    ctx.rotate(s * -0.25);
    ellipse(ctx, 0, 0, 13, 8.5);
    paint(ctx, g, 2);
    ellipse(ctx, s * -1, 0.4, 6, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    ctx.restore();
  }
  circle(ctx, 0, 1, 4);
  paint(ctx, '#ffffff', 2);
  circle(ctx, 0, 1, 2);
  ctx.fillStyle = '#a855e8';
  ctx.fill();
  ctx.restore();
}

function cheerPonytail(ctx, t) {
  const swing = Math.sin(t * 5) * 5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-14, -46);
  ctx.quadraticCurveTo(-44, -32, -48 + swing * 0.35, -4);
  ctx.quadraticCurveTo(-50 + swing, 16, -42 + swing, 32);
  ctx.quadraticCurveTo(-32 + swing * 0.4, 24, -40 + swing * 0.25, 2);
  ctx.quadraticCurveTo(-46, -22, -20, -44);
  ctx.closePath();
  paint(ctx, shade(ctx, -36, -2, 28, '#ecd4ff', '#6d28d9'), 2.6);
  const g = teamGradient(ctx, -18, -48, -50, 22);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-18 + s * 3, -46);
    ctx.quadraticCurveTo(-42 + s * 3, -10, -40 + swing * 0.4 + s * 4, 16);
    ctx.lineTo(-32 + swing * 0.3 + s * 2, 12);
    ctx.quadraticCurveTo(-36 + s * 2, -16, -16 + s, -42);
    ctx.closePath();
    paint(ctx, g, 1.7);
  }
  ctx.restore();
}

function cheerTitle(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#2a1838';
  ['Cheer', 'Halloween'].forEach((line, i) => {
    let size = i === 0 ? 8.2 : 6.4;
    ctx.font = `700 ${size}px ${FONT}`;
    while (ctx.measureText(line).width > 40 && size > 4) {
      size -= 0.15;
      ctx.font = `700 ${size}px ${FONT}`;
    }
    const y = i === 0 ? 10.6 : 17.2;
    ctx.lineWidth = Math.max(1.6, size * 0.34);
    ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

const ART = {
  face: null, // optional override: 'closed' | 'dizzy' | 'wide'

  eyes(ctx, x, y, r, gap, o = {}) {
    const mode = ART.face || (o.closed ? 'closed' : o.wide ? 'wide' : null);
    const now = performance.now() / 1000;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const ex = x + s * gap;
      if (mode === 'closed') {
        ctx.beginPath(); ctx.arc(ex, y + r * 0.4, r * 0.72, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineWidth = Math.max(2, r * 0.36); ctx.strokeStyle = o.color || INK; ctx.stroke();
      } else if (mode === 'dizzy') {
        ctx.beginPath();
        for (let a = 0; a < TAU * 2; a += 0.3) {
          const rr = (a / (TAU * 2)) * r;
          const px = ex + Math.cos(a + now * 10 * s) * rr, py = y + Math.sin(a + now * 10 * s) * rr;
          a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.lineWidth = Math.max(1.5, r * 0.25); ctx.strokeStyle = INK; ctx.stroke();
      } else if (mode === 'wide') {
        circle(ctx, ex, y, r * 1.05); paint(ctx, '#fff', Math.max(1.5, r * 0.22));
        circle(ctx, ex, y, r * 0.38); ctx.fillStyle = INK; ctx.fill();
      } else {
        ellipse(ctx, ex, y, r * 0.82, r); ctx.fillStyle = o.color || INK; ctx.fill();
        ctx.fillStyle = '#fff';
        circle(ctx, ex - r * 0.28 + (o.lx || 0), y - r * 0.4, r * 0.36); ctx.fill();
        circle(ctx, ex + r * 0.28, y + r * 0.36, r * 0.15); ctx.fill();
      }
    }
    ctx.restore();
  },

  blush(ctx, x, y, gap, r, alpha = 0.55) {
    ctx.fillStyle = `rgba(255,110,160,${alpha})`;
    ellipse(ctx, x - gap, y, r, r * 0.62); ctx.fill();
    ellipse(ctx, x + gap, y, r, r * 0.62); ctx.fill();
  },

  mouth(ctx, x, y, w, type = 'smile', color = INK) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1.8, w * 0.24);
    switch (type) {
      case 'smile':
        ctx.beginPath(); ctx.arc(x, y - w * 0.35, w * 0.55, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); break;
      case 'cat':
        ctx.beginPath(); ctx.arc(x - w * 0.28, y - w * 0.12, w * 0.28, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + w * 0.28, y - w * 0.12, w * 0.28, 0.05 * Math.PI, 0.95 * Math.PI); ctx.stroke(); break;
      case 'o':
        ellipse(ctx, x, y, w * 0.32, w * 0.42); ctx.fill();
        ctx.fillStyle = '#ff7aa8'; ellipse(ctx, x, y + w * 0.18, w * 0.2, w * 0.13); ctx.fill(); break;
      case 'open':
      case 'grin':
        ctx.beginPath();
        ctx.moveTo(x - w * 0.55, y - w * 0.15);
        ctx.quadraticCurveTo(x, y - w * 0.02, x + w * 0.55, y - w * 0.15);
        ctx.quadraticCurveTo(x + w * 0.5, y + w * 0.75, x, y + w * 0.75);
        ctx.quadraticCurveTo(x - w * 0.5, y + w * 0.75, x - w * 0.55, y - w * 0.15);
        ctx.fill();
        ctx.fillStyle = '#ff7aa8'; ellipse(ctx, x, y + w * 0.5, w * 0.28, w * 0.17); ctx.fill();
        if (type === 'grin') { ctx.fillStyle = '#fff'; rrect(ctx, x - w * 0.18, y - w * 0.1, w * 0.36, w * 0.24, w * 0.06); ctx.fill(); }
        break;
      case 'fang':
        ctx.beginPath(); ctx.arc(x, y - w * 0.35, w * 0.55, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.lineWidth = 1.2;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + s * w * 0.42, y + w * 0.05); ctx.lineTo(x + s * w * 0.16, y + w * 0.14); ctx.lineTo(x + s * w * 0.3, y + w * 0.48);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        break;
      case 'wavy':
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const px = x - w * 0.6 + i * (w * 1.2 / 8), py = y + Math.sin(i * 1.6) * w * 0.14;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke(); break;
      case 'sad':
        ctx.beginPath(); ctx.arc(x, y + w * 0.45, w * 0.5, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); break;
      case 'pout':
        ellipse(ctx, x, y, w * 0.28, w * 0.18); ctx.fill(); break;
    }
    ctx.restore();
  },

  drop(ctx, x, y, s, color = '#7fd0ff') {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s * 0.8, y + s * 0.2, x, y + s * 0.6);
    ctx.quadraticCurveTo(x - s * 0.8, y + s * 0.2, x, y - s);
    paint(ctx, color, 1.5);
  },

  candy(ctx, s = 10, color = '#ff5fa2', stripe = 'rgba(255,255,255,0.85)') {
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * s * 0.75, 0); ctx.lineTo(d * s * 1.55, -s * 0.62); ctx.lineTo(d * s * 1.55, s * 0.62);
      ctx.closePath(); paint(ctx, color, 2);
    }
    ellipse(ctx, 0, 0, s, s * 0.75); paint(ctx, color, 2);
    ctx.save();
    ellipse(ctx, 0, 0, s, s * 0.75); ctx.clip();
    ctx.strokeStyle = stripe; ctx.lineWidth = s * 0.28;
    for (let i = -2; i <= 2; i++) line(ctx, i * s * 0.6 - s * 0.5, -s, i * s * 0.6 + s * 0.5, s);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ellipse(ctx, -s * 0.35, -s * 0.3, s * 0.25, s * 0.14, -0.5); ctx.fill();
  },

  cupcake(ctx, s = 12) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.lineTo(s * 0.58, s * 0.9); ctx.lineTo(-s * 0.58, s * 0.9);
    ctx.closePath(); paint(ctx, '#7ad0ff', 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) line(ctx, i * s * 0.28, s * 0.08, i * s * 0.22, s * 0.85);
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, s * 0.05);
    ctx.quadraticCurveTo(-s * 1.0, -s * 0.6, -s * 0.3, -s * 0.55);
    ctx.quadraticCurveTo(-s * 0.1, -s * 1.1, s * 0.35, -s * 0.6);
    ctx.quadraticCurveTo(s * 1.0, -s * 0.6, s * 0.9, s * 0.05);
    ctx.closePath(); paint(ctx, '#ff9ad0', 2);
    circle(ctx, s * 0.05, -s * 0.95, s * 0.25); paint(ctx, '#ff3a5a', 1.5);
    const cols = ['#fff36b', '#7aff9a', '#7ad0ff', '#fff'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % 4];
      ctx.save(); ctx.translate(-s * 0.55 + i * s * 0.22, -s * 0.25 + (i % 2) * s * 0.18); ctx.rotate(i);
      ctx.fillRect(-s * 0.08, -s * 0.03, s * 0.16, s * 0.06); ctx.restore();
    }
  },

  wrapper(ctx, s = 8) {
    ctx.save();
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(d * s * 0.5, 0); ctx.lineTo(d * s * 1.2, -s * 0.6); ctx.lineTo(d * s * 1.1, s * 0.5);
      ctx.closePath(); paint(ctx, '#ffe36b', 1.5);
    }
    rrect(ctx, -s * 0.6, -s * 0.45, s * 1.2, s * 0.9, s * 0.25); paint(ctx, '#7ad0ff', 1.8);
    ctx.fillStyle = '#ff6aa8'; ctx.fillRect(-s * 0.15, -s * 0.45, s * 0.3, s * 0.9);
    ctx.restore();
  },

  teddy(ctx) {
    circle(ctx, -5.5, -12, 3.6); paint(ctx, '#c58a5a', 1.8);
    circle(ctx, 5.5, -12, 3.6); paint(ctx, '#c58a5a', 1.8);
    ellipse(ctx, 0, 4, 7, 7.5); paint(ctx, '#c58a5a', 2);
    circle(ctx, 0, -7, 7); paint(ctx, '#d89a68', 2);
    ellipse(ctx, 0, -5, 3.2, 2.4); ctx.fillStyle = '#f2d2b0'; ctx.fill();
    ctx.fillStyle = INK;
    circle(ctx, -2.6, -8.5, 1.2); ctx.fill(); circle(ctx, 2.6, -8.5, 1.2); ctx.fill();
    circle(ctx, 0, -5.5, 1); ctx.fill();
    ctx.fillStyle = '#ff7aa8'; heartShape(ctx, 0, 4, 2.6); ctx.fill();
  },

  // ---------- Monsters (drawn around origin, ~32px radius) ----------

  ghostPath(ctx, r, t, wob = 1) {
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.arc(0, 0, r, Math.PI, 0);
    ctx.lineTo(r, r * 0.85);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = r - (2 * r) * (i / n), x1 = r - (2 * r) * ((i + 1) / n);
      const dip = r * (0.4 + Math.sin(t * 6 + i * 1.7) * 0.08 * wob);
      ctx.quadraticCurveTo((x0 + x1) / 2, r * 0.85 + dip, x1, r * 0.85);
    }
    ctx.closePath();
  },

  ghost(ctx, t, e = {}) {
    const v = e.variant;
    const r = 30;
    const wob = Math.sin(t * 3 + (e.seed || 0)) * 0.04;
    ctx.save();
    ctx.scale(1 + wob, 1 - wob);
    let fill;
    if (v === 'rainbow') {
      fill = ctx.createLinearGradient(0, -r, 0, r * 1.2);
      ['#ffb3c7', '#ffd59e', '#fff4a3', '#b9f5c0', '#aee2ff', '#d7b8ff'].forEach((c, i, a) => fill.addColorStop(i / (a.length - 1), c));
    } else fill = shade(ctx, 0, 0, r * 1.1, '#ffffff', e.tint || '#ddd4ff');
    ART.ghostPath(ctx, r, t);
    paint(ctx, fill, 3);
    const armY = r * 0.3;
    ellipse(ctx, -r * 0.98, armY, 8, 5.5, 0.5); paint(ctx, e.tint ? '#fff' : '#f4efff', 2.5);
    ellipse(ctx, r * 0.98, armY + Math.sin(t * 5) * 3, 8, 5.5, -0.5); paint(ctx, e.tint ? '#fff' : '#f4efff', 2.5);
    if (v === 'ninja') {
      ctx.fillStyle = '#e84a5a';
      rrect(ctx, -r * 0.95, -r * 0.62, r * 1.9, 8, 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(r * 0.85, -r * 0.55); ctx.quadraticCurveTo(r * 1.3, -r * 0.7 + Math.sin(t * 8) * 4, r * 1.45, -r * 0.35); ctx.lineTo(r * 0.85, -r * 0.42); ctx.fill();
    }
    ART.eyes(ctx, 0, -4, 6.5, 11, { closed: v === 'sleepy' || e.happy });
    ART.blush(ctx, 0, 7, 19, 5);
    ART.mouth(ctx, 0, 11, 8, e.booing ? 'o' : (v === 'pirate' ? 'grin' : 'smile'));
    ART.ghostAccessory(ctx, v, r, t);
    if (e.bow) {
      ctx.fillStyle = '#ff6aa8';
      ctx.save(); ctx.translate(r * 0.55, -r * 0.8);
      ellipse(ctx, -6, 0, 7, 5, 0.3); paint(ctx, '#ff6aa8', 2); ellipse(ctx, 6, 0, 7, 5, -0.3); paint(ctx, '#ff6aa8', 2);
      circle(ctx, 0, 0, 3); paint(ctx, '#ff3a8a', 1.5);
      ctx.restore();
    }
    ctx.restore();
  },

  ghostAccessory(ctx, v, r, t) {
    switch (v) {
      case 'baby':
        ctx.beginPath(); ctx.arc(0, 0, r * 1.02, Math.PI * 1.08, Math.PI * 1.92);
        ctx.lineWidth = 9; ctx.strokeStyle = '#9fd4ff'; ctx.lineCap = 'round'; ctx.stroke();
        circle(ctx, 0, 14, 4.5); paint(ctx, '#ff9ad0', 1.8);
        ctx.beginPath(); ctx.arc(0, 18, 4, 0, Math.PI); ctx.lineWidth = 2; ctx.strokeStyle = '#ff6aa8'; ctx.stroke();
        break;
      case 'sleepy':
        ctx.beginPath();
        ctx.moveTo(-r * 0.85, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.2, -r * 1.6, r * 0.9, -r * 1.15);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.8, r * 0.8, -r * 0.48);
        ctx.closePath(); paint(ctx, '#7fa8ff', 2.5);
        rrect(ctx, -r * 0.92, -r * 0.62, r * 1.8, 9, 4.5); paint(ctx, '#fff', 2);
        circle(ctx, r * 0.95, -r * 1.12, 6); paint(ctx, '#fff', 2);
        ctx.fillStyle = '#fff'; ctx.font = `700 12px ${FONT}`;
        ctx.fillText('z', r * 0.9, -r * 0.2 - (t * 10 % 10));
        break;
      case 'pirate':
        ctx.beginPath(); ctx.arc(0, 0, r * 1.0, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(r * 0.7, -r * 0.45); ctx.lineTo(-r * 0.8, -r * 0.45); ctx.closePath();
        paint(ctx, '#e8505b', 2.5);
        ctx.fillStyle = '#fff';
        [[-12, -20], [2, -24], [14, -18]].forEach(([x, y]) => { circle(ctx, x, y, 2.2); ctx.fill(); });
        circle(ctx, -r * 0.95, -r * 0.5, 4); paint(ctx, '#e8505b', 2);
        ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, -r * 0.7, -r * 0.55, r * 0.8, -r * 0.05);
        circle(ctx, 11, -4, 7.5); paint(ctx, INK, 0);
        break;
      case 'cowboy':
        ellipse(ctx, 0, -r * 0.82, r * 1.15, 7); paint(ctx, '#c48a52', 2.5);
        rrect(ctx, -r * 0.55, -r * 1.42, r * 1.1, r * 0.66, 9); paint(ctx, '#c48a52', 2.5);
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-r * 0.53, -r * 0.98, r * 1.06, 5);
        starShape(ctx, 0, -r * 1.12, 5); paint(ctx, '#ffd65c', 1.2);
        break;
      case 'princess':
        ctx.beginPath();
        ctx.moveTo(-14, -r * 0.82); ctx.lineTo(-16, -r * 1.35); ctx.lineTo(-7, -r * 1.05); ctx.lineTo(0, -r * 1.45);
        ctx.lineTo(7, -r * 1.05); ctx.lineTo(16, -r * 1.35); ctx.lineTo(14, -r * 0.82); ctx.closePath();
        paint(ctx, '#ffd65c', 2.5);
        circle(ctx, 0, -r * 1.0, 3); paint(ctx, '#ff6aa8', 1.2);
        circle(ctx, -9, -r * 0.95, 2.2); paint(ctx, '#7ad0ff', 1); circle(ctx, 9, -r * 0.95, 2.2); paint(ctx, '#7ad0ff', 1);
        break;
      case 'wizard':
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, -r * 0.62);
        ctx.quadraticCurveTo(-r * 0.1, -r * 1.3, r * 0.35 + Math.sin(t * 2) * 3, -r * 2.0);
        ctx.quadraticCurveTo(r * 0.35, -r * 1.1, r * 0.75, -r * 0.62);
        ctx.closePath(); paint(ctx, '#5a6cff', 2.5);
        ellipse(ctx, 0, -r * 0.65, r * 0.95, 6); paint(ctx, '#5a6cff', 2.5);
        ctx.fillStyle = '#ffe36b';
        starShape(ctx, -4, -r * 1.05, 4); ctx.fill(); starShape(ctx, 8, -r * 1.4, 3); ctx.fill();
        break;
      case 'giant':
        ctx.fillStyle = '#7ad0ff';
        ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(-9, 15); ctx.lineTo(-9, 25); ctx.closePath(); paint(ctx, '#7ad0ff', 1.5);
        ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(9, 15); ctx.lineTo(9, 25); ctx.closePath(); paint(ctx, '#7ad0ff', 1.5);
        break;
    }
  },

  blob(ctx, t, e = {}) {
    const j = Math.sin(t * 4 + (e.seed || 0)) * 0.08;
    ctx.save(); ctx.scale(1 + j, 1 - j);
    ART.ghost(ctx, t, { tint: '#c9b2ff', seed: e.seed });
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(ctx, -14, -18, 4); ctx.fill(); circle(ctx, 16, -12, 2.5); ctx.fill();
    ctx.restore();
  },

  zombieHead(ctx, t, o = {}) {
    const skin = o.cheer ? '#b8e89c' : '#a6dd8c';
    if (o.cheer) {
      cheerBow(ctx, Math.sin(t * 5));
      circle(ctx, 0, -40, 6.5);
      paint(ctx, '#9a5ad8', 2.2);
    }
    circle(ctx, 0, -16, 21); paint(ctx, shade(ctx, 0, -16, 21, '#d4f7be', skin), 3);
    if (o.cheer) {
      ctx.beginPath();
      ctx.arc(0, -20, 18, Math.PI * 1.12, Math.PI * 1.88);
      ctx.quadraticCurveTo(8, -36, -2, -40);
      ctx.quadraticCurveTo(-14, -36, -17, -26);
      ctx.closePath();
      paint(ctx, shade(ctx, -2, -32, 16, '#c084fc', '#7a36c4'), 2.4);
    } else {
      ctx.beginPath(); ctx.moveTo(-4, -36); ctx.quadraticCurveTo(-2, -46, 6, -44); ctx.quadraticCurveTo(0, -42, 2, -36);
      paint(ctx, '#4f7a3a', 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      line(ctx, -14, -30, -4, -29);
      for (let i = 0; i < 3; i++) line(ctx, -12 + i * 4, -32, -12 + i * 4, -27);
    }
    ART.eyes(ctx, 0, -16, 6, 9);
    ART.blush(ctx, 0, -8, 14, 4.5);
    ART.mouth(ctx, 0, -5, 7, o.open ? 'o' : 'smile');
    if (!o.open) { ctx.fillStyle = '#fff'; ctx.fillRect(1, -4.5, 3, 3); }
    if (o.cheer && o.tail !== false) cheerPonytail(ctx, t);
  },

  zombieBody(ctx, t, o = {}) {
    const step = o.walk ? Math.sin(t * 8) * 2 : 0;
    if (o.cheer) {
      const g = teamGradient(ctx, 0, 2, 0, 34);
      for (const s of [-1, 1]) {
        const hop = s === -1 ? step : -step;
        ctx.save();
        ctx.translate(s * 8, hop);
        rrect(ctx, -6.5, 21, 13, 11, 5);
        paint(ctx, g, 2.2);
        ctx.restore();
      }
      for (const s of [-1, 1]) {
        rrect(ctx, s === -1 ? -17 : 2, 14, 15, 10, 4);
        paint(ctx, g, 2.2);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(-15.5, 17, 2.4, 6);
      ctx.fillRect(13.2, 17, 2.4, 6);
      for (const s of [-1, 1]) {
        const hop = s === -1 ? step : -step;
        ctx.save();
        ctx.translate(s * 8, hop);
        rrect(ctx, -7.2, 20.2, 14.4, 4.2, 2);
        paint(ctx, '#ffffff', 1.6);
        ctx.restore();
      }
      rrect(ctx, -22, 4, 44, 18, 6);
      paint(ctx, g, 2.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-5, 5);
      ctx.quadraticCurveTo(0, 8.5, 5, 5);
      ctx.stroke();
      cheerTitle(ctx);
      return;
    }
    rrect(ctx, -10, 16 + step, 8, 13, 4); paint(ctx, '#5b4a7a', 2.5);
    rrect(ctx, 2, 16 - step, 8, 13, 4); paint(ctx, '#5b4a7a', 2.5);
    rrect(ctx, -13, 2, 26, 20, 9); paint(ctx, '#8ec5ff', 3);
    ctx.fillStyle = '#ffe36b'; circle(ctx, 0, 9, 2); ctx.fill(); circle(ctx, 0, 15, 2); ctx.fill();
  },

  pompom(ctx) {
    const purple = '#9a5ad8', green = '#5ad86a';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      circle(ctx, Math.cos(a) * 8, Math.sin(a) * 8, 5.4);
      ctx.fillStyle = i % 2 ? purple : green;
      ctx.fill();
    }
    ctx.fillStyle = purple;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
  },

  zombie(ctx, t, e = {}) {
    const walk = !e.still;
    ART.zombieBody(ctx, t, { walk });
    const sway = Math.sin(t * 4) * 0.12;
    ctx.save(); ctx.translate(10, 6); ctx.rotate(-0.2 + sway);
    rrect(ctx, 0, -4, 18, 8, 4); paint(ctx, '#a6dd8c', 2.5);
    ctx.restore();
    ART.zombieHead(ctx, t);
    ctx.save(); ctx.translate(26, 8 + Math.sin(t * 4) * 1.5); ctx.rotate(sway); ART.teddy(ctx); ctx.restore();
  },

  cheer(ctx, t, e = {}) {
    ART.zombieBody(ctx, t, { walk: true, cheer: true });
    const up = Math.sin(t * 9);
    ART.zombieHead(ctx, t, { cheer: true, open: up > 0.6, tail: false });
    for (const s of [-1, 1]) {
      const ay = s === 1 ? up : -up;
      ctx.save();
      ctx.translate(s * 14, 6);
      ctx.rotate(s * (1.15 + ay * 0.22));
      const g = teamGradient(ctx, 0, 4, 0, -30);
      rrect(ctx, -4.2, -28, 8.4, 32, 4);
      paint(ctx, g, 2);
      rrect(ctx, -4.6, -30, 9.2, 5, 2.4);
      paint(ctx, '#ffffff', 1.6);
      circle(ctx, 0, -33, 4.6);
      paint(ctx, '#b8e89c', 2);
      ctx.translate(0, -48);
      ART.pompom(ctx);
      ctx.restore();
    }
    cheerPonytail(ctx, t);
    cheerTitle(ctx);
  },

  goblin(ctx, t, e = {}) {
    const skin = '#9be46b';
    const step = e.still ? 0 : Math.sin(t * 9) * 2;
    rrect(ctx, -10, 16 + step, 8, 12, 4); paint(ctx, '#6a4a2a', 2.5);
    rrect(ctx, 2, 16 - step, 8, 12, 4); paint(ctx, '#6a4a2a', 2.5);
    rrect(ctx, -14, 2, 28, 20, 9); paint(ctx, '#b07a4a', 3);
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(-13, 12, 26, 4);
    ctx.fillStyle = '#ffd65c'; ctx.fillRect(-3, 11, 6, 6);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 14, -20); ctx.lineTo(s * 42, -26 + Math.sin(t * 5 + s) * 2); ctx.lineTo(s * 16, -6); ctx.closePath();
      paint(ctx, skin, 2.5);
      ctx.beginPath(); ctx.moveTo(s * 18, -17); ctx.lineTo(s * 34, -22); ctx.lineTo(s * 19, -10); ctx.closePath();
      ctx.fillStyle = '#ffb3c7'; ctx.fill();
    }
    ellipse(ctx, 0, -12, 22, 19); paint(ctx, shade(ctx, 0, -12, 22, '#d2ffa8', skin), 3);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    line(ctx, -14, -24, -5, -21); line(ctx, 14, -24, 5, -21);
    ART.eyes(ctx, 0, -14, 6, 9);
    ellipse(ctx, 0, -6, 4, 3); ctx.fillStyle = '#6fb84a'; ctx.fill();
    ART.blush(ctx, 0, -4, 15, 4.5);
    ART.mouth(ctx, 0, 1, 9, 'grin');
    if (e.throwing > 0) { ctx.save(); ctx.translate(20, -14); ctx.rotate(t * 10); ART.wrapper(ctx, 7); ctx.restore(); }
  },

  bat(ctx, t, e = {}, o = {}) {
    const color = o.color || '#8a63d2', wing = o.wing || '#5d3e9e';
    const flap = Math.sin(t * 16 + (e.seed || 0));
    for (const s of [-1, 1]) {
      ctx.save(); ctx.scale(s, 1); ctx.rotate(flap * 0.35);
      ctx.beginPath(); ctx.moveTo(8, -6);
      ctx.quadraticCurveTo(28, -28, 46, -12);
      ctx.quadraticCurveTo(42, -2, 37, 3);
      ctx.quadraticCurveTo(31, -3, 27, 7);
      ctx.quadraticCurveTo(21, 1, 14, 11);
      ctx.closePath(); paint(ctx, wing, 3);
      ctx.restore();
    }
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 5, -13); ctx.lineTo(s * 13, -28); ctx.lineTo(s * 15, -10); ctx.closePath();
      paint(ctx, color, 2.5);
    }
    circle(ctx, 0, 0, 17); paint(ctx, shade(ctx, 0, 0, 17, o.light || '#c4a8ff', color), 3);
    ART.eyes(ctx, 0, -3, 5.5, 7.5);
    ART.blush(ctx, 0, 4, 11, 3.8);
    ART.mouth(ctx, 0, 7, 6, o.mouth || 'fang');
    if (o.cape) {
      ctx.beginPath(); ctx.moveTo(-10, 10); ctx.quadraticCurveTo(0, 26, 10, 10); paint(ctx, '#d63a5a', 2);
    }
    if (o.paci) { circle(ctx, 0, 10, 3.5); paint(ctx, '#7ad0ff', 1.5); }
  },

  vbat(ctx, t, e = {}) {
    ART.bat(ctx, t, e, { color: '#d4507a', wing: '#9a2f5c', light: '#ffa8c8', cape: true });
    if (e.stole) { ctx.save(); ctx.translate(0, 26); ctx.font = `20px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🍬', 0, 0); ctx.restore(); }
  },

  spider(ctx, t, e = {}, o = {}) {
    const color = o.color || '#5a4290';
    const speed = e.running ? 30 : 10;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) {
        const wig = Math.sin(t * speed + i * 1.3 + (s > 0 ? 1 : 0)) * 4;
        ctx.beginPath();
        ctx.moveTo(s * 10, -2 + i * 4);
        ctx.quadraticCurveTo(s * 26, -14 + i * 9 + wig, s * 33, 6 + i * 7 - wig * 0.5);
        ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = 2.2; ctx.stroke();
      }
    }
    circle(ctx, 0, 0, 18); paint(ctx, shade(ctx, 0, 0, 18, o.light || '#9d86d6', color), 3);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ellipse(ctx, -7, -9, 5, 3, -0.5); ctx.fill();
    ART.eyes(ctx, 0, -2, 6, 7.5, { wide: e.running });
    ART.blush(ctx, 0, 6, 12, 3.8);
    ART.mouth(ctx, 0, 9, 6, e.giggle || e.running ? 'open' : 'smile');
    if (o.bow) {
      ctx.save(); ctx.translate(9, -15);
      ellipse(ctx, -5, 0, 6, 4, 0.3); paint(ctx, '#ff6aa8', 1.8); ellipse(ctx, 5, 0, 6, 4, -0.3); paint(ctx, '#ff6aa8', 1.8);
      circle(ctx, 0, 0, 2.5); paint(ctx, '#ff3a8a', 1.2);
      ctx.restore();
    }
  },

  witch(ctx, t, e = {}, o = {}) {
    const dress = o.dress || '#7a4ad0', hat = o.hat || '#5a2fa8', skin = o.skin || '#ffe0c2', hair = o.hair || '#ff8a3d';
    const flap = Math.sin(t * 10);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineCap = 'round'; line(ctx, -36, 16, 34, 9);
    ctx.strokeStyle = '#a8703c'; ctx.lineWidth = 4; line(ctx, -36, 16, 34, 9);
    ctx.beginPath(); ctx.moveTo(-34, 12); ctx.lineTo(-58, 2 + flap * 2); ctx.lineTo(-60, 16); ctx.lineTo(-58, 30 - flap * 2); ctx.lineTo(-34, 20); ctx.closePath();
    paint(ctx, '#f5c84a', 2.5);
    ctx.strokeStyle = '#c99a2a'; ctx.lineWidth = 1.5; line(ctx, -36, 16, -56, 10); line(ctx, -36, 17, -56, 22);
    ctx.beginPath(); ctx.moveTo(-4, -4); ctx.quadraticCurveTo(-24, 4 + flap * 4, -30 - flap * 3, 18); ctx.lineTo(-6, 12); ctx.closePath();
    paint(ctx, o.cape || '#3a2a6a', 2.5);
    ctx.save(); ctx.translate(6, 16);
    for (const s of [0, 1]) {
      rrect(ctx, -4 + s * 7, 0, 5, 14 + s * 2, 2.5); paint(ctx, '#fff', 2);
      ctx.fillStyle = dress; ctx.fillRect(-3.5 + s * 7, 4, 4, 2.5); ctx.fillRect(-3.5 + s * 7, 9, 4, 2.5);
    }
    ctx.restore();
    rrect(ctx, -12, -4, 24, 20, 8); paint(ctx, dress, 3);
    circle(ctx, 0, -14, 15.5); paint(ctx, hair, 2.5);
    circle(ctx, 0, -12, 13); paint(ctx, skin, 2.5);
    ctx.beginPath(); ctx.arc(0, -14, 13.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(6, -18); ctx.lineTo(0, -15); ctx.lineTo(-6, -18); ctx.closePath();
    paint(ctx, hair, 0);
    ART.eyes(ctx, 0, -11, 4.5, 6);
    ART.blush(ctx, 0, -5, 9, 3);
    ART.mouth(ctx, 0, -3, 5, 'smile');
    ellipse(ctx, 0, -24, 21, 5.5, -0.08); paint(ctx, hat, 2.5);
    ctx.beginPath(); ctx.moveTo(-12, -25); ctx.quadraticCurveTo(-4, -44, 12 + flap * 2, -58); ctx.quadraticCurveTo(6, -40, 12, -25); ctx.closePath();
    paint(ctx, hat, 2.5);
    ctx.fillStyle = o.band || '#ff9a3d'; ctx.beginPath(); ctx.moveTo(-11, -28); ctx.lineTo(11.5, -28); ctx.lineTo(11, -32); ctx.lineTo(-9.5, -32); ctx.closePath(); ctx.fill();
    if (o.crown) {
      ctx.beginPath(); ctx.moveTo(-9, -31); ctx.lineTo(-10, -42); ctx.lineTo(-4, -36); ctx.lineTo(0, -45); ctx.lineTo(4, -36); ctx.lineTo(9, -42); ctx.lineTo(8, -31); ctx.closePath();
      paint(ctx, '#ffd65c', 2);
    }
    if (o.wand) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3; line(ctx, 10, 2, 26, -14);
      starShape(ctx, 28, -16, 7); paint(ctx, '#ffe36b', 2);
    }
  },

  boneLine(ctx, x1, y1, x2, y2, w = 5) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = w + 3; line(ctx, x1, y1, x2, y2);
    ctx.strokeStyle = '#fbf6ff'; ctx.lineWidth = w; line(ctx, x1, y1, x2, y2);
  },

  skull(ctx, x, y) {
    rrect(ctx, x - 10, y + 8, 20, 10, 4); paint(ctx, '#fbf6ff', 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) line(ctx, x + i * 5, y + 10, x + i * 5, y + 17);
    ellipse(ctx, x, y, 19, 16.5); paint(ctx, shade(ctx, x, y, 19, '#ffffff', '#e8e0f5'), 3);
    ART.eyes(ctx, x, y - 1, 6.5, 8);
    ctx.fillStyle = INK; heartShape(ctx, x, y + 8, 2.5); ctx.fill();
    ART.blush(ctx, x, y + 6, 13, 3.5);
  },

  skeleton(ctx, t, e = {}) {
    const d = e.dancing ? Math.sin(t * 11) : Math.sin(t * 6) * 0.3;
    ctx.save(); ctx.rotate(d * 0.12);
    ART.boneLine(ctx, -5, 16, -9 - d * 4, 29);
    ART.boneLine(ctx, 5, 16, 9 + d * 4, 29);
    ellipse(ctx, -10 - d * 4, 31, 5.5, 3.5); paint(ctx, '#fbf6ff', 2.5);
    ellipse(ctx, 10 + d * 4, 31, 5.5, 3.5); paint(ctx, '#fbf6ff', 2.5);
    ART.boneLine(ctx, 0, -2, 0, 15, 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 5;
    for (const y of [2, 7, 12]) { ctx.beginPath(); ctx.ellipse(0, y, 10 - (y - 2) * 0.3, 3, 0, 0, Math.PI); ctx.stroke(); }
    ctx.strokeStyle = '#fbf6ff'; ctx.lineWidth = 2.5;
    for (const y of [2, 7, 12]) { ctx.beginPath(); ctx.ellipse(0, y, 10 - (y - 2) * 0.3, 3, 0, 0, Math.PI); ctx.stroke(); }
    ellipse(ctx, 0, 16, 8, 4); paint(ctx, '#fbf6ff', 2.5);
    for (const s of [-1, 1]) {
      const hx = s * 22, hy = -10 + (e.dancing ? Math.sin(t * 11 + (s > 0 ? Math.PI : 0)) * 9 : 6);
      ART.boneLine(ctx, s * 8, 1, hx, hy);
      circle(ctx, hx, hy, 4); paint(ctx, '#fbf6ff', 2.5);
    }
    ctx.save(); ctx.translate(0, 0); ctx.fillStyle = '#ff6aa8';
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(-7, -5); ctx.lineTo(-7, 3); ctx.closePath(); paint(ctx, '#ff6aa8', 1.5);
    ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(7, -5); ctx.lineTo(7, 3); ctx.closePath(); paint(ctx, '#ff6aa8', 1.5);
    ctx.restore();
    if (!e.noHead) ART.skull(ctx, 0, -20);
    ctx.restore();
  },

  vampire(ctx, t, e = {}, o = {}) {
    const flap = Math.sin(t * 6) * 3;
    ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-30, 26 + flap); ctx.quadraticCurveTo(0, 18, 30, 26 - flap); ctx.lineTo(10, -6); ctx.closePath();
    paint(ctx, '#2b1b3a', 3);
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-24, 22 + flap); ctx.quadraticCurveTo(0, 15, 24, 22 - flap); ctx.lineTo(8, -2); ctx.closePath();
    ctx.fillStyle = o.lining || '#d63a5a'; ctx.fill();
    rrect(ctx, -10, 0, 20, 20, 7); paint(ctx, '#3a2850', 2.5);
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.lineTo(0, 10); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-6, -1); ctx.lineTo(-6, 5); ctx.closePath(); paint(ctx, o.lining || '#d63a5a', 1.5);
    ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(6, -1); ctx.lineTo(6, 5); ctx.closePath(); paint(ctx, o.lining || '#d63a5a', 1.5);
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-24, -26); ctx.lineTo(-6, -14); ctx.closePath(); paint(ctx, '#2b1b3a', 2);
    ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(24, -26); ctx.lineTo(6, -14); ctx.closePath(); paint(ctx, '#2b1b3a', 2);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 15, -16); ctx.lineTo(s * 24, -22); ctx.lineTo(s * 16, -9); ctx.closePath(); paint(ctx, '#efe4ff', 2); }
    circle(ctx, 0, -14, 17); paint(ctx, shade(ctx, 0, -14, 17, '#ffffff', '#e2d4ff'), 3);
    ctx.beginPath(); ctx.arc(0, -15, 17.5, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(10, -24, 0, -20); ctx.quadraticCurveTo(-10, -24, -17.5, -15);
    paint(ctx, '#2b1b3a', 2);
    ART.eyes(ctx, 0, -12, 5, 7, { color: '#4a1838' });
    ART.blush(ctx, 0, -6, 11, 3.6);
    ART.mouth(ctx, 0, -3, 7, 'fang');
    if (o.heart) { ctx.fillStyle = '#ff6aa8'; heartShape(ctx, 0, 10, 4); ctx.fill(); }
  },

  vampBat(ctx, t, e = {}) {
    ART.bat(ctx, t, e, { color: '#3a2a4a', wing: '#2b1b3a', light: '#7a6a9a', cape: true });
  },

  werewolf(ctx, t, e = {}) {
    const fur = '#b98250', light = '#f2d6b0';
    const step = e.still ? 0 : Math.sin(t * 9) * 2;
    ellipse(ctx, -20, 12, 12, 6, -0.6 + Math.sin(t * 8) * 0.2); paint(ctx, fur, 2.5);
    rrect(ctx, -10, 16 + step, 8, 12, 4); paint(ctx, fur, 2.5);
    rrect(ctx, 2, 16 - step, 8, 12, 4); paint(ctx, fur, 2.5);
    rrect(ctx, -12, 2, 24, 20, 9); paint(ctx, fur, 3);
    ellipse(ctx, 0, 9, 7, 6); ctx.fillStyle = light; ctx.fill();
    rrect(ctx, -12, 14, 24, 7, 3); paint(ctx, '#7a5ad0', 2);
    ctx.save();
    if (e.howl) { ctx.translate(0, -4); ctx.rotate(-0.45); }
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 6, -28); ctx.lineTo(s * 15, -42); ctx.lineTo(s * 18, -22); ctx.closePath(); paint(ctx, fur, 2.5);
      ctx.beginPath(); ctx.moveTo(s * 9, -27); ctx.lineTo(s * 14, -36); ctx.lineTo(s * 15, -24); ctx.closePath(); ctx.fillStyle = '#ffb3c7'; ctx.fill();
    }
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 15, -18); ctx.lineTo(s * 24, -12); ctx.lineTo(s * 16, -8); ctx.closePath(); paint(ctx, fur, 2); }
    circle(ctx, 0, -16, 19); paint(ctx, shade(ctx, 0, -16, 19, '#e6b07a', fur), 3);
    ellipse(ctx, 0, -6, 10, 7.5); paint(ctx, light, 2);
    ellipse(ctx, 0, -10, 4, 3); ctx.fillStyle = INK; ctx.fill();
    ART.eyes(ctx, 0, -19, 5, 8, { closed: e.embarrassed });
    if (e.howl) ART.mouth(ctx, 0, -2, 8, 'o'); else ART.mouth(ctx, 0, -4, 6, 'cat');
    ART.blush(ctx, 0, -10, 14, e.embarrassed ? 6 : 4, e.embarrassed ? 0.95 : 0.5);
    ctx.restore();
    if (e.embarrassed) ART.drop(ctx, 20, -34, 5);
  },

  troll(ctx, t, e = {}) {
    const skin = '#86cdb6';
    const step = e.still ? 0 : Math.sin(t * 8) * 2;
    rrect(ctx, -14, 18 + step, 10, 10, 4); paint(ctx, skin, 2.5);
    rrect(ctx, 4, 18 - step, 10, 10, 4); paint(ctx, skin, 2.5);
    for (const s of [-1, 1]) { ellipse(ctx, s * 25, 8, 6, 9, s * 0.4); paint(ctx, skin, 2.5); }
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 12, -22); ctx.quadraticCurveTo(s * 20, -34, s * 16, -38); ctx.quadraticCurveTo(s * 12, -30, s * 5, -26); ctx.closePath();
      paint(ctx, '#fff3c4', 2);
    }
    ellipse(ctx, 0, 0, 25, 27); paint(ctx, shade(ctx, 0, 0, 26, '#c4f2e2', skin), 3);
    ellipse(ctx, 0, 12, 14, 11); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 5 - 3, -24); ctx.lineTo(i * 6, -38 - Math.abs(i) * -2 + Math.sin(t * 5 + i) * 2); ctx.lineTo(i * 5 + 3, -24); ctx.closePath();
      paint(ctx, '#ff9a3d', 2);
    }
    ART.eyes(ctx, 0, -10, 5.5, 9);
    ellipse(ctx, 0, -1, 7, 6); paint(ctx, '#6ab49a', 2);
    ART.blush(ctx, 0, -1, 15, 4.5);
    ART.mouth(ctx, 0, 9, 8, 'smile');
    ctx.fillStyle = '#fff';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 5, 6); ctx.lineTo(s * 7, 1); ctx.lineTo(s * 9, 6); ctx.closePath(); ctx.fill(); }
  },

  gravestone(ctx, x, y, text = 'RIP', s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-22, -30); ctx.arc(0, -30, 22, Math.PI, 0); ctx.lineTo(22, 0); ctx.closePath();
    paint(ctx, shade(ctx, 0, -30, 30, '#d4d0f0', '#9a96c4'), 3);
    ctx.fillStyle = '#6a6698'; ctx.font = `700 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, -30);
    ctx.strokeStyle = '#7a76a8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(10, -46); ctx.lineTo(6, -40); ctx.lineTo(10, -36); ctx.stroke();
    ctx.fillStyle = '#7fc06a'; ellipse(ctx, -14, -2, 8, 3); ctx.fill(); ellipse(ctx, 12, -1, 6, 2.5); ctx.fill();
    ctx.restore();
  },

  ghoul(ctx, t, e = {}) {
    ART.gravestone(ctx, 14, 22, e.graveText || 'RIP');
    const rise = e.rise == null ? 1 : e.rise;
    ctx.save();
    ctx.beginPath(); ctx.rect(-70, -140, 140, 162); ctx.clip();
    ctx.translate(-4, (1 - rise) * 60);
    const skin = '#a9c9a2';
    for (const s of [-1, 1]) {
      const wave = Math.sin(t * 7 + s) * 5;
      ctx.save(); ctx.translate(s * 16, -2); ctx.rotate(s * (0.9 + wave * 0.03));
      rrect(ctx, -4, -22, 8, 22, 4); paint(ctx, skin, 2.5);
      for (let k = -1; k <= 1; k++) { circle(ctx, k * 3, -23, 2.5); paint(ctx, skin, 1.5); }
      ctx.restore();
    }
    rrect(ctx, -14, 0, 28, 26, 10); paint(ctx, '#7a6a9a', 3);
    ellipse(ctx, 0, -12, 20, 18); paint(ctx, shade(ctx, 0, -12, 20, '#d8f0d0', skin), 3);
    ctx.beginPath(); ctx.moveTo(-14, -24); ctx.quadraticCurveTo(-8, -38, 0, -28); ctx.quadraticCurveTo(6, -40, 14, -24); paint(ctx, '#4a3a5a', 2);
    ART.eyes(ctx, 0, -13, 5.5, 8);
    ART.blush(ctx, 0, -5, 13, 4);
    ART.mouth(ctx, 0, -1, 7, rise > 0.95 ? 'open' : 'smile');
    ctx.restore();
    ellipse(ctx, 0, 23, 30, 6); ctx.fillStyle = '#3a2a3a'; ctx.fill();
    ctx.fillStyle = '#5a4050'; circle(ctx, -20, 21, 4); ctx.fill(); circle(ctx, 18, 22, 3); ctx.fill();
  },

  grump(ctx, t, e = {}) {
    const fur = '#8a7af0';
    const step = Math.sin(t * 6) * 2;
    rrect(ctx, -16, 20 + step, 12, 12, 5); paint(ctx, '#6a5ad0', 2.5);
    rrect(ctx, 4, 20 - step, 12, 12, 5); paint(ctx, '#6a5ad0', 2.5);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 10, -24); ctx.quadraticCurveTo(s * 26, -30, s * 24, -46); ctx.quadraticCurveTo(s * 18, -34, s * 4, -28); ctx.closePath();
      paint(ctx, '#ffd65c', 2.5);
    }
    ellipse(ctx, 0, 0, 28, 28); paint(ctx, shade(ctx, 0, 0, 28, '#c4baff', fur), 3);
    ctx.fillStyle = fur;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU;
      circle(ctx, Math.cos(a) * 26, Math.sin(a) * 26, 5); ctx.fill();
    }
    ellipse(ctx, 0, 10, 15, 12); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
    line(ctx, -16, -17, -5, -12); line(ctx, 16, -17, 5, -12);
    ART.eyes(ctx, 0, -7, 6, 10);
    ART.blush(ctx, 0, 2, 17, 5);
    ART.mouth(ctx, 0, 9, 8, 'sad');
    ctx.save(); ctx.translate(30, 10); ctx.rotate(Math.sin(t * 3) * 0.2);
    ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(11, 12); ctx.lineTo(-11, 12); ctx.closePath(); paint(ctx, '#ff6aa8', 2.5);
    ctx.fillStyle = '#fff'; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('0', 0, 6);
    ctx.restore();
  },

  // ---------- Friends ----------

  cat(ctx, t, o = {}) {
    const fur = '#2f2745', fur2 = '#4a3d6e';
    const walk = o.moving ? Math.sin(t * 14) * 3 : 0;
    groundShadow(ctx, 0, 2, 22);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -12); ctx.bezierCurveTo(-32, -14, -28, -38 + Math.sin(t * 3) * 6, -18, -44 + Math.sin(t * 3) * 4);
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = fur; ctx.lineWidth = 5.5; ctx.stroke();
    for (const [x, d] of [[-9, walk], [6, -walk]]) { rrect(ctx, x - 3.5, -8 + d * 0.3, 7, 9, 3.5); paint(ctx, fur, 2.5); }
    ellipse(ctx, 0, -13, 17, 11); paint(ctx, fur, 3);
    ctx.save(); ctx.translate(10, -28);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 13, -4); ctx.lineTo(s * 12, -21); ctx.lineTo(s * 2, -12); ctx.closePath(); paint(ctx, fur, 2.5);
      ctx.beginPath(); ctx.moveTo(s * 10.5, -7); ctx.lineTo(s * 10.5, -16); ctx.lineTo(s * 5, -11); ctx.closePath(); ctx.fillStyle = '#ff9ac0'; ctx.fill();
    }
    circle(ctx, 0, 0, 14); paint(ctx, shade(ctx, 0, 0, 14, fur2, fur), 3);
    if (o.meow) {
      ART.eyes(ctx, 0, -1, 4, 5.5, { closed: true, color: '#d6f25a' });
    } else {
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 5.5, -1, 4, 5); ctx.fillStyle = '#d6f25a'; ctx.fill();
        ellipse(ctx, s * 5.5, -1, 1.6, 4); ctx.fillStyle = INK; ctx.fill();
        ctx.fillStyle = '#fff'; circle(ctx, s * 5.5 - 1.3, -2.8, 1.3); ctx.fill();
      }
    }
    ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(2, 4); ctx.lineTo(0, 6.5); ctx.closePath(); ctx.fillStyle = '#ff9ac0'; ctx.fill();
    ART.mouth(ctx, 0, 9, 5, o.meow ? 'o' : 'cat', '#ffd0e0');
    ART.blush(ctx, 0, 5, 9, 2.8);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
    for (const s of [-1, 1]) { line(ctx, s * 7, 5, s * 17, 3); line(ctx, s * 7, 7, s * 17, 8); }
    ctx.restore();
    ellipse(ctx, 6, -18, 9, 3); paint(ctx, '#e8404a', 1.5);
    circle(ctx, 9, -14, 3); paint(ctx, '#ffd65c', 1.5);
  },

  friend(ctx, t, f) {
    switch (f.type) {
      case 'fghost': ART.ghost(ctx, t, { tint: '#ffcde6', bow: true, seed: f.seed, happy: f.happy }); break;
      case 'babybat': ART.bat(ctx, t, f, { color: '#ff9ac8', wing: '#f070aa', light: '#ffd8ea', mouth: 'smile', paci: true }); break;
      case 'fwitch': ART.witch(ctx, t, f, { dress: '#ff8ac2', hat: '#ff5fa8', band: '#ffd65c', hair: '#ffd65c', wand: true, cape: '#c84a98' }); break;
      case 'fvamp': ART.vampire(ctx, t, f, { lining: '#ff9ad0', heart: true }); break;
      case 'spiderf': ART.spider(ctx, t, f, { color: '#ff7ab8', light: '#ffc4e0', bow: true }); break;
    }
  },

  friendHeart(ctx, x, y, t) {
    const b = Math.sin(t * 4) * 3;
    heartShape(ctx, x, y + b, 9);
    paint(ctx, '#ff6aa8', 2.5, '#fff');
  },

  // ---------- Pumpkins ----------

  pumpkin(ctx, r, o = {}) {
    const t = o.t || 0;
    const gold = o.gold;
    const light = gold ? '#fff4b0' : '#ffc46a', mid = gold ? '#ffd23f' : '#ff9a2e', dark = gold ? '#d6950f' : '#e2681a';
    if (o.glow) softGlow(ctx, 0, 0, r * 2.2, gold ? 'rgba(255,230,90,0.5)' : 'rgba(255,190,70,0.32)');
    ctx.save(); ctx.rotate(0.12);
    rrect(ctx, -r * 0.13, -r * 1.08, r * 0.26, r * 0.42, r * 0.1); paint(ctx, '#7aa83e', 2.5);
    ctx.restore();
    ctx.save(); ctx.translate(r * 0.12, -r * 0.86); ctx.rotate(-0.5 + Math.sin(t * 2) * 0.08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.35, -r * 0.38, r * 0.72, -r * 0.05); ctx.quadraticCurveTo(r * 0.35, r * 0.16, 0, 0);
    paint(ctx, '#9fd45a', 2);
    ctx.restore();
    ctx.strokeStyle = '#7aa83e'; ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.88, r * 0.14, 0, Math.PI * 1.6); ctx.stroke();
    const lobes = [[-0.48, 0.56], [0.48, 0.56], [-0.2, 0.52], [0.2, 0.52], [0, 0.44]];
    for (const [lx, lw] of lobes) {
      const g = ctx.createLinearGradient(0, -r * 0.85, 0, r * 0.85);
      g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
      ellipse(ctx, lx * r, 0, lw * r, r * 0.84); paint(ctx, g, Math.max(1.8, r * 0.085));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(ctx, -r * 0.42, -r * 0.42, r * 0.13, r * 0.25, 0.5); ctx.fill();
    ART.pumpkinFace(ctx, r, o.face, t, o);
    if (gold) {
      ctx.fillStyle = '#fff';
      const s = (Math.sin(t * 5) + 1) * 0.5;
      sparkleShape(ctx, r * 0.6, -r * 0.6, r * 0.25 * s + 2); ctx.fill();
      sparkleShape(ctx, -r * 0.7, r * 0.3, r * 0.2 * (1 - s) + 2); ctx.fill();
    }
  },

  pumpkinFace(ctx, r, face, t, o = {}) {
    if (!face || face === 'none') return;
    if (face === 'jack') {
      const flick = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7) * 0.07;
      ctx.save();
      ctx.globalAlpha *= flick;
      ctx.fillStyle = '#ffe46b'; ctx.strokeStyle = '#8a3a08'; ctx.lineWidth = Math.max(1.5, r * 0.06); ctx.lineJoin = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * r * 0.42, -r * 0.02); ctx.lineTo(s * r * 0.12, -r * 0.02); ctx.lineTo(s * r * 0.26, -r * 0.38); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.15);
      ctx.quadraticCurveTo(0, r * 0.68, r * 0.5, r * 0.15);
      ctx.lineTo(r * 0.3, r * 0.27); ctx.lineTo(r * 0.16, r * 0.17); ctx.lineTo(0, r * 0.3); ctx.lineTo(-r * 0.16, r * 0.17); ctx.lineTo(-r * 0.3, r * 0.27);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ART.blush(ctx, 0, r * 0.12, r * 0.55, r * 0.1, 0.4);
      return;
    }
    const ey = -r * 0.08, er = r * 0.16, eg = r * 0.3;
    const eo = {}; let m = 'smile';
    switch (face) {
      case 'talk': m = (o.talking && Math.sin(t * 18) > 0) ? 'open' : 'smile'; break;
      case 'happy': eo.closed = true; m = 'open'; break;
      case 'sad': m = 'sad'; break;
      case 'worried': m = 'o'; eo.wide = true; break;
      case 'baby': m = 'smile'; break;
    }
    ART.eyes(ctx, 0, ey, er, eg, eo);
    ART.blush(ctx, 0, r * 0.16, r * 0.48, r * 0.12);
    ART.mouth(ctx, 0, r * 0.32, r * 0.34, m);
    if (face === 'sad') { ART.drop(ctx, eg + er * 0.4, ey + er * 1.8, r * 0.12); }
    if (face === 'worried') { ART.drop(ctx, r * 0.62, -r * 0.45, r * 0.13); }
  },

  // ---------- Player ----------

  player(ctx, p, t, o = {}) {
    const bob = p.moving ? Math.abs(Math.sin(t * 12)) * 3 : Math.sin(t * 3);
    groundShadow(ctx, 0, 2, 26);
    ctx.save();
    ctx.translate(0, -bob);
    const f = p.face || 1;
    ctx.save(); ctx.scale(f, 1);
    ctx.beginPath(); ctx.moveTo(-6, -48);
    ctx.quadraticCurveTo(-30 - Math.sin(t * 6) * 4, -24, -24 - Math.sin(t * 6) * 6, -6);
    ctx.lineTo(6, -10); ctx.closePath();
    paint(ctx, o.witch ? '#3a2a6a' : '#8a4ad8', 3);
    ctx.restore();
    const step = p.moving ? Math.sin(t * 14) * 4 : 0;
    rrect(ctx, -11, -17 + step * 0.3, 9, 16, 4); paint(ctx, '#5a3a8a', 2.5);
    rrect(ctx, 2, -17 - step * 0.3, 9, 16, 4); paint(ctx, '#5a3a8a', 2.5);
    ellipse(ctx, -7, -2, 7.5, 4.5); paint(ctx, '#3a2a5a', 2.5);
    ellipse(ctx, 7, -2, 7.5, 4.5); paint(ctx, '#3a2a5a', 2.5);
    if (o.witch) {
      ctx.beginPath(); ctx.moveTo(-18, -16); ctx.lineTo(18, -16); ctx.lineTo(13, -46); ctx.lineTo(-13, -46); ctx.closePath();
      paint(ctx, '#6a3ad0', 3);
    } else {
      ellipse(ctx, 0, -30, 21, 18); paint(ctx, shade(ctx, 0, -30, 21, '#ffc86a', '#f07d1a'), 3);
      ctx.strokeStyle = 'rgba(170,70,0,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, -30, 8, 17, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#5a2a0a';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 9, -33); ctx.lineTo(s * 3, -33); ctx.lineTo(s * 6, -39); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, -28, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fill();
    }
    ellipse(ctx, 0, -46, 12, 4); paint(ctx, '#7cc04a', 2.5);
    circle(ctx, 0, -63, 18); paint(ctx, shade(ctx, 0, -63, 18, '#ffead6', '#ffc9a0'), 3);
    ctx.beginPath(); ctx.arc(0, -64, 18.5, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(12, -66, 8, -72); ctx.quadraticCurveTo(4, -66, -2, -70); ctx.quadraticCurveTo(-8, -64, -18.5, -64);
    paint(ctx, '#7a4a2a', 2);
    ART.eyes(ctx, f * 1.5, -61, 4.6, 7.5);
    ART.blush(ctx, f * 1.5, -55, 11.5, 3.6);
    ART.mouth(ctx, f * 1.5, -53, 6, p.inv > 0 ? 'o' : 'smile');
    if (o.witch) {
      ellipse(ctx, 0, -76, 27, 6); paint(ctx, '#4a2a9a', 2.5);
      ctx.beginPath(); ctx.moveTo(-14, -78); ctx.quadraticCurveTo(-4, -100, 12 + Math.sin(t * 3) * 3, -116); ctx.quadraticCurveTo(6, -96, 14, -78); ctx.closePath();
      paint(ctx, '#4a2a9a', 2.5);
      ctx.fillStyle = '#ffd65c'; ctx.fillRect(-13, -84, 26, 5);
      starShape(ctx, 0, -94, 5); paint(ctx, '#ffe36b', 1.2);
    } else {
      ctx.beginPath(); ctx.arc(0, -68, 19.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      paint(ctx, shade(ctx, 0, -76, 18, '#ffc86a', '#f07d1a'), 2.5);
      ctx.strokeStyle = 'rgba(170,70,0,0.45)'; ctx.lineWidth = 2;
      line(ctx, -7, -84, -9, -70); line(ctx, 7, -84, 9, -70);
      rrect(ctx, -3, -94, 6, 9, 3); paint(ctx, '#7aa83e', 2);
      ctx.beginPath(); ctx.moveTo(2, -90); ctx.quadraticCurveTo(10, -98, 16, -90); ctx.quadraticCurveTo(10, -86, 2, -90); paint(ctx, '#9fd45a', 1.8);
    }
    const a = p.aimAng == null ? -Math.PI / 2 : p.aimAng;
    ctx.save(); ctx.translate(f * 6, -36); ctx.rotate(a);
    rrect(ctx, 0, -7, 30, 14, 7); paint(ctx, o.weaponColor || '#ff6aa8', 2.5);
    rrect(ctx, 24, -9, 10, 18, 5); paint(ctx, '#ffd65c', 2.5);
    circle(ctx, 4, 0, 6); paint(ctx, '#ffd7b5', 2.5);
    ctx.translate(14, 0); ctx.rotate(-a);
    ctx.font = `14px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(o.icon || '🍬', 0, 1);
    ctx.restore();
    ctx.restore();
  },

  // ---------- Houses ----------

  house(ctx, h, t, ready) {
    ctx.save(); ctx.translate(h.x, GROUND_Y + 8);
    groundShadow(ctx, 0, 0, 62);
    rrect(ctx, 28, -138, 16, 34, 4); paint(ctx, '#8a5a4a', 2.5);
    rrect(ctx, -50, -96, 100, 96, 10); paint(ctx, shade(ctx, 0, -60, 70, '#a07ad8', '#6a4aa8'), 3);
    ctx.strokeStyle = 'rgba(40,20,70,0.25)'; ctx.lineWidth = 2;
    for (let y = -80; y < 0; y += 16) line(ctx, -48, y, 48, y);
    ctx.beginPath(); ctx.moveTo(-64, -90); ctx.quadraticCurveTo(-30, -126, 0, -152); ctx.quadraticCurveTo(30, -126, 64, -90); ctx.closePath();
    paint(ctx, shade(ctx, 0, -120, 60, '#ffb36a', '#e8641c'), 3);
    ctx.fillStyle = 'rgba(160,50,0,0.35)';
    for (let i = 0; i < 4; i++) { circle(ctx, -36 + i * 24, -98, 6); ctx.fill(); }
    circle(ctx, 0, -118, 11); paint(ctx, '#ffe36b', 2.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, 0, -129, 0, -107); line(ctx, -11, -118, 11, -118);
    for (const s of [-1, 1]) {
      rrect(ctx, s * 30 - 11, -76, 22, 22, 5); paint(ctx, '#ffe36b', 2.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, s * 30, -76, s * 30, -54); line(ctx, s * 30 - 11, -65, s * 30 + 11, -65);
    }
    ctx.fillStyle = INK; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.arc(-30, -60, 5, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-34, -63); ctx.lineTo(-34, -68); ctx.lineTo(-31, -64); ctx.fill();
    ctx.globalAlpha = 1;
    if (ready) {
      const pulse = 0.5 + Math.sin(t * 5) * 0.5;
      softGlow(ctx, 0, -26, 50, `rgba(255,220,100,${0.35 + pulse * 0.35})`);
    }
    const open = h.open || 0;
    ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16, -34); ctx.arc(0, -34, 16, Math.PI, 0); ctx.lineTo(16, 0); ctx.closePath();
    paint(ctx, open > 0 ? '#2a1030' : '#7a4a2a', 3);
    if (open > 0) {
      ctx.fillStyle = 'rgba(255,230,120,0.25)'; ctx.fill();
      ART.eyes(ctx, 0, -24, 4, 6, { color: '#ffe36b' });
    } else {
      circle(ctx, 9, -20, 3); paint(ctx, '#ffd65c', 1.8);
      ctx.strokeStyle = 'rgba(40,20,10,0.4)'; ctx.lineWidth = 2; line(ctx, 0, -48, 0, -2);
    }
    rrect(ctx, -24, -4, 48, 6, 3); paint(ctx, '#9a6a4a', 2);
    ctx.save(); ctx.translate(-42, -40); ctx.rotate(Math.sin(t * 2) * 0.1);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; line(ctx, 0, -14, 0, -6);
    rrect(ctx, -6, -6, 12, 14, 4); paint(ctx, '#ffd65c', 2);
    softGlow(ctx, 0, 1, 22, 'rgba(255,220,100,0.45)');
    ctx.restore();
    ctx.restore();
  },

  // ---------- Bosses ----------

  king(ctx, t, b) {
    const r = 66;
    ctx.beginPath(); ctx.moveTo(-50, -40); ctx.quadraticCurveTo(-96, 10, -84, 62); ctx.lineTo(84, 62); ctx.quadraticCurveTo(96, 10, 50, -40); ctx.closePath();
    paint(ctx, '#d63a5a', 3);
    ctx.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { circle(ctx, i * 24, 60, 7); ctx.fill(); }
    ctx.fillStyle = INK; for (let i = -3; i <= 3; i++) { circle(ctx, i * 24, 60, 2); ctx.fill(); }
    const face = b.mood || 'smile';
    ART.pumpkin(ctx, r, { face, t, talking: !!b.say, glow: true });
    ctx.save(); ctx.translate(0, -r * 0.92);
    ctx.beginPath(); ctx.moveTo(-30, 4); ctx.lineTo(-34, -26); ctx.lineTo(-16, -10); ctx.lineTo(0, -34); ctx.lineTo(16, -10); ctx.lineTo(34, -26); ctx.lineTo(30, 4); ctx.closePath();
    paint(ctx, shade(ctx, 0, -10, 30, '#fff3a0', '#ffc020'), 3);
    circle(ctx, 0, -8, 5); paint(ctx, '#ff3a6a', 2); circle(ctx, -20, -4, 3.5); paint(ctx, '#4ac0ff', 1.5); circle(ctx, 20, -4, 3.5); paint(ctx, '#7aff9a', 1.5);
    ctx.restore();
    ctx.save(); ctx.translate(r + 14, 8); ctx.rotate(0.2 + Math.sin(t * 2) * 0.1);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; line(ctx, 0, -50, 0, 40);
    ctx.strokeStyle = '#ffc020'; ctx.lineWidth = 4; line(ctx, 0, -50, 0, 40);
    starShape(ctx, 0, -56, 13); paint(ctx, '#ffe36b', 2.5);
    ctx.restore();
  },

  chef(ctx, t, b) {
    ctx.save(); ctx.scale(2.2, 2.2);
    ART.zombieBody(ctx, t, { walk: false });
    rrect(ctx, -13, 4, 26, 18, 6); paint(ctx, '#fff', 2);
    ctx.fillStyle = '#ff9ad0'; heartShape(ctx, 0, 12, 4); ctx.fill();
    ctx.save(); ctx.translate(16, 4); ctx.rotate(-0.6 + Math.sin(t * 6) * 0.5);
    ctx.strokeStyle = INK; ctx.lineWidth = 4; line(ctx, 0, 0, 0, -22);
    ctx.strokeStyle = '#c48a52'; ctx.lineWidth = 2.5; line(ctx, 0, 0, 0, -22);
    ellipse(ctx, 0, -25, 4.5, 6); paint(ctx, '#c48a52', 2);
    ctx.restore();
    ART.zombieHead(ctx, t, { open: b.mouth > 0 });
    ctx.save(); ctx.translate(0, -38);
    rrect(ctx, -16, -2, 32, 9, 3); paint(ctx, '#fff', 2.5);
    circle(ctx, -10, -9, 9); paint(ctx, '#fff', 2.5); circle(ctx, 10, -9, 9); paint(ctx, '#fff', 2.5); circle(ctx, 0, -14, 11); paint(ctx, '#fff', 2.5);
    ctx.fillStyle = '#fff'; ctx.fillRect(-15, -6, 30, 8);
    ctx.restore();
    ctx.restore();
  },

  queen(ctx, t, b) {
    ctx.save(); ctx.scale(2, 2);
    ART.witch(ctx, t, b, { dress: '#c24ad0', hat: '#6a2fa8', band: '#ffd65c', hair: '#7ad0ff', crown: true, wand: true, cape: '#ff6aa8', skin: '#d8ffe0' });
    ctx.restore();
  },

  count(ctx, t, b) {
    const scared = b.scared > 0;
    const shake = scared ? Math.sin(t * 60) * 3 : 0;
    ctx.save(); ctx.translate(shake, 0);
    if (!scared) {
      ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.1;
      ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 30;
      circle(ctx, 0, 0, 82); ctx.strokeStyle = '#ffd8f0'; ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.scale(2.4, 2.4);
    const flap = Math.sin(t * 5) * 4;
    ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-34, 28 + flap); ctx.quadraticCurveTo(0, 20, 34, 28 - flap); ctx.lineTo(12, -6); ctx.closePath();
    paint(ctx, '#2b1b3a', 2);
    ctx.fillStyle = '#d63a5a';
    ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-28, 24 + flap); ctx.quadraticCurveTo(0, 17, 28, 24 - flap); ctx.lineTo(10, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6eeff';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circle(ctx, Math.cos(a) * 14, 8 + Math.sin(a) * 11, 7); ctx.fill(); }
    ellipse(ctx, 0, 8, 15, 12); paint(ctx, '#fff', 0);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 15, -16); ctx.lineTo(s * 24, -22); ctx.lineTo(s * 16, -9); ctx.closePath(); paint(ctx, '#efe4ff', 1.5); }
    circle(ctx, 0, -14, 16); paint(ctx, scared ? shade(ctx, 0, -14, 16, '#e8f4ff', '#b8d0ff') : shade(ctx, 0, -14, 16, '#ffffff', '#e2d4ff'), 2);
    ctx.beginPath(); ctx.arc(0, -15, 16.5, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(9, -23, 0, -19); ctx.quadraticCurveTo(-9, -23, -16.5, -15);
    paint(ctx, '#2b1b3a', 1.5);
    ART.eyes(ctx, 0, -12, 4.5, 6.5, { wide: scared });
    ART.blush(ctx, 0, -6, 10, 3.2);
    ART.mouth(ctx, 0, -3, 6, scared ? 'wavy' : 'fang');
    if (scared) { ART.drop(ctx, 14, -24, 3); ART.drop(ctx, -15, -20, 2.5); }
    ctx.restore();
    ctx.restore();
  },

  bigBoo(ctx, t, b) {
    ctx.save(); ctx.scale(2.8, 2.8);
    ART.ghost(ctx, t, { booing: b.booing, variant: 'giant', seed: 1 });
    ctx.restore();
  },

  moonBoss(ctx, t, b) {
    const r = 115;
    softGlow(ctx, 0, 0, r * 1.8, 'rgba(255,235,150,0.35)');
    circle(ctx, 0, 0, r); paint(ctx, shade(ctx, 0, 0, r, '#fff8c8', '#ffd86a'), 4);
    ctx.fillStyle = 'rgba(210,160,60,0.3)';
    [[-60, -50, 16], [55, -62, 11], [70, 30, 18], [-75, 35, 10], [20, 75, 9]].forEach(([x, y, cr]) => { circle(ctx, x, y, cr); ctx.fill(); });
    ctx.save(); ctx.translate(30, -r + 6); ctx.rotate(0.3);
    ctx.beginPath(); ctx.moveTo(-24, 6); ctx.lineTo(0, -50); ctx.lineTo(24, 6); ctx.closePath(); paint(ctx, '#ff6aa8', 3);
    ctx.save(); ctx.beginPath(); ctx.moveTo(-24, 6); ctx.lineTo(0, -50); ctx.lineTo(24, 6); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#ffe36b'; for (let i = 0; i < 4; i++) { circle(ctx, -12 + i * 9, -6 - i * 10, 4); ctx.fill(); }
    ctx.restore();
    circle(ctx, 0, -52, 7); paint(ctx, '#7ad0ff', 2.5);
    ctx.restore();
    const happy = b.happy;
    ART.eyes(ctx, 0, -22, 16, 38, { closed: happy || b.mouth > 0.6 });
    ART.blush(ctx, 0, 6, 58, 14);
    const m = b.mouth || 0;
    if (m > 0.05) {
      ellipse(ctx, 0, 40, 34 + m * 10, 8 + m * 34); paint(ctx, '#7a1838', 4);
      ctx.fillStyle = '#ff7aa8'; ellipse(ctx, 0, 40 + m * 22, 20, 8 + m * 6); ctx.fill();
      ctx.fillStyle = '#fff'; rrect(ctx, -16, 40 - 8 - m * 32, 13, 10, 3); ctx.fill(); rrect(ctx, 3, 40 - 8 - m * 32, 13, 10, 3); ctx.fill();
    } else {
      ART.mouth(ctx, 0, 40, 34, 'smile');
    }
  },

  // ---------- Speech bubbles ----------

  speech(ctx, x, y, text, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `700 15px ${FONT}`;
    const w = ctx.measureText(text).width + 20, h = 27;
    const bx = clamp(x - w / 2, 6, W - w - 6), by = Math.max(6, y - h - 12);
    const tx = clamp(x, bx + 14, bx + w - 14);
    rrect(ctx, bx, by, w, h, 13); paint(ctx, '#fff', 2.5);
    ctx.beginPath(); ctx.moveTo(tx - 7, by + h - 1); ctx.lineTo(tx, by + h + 9); ctx.lineTo(tx + 7, by + h - 1); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(tx - 6, by + h - 4, 12, 4);
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + w / 2, by + h / 2 + 1);
    ctx.restore();
  },
};
