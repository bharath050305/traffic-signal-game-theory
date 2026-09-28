/* ================= UI ================= */
const $ = id => document.getElementById(id);
const CTRLS = ['fixed', 'selfish', 'nash'];
const CNAME = { fixed: 'Fixed-time', selfish: 'Selfish', nash: 'Nash game' };
const PRESETS = {
  bal: { rate: 8, bias: 0, profile: 'steady' },
  ew: { rate: 8, bias: 45, profile: 'steady' },
  heavy: { rate: 11, bias: 0, profile: 'steady' },
  wave: { rate: 9, bias: 0, profile: 'rush' }
};
const S = { n: 2, rate: 8, bias: 0, profile: 'steady', seed: 42, ctrl: 'nash', speed: 2, playing: true, sel: 0, nbr: null,
  metric: 'd', tab: 'sim', gp: Object.assign({}, GP_DEFAULT), sims: {}, bench: null };
let COL = {};

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function readColors() {
  COL = { road: cssVar('--road'), line: cssVar('--roadline'), walk: cssVar('--walk'), block: cssVar('--block'), pill: cssVar('--pill'),
    accent: cssVar('--accent'), ink: cssVar('--ink'), muted: cssVar('--muted'), grid: cssVar('--line'), surface: cssVar('--surface2'),
    fixed: cssVar('--c-fixed'), selfish: cssVar('--c-selfish'), nash: cssVar('--c-nash') };
  COL.dark = isDark(); BG.key = '';
}
function ccol(c) { return COL[c]; }

/* ---------- simulation set ---------- */
function newSims() {
  const opts = { n: S.n, rate: S.rate, bias: S.bias / 100, profile: S.profile, gp: S.gp, seed: S.seed, vis: true };
  S.sims = {};
  for (const c of CTRLS) S.sims[c] = new Sim(Object.assign({}, opts, { ctrl: c }));
  if (S.sel >= S.n * S.n) S.sel = 0;
  buildChips(); fillNbrs();
}
function applyLive() {
  for (const c of CTRLS) { const s = S.sims[c]; s.rate = S.rate; s.bias = S.bias / 100; s.profile = S.profile; s.gp = Object.assign({}, S.gp); }
}

/* ---------- drawing the map ---------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function lampState(I, axis) {
  const my = axis === 'v' ? 0 : 1;
  if (I.phase !== my) return 'r';
  return I.status === 'green' ? 'g' : (I.status === 'yellow' ? 'y' : 'r');
}
const LAMP = { g: '#22c55e', y: '#f59e0b', r: '#ef4444' };
/* traffic-light head: dark housing with red / amber / green lens, active one glows */
function signalHead(ctx, x, y, st) {
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, x - 12, y - 3.2, 24, 9, 4); ctx.fill();
  ctx.fillStyle = '#12161c'; rr(ctx, x - 12, y - 4.5, 24, 9, 4); ctx.fill();
  ctx.strokeStyle = '#2b323c'; ctx.lineWidth = 0.8; ctx.stroke();
  const order = ['r', 'y', 'g'], dim = { r: '#4a1a1a', y: '#4a3a12', g: '#14401f' };
  order.forEach((k, i) => {
    const cx = x - 7.5 + i * 7.5, on = k === st;
    if (on) { ctx.save(); ctx.shadowColor = LAMP[k]; ctx.shadowBlur = 12; ctx.fillStyle = LAMP[k]; ctx.beginPath(); ctx.arc(cx, y, 2.9, 0, 6.2832); ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = dim[k]; ctx.beginPath(); ctx.arc(cx, y, 2.6, 0, 6.2832); ctx.fill(); }
  });
}

/* ---------- colour helpers ---------- */
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(hex, f) {
  const c = hexRgb(hex).map(v => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
}
function lum(hex) { const c = hexRgb(hex); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }

/* ---------- vehicle sprites (top-down, heading = +x) ---------- */
function drawCar(ctx, v, brake) {
  const L = 18, w = 10, hl = L / 2, hw = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.30)'; rr(ctx, -hl + 1, -hw + 1.8, L, w, 3.6); ctx.fill();
  ctx.fillStyle = '#0d0f12';
  for (const sx of [L * 0.29, -L * 0.29]) { ctx.fillRect(sx - 2, -hw - 0.7, 4, 1.7); ctx.fillRect(sx - 2, hw - 1, 4, 1.7); }
  ctx.fillStyle = v.c1;
  ctx.beginPath();
  ctx.moveTo(-hl + 3, -hw); ctx.lineTo(hl - 6, -hw); ctx.quadraticCurveTo(hl, -hw, hl, -hw + 3.4); ctx.lineTo(hl, hw - 3.4);
  ctx.quadraticCurveTo(hl, hw, hl - 6, hw); ctx.lineTo(-hl + 3, hw); ctx.quadraticCurveTo(-hl, hw, -hl, hw - 2.6);
  ctx.lineTo(-hl, -hw + 2.6); ctx.quadraticCurveTo(-hl, -hw, -hl + 3, -hw); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.16)'; rr(ctx, L * 0.2, -hw + 1.6, hl - L * 0.2 - 1.4, w - 3.2, 1.6); ctx.fill();
  ctx.fillStyle = '#18232f'; rr(ctx, -L * 0.31, -hw + 1.1, L * 0.52, w - 2.2, 2.4); ctx.fill();
  ctx.fillStyle = v.c2; rr(ctx, -L * 0.22, -hw + 1.7, L * 0.34, w - 3.4, 1.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(L * 0.2, -hw + 1.9); ctx.lineTo(L * 0.14, -hw + 1.9); ctx.lineTo(L * 0.14, -1); ctx.lineTo(L * 0.19, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = v.c1; ctx.fillRect(L * 0.16, -hw - 1.2, 2, 1.4); ctx.fillRect(L * 0.16, hw - 0.2, 2, 1.4);
  ctx.fillStyle = '#fff4c2'; ctx.fillRect(hl - 1.4, -hw + 0.9, 1.6, 2.2); ctx.fillRect(hl - 1.4, hw - 3.1, 1.6, 2.2);
  tailLights(ctx, -hl, hw - 1.1, 2.4, brake);
}
function tailLights(ctx, x, y, h, brake) {
  ctx.save();
  if (brake) { ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 7; }
  ctx.fillStyle = brake ? '#ff3b30' : '#8a1616';
  ctx.fillRect(x - 0.2, -y - 0.1, 1.5, h); ctx.fillRect(x - 0.2, y - h + 0.1, 1.5, h);
  ctx.restore();
}
function drawBike(ctx, v, brake) {
  const L = 10, hl = L / 2;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0.8, 1.6, hl + 0.5, 3, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = '#0d0f12'; rr(ctx, hl - 3.4, -0.9, 3.6, 1.8, 0.9); ctx.fill(); rr(ctx, -hl - 0.2, -1, 3.8, 2, 1); ctx.fill();
  ctx.fillStyle = v.c1; rr(ctx, -hl + 2, -1.5, L - 5, 3, 1.4); ctx.fill();
  ctx.fillStyle = '#1a1d22'; ctx.fillRect(hl - 4.2, -3.2, 1.3, 6.4);
  ctx.strokeStyle = v.c3; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0.6, -2.5); ctx.lineTo(hl - 3.6, -2.8); ctx.moveTo(0.6, 2.5); ctx.lineTo(hl - 3.6, 2.8); ctx.stroke();
  ctx.fillStyle = v.c3; ctx.beginPath(); ctx.ellipse(-0.6, 0, 2.5, 3.1, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = v.c2; ctx.beginPath(); ctx.arc(0.9, 0, 2, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(1.9, -1.3, 0.9, 2.6);
  ctx.fillStyle = '#fff4c2'; ctx.fillRect(hl - 0.6, -0.8, 0.9, 1.6);
  ctx.save(); if (brake) { ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 6; }
  ctx.fillStyle = brake ? '#ff3b30' : '#8a1616'; ctx.fillRect(-hl - 0.2, -0.9, 1.2, 1.8); ctx.restore();
}
function drawAuto(ctx, v, brake) {
  const L = 14, w = 9, hl = L / 2, hw = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, -hl + 1, -hw + 1.7, L, w, 3); ctx.fill();
  ctx.fillStyle = '#0d0f12'; ctx.fillRect(hl - 3.4, -0.9, 3.4, 1.8);
  ctx.fillRect(-hl + 1.6, -hw - 0.6, 3.6, 1.7); ctx.fillRect(-hl + 1.6, hw - 1.1, 3.6, 1.7);
  ctx.fillStyle = '#16181c'; rr(ctx, -hl, -hw + 0.4, L, w - 0.8, 2.6); ctx.fill();
  ctx.fillStyle = '#f2c200'; rr(ctx, -hl + 0.5, -hw + 0.9, L - 4.6, w - 1.8, 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(-hl + 2.2, -hw + 1.6, 0.8, w - 3.2); ctx.fillRect(-hl + 5.6, -hw + 1.6, 0.8, w - 3.2);
  ctx.fillStyle = '#1e2c3a'; ctx.beginPath(); ctx.moveTo(hl - 4.1, -hw + 1.6); ctx.lineTo(hl - 2, -1.8); ctx.lineTo(hl - 2, 1.8); ctx.lineTo(hl - 4.1, hw - 1.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff4c2'; ctx.fillRect(hl - 0.8, -0.9, 1, 1.8);
  ctx.save(); if (brake) { ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 6; }
  ctx.fillStyle = brake ? '#ff3b30' : '#8a1616'; ctx.fillRect(-hl - 0.2, -hw + 1.2, 1.3, 1.8); ctx.fillRect(-hl - 0.2, hw - 3, 1.3, 1.8); ctx.restore();
}
function drawBus(ctx, v, brake) {
  const L = 32, w = 11, hl = L / 2, hw = w / 2;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; rr(ctx, -hl + 1.2, -hw + 2, L, w, 3); ctx.fill();
  ctx.fillStyle = '#0d0f12';
  for (const sx of [hl - 6, -hl + 8, -hl + 12.5]) { ctx.fillRect(sx - 2.2, -hw - 0.6, 4.4, 1.6); ctx.fillRect(sx - 2.2, hw - 1, 4.4, 1.6); }
  ctx.fillStyle = v.c1; rr(ctx, -hl, -hw, L, w, 2.6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.fillStyle = v.c2; rr(ctx, -hl + 1.3, -hw + 1.3, L - 4.6, w - 2.6, 1.8); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  for (let i = 0; i < 4; i++) ctx.fillRect(-hl + 4 + i * 6.4, -hw + 1.8, 3.6, w - 3.6);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(-hl + 1.5, -0.4, L - 8, 0.8);
  ctx.fillStyle = '#18232f'; rr(ctx, hl - 3.1, -hw + 0.9, 2.4, w - 1.8, 1); ctx.fill();
  ctx.fillStyle = '#18232f'; ctx.fillRect(-hl + 0.1, -hw + 2, 0.9, w - 4);
  ctx.fillStyle = v.c1; ctx.fillRect(hl - 7, -hw - 1.4, 2.4, 1.6); ctx.fillRect(hl - 7, hw - 0.2, 2.4, 1.6);
  ctx.fillStyle = '#fff4c2'; ctx.fillRect(hl - 0.9, -hw + 0.8, 1.1, 2); ctx.fillRect(hl - 0.9, hw - 2.8, 1.1, 2);
  ctx.save(); if (brake) { ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 7; }
  ctx.fillStyle = brake ? '#ff3b30' : '#8a1616'; ctx.fillRect(-hl - 0.2, -hw + 0.8, 1.4, 2); ctx.fillRect(-hl - 0.2, hw - 2.8, 1.4, 2); ctx.restore();
}
function vehicleColors(v) {
  if (v.c1) return;
  if (v.type === 'bus') { const red = v.id % 3 !== 0; v.c1 = red ? '#c0272d' : '#1f5fa8'; v.c2 = red ? '#d9d4cc' : '#e6e9ee'; }
  else if (v.type === 'auto') { v.c1 = '#f2c200'; v.c2 = '#f2c200'; }
  else if (v.type === 'bike') { const dark = lum(v.color) > 0.6; v.c1 = v.color; v.c3 = ['#2c3e5a', '#3a3f47', '#5a2a2a', '#2f4a3a', '#8a8f98'][v.id % 5]; v.c2 = ['#e8e8e8', '#222', '#c62828', '#1e5aa8', '#f2c200'][(v.id >> 2) % 5]; if (dark) v.c1 = '#2b3038'; }
  else { v.c1 = v.color; v.c2 = lum(v.color) > 0.5 ? shade(v.color, -0.10) : shade(v.color, 0.14); }
}
function drawVehicle(ctx, v) {
  vehicleColors(v);
  const brake = v.v < 4;
  if (v.type === 'bus') drawBus(ctx, v, brake); else if (v.type === 'auto') drawAuto(ctx, v, brake);
  else if (v.type === 'bike') drawBike(ctx, v, brake); else drawCar(ctx, v, brake);
}

/* ---------- static city background (cached) ---------- */
let BG = { key: '', cv: null };
function isDark() { const c = hexRgb(cssVar('--bg')); return (c[0] + c[1] + c[2]) / 3 < 100; }
function buildBg(sim, px) {
  const cv = document.createElement('canvas'); cv.width = px; cv.height = px;
  const ctx = cv.getContext('2d'); const sc = px / CFG.W; ctx.setTransform(sc, 0, 0, sc, 0, 0);
  const C = sim.C, n = sim.n, W = CFG.W, RH = CFG.box, SO = CFG.stopOff, dark = COL.dark;
  ctx.fillStyle = COL.walk; ctx.fillRect(0, 0, W, W);
  const roofs = dark ? ['#1a2634', '#1e2b3b', '#16222f', '#223144'] : ['#c6ced8', '#bcc5d1', '#d3d9e1', '#b3bdca'];
  const parks = dark ? ['#17372c', '#1a4032'] : ['#a9cfa6', '#98c495'];
  const trees = dark ? ['#1f5a40', '#276b4c', '#1b4d38'] : ['#4f9a5c', '#5aa868', '#3f8650'];
  const rng = mulberry32(n * 977 + 13);
  for (let gx = 0; gx <= n; gx++) for (let gy = 0; gy <= n; gy++) {
    const x0 = gx === 0 ? 6 : C[gx - 1] + RH + 8, x1 = gx === n ? W - 6 : C[gx] - RH - 8;
    const y0 = gy === 0 ? 6 : C[gy - 1] + RH + 8, y1 = gy === n ? W - 6 : C[gy] - RH - 8;
    ctx.fillStyle = COL.block; rr(ctx, x0, y0, x1 - x0, y1 - y0, 9); ctx.fill();
    const park = rng() < 0.22;
    const cw = park ? 999 : 70 + rng() * 30, cols = Math.max(1, Math.round((x1 - x0) / cw)), rows = Math.max(1, Math.round((y1 - y0) / cw));
    if (park) {
      ctx.fillStyle = parks[Math.floor(rng() * parks.length)]; rr(ctx, x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10, 8); ctx.fill();
      const cnt = Math.round((x1 - x0) * (y1 - y0) / 1500);
      for (let t = 0; t < cnt; t++) {
        const tx = x0 + 14 + rng() * (x1 - x0 - 28), ty = y0 + 14 + rng() * (y1 - y0 - 28), r = 6 + rng() * 6;
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.arc(tx + 2, ty + 3, r, 0, 6.2832); ctx.fill();
        ctx.fillStyle = trees[Math.floor(rng() * trees.length)]; ctx.beginPath(); ctx.arc(tx, ty, r, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.beginPath(); ctx.arc(tx - r * 0.3, ty - r * 0.3, r * 0.5, 0, 6.2832); ctx.fill();
      }
      continue;
    }
    const bw = (x1 - x0) / cols, bh = (y1 - y0) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const ins = 5 + rng() * 5, bx = x0 + i * bw + ins, by = y0 + j * bh + ins, ww = bw - 2 * ins, hh = bh - 2 * ins;
      if (ww < 14 || hh < 14) continue;
      ctx.fillStyle = 'rgba(0,0,0,.26)'; rr(ctx, bx + 3, by + 4, ww, hh, 3); ctx.fill();
      const rc = roofs[Math.floor(rng() * roofs.length)];
      ctx.fillStyle = rc; rr(ctx, bx, by, ww, hh, 3); ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.14)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.35)'; rr(ctx, bx + 4, by + 4, ww - 8, hh - 8, 2); ctx.fill();
      const units = 1 + Math.floor(rng() * 4);
      for (let u = 0; u < units; u++) {
        ctx.fillStyle = dark ? '#2d3d50' : '#9aa5b4'; const ux = bx + 8 + rng() * (ww - 26), uy = by + 8 + rng() * (hh - 24);
        ctx.fillRect(ux, uy, 8 + rng() * 6, 6 + rng() * 5);
      }
      if (rng() < 0.35) { ctx.fillStyle = trees[Math.floor(rng() * trees.length)]; ctx.beginPath(); ctx.arc(bx - 3, by + hh * 0.5, 4.5, 0, 6.2832); ctx.fill(); }
    }
  }
  // asphalt
  ctx.fillStyle = COL.road;
  for (const c of C) { ctx.fillRect(c - RH, 0, 2 * RH, W); ctx.fillRect(0, c - RH, W, 2 * RH); }
  // subtle wheel-track wear on each lane
  ctx.fillStyle = dark ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.05)';
  for (const c of C) for (const o of [-CFG.laneOff, CFG.laneOff]) { ctx.fillRect(c + o - 5.5, 0, 2.6, W); ctx.fillRect(c + o + 3, 0, 2.6, W); ctx.fillRect(0, c + o - 5.5, W, 2.6); ctx.fillRect(0, c + o + 3, W, 2.6); }
  // kerb lines and centre lines
  ctx.strokeStyle = COL.line; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.85;
  for (const c of C) { ctx.beginPath(); ctx.moveTo(c - RH + 1, 0); ctx.lineTo(c - RH + 1, W); ctx.moveTo(c + RH - 1, 0); ctx.lineTo(c + RH - 1, W); ctx.moveTo(0, c - RH + 1); ctx.lineTo(W, c - RH + 1); ctx.moveTo(0, c + RH - 1); ctx.lineTo(W, c + RH - 1); ctx.stroke(); }
  ctx.globalAlpha = 0.9; ctx.strokeStyle = dark ? '#c9a227' : '#e3b90f'; ctx.lineWidth = 1.6; ctx.setLineDash([12, 9]);
  for (const c of C) { ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, W); ctx.moveTo(0, c); ctx.lineTo(W, c); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
  ctx.fillStyle = COL.road;
  for (const I of sim.inter) { ctx.fillRect(I.x - SO, I.y - RH, 2 * SO, 2 * RH); ctx.fillRect(I.x - RH, I.y - SO, 2 * RH, 2 * SO); }
  // kerb continues across box corners
  for (const I of sim.inter) {
    ctx.strokeStyle = COL.line; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.4;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = I.x + sx * RH, cy = I.y + sy * RH;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 0.1, cy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.line; ctx.globalAlpha = 0.8;
    for (let k = -RH + 3; k < RH - 2; k += 5.5) {
      ctx.fillRect(I.x - SO + 2, I.y + k, 11, 3); ctx.fillRect(I.x + SO - 13, I.y + k, 11, 3);
      ctx.fillRect(I.x + k, I.y - SO + 2, 3, 11); ctx.fillRect(I.x + k, I.y + SO - 13, 3, 11);
    }
    ctx.globalAlpha = 1; ctx.strokeStyle = COL.line; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(I.x - SO, I.y - RH); ctx.lineTo(I.x - SO, I.y);
    ctx.moveTo(I.x + SO, I.y); ctx.lineTo(I.x + SO, I.y + RH);
    ctx.moveTo(I.x, I.y - SO); ctx.lineTo(I.x + RH, I.y - SO);
    ctx.moveTo(I.x - RH, I.y + SO); ctx.lineTo(I.x, I.y + SO);
    ctx.stroke();
  }
  return cv;
}

function drawMap() {
  const cv = $('sim'); if (!cv.clientWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.round(cv.clientWidth * dpr);
  if (cv.width !== px) { cv.width = px; cv.height = px; }
  const ctx = cv.getContext('2d'); const sc = cv.width / CFG.W;
  const sim = S.sims[S.ctrl], C = sim.C, RH = CFG.box, SO = CFG.stopOff;
  const key = sim.n + '|' + px + '|' + COL.road + COL.block + COL.walk;
  if (BG.key !== key) { BG = { key, cv: buildBg(sim, px) }; }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(BG.cv, 0, 0);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);
  // green corridors
  ctx.fillStyle = COL.accent; ctx.globalAlpha = 0.16;
  for (const I of sim.inter) {
    if (I.status !== 'green') continue;
    const e = sim.nb(I, 'E'), s = sim.nb(I, 'S');
    if (e >= 0 && I.phase === 1) { const J = sim.inter[e]; if (J.phase === 1 && J.status === 'green') ctx.fillRect(I.x + SO, I.y - RH, J.x - I.x - 2 * SO, 2 * RH); }
    if (s >= 0 && I.phase === 0) { const J = sim.inter[s]; if (J.phase === 0 && J.status === 'green') ctx.fillRect(I.x - RH, I.y + SO, 2 * RH, J.y - I.y - 2 * SO); }
  }
  ctx.globalAlpha = 1;
  // queue heat
  for (const I of sim.inter) {
    const o = sim.obs[I.id], x = I.x, y = I.y;
    const heat = (q, rx, ry, rw, rh) => { if (q > 0) { ctx.fillStyle = 'rgba(226,72,61,' + Math.min(0.42, 0.06 * q) + ')'; ctx.fillRect(rx, ry, rw, rh); } };
    heat(o.q.W, x - SO - CFG.detect, y - RH, CFG.detect, RH);
    heat(o.q.E, x + SO, y, CFG.detect, RH);
    heat(o.q.N, x, y - SO - CFG.detect, RH, CFG.detect);
    heat(o.q.S, x - RH, y + SO, RH, CFG.detect);
  }
  // vehicles
  for (const v of sim.vehicles) {
    const p = sim.xy(v);
    ctx.save(); ctx.translate(p.x + v.dx, p.y + v.dy); ctx.rotate(v.ang);
    drawVehicle(ctx, v);
    ctx.restore();
  }
  // signal heads & labels
  ctx.font = '600 11px Barlow, system-ui, sans-serif'; ctx.textBaseline = 'middle';
  for (const I of sim.inter) {
    const x = I.x, y = I.y;
    signalHead(ctx, x - SO - 4, y - RH - 8, lampState(I, 'h'));
    signalHead(ctx, x + SO + 4, y + RH + 8, lampState(I, 'h'));
    signalHead(ctx, x + RH + 13, y - SO - 9, lampState(I, 'v'));
    signalHead(ctx, x - RH - 13, y + SO + 9, lampState(I, 'v'));
    let txt = 'J' + (I.id + 1) + '  ' + (I.phase === 0 ? '\u2195' : '\u2194');
    if (I.status === 'green') txt += '  ' + Math.floor(I.greenT) + 's'; else if (I.status === 'yellow') txt += '  amber'; else txt += '  clear';
    const bw = ctx.measureText(txt).width + 14;
    ctx.fillStyle = COL.pill; rr(ctx, x + 56, y + 56, bw, 20, 6); ctx.fill();
    ctx.fillStyle = COL.ink; ctx.fillText(txt, x + 63, y + 66.5);
    if (I.id === S.sel) {
      ctx.strokeStyle = COL.accent; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
      rr(ctx, x - SO - 16, y - SO - 16, 2 * SO + 32, 2 * SO + 32, 14); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}

/* ---------- panels ---------- */
function fmtTime(t) { t = Math.floor(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function pct(a, b) { return b > 0 ? (a - b) / b * 100 : 0; }
function sgn(x, d) { const s = Math.abs(x).toFixed(d == null ? 0 : d); return (parseFloat(s) === 0 ? '' : (x > 0 ? '+' : '\u2212')) + s; }

function updateKPIs() {
  const sim = S.sims[S.ctrl], fx = S.sims.fixed, m = sim.metrics(), mf = fx.metrics();
  $('clock').textContent = fmtTime(sim.t);
  let dDelay = '', dQ = '';
  if (S.ctrl !== 'fixed' && sim.t > 30) {
    const a = pct(m.delay, mf.delay), b = pct(m.avgQ, mf.avgQ);
    dDelay = '<span class="' + (a <= 0 ? 'good' : 'bad') + '">' + sgn(a) + '%</span> vs fixed-time';
    dQ = '<span class="' + (b <= 0 ? 'good' : 'bad') + '">' + sgn(b) + '%</span> avg vs fixed-time';
  } else dQ = 'average ' + m.avgQ.toFixed(1);
  const eq = S.ctrl === 'fixed' ? ['\u2014', 'no decisions: fixed timer'] :
    [m.brRounds.toFixed(1) + '<small>rounds</small>', (m.brConv * 100).toFixed(0) + '% of decisions reached equilibrium'];
  const T = [
    ['Average delay', m.delay.toFixed(1) + '<small>s</small>', dDelay || 'per vehicle, all vehicles'],
    ['Vehicles stopped', String(sim.stoppedNow), dQ],
    ['Throughput', String(m.thr60) + '<small>/min</small>', m.exited + ' trips completed'],
    ['Stops per trip', m.stops.toFixed(1), 'stop-and-go events'],
    ['On the map', String(m.inNet), m.pend + ' waiting to enter'],
    ['Nash equilibrium', eq[0], eq[1]]
  ];
  $('kpis').innerHTML = T.map(t => '<div class="kpi"><div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div><div class="s">' + t[2] + '</div></div>').join('');
}
function updateScore() {
  const ms = CTRLS.map(c => S.sims[c].metrics());
  const best = Math.min(...ms.map(m => m.delay));
  $('score').innerHTML = CTRLS.map((c, i) => '<span class="pill' + (ms[i].delay === best && ms[i].t > 30 ? ' best' : '') + '"><i style="background:' + ccol(c) + '"></i>' + CNAME[c] + ' <b>' + ms[i].delay.toFixed(1) + ' s</b></span>').join('');
}
function buildChips() {
  const html = S.sims.nash.inter.map(I => '<button type="button" class="chip' + (I.id === S.sel ? ' on' : '') + '" data-i="' + I.id + '">J' + (I.id + 1) + '</button>').join('');
  $('chips').innerHTML = html; $('chips2').innerHTML = html;
}
function selectJ(i) { S.sel = i; buildChips(); fillNbrs(); updateInspector(); updateGame(); }
function updateInspector() {
  const sim = S.sims[S.ctrl], I = sim.inter[S.sel], o = sim.obs[I.id];
  const stTxt = { green: 'Green', yellow: 'Yellow', allred: 'All red' }[I.status];
  const axis = I.phase === 0 ? 'North\u2013South' : 'East\u2013West';
  const cls = I.status === 'green' ? 'g' : (I.status === 'yellow' ? 'y' : 'r');
  let h = '<div class="status"><span class="dot ' + cls + '"></span>' + (I.status === 'allred' ? 'All red, clearing the junction' : stTxt + ' for ' + axis) + '<span class="hint" style="margin-left:auto;font-weight:400">' + (I.status === 'green' ? I.greenT.toFixed(0) + ' s in this phase' : '') + '</span></div>';
  const rows = [['N', '\u2193 from north'], ['S', '\u2191 from south'], ['W', '\u2192 from west'], ['E', '\u2190 from east']];
  for (const [k, lab] of rows) {
    h += '<div class="appr"><span>' + lab + '</span><div class="bar q"><span style="width:' + Math.min(100, o.q[k] * 9) + '%"></span></div><span class="hint">' + o.q[k] + ' queued, ' + o.m[k] + ' near</span></div>';
  }
  if (S.ctrl === 'fixed') {
    h += '<div class="why">Fixed timer: switches every ' + CFG.fixedGreen + ' s whatever the queues look like.</div>';
  } else {
    const u = sim.lastU[I.id], pl = sim.plan[I.id], mx = Math.max(1, Math.abs(u[0]), Math.abs(u[1]));
    const ub = (lab, v, chosen) => '<div class="appr"><span>' + lab + '</span><div class="bar"><span style="width:' + Math.max(2, Math.max(0, v) / mx * 100) + '%;background:' + (chosen ? COL.accent : COL.muted) + '"></span></div><span class="hint"><b>' + v.toFixed(1) + '</b>' + (chosen ? ' \u2713' : '') + '</span></div>';
    h += '<div class="hint" style="margin-top:10px">Payoff of each action, given what the others chose</div>' + ub('\u2195 N\u2013S', u[0], pl === 0) + ub('\u2194 E\u2013W', u[1], pl === 1);
    const better = pl === 0 ? 'North\u2013South' : 'East\u2013West';
    let why = 'Best response: serve <b>' + better + '</b> (' + Math.abs(u[0] - u[1]).toFixed(1) + ' higher payoff).';
    if (I.status === 'green' && pl !== I.phase) why += I.greenT < CFG.minGreen ? ' Waiting for the minimum green of ' + CFG.minGreen + ' s.' : ' Switching now.';
    if (I.status === 'green' && pl === I.phase) why += ' Keeping the current green.';
    h += '<div class="why">' + why + '</div>';
  }
  $('inspBody').innerHTML = h;
}

/* ---------- charts ---------- */
function setupCv(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return null;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
function niceStep(v) { const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
function drawLines(cv, series, xLabel) {
  const g = setupCv(cv); if (!g) return; const { ctx, w, h } = g;
  const pad = { l: 44, r: 14, t: 10, b: 38 };
  let xmax = 0, ymax = 0;
  for (const s of series) for (const p of s.pts) { if (p.x > xmax) xmax = p.x; if (p.y > ymax) ymax = p.y; }
  ymax = niceMax(ymax * 1.08); xmax = Math.max(xmax, 1);
  const X = x => pad.l + x / xmax * (w - pad.l - pad.r), Y = y => h - pad.b - y / ymax * (h - pad.t - pad.b);
  ctx.font = '12px Barlow, system-ui, sans-serif'; ctx.fillStyle = COL.muted; ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) { const v = ymax * i / 4, y = Y(v); ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(String(Math.round(v * 10) / 10), pad.l - 6, y); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const st = niceStep(xmax / 4);
  for (let v = 0; v <= xmax + 1e-9; v += st) ctx.fillText(v.toFixed(st < 1 ? 1 : 0), X(v), h - pad.b + 6);
  ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xLabel, w - pad.r, h - 2);
  for (const s of series) {
    if (!s.pts.length) continue;
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath();
    s.pts.forEach((p, i) => { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); });
    ctx.stroke();
    const l = s.pts[s.pts.length - 1]; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(l.x), Y(l.y), 3.5, 0, 6.2832); ctx.fill();
  }
}
function drawLive() {
  const series = CTRLS.map(c => ({ color: ccol(c), pts: S.sims[c].series.map(s => ({ x: s.t / 60, y: s[S.metric] })) }));
  drawLines($('chartLive'), series, S.metric === 'd' ? 'minutes \u00b7 average delay (s)' : 'minutes \u00b7 vehicles stopped');
}
function drawBars(cv, title, bars, better) {
  const g = setupCv(cv); if (!g) return; const { ctx, w, h } = g;
  const pad = { l: 12, r: 12, t: 34, b: 34 };
  let ymax = 0; for (const b of bars) ymax = Math.max(ymax, b.mean + b.sd);
  ymax = niceMax(ymax * 1.1);
  ctx.font = '600 14px "Barlow Semi Condensed", Barlow, system-ui, sans-serif'; ctx.fillStyle = COL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(title, pad.l, 8);
  ctx.font = '12px Barlow, system-ui, sans-serif'; ctx.fillStyle = COL.muted; ctx.fillText(better, pad.l, 24 - 1);
  const bw = (w - pad.l - pad.r) / bars.length, base = h - pad.b;
  const Y = v => base - v / ymax * (base - pad.t - 12);
  ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(pad.l, base); ctx.lineTo(w - pad.r, base); ctx.stroke();
  bars.forEach((b, i) => {
    const x = pad.l + i * bw + bw * 0.2, ww = bw * 0.6;
    ctx.fillStyle = b.color; ctx.globalAlpha = 0.9; rr(ctx, x, Y(b.mean), ww, base - Y(b.mean), 4); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.5; const cx = x + ww / 2;
    ctx.beginPath(); ctx.moveTo(cx, Y(b.mean + b.sd)); ctx.lineTo(cx, Y(Math.max(0, b.mean - b.sd)));
    ctx.moveTo(cx - 5, Y(b.mean + b.sd)); ctx.lineTo(cx + 5, Y(b.mean + b.sd)); ctx.moveTo(cx - 5, Y(Math.max(0, b.mean - b.sd))); ctx.lineTo(cx + 5, Y(Math.max(0, b.mean - b.sd))); ctx.stroke();
    ctx.fillStyle = COL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = '600 13px Barlow, system-ui, sans-serif';
    ctx.fillText(b.mean.toFixed(b.mean < 10 ? 2 : 1), cx, Y(b.mean + b.sd) - 3);
    ctx.textBaseline = 'top'; ctx.font = '12px Barlow, system-ui, sans-serif'; ctx.fillStyle = COL.muted; ctx.fillText(b.label, cx, base + 6);
  });
}

/* ---------- game tab ---------- */
function fillNbrs() {
  const sim = S.sims.nash, I = sim.inter[S.sel], opts = [];
  for (const [d, lab] of [['E', 'east'], ['S', 'south'], ['W', 'west'], ['N', 'north']]) { const j = sim.nb(I, d); if (j >= 0) opts.push([j, 'J' + (j + 1) + ' (' + lab + ')']); }
  $('selNbr').innerHTML = opts.map(o => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
  S.nbr = opts.length ? opts[0][0] : null;
}
function updateGame() {
  const sim = S.sims.nash, i = S.sel, j = S.nbr;
  if (j == null) { $('pmBox').innerHTML = ''; return; }
  const P = sim.P || sim.gp, plan = sim.plan.slice(), M = [[null, null], [null, null]];
  for (let ai = 0; ai < 2; ai++) for (let aj = 0; aj < 2; aj++) {
    const p = plan.slice(); p[i] = ai; p[j] = aj;
    M[ai][aj] = [sim.util(i, ai, p, P), sim.util(j, aj, p, P)];
  }
  const brI = [[0, 0], [0, 0]], brJ = [[0, 0], [0, 0]];
  for (let aj = 0; aj < 2; aj++) { const m = Math.max(M[0][aj][0], M[1][aj][0]); for (let ai = 0; ai < 2; ai++) brI[ai][aj] = M[ai][aj][0] >= m - 1e-9 ? 1 : 0; }
  for (let ai = 0; ai < 2; ai++) { const m = Math.max(M[ai][0][1], M[ai][1][1]); for (let aj = 0; aj < 2; aj++) brJ[ai][aj] = M[ai][aj][1] >= m - 1e-9 ? 1 : 0; }
  const sym = ['\u2195 North\u2013South', '\u2194 East\u2013West'], ne = [];
  let h = '<div class="tbl-wrap"><table class="pm"><thead><tr><th></th><th colspan="2">J' + (j + 1) + ' serves</th></tr><tr><th></th><th>' + sym[0] + '</th><th>' + sym[1] + '</th></tr></thead><tbody>';
  for (let ai = 0; ai < 2; ai++) {
    h += '<tr><th>J' + (i + 1) + ' serves<br>' + sym[ai] + '</th>';
    for (let aj = 0; aj < 2; aj++) {
      const isNE = brI[ai][aj] && brJ[ai][aj]; if (isNE) ne.push([ai, aj]);
      h += '<td class="' + (isNE ? 'ne' : '') + '"><span class="u a' + (brI[ai][aj] ? ' br' : '') + '">' + M[ai][aj][0].toFixed(1) + '</span> <span class="u b' + (brJ[ai][aj] ? ' br' : '') + '">' + M[ai][aj][1].toFixed(1) + '</span></td>';
    }
    h += '</tr>';
  }
  h += '</tbody></table></div>';
  const I = sim.inter[i], vertical = (I.c === sim.inter[j].c);
  const road = vertical ? 'North\u2013South' : 'East\u2013West';
  h += '<p class="hint"><span style="color:var(--accent);font-weight:600">J' + (i + 1) + ' payoff</span> and <span style="color:var(--c-selfish);font-weight:600">J' + (j + 1) + ' payoff</span> in each cell. Underlined = best response to the other player\u2019s action. Shaded cell = Nash equilibrium (both underlined).</p>';
  h += '<p>' + (ne.length ? '<b>Pure Nash equilibrium: </b>' + ne.map(c => 'J' + (i + 1) + ' \u2192 ' + sym[c[0]] + ', J' + (j + 1) + ' \u2192 ' + sym[c[1]]).join(' or ') + '.' : '<b>No pure equilibrium in this pair right now.</b>') + '</p>';
  h += '<p class="hint">These two junctions share the ' + road + ' road, so their payoffs only interact when J' + (i + 1) + ' serves ' + road + ' (spillback and platoon coordination). Other rows are independent of the neighbour.</p>';
  $('pmBox').innerHTML = h;
  // trace
  const n2 = sim.inter.length; let t = '';
  sim.trace.forEach((pl, r) => {
    const last = r === sim.trace.length - 1;
    t += '<div class="rw' + (last ? ' last' : '') + '" style="--n:' + n2 + '"><span class="hint">' + (r === 0 ? 'Start' : 'Round ' + r) + '</span>' + pl.map(a => '<span class="c">' + (a === 0 ? '\u2195' : '\u2194') + '</span>').join('') + '</div>';
  });
  t = '<div class="rw" style="--n:' + n2 + '"><span></span>' + sim.inter.map(I2 => '<span class="hint" style="text-align:center">J' + (I2.id + 1) + '</span>').join('') + '</div>' + t;
  $('trace').innerHTML = t;
  $('traceNote').textContent = sim.trace.length > 1 ? (sim.converged ? 'Stable after ' + (sim.rounds - 1 || 0) + ' change round' + ((sim.rounds - 1) === 1 ? '' : 's') + '. No junction wants to deviate: Nash equilibrium.' : 'Round limit reached without a stable profile.') : 'Waiting for the first decision.';
}
function syncParams() {
  const map = [['gpOmega', 'omega', 'oOmega'], ['gpSigma', 'sigma', 'oSigma'], ['gpLam', 'lam', 'oLam'], ['gpKap', 'kap', 'oKap']];
  for (const [id, k, o] of map) { $(id).value = S.gp[k]; $(o).textContent = (+S.gp[k]).toFixed(1); }
}

/* ---------- benchmark ---------- */
function pctile(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); const k = (s.length - 1) * p / 100, f = Math.floor(k), c = Math.ceil(k); return s[f] + (s[c] - s[f]) * (k - f); }
function scenarioText() {
  const b = S.bias; const mix = b === 0 ? 'balanced mix' : (b > 0 ? 'East\u2013West +' + b + '%' : 'North\u2013South +' + (-b) + '%');
  return S.n + '\u00d7' + S.n + ' grid \u00b7 ' + S.rate + ' veh/min per entry \u00b7 ' + mix + ' \u00b7 ' + (S.profile === 'rush' ? 'rush-hour wave' : 'steady demand');
}
async function runBenchmark() {
  const btn = $('btnBench'); btn.disabled = true;
  const nSeeds = +$('selSeeds').value, dur = +$('selDur').value, steps = Math.round(dur / CFG.dt);
  const opts = { n: S.n, rate: S.rate, bias: S.bias / 100, profile: S.profile, gp: S.gp, keepDelays: true };
  const R = { fixed: [], selfish: [], nash: [] }, SER = { fixed: [], selfish: [], nash: [] };
  const total = nSeeds * 3; let done = 0; const t0 = performance.now();
  for (let k = 0; k < nSeeds; k++) {
    for (const c of CTRLS) {
      const sim = makeSim(opts, c, 1000 + k * 101);
      for (let s = 0; s < steps; s++) {
        sim.step();
        if (s % 1500 === 1499) { $('benchBar').style.width = ((done + s / steps) / total * 100).toFixed(1) + '%'; $('benchStatus').textContent = 'Running seed ' + (k + 1) + ' of ' + nSeeds + ', ' + CNAME[c] + '\u2026'; await new Promise(r => setTimeout(r, 0)); }
      }
      const m = sim.metrics(); m.p95 = pctile(sim.allDelays(), 95);
      R[c].push(m); SER[c].push(sim.series.map(p => p.q)); done++;
    }
  }
  $('benchBar').style.width = '100%';
  $('benchStatus').textContent = 'Done in ' + ((performance.now() - t0) / 1000).toFixed(1) + ' s.';
  const meanSeries = c => { const L = Math.min(...SER[c].map(a => a.length)); const out = []; for (let i = 0; i < L; i++) out.push({ x: (i + 1) * 5 / 60, y: mean(SER[c].map(a => a[i])) }); return out; };
  S.bench = { R, dur, nSeeds, scen: scenarioText(), series: CTRLS.map(c => ({ name: CNAME[c], color: c, pts: meanSeries(c) })) };
  renderBench(); btn.disabled = false;
}
function renderBench() {
  const B = S.bench; if (!B) return; $('benchOut').hidden = false;
  const R = B.R, col = (c, f) => R[c].map(f);
  const rows = [
    ['Average delay (s per vehicle)', m => m.delay, 'low', 1],
    ['95th percentile delay (s)', m => m.p95, 'low', 1],
    ['Average vehicles stopped', m => m.avgQ, 'low', 1],
    ['Stops per trip', m => m.stops, 'low', 2],
    ['Throughput (trips per minute)', m => m.thr, 'high', 1],
    ['Signal switches per junction per hour', m => m.sw / (S.n * S.n) / (B.dur / 3600), 'info', 0]
  ];
  let t = '<thead><tr><th>Metric</th>' + CTRLS.map(c => '<th style="color:' + ccol(c) + '">' + CNAME[c] + '</th>').join('') + '<th>Nash vs fixed</th><th>Nash vs selfish</th></tr></thead><tbody>';
  const cmp = (f, a, b, dir) => {
    const x = col(a, f), y = col(b, f), tt = pairedT(x, y), ch = pct(mean(x), mean(y));
    const better = dir === 'low' ? ch < 0 : ch > 0, sig = tt.p < 0.05 && dir !== 'info';
    return '<span class="' + (sig ? (better ? 'good' : 'bad') : '') + '">' + sgn(ch, 1) + '%</span> <span class="hint">p=' + (isNaN(tt.p) ? 'n/a' : (tt.p < 0.001 ? '<0.001' : tt.p.toFixed(3))) + '</span>';
  };
  for (const [name, f, dir, dp] of rows) {
    const means = CTRLS.map(c => mean(col(c, f)));
    const best = dir === 'info' ? NaN : (dir === 'low' ? Math.min(...means) : Math.max(...means));
    t += '<tr><td>' + name + '</td>' + CTRLS.map((c, i) => '<td class="' + (means[i] === best ? 'win' : '') + '">' + means[i].toFixed(dp) + ' <span class="hint">\u00b1 ' + sd(col(c, f)).toFixed(dp) + '</span></td>').join('') + '<td>' + cmp(f, 'nash', 'fixed', dir) + '</td><td>' + cmp(f, 'nash', 'selfish', dir) + '</td></tr>';
  }
  $('benchTable').innerHTML = t + '</tbody>';
  // summary
  const dN = col('nash', m => m.delay), dF = col('fixed', m => m.delay), dS = col('selfish', m => m.delay);
  const tF = pairedT(dN, dF), tS = pairedT(dN, dS), cF = pct(mean(dN), mean(dF)), cS = pct(mean(dN), mean(dS)), sS = pct(mean(dS), mean(dF)), tSF = pairedT(dS, dF);
  const P = p => p < 0.001 ? 'p < 0.001' : 'p = ' + p.toFixed(3);
  const verb = c => c <= 0 ? 'lowered' : 'raised';
  let s = '<p>Scenario: ' + B.scen + '. ' + B.nSeeds + ' seeds, ' + Math.round(B.dur / 60) + ' simulated minutes each, identical traffic for all controllers.</p>';
  s += '<p>The <b>Nash game controller ' + verb(cF) + ' average delay by ' + Math.abs(cF).toFixed(1) + '%</b> compared with the fixed timer (' + P(tF.p) + ', ' + (tF.p < 0.05 ? 'statistically significant' : 'not significant at the 5% level') + ').</p>';
  s += '<p>The selfish adaptive controller ' + verb(sS) + ' it by ' + Math.abs(sS).toFixed(1) + '% (' + P(tSF.p) + ')' + (sS < 0 && tSF.p < 0.05 ? ', so most of the gain comes from reacting to queues at all.' : '.') + '</p>';
  if (tS.p < 0.05 && cS < 0) s += '<p>Adding neighbour-aware payoffs (spillback and coordination) gave a further <b>' + Math.abs(cS).toFixed(1) + '%</b> reduction over the selfish version (' + P(tS.p) + ').</p>';
  else if (tS.p < 0.05 && cS > 0) s += '<p>In this scenario the neighbour-aware payoffs were <b>' + cS.toFixed(1) + '% worse</b> than the selfish version (' + P(tS.p) + '). Try a smaller \u03bb on the Game model tab.</p>';
  else s += '<p>The difference between Nash and selfish (' + sgn(cS, 1) + '%, ' + P(tS.p) + ') is <b>not statistically significant</b> here. Coordination terms matter most when links are nearly full, so try Heavy load or the 3\u00d73 grid.</p>';
  $('benchSummary').innerHTML = s;
  $('benchScenario').textContent = B.scen;
  drawBenchCharts();
  $('benchLegend').innerHTML = CTRLS.map(c => '<span class="pill"><i style="background:' + ccol(c) + '"></i>' + CNAME[c] + '</span>').join('');
}
function drawBenchCharts() {
  const B = S.bench; if (!B || $('benchOut').hidden) return;
  const R = B.R, mk = (f) => CTRLS.map(c => ({ label: CNAME[c], color: ccol(c), mean: mean(R[c].map(f)), sd: sd(R[c].map(f)) }));
  drawBars($('bb1'), 'Average delay (s)', mk(m => m.delay), 'lower is better');
  drawBars($('bb2'), '95th percentile delay (s)', mk(m => m.p95), 'lower is better');
  drawBars($('bb3'), 'Vehicles stopped', mk(m => m.avgQ), 'lower is better');
  drawBars($('bb4'), 'Throughput (trips/min)', mk(m => m.thr), 'higher is better');
  drawLines($('chartBench'), B.series.map(s => ({ color: ccol(s.color), pts: s.pts })), 'minutes \u00b7 vehicles stopped');
}

/* ---------- wiring ---------- */
function setSeg(id, attr, val) { document.querySelectorAll('#' + id + ' button').forEach(b => b.classList.toggle('on', b.dataset[attr] === String(val))); }
function setPlayIcon() {
  $('btnPlay').innerHTML = S.playing ? '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>' : '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
  $('btnPlay').setAttribute('aria-label', S.playing ? 'Pause simulation' : 'Play simulation');
}
function updateRateLabels() {
  $('outRate').textContent = S.rate + ' veh/min'; const b = S.bias;
  $('outBias').textContent = b === 0 ? 'balanced' : (b > 0 ? 'East\u2013West +' + b + '%' : 'North\u2013South +' + (-b) + '%');
}
function syncControls() {
  $('rngRate').value = S.rate; $('rngBias').value = S.bias; $('selProfile').value = S.profile; $('numSeed').value = S.seed;
  setSeg('segGrid', 'n', S.n); updateRateLabels(); $('benchScenario').textContent = scenarioText();
}
function showTab(t) {
  S.tab = t;
  for (const id of ['sim', 'game', 'bench', 'report']) { $('tab-' + id).hidden = id !== t; $('t-' + id).setAttribute('aria-selected', id === t ? 'true' : 'false'); }
  $('benchScenario').textContent = scenarioText();
  requestAnimationFrame(() => { drawAll(); });
}
function drawAll() {
  if (S.tab === 'sim') { drawMap(); drawLive(); }
  if (S.tab === 'bench') drawBenchCharts();
}
function refreshPanels() {
  if (S.tab === 'sim') { updateKPIs(); updateScore(); updateInspector(); drawLive(); }
  else if (S.tab === 'game') updateGame();
}
function init() {
  readColors();
  syncControls(); syncParams(); setPlayIcon(); newSims();
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $('btnPlay').addEventListener('click', () => { S.playing = !S.playing; setPlayIcon(); });
  $('btnReset').addEventListener('click', () => { S.seed = Math.max(1, Math.min(99999, parseInt($('numSeed').value, 10) || 42)); newSims(); refreshPanels(); if (S.tab === 'sim') drawMap(); });
  $('segSpeed').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.speed = +b.dataset.v; setSeg('segSpeed', 'v', S.speed); });
  $('segCtrl').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.ctrl = b.dataset.c; setSeg('segCtrl', 'c', S.ctrl); refreshPanels(); drawMap(); });
  $('segMetric').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.metric = b.dataset.m; setSeg('segMetric', 'm', S.metric); drawLive(); });
  $('segGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.n = +b.dataset.n; setSeg('segGrid', 'n', S.n); S.sel = 0; newSims(); syncControls(); refreshPanels(); drawMap(); });
  $('rngRate').addEventListener('input', e => { S.rate = +e.target.value; updateRateLabels(); applyLive(); $('benchScenario').textContent = scenarioText(); });
  $('rngBias').addEventListener('input', e => { S.bias = +e.target.value; updateRateLabels(); applyLive(); $('benchScenario').textContent = scenarioText(); });
  $('selProfile').addEventListener('change', e => { S.profile = e.target.value; applyLive(); $('benchScenario').textContent = scenarioText(); });
  $('presets').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const p = PRESETS[b.dataset.p];
    Object.assign(S, p); S.seed = Math.max(1, Math.min(99999, parseInt($('numSeed').value, 10) || 42));
    syncControls(); newSims(); refreshPanels(); drawMap();
  });
  const chipClick = e => { const b = e.target.closest('.chip'); if (b) selectJ(+b.dataset.i); };
  $('chips').addEventListener('click', chipClick); $('chips2').addEventListener('click', chipClick);
  $('selNbr').addEventListener('change', e => { S.nbr = +e.target.value; updateGame(); });
  $('sim').addEventListener('click', e => {
    const r = $('sim').getBoundingClientRect(), x = (e.clientX - r.left) / r.width * CFG.W, y = (e.clientY - r.top) / r.height * CFG.W;
    let best = -1, bd = 1e9; for (const I of S.sims.nash.inter) { const d = Math.hypot(I.x - x, I.y - y); if (d < bd) { bd = d; best = I.id; } }
    if (bd < 90) selectJ(best);
  });
  for (const [id, k] of [['gpOmega', 'omega'], ['gpSigma', 'sigma'], ['gpLam', 'lam'], ['gpKap', 'kap']])
    $(id).addEventListener('input', e => { S.gp[k] = +e.target.value; syncParams(); applyLive(); });
  $('btnGpReset').addEventListener('click', () => { S.gp = Object.assign({}, GP_DEFAULT); syncParams(); applyLive(); });
  $('btnBench').addEventListener('click', runBenchmark);
  $('btnTheme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark'; readColors(); drawAll();
  });
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); drawAll(); });
  if (window.ResizeObserver) new ResizeObserver(() => drawAll()).observe(document.body);
  let last = performance.now(), acc = 0, lastUI = 0;
  function frame(now) {
    const dtr = Math.min(0.1, (now - last) / 1000); last = now;
    if (S.playing && !document.hidden && (S.tab === 'sim' || S.tab === 'game')) {
      acc += dtr * S.speed; let k = 0;
      while (acc >= CFG.dt && k < 60) { for (const c of CTRLS) S.sims[c].step(); acc -= CFG.dt; k++; }
      if (k >= 60) acc = 0;
    }
    if (S.tab === 'sim') drawMap();
    if (now - lastUI > 250) { lastUI = now; refreshPanels(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  showTab('sim');
}
document.addEventListener('DOMContentLoaded', init);
