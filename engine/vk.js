/* vk.js — 引擎核心：一张 1920×1080 的 Canvas，每一帧都是 t 的纯函数。
 *
 *   VK.film({ dur, theme, draw(fr, t) })   →  window.seek(t) / window.END / window.SFX
 *
 * 画面分两层：底（bg：渐变、星点/尘埃、暗角）和光（L：一切内容）。
 * 出帧时 L 叠到底上，再把 L 模糊两遍用加法叠回去 —— 所有亮的东西自带辉光。
 * 没有任何状态跨帧保留：随机数全部按种子取，模拟全部按 t 重算，所以可以任意跳着 seek。
 */
(function (G) {
'use strict';
const W = 1920, H = 1080;

/* ---------- 时间与数学 ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));            // t 在 [a,b] 里走到哪了，0..1
const smooth = x => x * x * (3 - 2 * x);
const ss = (t, a, b) => smooth(seg(t, a, b));                 // 最常用：a→b 之间平滑地 0→1
const E = {
  lin: x => x,
  in2: x => x * x, out2: x => 1 - (1 - x) * (1 - x),
  in3: x => x * x * x, out3: x => 1 - Math.pow(1 - x, 3),
  io3: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  out5: x => 1 - Math.pow(1 - x, 5),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  outBack: (x, s = 1.4) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
};
/* 出现-停留-消失的包络：a 起经 fin 秒亮起，b 前 fout 秒暗下 */
const fade = (t, a, b, fin = .5, fout = .5) => Math.min(ss(t, a, a + fin), 1 - ss(t, b - fout, b));
/* 确定的随机 */
const hash = n => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rng = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const noise1 = x => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)) * 2 - 1; };

/* ---------- 颜色 ---------- */
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const rgba = (c, a = 1) => { if (Array.isArray(c)) return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; if (c[0] !== '#') return c; const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };
const mix = (c1, c2, k) => { const a = hex(c1), b = hex(c2); return '#' + [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], k)).toString(16).padStart(2, '0')).join(''); };

/* ---------- 字体键 ---------- */
const FONTS = {
  serif:  ['700', '"VK Serif"'],  serifm: ['500', '"VK Serif"'], serifr: ['400', '"VK Serif"'],
  serifl: ['300', '"VK Serif"'],  serifx: ['200', '"VK Serif"'], serifh: ['900', '"VK Serif"'],
  sans:   ['700', '"VK Sans"'],   sansm:  ['500', '"VK Sans"'],  sansr:  ['400', '"VK Sans"'], sansh: ['900', '"VK Sans"'],
  latin:  ['400', '"VK Latin","VK Serif"'], latinl: ['300', '"VK Latin","VK Serif"'], latinm: ['600', '"VK Latin","VK Serif"'],
  latini: ['italic 400', '"VK Latin","VK Serif"'], latinim: ['italic 500', '"VK Latin","VK Serif"'],
  lora:   ['italic 400', '"VK Lora","VK Serif"'],  lorar: ['400', '"VK Lora","VK Serif"'],
  mono:   ['400', '"VK Mono","VK Sans"'], type: ['400', '"VK Type","VK Mono"'],
};
const fontOf = (key, size) => { const f = FONTS[key] || FONTS.serif; return `${f[0]} ${size}px ${f[1]}`; };

/* ---------- 一帧 ---------- */
class Frame {
  constructor(film) { this.film = film; this.c = film.L; this.x = film.L.getContext('2d'); this.w = W; this.h = H; this.t = 0; }

  /* 在一个变换/透明度/混合/模糊的包裹里画一组东西 */
  g(o, fn) {
    const x = this.x; x.save();
    if (o.a != null) x.globalAlpha *= clamp(o.a);
    if (o.add) x.globalCompositeOperation = 'lighter';
    if (o.blend) x.globalCompositeOperation = o.blend;
    if (o.at) x.translate(o.at[0], o.at[1]);
    if (o.rot) x.rotate(o.rot);
    if (o.s != null) { const s = Array.isArray(o.s) ? o.s : [o.s, o.s]; x.scale(s[0], s[1]); }
    if (o.blur) x.filter = `blur(${o.blur}px)`;
    if (o.clip) { x.beginPath(); x.rect(...o.clip); x.clip(); }
    fn(); x.restore();
  }
  /* 先画到一张临时画布，再整体合成：一组东西一起淡入、一起虚、一起缩放时用 */
  layer(o, fn) {
    const f = this.film, S = f.tmp(), sx = S.getContext('2d'), keep = this.x;
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, W, H);
    this.x = sx; fn(); this.x = keep;
    const x = this.x; x.save();
    x.globalAlpha *= clamp(o.a == null ? 1 : o.a);
    if (o.add) x.globalCompositeOperation = 'lighter';
    if (o.blur) x.filter = `blur(${o.blur}px)`;
    if (o.s != null || o.at || o.rot) {
      const cx = o.cx == null ? W / 2 : o.cx, cy = o.cy == null ? H / 2 : o.cy;
      x.translate(cx + (o.at ? o.at[0] : 0), cy + (o.at ? o.at[1] : 0));
      if (o.rot) x.rotate(o.rot);
      if (o.s != null) x.scale(o.s, o.s);
      x.translate(-cx, -cy);
    }
    x.drawImage(S, 0, 0); x.restore(); f.untmp(S);
  }

  /* --- 光 --- */
  glow(px, py, r, color = '#fff', a = 1) {
    if (a <= 0 || r <= 0) return; const x = this.x; x.save(); x.globalCompositeOperation = 'lighter';
    const gr = x.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, rgba(color, a)); gr.addColorStop(.25, rgba(color, a * .55)); gr.addColorStop(.6, rgba(color, a * .12)); gr.addColorStop(1, rgba(color, 0));
    x.fillStyle = gr; x.fillRect(px - r, py - r, r * 2, r * 2); x.restore();
  }
  /* 光点 = 小白核 + 大色晕（两层叠加，参考片就是这么画的） */
  spark(px, py, r, color = '#F8D893', a = 1) { this.glow(px, py, r * 4.2, color, a * .34); this.glow(px, py, r * 1.6, color, a * .8); this.glow(px, py, r * .8, '#ffffff', a); }
  /* 带彗尾的光点：沿 ang 方向运动，尾巴拖在身后 */
  comet(px, py, len, r, color = '#DCEBFF', a = 1, ang = 0) {
    const x = this.x; x.save(); x.globalCompositeOperation = 'lighter'; x.translate(px, py); x.rotate(ang);
    const gr = x.createLinearGradient(-len, 0, 0, 0); gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(.7, rgba(color, a * .35)); gr.addColorStop(1, rgba('#ffffff', a));
    x.strokeStyle = gr; x.lineWidth = r * .62; x.lineCap = 'round'; x.beginPath(); x.moveTo(-len, 0); x.lineTo(0, 0); x.stroke(); x.restore();
    this.spark(px, py, r, color, a);
  }
  flash(a, color = '#F2E2B8') { if (a <= 0) return; const x = this.x; x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = rgba(color, a); x.fillRect(0, 0, W, H); x.restore(); }

  /* --- 线与形 --- */
  _stroke(o) { const x = this.x; x.lineWidth = o.w == null ? 2 : o.w; x.strokeStyle = rgba(o.color || '#fff', o.a == null ? 1 : o.a); x.lineCap = o.cap || 'round'; x.lineJoin = 'round'; x.setLineDash(o.dash || []); if (o.dashOff) x.lineDashOffset = o.dashOff; if (o.glow) { x.shadowColor = rgba(o.glowColor || o.color || '#fff', o.glowA == null ? .9 : o.glowA); x.shadowBlur = o.glow; } x.stroke(); }
  _fill(o) { const x = this.x; x.fillStyle = typeof o.fill === 'string' ? rgba(o.fill, o.fa == null ? (o.a == null ? 1 : o.a) : o.fa) : o.fill; if (o.glow && !o.stroke) { x.shadowColor = rgba(o.glowColor || o.fill, .9); x.shadowBlur = o.glow; } x.fill(); }
  _paint(o) { const x = this.x; if (o.fill) { x.save(); this._fill(o); x.restore(); } if (o.color || o.stroke) { x.save(); this._stroke(Object.assign({}, o, { color: o.color || o.stroke })); x.restore(); } }
  line(x1, y1, x2, y2, o = {}) { const x = this.x; x.save(); if (o.add) x.globalCompositeOperation = 'lighter'; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); this._stroke(o); x.restore(); }
  /* pts: [[x,y],...]；o.k 只画前 k（0..1）这么长 —— 线条"长出来"就靠它 */
  poly(pts, o = {}) {
    if (pts.length < 2) return; const x = this.x; x.save(); if (o.add) x.globalCompositeOperation = 'lighter';
    let n = pts.length; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    if (o.k != null && o.k < 1) {
      const f = clamp(o.k) * (n - 1), i = Math.floor(f), r = f - i;
      for (let j = 1; j <= i; j++) x.lineTo(pts[j][0], pts[j][1]);
      if (i < n - 1) x.lineTo(lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r));
    } else { for (let j = 1; j < n; j++) x.lineTo(pts[j][0], pts[j][1]); if (o.close) x.closePath(); }
    this._paint(o); x.restore();
  }
  /* 沿 poly 走到 k 处的坐标与切向 —— 给线头安一个光点用 */
  along(pts, k) { const f = clamp(k) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i; return [lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r), Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])]; }
  /* SVG 路径字符串 */
  path(d, o = {}) { const x = this.x; x.save(); if (o.add) x.globalCompositeOperation = 'lighter'; if (o.at) x.translate(o.at[0], o.at[1]); if (o.rot) x.rotate(o.rot); if (o.s != null) x.scale(o.s, o.s); const p = new Path2D(d); if (o.fill) { x.fillStyle = typeof o.fill === 'string' ? rgba(o.fill, o.a == null ? 1 : o.a) : o.fill; x.fill(p); } if (o.color) { x.lineWidth = o.w == null ? 2 : o.w; x.strokeStyle = rgba(o.color, o.a == null ? 1 : o.a); x.lineJoin = 'round'; x.lineCap = 'round'; if (o.glow) { x.shadowColor = rgba(o.color, .9); x.shadowBlur = o.glow; } x.stroke(p); } x.restore(); }
  circle(cx, cy, r, o = {}) { this.ellipse(cx, cy, r, r, o); }
  ellipse(cx, cy, rx, ry, o = {}) { if (rx <= 0 || ry <= 0) return; const x = this.x; x.save(); if (o.add) x.globalCompositeOperation = 'lighter'; x.beginPath(); x.ellipse(cx, cy, rx, ry, o.rot || 0, o.a0 == null ? 0 : o.a0, o.a1 == null ? Math.PI * 2 : o.a1); this._paint(o); x.restore(); }
  arc(cx, cy, r, a0, a1, o = {}) { this.ellipse(cx, cy, r, r, Object.assign({}, o, { a0, a1 })); }
  rect(px, py, w, h, o = {}) { const x = this.x; x.save(); if (o.add) x.globalCompositeOperation = 'lighter'; x.beginPath(); if (o.r) x.roundRect(px, py, w, h, o.r); else x.rect(px, py, w, h); this._paint(o); x.restore(); }
  grad(x0, y0, x1, y1, stops) { const g = this.x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([k, c, a]) => g.addColorStop(k, rgba(c, a == null ? 1 : a))); return g; }
  rgrad(cx, cy, r0, r1, stops) { const g = this.x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(([k, c, a]) => g.addColorStop(k, rgba(c, a == null ? 1 : a))); return g; }

  /* --- 字 ---
   * o: font 键, size, color, a, track(px), align('c'|'l'|'r'), base, glow(px), blur(px), grad([[k,色],...] 竖向渐变) */
  _font(o) { const x = this.x; x.font = fontOf(o.font || 'serif', o.size || 48); x.letterSpacing = (o.track || 0) + 'px'; x.textBaseline = o.base || 'middle'; x.fontKerning = 'normal'; }
  measure(str, o = {}) { const x = this.x; x.save(); this._font(o); const w = x.measureText(str).width - (o.track || 0); x.restore(); return w; }
  text(str, px, py, o = {}) {
    const a = o.a == null ? 1 : o.a; if (a <= 0 || !str) return 0; const x = this.x; x.save(); this._font(o);
    const w = x.measureText(str).width - (o.track || 0), al = o.align || 'c';
    const lx = al === 'c' ? px - w / 2 : al === 'r' ? px - w : px;
    x.textAlign = 'left'; x.globalAlpha *= clamp(a); if (o.add) x.globalCompositeOperation = 'lighter';
    if (o.blur) x.filter = `blur(${o.blur}px)`;
    if (o.glow) { x.shadowColor = rgba(o.glowColor || o.color || '#fff', o.glowA == null ? .85 : o.glowA); x.shadowBlur = o.glow; }
    if (o.shadow) { x.shadowColor = rgba('#000', o.shadow); x.shadowBlur = o.shadowBlur || 14; x.shadowOffsetY = o.shadowY || 2; }
    const s = o.size || 48;
    x.fillStyle = o.grad ? this.grad(0, py - s * .52, 0, py + s * .52, o.grad) : rgba(o.color || '#fff', 1);
    x.fillText(str, lx, py);
    if (o.stroke) { x.shadowBlur = 0; x.lineWidth = o.strokeW || 1; x.strokeStyle = rgba(o.stroke, 1); x.strokeText(str, lx, py); }
    x.restore(); return w;
  }
  /* 逐字排布：返回每个字的中心 x 与宽，供逐字显影 / 打字 / 高亮用 */
  layout(str, px, o = {}) {
    const x = this.x; x.save(); this._font(Object.assign({}, o, { track: 0 })); const tr = o.track || 0, cs = Array.from(str);
    const ws = cs.map(ch => x.measureText(ch).width); x.restore();
    const total = ws.reduce((a, b) => a + b, 0) + tr * (cs.length - 1), al = o.align || 'c';
    let cur = al === 'c' ? px - total / 2 : al === 'r' ? px - total : px; const out = [];
    cs.forEach((ch, i) => { out.push({ ch, x: cur, w: ws[i], cx: cur + ws[i] / 2, i }); cur += ws[i] + tr; });
    out.w = total; return out;
  }
  /* 逐字画：per(i, 字) 返回 {a, blur, dy, color, glow, s}；不返回就按 o 画 */
  chars(str, px, py, o, per) {
    const lay = this.layout(str, px, o), x = this.x;
    lay.forEach(c => {
      const p = (per && per(c.i, c)) || {}; const a = (p.a == null ? 1 : p.a) * (o.a == null ? 1 : o.a); if (a <= 0.003) return;
      x.save(); this._font(Object.assign({}, o, { track: 0 })); x.textAlign = 'left'; x.globalAlpha *= clamp(a);
      if (p.blur) x.filter = `blur(${p.blur}px)`;
      const col = p.color || o.color || '#fff'; const gl = p.glow == null ? o.glow : p.glow;
      if (gl) { x.shadowColor = rgba(p.glowColor || col, o.glowA == null ? .85 : o.glowA); x.shadowBlur = gl; }
      else if (o.shadow) { x.shadowColor = rgba('#000', o.shadow); x.shadowBlur = o.shadowBlur || 14; x.shadowOffsetY = o.shadowY || 2; }
      const s = o.size || 48; x.fillStyle = (o.grad && !p.color) ? this.grad(0, py - s * .52, 0, py + s * .52, o.grad) : rgba(col, 1);
      if (p.s != null && p.s !== 1) { x.translate(c.cx, py); x.scale(p.s, p.s); x.translate(-c.cx, -py); }
      x.fillText(c.ch, c.x, py + (p.dy || 0)); x.restore();
    });
    return lay;
  }
}

/* ---------- 底：三套世界 ---------- */
const BG = {
  /* A 鎏金暗场：o.warm 0..1（1 = 暖棕，0 = 冷蓝黑）；o.floor 地面暖光 0..1；o.pool 上方光池 0..1 */
  gilt(x, t, o = {}) {
    const warm = o.warm == null ? 1 : o.warm, base = mix('#030306', '#070401', warm), mid = mix('#10131C', '#271B10', warm);
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    let g = x.createRadialGradient(W * .5, H * (o.cy == null ? .34 : o.cy), 0, W * .5, H * .34, W * .62);
    g.addColorStop(0, rgba(mid, .95 * (o.pool == null ? 1 : o.pool))); g.addColorStop(.55, rgba(mid, .3)); g.addColorStop(1, rgba(mid, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const fl = o.floor || 0;
    if (fl > 0) { g = x.createRadialGradient(W * .5, H * 1.02, 0, W * .5, H * 1.02, W * .55); g.addColorStop(0, rgba('#4A2710', .85 * fl)); g.addColorStop(.5, rgba('#2A1609', .5 * fl)); g.addColorStop(1, rgba('#2A1609', 0)); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    const hz = o.horizon || 0;   // 桌面：一条极淡的地平线，下半略亮
    if (hz > 0) { g = x.createLinearGradient(0, H * .705, 0, H); g.addColorStop(0, rgba('#2B241A', .5 * hz)); g.addColorStop(.04, rgba('#1D1810', .42 * hz)); g.addColorStop(1, rgba('#0A0806', .2 * hz)); x.fillStyle = g; x.fillRect(0, H * .705, W, H * .295); }
    dust(x, t, 46, o.dustColor || mix('#C9D2E4', '#E9D5AE', warm), o.dust == null ? 1 : o.dust);
    vignette(x, .62);
  },
  /* C 夜空：o.core 中央那团深蓝 0..1；o.stars 星点密度 0..1；o.tint 整体染色 */
  night(x, t, o = {}) {
    x.fillStyle = '#010104'; x.fillRect(0, 0, W, H);
    const g = x.createRadialGradient(W * .5, H * .46, 0, W * .5, H * .46, W * .6), c = o.tint || '#0B1830', k = o.core == null ? 1 : o.core;
    g.addColorStop(0, rgba(c, .62 * k)); g.addColorStop(.5, rgba(c, .22 * k)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, W, H);
    stars(x, t, 420, o.stars == null ? 1 : o.stars);
    vignette(x, .5);
  },
  /* B 扁平插画：场景自己画底，这里只给一张干净的底色 */
  flat(x, t, o = {}) { x.fillStyle = o.color || '#0C0705'; x.fillRect(0, 0, W, H); },
};
function vignette(x, k) { const g = x.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
/* 失焦的尘埃：慢慢漂，大小不一，越大越虚 */
function dust(x, t, n, color, k) {
  if (k <= 0) return; x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const r0 = hash(i * 3.1 + 7), big = r0 > .82, r = big ? 9 + hash(i + 40) * 9 : 2 + hash(i + 40) * 3.5;
    const sp = 6 + hash(i + 90) * 16, dir = hash(i + 5) * Math.PI * 2;
    const px = ((hash(i + 11) * W + Math.cos(dir) * sp * t + Math.sin(t * .23 + i) * 14) % W + W) % W;
    const py = ((hash(i + 23) * H + Math.sin(dir) * sp * t * .6 - t * 3 + Math.cos(t * .19 + i * 2) * 10) % H + H) % H;
    const a = (big ? .05 : .13) * (.55 + .45 * Math.sin(t * (.4 + hash(i + 60)) + i * 1.7)) * k;
    const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(.5, rgba(color, a * .5)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  x.restore();
}
function stars(x, t, n, k) {
  if (k <= 0) return; x.save(); x.globalCompositeOperation = 'lighter';
  const m = Math.round(n * Math.min(1.6, k));
  for (let i = 0; i < m; i++) {
    const px = hash(i * 1.37 + 3) * W, py = hash(i * 2.11 + 9) * H, s = hash(i + 77);
    const a = (.10 + .42 * s * s) * (.75 + .25 * Math.sin(t * (.6 + s * 1.4) + i)) * Math.min(1, k);
    const r = s > .93 ? 1.5 : s > .6 ? 1.0 : .7;
    x.fillStyle = rgba(s > .8 ? '#CFE0FF' : '#9FB0C8', a); x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill();
  }
  x.restore();
}

/* ---------- 影片 ---------- */
function film(spec) {
  const cv = document.getElementById('stage'); cv.width = W; cv.height = H;
  const out = cv.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const pool = [];
  const F = { L: mk(), tmp: () => pool.pop() || mk(), untmp: c => pool.push(c), spec };
  const small = document.createElement('canvas'); small.width = W / 4; small.height = H / 4; const sx = small.getContext('2d');
  /* 胶片颗粒：几张预生成的噪声，按帧号轮换 */
  const grains = []; { const r = rng(20261006); for (let k = 0; k < 6; k++) { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const gx = c.getContext('2d'), im = gx.createImageData(480, 270); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - .5) * 2 * 110; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gx.putImageData(im, 0, 0); grains.push(c); } }
  const fr = new Frame(F); F.fr = fr;
  const fps = spec.fps || 30;
  const SFX = [];           // 音效登记：scene 里 fr.sfx(时刻, 名字, 参数) —— 只在导出事件表时收集
  let collecting = false;
  fr.sfx = (t, name, p) => { if (collecting) SFX.push([+t.toFixed(3), name, p || {}]); };
  fr.theme = spec.theme || 'night';

  function seek(t) {
    t = Math.max(0, Math.min(spec.dur, t)); fr.t = t; fr.frame = Math.round(t * fps);
    const L = F.L, lx = L.getContext('2d'); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, W, H); fr.x = lx;
    const look = { bg: fr.theme, bgo: {}, bloom: spec.bloom == null ? ({ gilt: .34, flat: .12 }[fr.theme] || 1) : spec.bloom, grain: spec.grain == null ? .05 : spec.grain, post: null };   // 辉光：夜空全开，鎏金三成（实物不能发白），插画基本不要
    fr.look = look;
    spec.draw(fr, t);                                   // 场景可以改 fr.look（换底、调辉光）
    out.setTransform(1, 0, 0, 1, 0, 0); out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.filter = 'none';
    (BG[look.bg] || BG.night)(out, t, look.bgo);
    if (look.under) look.under(out, t);                 // 需要画在内容之下、底之上的东西（整幅插画背景）
    out.drawImage(L, 0, 0);
    if (look.bloom > 0) {                               // 辉光：缩小→模糊→加法叠回，两档半径
      sx.setTransform(1, 0, 0, 1, 0, 0); sx.clearRect(0, 0, W / 4, H / 4); sx.filter = 'blur(3px)'; sx.drawImage(L, 0, 0, W / 4, H / 4); sx.filter = 'none';
      out.globalCompositeOperation = 'lighter'; out.globalAlpha = .42 * look.bloom; out.drawImage(small, 0, 0, W, H);
      sx.clearRect(0, 0, W / 4, H / 4); sx.filter = 'blur(11px)'; sx.drawImage(L, 0, 0, W / 4, H / 4); sx.filter = 'none';
      out.globalAlpha = .34 * look.bloom; out.drawImage(small, 0, 0, W, H);
      out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1;
    }
    if (look.post) look.post(out, t);                   // 全幅后期：闪白、染色、色差
    if (look.grain > 0) { out.globalCompositeOperation = 'overlay'; out.globalAlpha = look.grain; out.imageSmoothingEnabled = true; out.drawImage(grains[fr.frame % grains.length], 0, 0, W, H); out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; }
  }
  /* 音效事件表：把全片每帧过一遍，只收集、不出图 */
  function events() { SFX.length = 0; collecting = true; const keep = F.L; for (let i = 0; i <= spec.dur * fps; i++) { fr.t = i / fps; fr.frame = i; fr.x = keep.getContext('2d'); fr.look = { bgo: {} }; try { spec.draw(fr, i / fps); } catch (e) { } } collecting = false; const seen = new Set(), uniq = []; SFX.forEach(e => { const k = e[0] + e[1]; if (!seen.has(k)) { seen.add(k); uniq.push(e); } }); uniq.sort((a, b) => a[0] - b[0]); return uniq; }

  G.seek = seek; G.END = spec.dur; G.FPS = fps; G.events = events; G.META = spec.meta || {};
  document.fonts.ready.then(() => Promise.all(Object.values(FONTS).map(f => document.fonts.load(`${f[0]} 40px ${f[1].split(',')[0]}`, '运A1')))).then(() => { G.READY = true; seek(+(new URLSearchParams(location.search).get('t') || 0)); });
  /* 预览：?play 实时播，←/→ 步进 */
  if (new URLSearchParams(location.search).has('play')) { let t0 = performance.now(); const loop = () => { seek(((performance.now() - t0) / 1000) % spec.dur); requestAnimationFrame(loop); }; document.fonts.ready.then(() => requestAnimationFrame(loop)); }
  return F;
}

/* 一段戏：在 [a,b] 内才画，带进出包络；fn(本地时间 lt, 包络 k) */
function scene(fr, t, a, b, fn, fin = .6, fout = .6) { if (t < a - .001 || t > b + .001) return; const k = fade(t, a, b, fin, fout); if (k <= 0) return; fr.g({ a: k }, () => fn(t - a, k)); }

G.VK = { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, noise1, hex, rgba, mix, film, scene, BG, FONTS, fontOf, vignette };
})(window);
