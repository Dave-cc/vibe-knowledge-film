/* 《折叠》序 + 01 形 · 33 秒。分镜表见同目录 storyboard.md。
 * 同一个世界、一台摄影机：血管里的红细胞 → 细胞里的血红蛋白 → 一串珠子（β 链）。镜头只做推近和拉远。
 *
 * 事实（2026-10-06 联网核对）：
 *   β 珠蛋白成熟链 146 个氨基酸，开头是 V H L T P E E K S A V T；
 *   镰状细胞突变 = 第 6 位谷氨酸 → 缬氨酸（V. M. Ingram, Nature 180:326, 1957）；
 *   缬氨酸怕水。放下氧气以后，它卡进相邻分子表面的疏水口袋，一个接一个聚成纤维，把红细胞顶成镰刀；
 *   "分子病"出自 L. Pauling 等, Science 110:543, 1949；一个红细胞约含 2.7 亿个血红蛋白分子。
 * 示意：真实的血红蛋白由 4 条链组成，这里只画一条；一团里的珠子是平铺的（位置由 gen_blob.py 算出）；
 *   分子和细胞的大小比例压缩过（RHO）。 */
(function () {
'use strict';
const { clamp, lerp, seg, smooth, ss, E, hash, rng, rgba, mix } = VK;
const K = VKit, P = K.PAL.night, F = window.FOLD;

const T = { push: 2.0, count: 3.7, close: 5.0, flip: 6.5, out1: 8.3, bend: 10.3, in2: 15.2, fold: 16.2, o2: 18.0, off: 19.5, sticky: 20.7, row: 23.0, out2: 26.2, rods: 27.3, end: 33 };
const SUBS = [
  { a: .6,   b: 4.9,  zh: '你的血里，有一串 146 颗的珠子。', en: 'In your blood there is a string of 146 beads.' },
  { a: 5.3,  b: 8.1,  zh: '只换错第 6 颗——', en: 'Change just the sixth —' },
  { a: 8.6,  b: 12.4, zh: '圆圆的红细胞，就弯成了{!镰刀}。', en: 'and a round red cell bends into a sickle.' },
  { a: 12.8, b: 15.0, zh: '一颗珠子，凭什么？', en: 'One bead. How?' },
  { a: 15.6, b: 19.2, zh: '这串珠子，会自己折成一团，去抓{氧气}。', en: 'The string folds itself into a ball, to carry oxygen.' },
  { a: 19.6, b: 22.8, zh: '错的那颗，正好落在表面，成了一个{!黏点}。', en: 'The wrong bead ends up on the surface: a sticky spot.' },
  { a: 23.3, b: 26.0, zh: '一个粘一个，连成了长杆。', en: 'One sticks to the next. They grow into rods.' },
  { a: 26.4, b: 29.1, zh: '长杆从里面，把细胞顶成了镰刀。', en: 'From inside, the rods push the cell into a sickle.' },
  { a: 29.5, b: 32.3, zh: '一颗珠子，改掉了一个细胞的形状。', en: 'One bead changed the shape of a whole cell.' },
];
const MARKS = [{ t: .4, no: '00', zh: '序', en: 'PROLOGUE' }, { t: T.in2, no: '01', zh: '形', en: 'SHAPE' }];
const ROSE = '#FF4F7E', INK2 = '#AEB8C2';
const fadeOut = t => 1 - ss(t, 32.3, 32.9);

/* ---------- 摄影机：缩放在对数空间里走，焦点跟着"镜头高度"走 ---------- */
const RHO = 66, C0 = [960, 450], N = 146, SEQ = 'VHLTPEEKSAVT', B6 = [-354, -84], RB = 14;      // RB：珠子半径（珠子层单位，珠距 31.5）
const CAM = [[0, 1 / RHO, 0, 0], [T.push, 1 / RHO, 0, 0], [3.6, 1.43, 0, 0], [T.close, 1.43, 0, 0], [5.9, 2.3, B6[0], B6[1]], [T.out1, 2.3, B6[0], B6[1]],
  [9.9, 1 / RHO, 0, 0], [T.in2, 1 / RHO, 0, 0], [T.fold, 1.43, 0, 0], [T.fold + .5, 1.43, 0, 0], [T.fold + 1.7, 1.25, 0, 0], [19.4, 1.25, 0, 0], [20.2, 1.45, 90, 0], [T.row, 1.45, 90, 0],
  [23.7, .5, 0, 0], [T.out2, .5, 0, 0], [27.4, 1 / RHO, 0, 0], [T.end, 1 / RHO, 0, 0]];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], k = E.io3(seg(t, a[0], b[0])), s = Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), k));
  const ia = 1 / a[1], ib = 1 / b[1], w = Math.abs(ib - ia) < 1e-9 ? k : (1 / s - ia) / (ib - ia);
  return { s, sc: s * RHO, fx: lerp(a[2], b[2], w), fy: lerp(a[3], b[3], w) };
}
const toS = (c, x, y) => [C0[0] + (x - c.fx) * c.s, C0[1] + (y - c.fy) * c.s];      // 珠子层坐标 → 屏幕

/* ---------- 一颗有光泽的珠子（x 是 canvas 上下文） ---------- */
function ball(x, px, py, r, col, a = 1) {
  if (r < .5 || a <= .004) return;
  x.save(); x.globalAlpha *= clamp(a);
  if (r < 6.5) x.fillStyle = col;
  else {
    const g = x.createRadialGradient(px - r * .34, py - r * .38, r * .04, px, py, r * 1.04);
    g.addColorStop(0, mix(col, '#FFFFFF', .9)); g.addColorStop(.2, mix(col, '#FFFFFF', .3)); g.addColorStop(.62, col); g.addColorStop(1, mix(col, '#020510', .7));
    x.fillStyle = g;
  }
  x.beginPath(); x.arc(px, py, r, 0, 6.2832); x.fill(); x.restore();
}
const COL = Array.from({ length: N }, (_, i) => mix('#58B2CF', '#A6E2F2', hash(i * 7.3 + 1)));

/* ---------- 珠串：没折的样子（蛇形三行）和折好的样子（layout.js） ---------- */
const SERP = (() => {
  const x0 = -527.5, x1 = 527.5, r = 38, ys = [-114, -38, 38, 114], dn = [];
  ys.forEach((y, n) => {
    if (n % 2 === 0) for (let x = x0; x <= x1; x += 2) dn.push([x, y]); else for (let x = x1; x >= x0; x -= 2) dn.push([x, y]);
    if (n < ys.length - 1) for (let a = -Math.PI / 2; a <= Math.PI / 2; a += .02) dn.push([(n % 2 ? x0 - r * Math.cos(a) : x1 + r * Math.cos(a)), y + r + r * Math.sin(a)]);
  });
  const cum = [0]; for (let i = 1; i < dn.length; i++) cum.push(cum[i - 1] + Math.hypot(dn[i][0] - dn[i - 1][0], dn[i][1] - dn[i - 1][1]));
  const L = cum[cum.length - 1], out = []; let j = 0;
  for (let i = 0; i < N; i++) { const d = L * i / (N - 1); while (j < dn.length - 2 && cum[j + 1] < d) j++; const u = (d - cum[j]) / (cum[j + 1] - cum[j] || 1); out.push([lerp(dn[j][0], dn[j + 1][0], u), lerp(dn[j][1], dn[j + 1][1], u)]); }
  return out;
})();
const ROWOF = SERP.map(p => p[1] < -76 ? 0 : p[1] < 0 ? 1 : p[1] < 76 ? 2 : 3);
const foldK = (i, t) => E.io3(seg(t, T.fold + .5 + .6 * i / 145, T.fold + 1.5 + .6 * i / 145));
function beadPos(i, t) {
  const k = foldK(i, t), a = SERP[i], b = F.pts[i]; if (k <= 0) return a; if (k >= 1) return b;
  const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), th = .85 * Math.sin(Math.PI * k), c = Math.cos(th), s = Math.sin(th);      // 路上绕着中心旋一下
  return [x * c - y * s, x * s + y * c];
}
/* 折好以后是一个"球"：越靠边的珠子越暗 */
const SHADE = F.pts.map(p => .5 * Math.pow(Math.hypot(p[0], p[1]) / F.R, 2.2)), COLD = COL.map((c, i) => mix(c, '#03101C', SHADE[i]));
function backing(x, c, ox, oy, a) {                        // 一团背后的淡圆：让它是"一个东西"
  const o = toS(c, ox, oy), rr = (F.R + 26) * c.s, g = x.createRadialGradient(o[0], o[1], 0, o[0], o[1], rr);
  g.addColorStop(0, rgba('#9FD8E8', .13 * a)); g.addColorStop(.82, rgba('#9FD8E8', .09 * a)); g.addColorStop(1, rgba('#9FD8E8', 0));
  x.fillStyle = g; x.beginPath(); x.arc(o[0], o[1], rr, 0, 6.2832); x.fill();
}
function heme(x, c, ox, oy, a, bound = 0) {                // 中间那个小窝里的血红素
  const o = toS(c, ox + F.cavity[0], oy + F.cavity[1]), rr = 17 * c.s; if (rr < 2.2) return;
  x.save(); x.globalAlpha *= a; x.fillStyle = mix('#4A0A14', '#FF6A55', .55 * bound); x.beginPath(); x.arc(o[0], o[1], rr, 0, 6.2832); x.fill();
  x.lineWidth = Math.max(1, 3 * c.s); x.strokeStyle = mix('#C23650', '#FFB3A6', bound); x.stroke(); x.restore();
}

/* 主角那一串：数珠子、换错第 6 颗、自己折成一团、放下氧气以后鼓出一个黏点 */
function hero(fr, c, t, vis) {
  if (vis <= .003) return;
  const x = fr.x, s = c.s, r = RB * s;
  const close = ss(t, T.close, T.close + .8) * (1 - ss(t, T.out1, T.out1 + .7));      // 第 2 镜推近时，后两行退到暗处
  const folded = ss(t, T.fold + 1.9, T.fold + 2.3);
  const nf = N * E.io3(seg(t, T.count, T.count + 1.0)), counting = t > T.count - .05 && t < T.count + 1.15;
  const mut = t >= T.flip + .15, sticky = ss(t, T.sticky, T.sticky + .3), push = 8 * E.outBack(seg(t, T.sticky, T.sticky + .4));
  const pts = []; for (let i = 0; i < N; i++) { const p = beadPos(i, t); pts.push(toS(c, p[0] + (i === F.knob ? push : 0), p[1])); }
  const dimOf = i => lerp(1, [i > 12 ? .4 : 1, .12, .05, 0][ROWOF[i]], close);
  fr.g({ a: vis }, () => {
    if (folded > 0) { backing(x, c, 0, 0, folded); const o = toS(c, -F.R * .3, -F.R * .36); fr.glow(o[0], o[1], F.R * 1.1 * s, '#DDF4FF', .1 * folded); }
    x.save(); x.lineCap = 'round'; x.lineWidth = Math.max(1, 2.4 * s);                       // 线按段画：退到暗处的行，线也跟着暗
    for (let i = 0; i < N - 1; i++) { const al = .6 * Math.min(dimOf(i), dimOf(i + 1)); if (al < .02) continue; x.strokeStyle = rgba('#9FB6C8', al); x.beginPath(); x.moveTo(pts[i][0], pts[i][1]); x.lineTo(pts[i + 1][0], pts[i + 1][1]); x.stroke(); }
    x.restore();
    if (folded > 0) heme(x, c, 0, 0, folded, ss(t, T.o2 + .85, T.o2 + 1.05) * (1 - ss(t, T.off, T.off + .35)));
    for (let i = 0; i < N; i++) {
      if (i === F.knob) continue;
      const bump = counting ? Math.exp(-Math.pow((i - nf) / 2.4, 2)) : 0;
      ball(x, pts[i][0], pts[i][1], r * (1 + .3 * bump), bump > .05 ? mix(COL[i], '#FFFFFF', .45 * bump) : foldK(i, t) > .5 ? COLD[i] : COL[i], dimOf(i));
    }
    /* 第 6 颗 */
    const [kx, ky] = pts[F.knob], sx = Math.abs(Math.cos(Math.PI * seg(t, T.flip, T.flip + .3)));
    if (mut) fr.glow(kx, ky, r * 4.2, ROSE, .28 + sticky * (.32 + .22 * Math.sin((t - T.sticky) * 8)));
    x.save(); x.translate(kx, ky); x.scale(Math.max(.04, sx), 1); ball(x, 0, 0, r * (1 + .1 * sticky), mut ? ROSE : COL[F.knob]); x.restore();
    const rp = seg(t, T.flip + .15, T.flip + 1.0); if (rp > 0 && rp < 1) fr.circle(kx, ky, r * (1.3 + 3.2 * E.out3(rp)), { color: ROSE, w: 2.2, a: 1 - rp });
  });
  if (counting) for (let n = 0; n < 12; n++) fr.sfx(T.count + n * .085, 'tick', { pitch: n % 7, gain: .5 });
  fr.sfx(T.flip + .15, 'tock', { pitch: 1 }); fr.sfx(T.flip + .15, 'thud', { gain: .4 }); fr.sfx(T.fold + .5, 'shimmer', {}); fr.sfx(T.sticky, 'tock', { pitch: 4 });
}

/* 别的血红蛋白：折好的一团，表面那颗已经是黏点 */
const ROW = [[1, 23.9], [-1, 24.35], [2, 24.7], [-2, 25.0], [3, 25.25], [-3, 25.45], [4, 25.6], [-4, 25.75]], PITCH = F.pitch + 8;
function molBall(fr, c, ox, oy, rot, a) {
  const x = fr.x, r = RB * c.s, cs = Math.cos(rot), sn = Math.sin(rot), at = (px, py) => toS(c, ox + px * cs - py * sn, oy + px * sn + py * cs);
  fr.g({ a }, () => {
    backing(x, c, ox, oy, 1);
    x.save(); x.lineJoin = x.lineCap = 'round'; x.lineWidth = Math.max(.8, 2.2 * c.s); x.strokeStyle = rgba('#9FB6C8', .4); x.beginPath();
    const pts = F.pts.map((p, i) => at(p[0] + (i === F.knob ? 8 : 0), p[1])); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke(); x.restore();
    const h = at(F.cavity[0], F.cavity[1]); x.fillStyle = '#4A0A14'; x.beginPath(); x.arc(h[0], h[1], 17 * c.s, 0, 6.2832); x.fill(); x.lineWidth = Math.max(1, 3 * c.s); x.strokeStyle = '#C23650'; x.stroke();
    pts.forEach((p, i) => { if (i !== F.knob) ball(x, p[0], p[1], r, COLD[i]); });
    fr.glow(pts[F.knob][0], pts[F.knob][1], r * 4, ROSE, .45); ball(x, pts[F.knob][0], pts[F.knob][1], r * 1.1, ROSE);
  });
}
function rowMols(fr, c, t, vis) {
  if (t < ROW[0][1] - .6 || vis <= .003) return;
  ROW.forEach(([k, tk], n) => {
    const u = E.out3(seg(t, tk - .5, tk)); if (u <= 0) return;
    const side = k > 0 ? 1 : -1;
    molBall(fr, c, k * PITCH + side * 300 * (1 - u), (n % 2 ? 1 : -1) * 190 * (1 - u), side * .7 * (1 - u), vis * ss(t, tk - .5, tk - .3));
    const fl = seg(t, tk, tk + .4); if (fl > 0 && fl < 1) { const j = toS(c, (k > 0 ? k - 1 : k) * PITCH + F.pts[F.knob][0] + 8, 0); fr.glow(j[0], j[1], 120 * c.s, '#FFD0DA', .7 * (1 - fl) * vis); }
    fr.sfx(tk, 'tock', { pitch: 2 + n, gain: .8 });
  });
}

/* 氧分子：飞进小窝，再飞走 */
function oxygen(fr, c, t) {
  const kout = E.in2(seg(t, T.off, T.off + .9)); if (t < T.o2 || kout >= 1) return;
  const cav = toS(c, F.cavity[0], F.cavity[1]), q = (a, m, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * k * (1 - k) * m[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * k * (1 - k) * m[1] + k * k * b[1]];
  const p = kout > 0 ? q(cav, [760, 330], [560, 130], kout) : q([1520, 150], [1330, 520], cav, E.out3(seg(t, T.o2, T.o2 + 1.0)));
  const al = ss(t, T.o2, T.o2 + .25) * (1 - ss(kout, .5, 1)), r = 12.5 * c.s;
  ball(fr.x, p[0] - r * .56, p[1] + r * .12, r, '#FF6A55', al); ball(fr.x, p[0] + r * .56, p[1] - r * .12, r, '#FF6A55', al);
  /* 标注：飞的时候跟着它；落进小窝以后拉到一团外面，用一根细线连着 */
  const dock = ss(t, T.o2 + .75, T.o2 + 1.15) * (1 - ss(t, T.off, T.off + .3)), far = toS(c, F.R * .62, -F.R * .9);
  const lx = lerp(p[0] + r * 2.5, far[0] + 78, dock), ly = lerp(p[1] - r * 1.7, far[1] - 44, dock);
  if (dock > .05) fr.line(p[0] + r * 1.2, p[1] - r * 1.2, lx - 12, ly + 16, { w: 1.4, color: '#FFB3A6', a: .55 * dock * al });
  const w = fr.text('O', lx, ly, { font: 'latin', size: 46, color: '#FFB3A6', a: al, align: 'l' });
  fr.text('2', lx + w + 2, ly + 14, { font: 'latin', size: 27, color: '#FFB3A6', a: al, align: 'l' });
  if (dock > 0) fr.glow(p[0], p[1], r * 4.5, '#FF6A55', .35 * dock);
  fr.sfx(T.o2 + .9, 'bloom', { gain: .6 }); fr.sfx(T.off, 'soft', { gain: .6 });
}

/* ---------- 红细胞（画在底层，不吃辉光） ---------- */
const R = 250;
function sickleMap(px, py) {                               // 单位圆盘 → 镰刀：两头朝上、带尖，整体转 −15°
  const X = 1.7 * R * px, h = .42 * R * Math.pow(Math.max(0, 1 - px * px), .6), Yc = R * (.20 - .55 * px * px);
  const v = clamp(py / Math.sqrt(1 - px * px + 1e-6), -1, 1), y = Yc + h * v, c = Math.cos(-.26), s = Math.sin(-.26);
  return [X * c - y * s, X * s + y * c];
}
const rodE = t => lerp(.12, .93, E.io3(seg(t, T.rods, T.rods + 1.5)));
const sickleAmt = t => t < T.in2 ? E.io3(seg(t, T.bend, T.bend + 1.6)) : t < T.out2 ? 1 - E.io3(seg(t, T.in2, T.in2 + .6)) : smooth(seg(rodE(t), .5, .93));
const RODS = [-.62, -.31, 0, .31, .62];
const MOLS = (() => { const r = rng(7), o = []; while (o.length < 300) { const a = r() * 6.2832, d = Math.sqrt(r()) * .93; if (d > .13) o.push([d * Math.cos(a), d * Math.sin(a)]); } return o; })();
const BGC = [                                              // 血管里别的红细胞：位置（细胞层像素，相对主角）、半径、倾角、转角、流速、相位、亮度
  { x: -720, y: -200, r: 150, tilt: .55, rot: .3, v: 9, ph: 0, a: .6 }, { x: 600, y: 190, r: 150, tilt: .42, rot: -.5, v: 12, ph: 2, a: .7 },
  { x: -520, y: 250, r: 92, tilt: .78, rot: 1.1, v: 7, ph: 4, a: .45 }, { x: 520, y: -310, r: 96, tilt: .66, rot: .2, v: 8, ph: 1, a: .45 },
  { x: -1180, y: 40, r: 130, tilt: .3, rot: -.2, v: 13, ph: 3, a: .55 }, { x: 1010, y: -70, r: 118, tilt: .62, rot: .9, v: 10, ph: 5, a: .5 },
  { x: -360, y: -440, r: 70, tilt: .8, rot: .4, v: 5, ph: 6, a: .35 }];
const BODY = [[0, '#7C1424'], [.42, '#A32033'], [.74, '#CC3A4E'], [.93, '#D9495C'], [1, '#97192C']];
function bgCell(x, c, t, o, vis) {
  const p = toS(c, (o.x + o.v * t) * RHO, (o.y + 12 * Math.sin(t * .4 + o.ph)) * RHO), rr = o.r * c.sc; if (p[0] < -rr || p[0] > 1920 + rr || p[1] < -rr || p[1] > 1080 + rr) return;
  const cy = Math.cos(o.tilt);
  x.save(); x.globalAlpha = vis * o.a; x.translate(p[0], p[1]); x.rotate(o.rot + .06 * Math.sin(t * .3 + o.ph));
  x.fillStyle = '#560C18'; x.beginPath(); x.ellipse(0, rr * .26 * Math.sin(o.tilt), rr, rr * cy, 0, 0, 6.2832); x.fill();      // 侧面的厚度
  x.scale(1, cy);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, rr); BODY.forEach(([k, col]) => g.addColorStop(k, col)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, rr, 0, 6.2832); x.fill();
  [.64, .6, .56, .52, .48, .44, .4, .36, .32, .28, .24].forEach(k => { x.fillStyle = rgba('#3D0710', .055); x.beginPath(); x.arc(0, 0, rr * k, 0, 6.2832); x.fill(); });
  x.lineWidth = 2; x.strokeStyle = rgba('#F27C92', .4); x.beginPath(); x.arc(0, 0, rr, 0, 6.2832); x.stroke(); x.restore();
}
function heroCell(x, c, t, vis, molVis) {
  const sc = c.sc, m = sickleAmt(t), xray = ss(t, T.out2, T.out2 + .8), wob = .035 * Math.sin(t * .45), cw = Math.cos(wob), sw = Math.sin(wob);
  const q = (px, py) => { const b = sickleMap(px, py), u = lerp(R * px, b[0], m), v = lerp(R * py, b[1], m); return toS(c, (u * cw - v * sw) * RHO, (u * sw + v * cw) * RHO); };
  const ring = (rr, n) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; o.push(q(rr * Math.cos(a), rr * Math.sin(a))); } return o; };
  const trace = pts => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); };
  const ctr = q(0, 0), out = ring(1, 140);
  const deep = ss(sc, 1.6, 6);                             // 钻进细胞以后压暗，字幕才读得清
  x.save(); x.globalAlpha = vis * lerp(1, .62, xray) * lerp(1, .5, deep);
  const g = x.createRadialGradient(ctr[0], ctr[1], 0, ctr[0], ctr[1], lerp(R, 1.75 * R, m) * sc); BODY.forEach(([k, col]) => g.addColorStop(k, col));
  trace(out); x.closePath(); x.fillStyle = g; x.fill();
  [.64, .6, .56, .52, .48, .44, .4, .36, .32, .28, .24].forEach(k => { trace(ring(k, 70)); x.closePath(); x.fillStyle = rgba('#3D0710', .055 * lerp(1, .45, xray)); x.fill(); });   // 中间的凹窝（很多层叠出软边）
  x.globalAlpha = vis * lerp(1, .5, deep); x.lineJoin = x.lineCap = 'round';
  trace(out); x.closePath(); x.lineWidth = 2.4; x.strokeStyle = rgba('#F27C92', .6); x.stroke();
  const hi = []; for (let i = 0; i <= 26; i++) { const a = (198 + i * 4) / 180 * Math.PI; hi.push(q(.9 * Math.cos(a), .9 * Math.sin(a))); }                             // 左上的高光
  trace(hi); x.lineWidth = Math.max(4, Math.min(16, 7 * Math.sqrt(sc))); x.strokeStyle = rgba('#FFD3DA', .26); x.stroke();
  /* 细胞里的血红蛋白：推进去才看得见；第 8 镜里它们排到杆上 */
  const molA = Math.max(ss(sc, 2.2, 5), xray); if (molA > 0) {
    const e = rodE(t), glide = t < T.out2 ? 0 : E.io3(seg(t, T.rods - .3, T.rods + .5)), rr = 3 * sc;
    if (glide > 0) {                                        // 长杆
      x.save(); x.shadowColor = rgba(ROSE, .9); x.shadowBlur = 14; x.lineWidth = Math.max(2.5, 1.7 * sc); x.strokeStyle = rgba('#FF8FA8', .9 * glide);
      RODS.forEach(v => { const pl = []; for (let i = 0; i <= 40; i++) { const px = lerp(-e, e, i / 40); pl.push(q(px, v * Math.sqrt(1 - px * px))); } trace(pl); x.stroke(); });
      x.restore();
    }
    MOLS.forEach(([px, py]) => {
      let ux = px, uy = py;
      if (glide > 0) { const vd = py / Math.sqrt(1 - px * px + 1e-6), vr = RODS.reduce((b, v) => Math.abs(v - vd) < Math.abs(b - vd) ? v : b), tx = clamp(px, -e, e); ux = lerp(px, tx, glide); uy = lerp(py, vr * Math.sqrt(1 - tx * tx), glide); }
      const p = q(ux, uy); if (p[0] < -rr || p[0] > 1920 + rr || p[1] < -rr || p[1] > 1080 + rr) return;
      if (rr < 4.5) { x.globalAlpha = vis * molA * .62; x.fillStyle = '#F8BECB'; x.beginPath(); x.arc(p[0], p[1], Math.max(1.4, rr * .8), 0, 6.2832); x.fill(); }
      else { x.globalAlpha = 1; ball(x, p[0], p[1], rr, '#D9788F', vis * molA * .9); }
    });
    if (molVis < 1) { x.globalAlpha = 1; ball(x, ctr[0], ctr[1], Math.max(2, rr), ROSE, vis * molA * (1 - molVis)); }                                                  // 主角缩成的那一个点
  }
  x.restore();
}

/* ---------- 屏上的小字（一镜最多一条） ---------- */
function labels(fr, c, t) {
  const top = (zh, en, a) => { if (a <= 0) return; const wz = fr.measure(zh, { font: 'serifr', size: 27, track: 5 }), we = en ? fr.measure(en, { font: 'latin', size: 26, track: 6 }) : 0, x0 = 960 - (wz + (en ? 26 + we : 0)) / 2;
    fr.text(zh, x0, 128, { font: 'serifr', size: 27, track: 5, color: INK2, align: 'l', a }); if (en) fr.text(en, x0 + wz + 26, 129, { font: 'latin', size: 26, track: 6, color: P.label, align: 'l', a }); };
  top('血红蛋白的一条链', 'HAEMOGLOBIN  β', ss(t, 3.8, 4.3) * (1 - ss(t, 7.9, 8.3)));
  top('一个红细胞里，约有 2.7 亿个血红蛋白', '', ss(t, 27.6, 28.1) * (1 - ss(t, 29.2, 29.6)));
  const src = ss(t, 29.8, 30.4) * fadeOut(t);
  top('L. Pauling 等 1949  ·  V. Ingram 1957', '', src);
  fr.text('画面为示意：真实的血红蛋白由 4 条链组成，这里只画了一条；大小比例压缩过', 960, 170, { font: 'serifr', size: 21, track: 2, color: '#5E6B77', a: src });
  /* 第 1 镜：数到 146 */
  const ca = ss(t, T.count - .1, T.count + .2) * (1 - ss(t, 4.9, 5.3));
  if (ca > 0) { const n = Math.round(N * E.io3(seg(t, T.count, T.count + 1.0))); fr.text(String(n), 1690, 208, { font: 'latin', size: 104, color: P.ice, align: 'r', a: ca, glow: 12, glowA: .35 }); fr.text('颗', 1704, 222, { font: 'serifr', size: 34, color: P.iceLo, align: 'l', a: ca }); }
  /* 第 2 镜：字母、第 6 颗 */
  const la = ss(t, 5.6, 6.0) * (1 - ss(t, T.out1 - .1, T.out1 + .3));
  if (la > 0) {
    const r = RB * c.s, mut = t >= T.flip + .15;
    for (let i = 0; i < 12; i++) { const p = toS(c, SERP[i][0], SERP[i][1]), six = i === F.knob; fr.text(six && mut ? 'V' : SEQ[i], p[0], p[1] + r + 36, { font: 'mono', size: 34, color: six ? (mut ? ROSE : P.ink) : P.label, a: la * (six ? 1 : .8) }); }
    const p6 = toS(c, SERP[F.knob][0], SERP[F.knob][1]);
    fr.line(p6[0], p6[1] - r - 40, p6[0], p6[1] - r - 12, { w: 1.6, color: INK2, a: .7 * la, cap: 'butt' });
    fr.text('第 6 颗', p6[0], p6[1] - r - 72, { font: 'serifr', size: 42, track: 4, color: P.ink, a: la });
    fr.text('谷氨酸 → 缬氨酸', p6[0], p6[1] + r + 92, { font: 'serifr', size: 31, track: 3, color: ROSE, a: la * ss(t, T.flip + .4, T.flip + .8) });
  }
  /* 第 3 镜：红细胞 → 镰状细胞 */
  const a1 = ss(t, 9.7, 10.1) * (1 - ss(t, 10.9, 11.3)), a2 = ss(t, 11.5, 11.9) * (1 - ss(t, T.in2 - .2, T.in2 + .2));
  if (a1 > 0) { fr.line(1168, 306, 1262, 262, { w: 1.2, color: INK2, a: .5 * a1 }); fr.text('红细胞', 1278, 254, { font: 'serifr', size: 38, track: 4, color: P.ink, align: 'l', a: a1 }); }
  if (a2 > 0) { fr.line(1366, 268, 1436, 232, { w: 1.4, color: ROSE, a: .7 * a2 }); fr.text('镰状细胞', 1452, 224, { font: 'serifr', size: 38, track: 4, color: ROSE, align: 'l', a: a2 }); }
  /* 第 6 镜：放下氧气以后 · 黏点 */
  fr.text('放下氧气以后', 470, 196, { font: 'serifr', size: 30, track: 3, color: INK2, a: ss(t, T.off + .3, T.off + .7) * (1 - ss(t, 21.6, 22.0)) });
  const sa = ss(t, T.sticky + .3, T.sticky + .7) * (1 - ss(t, T.row - .2, T.row + .1));
  if (sa > 0) { const k = toS(c, F.pts[F.knob][0] + 8, F.pts[F.knob][1]); fr.line(k[0] + 24, k[1] - 20, k[0] + 112, k[1] - 84, { w: 1.6, color: ROSE, a: .7 * sa }); fr.text('黏点', k[0] + 128, k[1] - 96, { font: 'serifr', size: 46, track: 6, color: ROSE, align: 'l', a: sa, glow: 10, glowA: .4 }); }
}

VK.film({
  dur: T.end, theme: 'night', meta: { title: '折叠', root: -2 },
  draw(fr, t) {
    const c = camAt(t), cellVis = (1 - ss(c.sc, 5, 28)) * fadeOut(t), molVis = ss(c.s, .08, .25);
    fr.look.bloom = .5;
    fr.look.bgo = { stars: 0, tint: mix('#0B1830', '#5A0F1C', cellVis) };
    fr.look.under = x => { if (cellVis > .003) { BGC.forEach(o => bgCell(x, c, t, o, cellVis)); heroCell(x, c, t, cellVis, molVis); } };
    fr.g({ a: fadeOut(t) }, () => {
      hero(fr, c, t, molVis); rowMols(fr, c, t, molVis); oxygen(fr, c, t); labels(fr, c, t);
      K.chapterMark(fr, t, MARKS, T.end);
    });
    fr.sfx(.4, 'chord', { root: 0, gain: .7 }); fr.sfx(T.push, 'rise', { dur: 1.6, gain: .6 }); fr.sfx(T.out1, 'rise', { dur: 1.6, gain: .6 }); fr.sfx(T.bend + .8, 'thud', { gain: .7 });
    fr.sfx(T.in2, 'rise', { dur: .9, gain: .5 }); fr.sfx(T.out2, 'rise', { dur: 1.2, gain: .6 }); fr.sfx(T.rods + 1.2, 'thud', { gain: .8 }); fr.sfx(29.5, 'chord', { root: -5, gain: .8 });
    K.subs(fr, t, SUBS, 'night');
  },
});
})();
