/* vk-kit.js — 贯穿全片的"语法件"：字幕、片名卡、年份 HUD、章节标、骰子、点阵成字、数轴。
 * 货架，不是清单：只有这些是每条片都会出现的；每章的道具（陶瓮、针、信封……）在各自的 film.js 里现画。
 * 三套世界：gilt = A 鎏金暗场，flat = B 扁平插画，night = C 夜曲。 */
(function (G) {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = G.VK;

/* 调色板：数值量自参考片 */
const PAL = {
  gilt:  { ink: '#E8E3D9', gold: '#DDBD74', goldHi: '#F4E0B7', goldLo: '#B98A3E', red: '#D9583C', seal: '#C94027', dim: '#C4BBB1', mute: '#94908B', faint: '#5D5D5F', ivory: '#F1E8D6' },
  flat:  { ink: '#FFFAEB', gold: '#EEC672', goldHi: '#FCE7C2', goldLo: '#CFA55E', red: '#FC593F', dim: '#D8CFBF', mute: '#A89F90', paper: '#D4CABA' },
  night: { ink: '#F8F9F8', sub: '#D9D9D8', en: '#86898C', label: '#879399', gold: '#F8D893', goldLo: '#B09973', ice: '#64E3F6', iceHi: '#94FDFF', iceLo: '#508FA6', rose: '#E84B75', crimson: '#CF3655', deep: '#A21224', violet: '#8477D0' },
};

/* ---------- 字幕 ----------
 * 一条：{ a, b, zh, en?, big?, tone? }；zh 里 {词} = 金色关键词，{!词} = 红色关键词。
 * gilt：逐字"模糊→清晰"，约 0.085s/字；flat：逐字亮起，不虚；night：整行淡入，英文晚 0.18s。 */
function parseMark(s) { const out = []; let tone = null, i = 0; const cs = Array.from(s); while (i < cs.length) { const c = cs[i]; if (c === '{') { tone = 'gold'; if (cs[i + 1] === '!') { tone = 'red'; i++; } } else if (c === '}') tone = null; else out.push({ ch: c, tone }); i++; } return out; }
const SUB = {
  gilt:  { font: 'serif', size: 54, big: 74, huge: 94, track: .11, y: 915, stagger: .085, rise: .34, shadow: .6 },
  flat:  { font: 'sans',  size: 48, big: 56, huge: 64, track: .07, y: 966, stagger: .07,  rise: .16, shadow: .75 },
  night: { font: 'serifr', size: 41, big: 46, huge: 52, track: .12, y: 939, enY: 995, enSize: 29 },
};
function subs(fr, t, list, style) {
  const st = SUB[style] || SUB.gilt, pal = PAL[style] || PAL.gilt;
  for (const s of list) {
    if (t < s.a || t > s.b) continue;
    const cs = parseMark(s.zh), str = cs.map(c => c.ch).join('');
    const size = s.big === 2 ? st.huge : s.big ? st.big : st.size, y = s.y || st.y;
    if (style === 'night') {
      const k = fade(t, s.a, s.b, .55, .5);
      fr.chars(str, W / 2, y, { font: st.font, size, track: size * st.track, color: pal.sub, a: k, glow: 6, glowA: .25 }, i => cs[i].tone ? { color: cs[i].tone === 'red' ? pal.rose : pal.gold } : null);
      if (s.en) fr.text(s.en, W / 2, s.enY || st.enY, { font: 'lora', size: st.enSize, color: pal.en, a: fade(t, s.a + .18, s.b, .55, .45) });
      continue;
    }
    const n = cs.length, stg = Math.min(st.stagger, .95 / n), out = 1 - ss(t, s.b - .38, s.b);   // 整句约 0.7–1s 显完，句子越长每字越快
    const base = s.tone === 'gold' ? pal.gold : pal.ink;
    fr.chars(str, W / 2, y, { font: st.font, size, track: size * st.track, color: base, shadow: st.shadow, shadowBlur: style === 'flat' ? 10 : 20, shadowY: style === 'flat' ? 3 : 2 }, i => {
      const k = seg(t, s.a + i * stg, s.a + i * stg + st.rise), tone = cs[i].tone;
      return { a: smooth(k) * out, blur: style === 'gilt' ? (1 - k) * 9 + (1 - out) * 7 : 0, color: tone === 'red' ? pal.red : tone === 'gold' ? pal.gold : base };
    });
  }
}

/* ---------- A：年份里程表 + 地点·人物 + 出处 + 朱印 ----------
 * chapters: [{ t, year:'1494', approx?, place:'威尼斯 · 帕乔利', src?:{ la, zh, by } }]，按 t 升序；end = HUD 整体退场时刻 */
function odometer(fr, x, y, from, to, k, o) {
  const size = o.size, dw = size * .52, cx = fr.x; to = String(to); from = String(from || '').padStart(to.length, '0');
  for (let i = 0; i < to.length; i++) {
    const a = +from[i] || 0, b = +to[i], ki = E.out3(seg(k, i * .13, .42 + i * .19)), turns = 10;   // 左边的数位先停
    const p = k >= 1 ? b : a + (((b - a) % 10 + 10) % 10 + turns) * ki, d0 = Math.floor(p), fr0 = p - d0, px = x + i * dw + dw / 2;
    cx.save(); cx.beginPath(); cx.rect(px - dw, y - size * .56, dw * 2, size * 1.12); cx.clip();
    for (const [d, off] of [[d0, -fr0], [d0 + 1, 1 - fr0]]) {
      const dy = off * size * .98, al = 1 - Math.min(1, Math.abs(off) * 1.25); if (al <= 0) continue;
      fr.text(String(((d % 10) + 10) % 10), px, y + dy, { font: 'latinm', size, grad: o.grad, a: al * (o.a == null ? 1 : o.a), glow: 14, glowColor: '#D9B15F', glowA: .35, blur: Math.abs(off) > .02 && k < 1 ? 1.2 : 0 });
    }
    cx.restore();
  }
  return to.length * dw;
}
function hudYear(fr, t, chapters, end = 1e9) {
  let i = -1; for (let j = 0; j < chapters.length; j++) if (t >= chapters[j].t) i = j; if (i < 0) return;
  const c = chapters[i], prev = chapters[i - 1], lt = t - c.t, pal = PAL.gilt, out = 1 - ss(t, end - .7, end);
  const nextT = chapters[i + 1] ? chapters[i + 1].t : end, aIn = prev ? 1 : ss(lt, 0, .5);
  const gold = [[0, '#F6E3B4'], [.55, '#E7C477'], [1, '#C79A4C']];
  let x0 = 110;
  if (c.approx) { fr.text('约', 86, 86, { font: 'serifm', size: 22, color: pal.dim, a: ss(lt, .5, 1) * out }); }
  odometer(fr, x0, 95, prev ? prev.year : String(+c.year - 254), c.year, seg(lt, 0, .85), { size: 96, grad: gold, a: aIn * out });
  fr.line(103, 146, 103 + 337 * ss(lt, .1, .9), 146, { w: 1.2, color: '#B89B63', a: .32 * out, cap: 'butt' });
  /* 地点·人物：换章时旧的向上淡出，新的从下淡入 */
  const sw = prev ? ss(lt, .25, .75) : ss(lt, .1, .5);
  if (prev && sw < 1) fr.text(prev.place, 103, 183 - sw * 10, { font: 'serifm', size: 27, track: 5.5, color: pal.dim, align: 'l', a: (1 - sw) * out });
  fr.text(c.place, 103, 183 + (1 - sw) * 10, { font: 'serifm', size: 27, track: 5.5, color: pal.dim, align: 'l', a: sw * out });
  /* 右上出处：斜体西文原题 /《中文名》/ 作者·地点·年份 + 朱印；到下一章前 0.5s 先退 */
  if (c.src) {
    const k = fade(lt, c.src.at == null ? .25 : c.src.at, (c.src.until == null ? nextT - c.t : c.src.until), .4, .5) * out;
    if (k > 0) {
      fr.text(c.src.la, 1790, 66, { font: 'latini', size: 31, color: '#A9A59C', align: 'r', a: k });
      fr.text(c.src.zh, 1790, 117, { font: 'serif', size: 30, track: 1.5, color: '#C9B27A', align: 'r', a: k });
      fr.text(c.src.by, 1790, 162, { font: 'serifr', size: 20, track: 2, color: '#77756F', align: 'r', a: k });
      fr.line(1790 - 390 * k, 180, 1790, 180, { w: 1, color: '#B89B63', a: .22 * k, cap: 'butt' });
      seal(fr, 1840, 76, 21, ['文', '献'], k, { rot: .04 });
    }
  }
}
/* 朱红小印：竖排两字 */
function seal(fr, cx, cy, hw, chs, a = 1, o = {}) {
  fr.g({ at: [cx, cy], rot: o.rot || 0, a, s: o.s == null ? 1 : o.s }, () => {
    const hh = hw * (chs.length > 1 ? 1.28 : 1);
    fr.rect(-hw, -hh, hw * 2, hh * 2, { r: hw * .22, fill: o.fill || '#B8321F' });
    fr.rect(-hw + 3, -hh + 3, hw * 2 - 6, hh * 2 - 6, { r: hw * .16, color: '#F3D9C4', w: 1.2, a: .55 });
    chs.forEach((ch, i) => fr.text(ch, 0, (i - (chs.length - 1) / 2) * hw * 1.1, { font: 'serif', size: hw * 1.02, color: '#FBE9DA' }));
  });
}

/* ---------- C：左上章节标（极小，只为定位） ---------- */
function chapterMark(fr, t, marks, end = 1e9) {
  let i = -1; for (let j = 0; j < marks.length; j++) if (t >= marks[j].t) i = j; if (i < 0) return;
  const m = marks[i], nx = marks[i + 1] ? marks[i + 1].t : end, k = fade(t, m.t, nx, .8, .6) * .9; if (k <= 0) return;
  let x = 101; x += fr.text(m.no, x, 88, { font: 'mono', size: 15, track: 3, color: '#5E6B77', align: 'l', a: k }) + 18;
  x += fr.text(m.zh, x, 87, { font: 'serifr', size: 22, track: 3, color: '#AEB8C2', align: 'l', a: k }) + 16;
  fr.text(m.en, x, 88, { font: 'mono', size: 13, track: 5, color: '#5E6B77', align: 'l', a: k });
  fr.line(101, 110, 101 + 250 * ss(t, m.t, m.t + 1), 110, { w: 1, color: '#8FA3B5', a: .22 * k, cap: 'butt' });
}

/* ---------- A / B：金字片名卡 ----------
 * lt = 片名卡本地时间（0 = 闪白峰值）。o: { la 外文行, zh 片名, tag 副题, motif(fr, lt, a) 片名下方那个"母题图形", a, cy, size, track, rays, specks, tagDy } */
function rays(fr, cx, cy, lt, a, n = 56, color = '#E7C477') {
  const x = fr.x; x.save(); x.globalCompositeOperation = 'lighter'; x.translate(cx, cy); x.rotate(lt * .012);
  for (let i = 0; i < n; i++) {
    const ang = i / n * Math.PI * 2 + hash(i) * .08, len = 560 + hash(i + 9) * 520, w = .018 + hash(i + 3) * .03, al = (.035 + hash(i + 5) * .06) * a;
    const g = x.createLinearGradient(0, 0, Math.cos(ang) * len, Math.sin(ang) * len); g.addColorStop(0, rgba(color, 0)); g.addColorStop(.18, rgba(color, al)); g.addColorStop(1, rgba(color, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(ang - w) * len, Math.sin(ang - w) * len); x.lineTo(Math.cos(ang + w) * len, Math.sin(ang + w) * len); x.closePath(); x.fill();
  }
  x.restore();
}
function titleGilt(fr, lt, o) {
  const pal = PAL.gilt, a = o.a == null ? 1 : o.a, cy = o.cy || 465, cs = Array.from(o.zh), size = o.size || 196, track = o.track == null ? 22 : o.track;
  rays(fr, W / 2, cy + 30, lt, ss(lt, .1, 1.2) * a * (o.rays == null ? .5 : o.rays));
  { const r0 = rng(31), sk = ss(lt, 0, 1) * a * (o.specks == null ? 1 : o.specks); for (let i = 0; i < 110; i++) { const px = r0() * W, py = r0() * H, s0 = r0(); fr.glow(px, py, 2.5 + s0 * 4, '#F1D9A0', (.25 + .6 * s0) * (.6 + .4 * Math.sin(lt * (1 + s0 * 2) + i)) * sk); } }   // 金屑星点
  fr.glow(W / 2, cy, 620, '#6B4A1C', .22 * ss(lt, 0, .8) * a);
  fr.text(o.la, W / 2, cy - 154, { font: 'latinl', size: 30, track: 19, color: pal.mute, a: ss(lt, .25, 1.0) * a });
  const gold = [[0, '#F7E8C2'], [.38, '#E2C07A'], [.62, '#C39A52'], [1, '#8E6A2F']];
  fr.chars(o.zh, W / 2, cy, { font: 'serifh', size, track, grad: gold, glow: 26, glowColor: '#B8873C', glowA: .42 }, i => { const k = seg(lt, .08 + i * .1, .08 + i * .1 + .34); return { a: smooth(k) * a, blur: (1 - k) * 16 }; });
  /* 显影时飘过的金屑 */
  const r = rng(77);
  for (let i = 0; i < 70; i++) { const b = .1 + r() * .9, k = seg(lt, b, b + .9); if (k <= 0 || k >= 1) { r(); r(); r(); continue; } const px = W / 2 - 520 + r() * 1040 + k * 40, py = cy - 110 + r() * 220 - k * 30, s = 1 + r() * 2.2; fr.glow(px, py, s * 4, '#F4D48A', Math.sin(k * Math.PI) * .8 * a); }
  if (o.motif) o.motif(fr, lt, a);
  fr.text(o.tag, W / 2, cy + (o.tagDy || 307), { font: 'serifm', size: 34, track: 18, color: '#D4D2CC', a: ss(lt, 1.15, 1.8) * a });
}

/* ---------- C：点阵聚成字 ----------
 * 把字先画到暗处取样，得到一堆目标点；k: 0 = 散在四周，1 = 归位。归位后叠上实字。 */
const _dustCache = {};
function dustPoints(str, cx, cy, o) {
  const key = [str, cx, cy, o.font, o.size, o.track, o.n].join('|'); if (_dustCache[key]) return _dustCache[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.font = G.VK.fontOf(o.font, o.size); x.letterSpacing = (o.track || 0) + 'px'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = '#fff';
  const w = x.measureText(str).width - (o.track || 0); x.fillText(str, cx - w / 2, cy);
  const x0 = Math.max(0, Math.floor(cx - w / 2 - 10)), y0 = Math.max(0, Math.floor(cy - o.size * .75)), ww = Math.min(W - x0, Math.ceil(w + 20)), hh = Math.min(H - y0, Math.ceil(o.size * 1.5));
  const d = x.getImageData(x0, y0, ww, hh).data, pts = [], st = o.step || 2;
  for (let yy = 0; yy < hh; yy += st) for (let xx = 0; xx < ww; xx += st) if (d[(yy * ww + xx) * 4 + 3] > 110) pts.push([x0 + xx, y0 + yy]);
  const r = rng(4242); for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const out = pts.slice(0, o.n || 4200).map(p => { const ang = r() * 6.2832, dist = 30 + r() * r() * 420; return { x: p[0], y: p[1], sx: p[0] + Math.cos(ang) * dist * 1.7, sy: p[1] + Math.sin(ang) * dist * .75, d: r() * .5, tw: r() }; });   // 起点就在字的周围：先是一团雾，再收成笔画
  return (_dustCache[key] = out);
}
function dustText(fr, str, cx, cy, o, k, t) {
  const pts = dustPoints(str, cx, cy, o), x = fr.x, col = o.dustColor || '#CFE4F4', a = o.a == null ? 1 : o.a;
  const solid = ss(k, .78, 1); x.save(); x.globalCompositeOperation = 'lighter';
  if (solid < 1) for (const p of pts) {
    const kk = E.io3(seg(k, p.d * .9, p.d * .9 + .5)), px = lerp(p.sx, p.x, kk) + Math.sin(t * 1.3 + p.tw * 9) * 6 * (1 - kk), py = lerp(p.sy, p.y, kk) + Math.cos(t * 1.1 + p.tw * 7) * 6 * (1 - kk);
    const al = (.45 + .5 * kk) * ss(k, 0, .1 + p.d * .25) * (1 - solid * .85) * a * (.65 + .35 * Math.sin(t * 5 + p.tw * 20));
    x.fillStyle = rgba(col, al); x.fillRect(px - 1.1, py - 1.1, 2.2, 2.2);
  }
  x.restore();
  if (solid > 0) fr.text(str, cx, cy, Object.assign({}, o, { a: solid * a }));
}
function titleNight(fr, lt, o) {
  const pal = PAL.night, a = o.a == null ? 1 : o.a, cy = o.cy || 438, ly = o.lineY || 577;
  /* 一条贯穿画面的细线，两个光点沿线向右跑（信号） */
  const la = ss(lt, 0, .6) * a; fr.line(W / 2 - 960 * ss(lt, .05, 1.2), ly, W / 2 + 960 * ss(lt, .05, 1.2), ly, { w: 1.1, color: '#7FA8C8', a: .3 * la, cap: 'butt' });
  for (let i = 0; i <= 16; i++) { const tx = 120 + i * 105; fr.line(tx, ly + 3, tx, ly + 8, { w: 1, color: '#7FA8C8', a: .22 * la * ss(lt, .3 + i * .03, 1 + i * .03), cap: 'butt' }); }
  for (let j = 0; j < 2; j++) { const sp = 685, span = 2074, px = ((W / 2 + j * 1037 + Math.max(0, lt) * sp) % span) - 77; fr.comet(px, ly, 240, 13, '#CFE6FF', (j === 0 ? 1 : ss(lt, .55, .9)) * a); }   // 两个光点相隔半个画面，约 3s 绕一圈
  dustText(fr, o.zh, W / 2, cy, { font: 'serifl', size: o.size || 178, track: o.track == null ? 58 : o.track, color: pal.ink, glow: 14, glowColor: '#BFD9F2', glowA: .35, a }, seg(lt, .5, 3.3), lt);
  fr.text(o.sub, W / 2 + 9, cy + 235, { font: 'serifm', size: 40, track: 20, color: pal.goldLo, a: ss(lt, 4.6, 5.6) * a, glow: 10, glowA: .3 });
  fr.text(o.en, W / 2, cy + 290, { font: 'mono', size: 15, track: 5.5, color: pal.label, a: ss(lt, 5.2, 6.2) * a });
}

/* ---------- 骰子（小型 3D：正交基 + 弱透视） ---------- */
const M3 = {
  rot(ax, ay, az) { const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az); return [[cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz], [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz], [-sy, sx * cy, cx * cy]]; },
  mul(m, v) { return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]]; },
  rx(a) { const c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; },
  ry(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; },
  rz(a) { const c = Math.cos(a), s = Math.sin(a); return [[c, -s, 0], [s, c, 0], [0, 0, 1]]; },
  /* 连乘：mm(A, B, C) = A·B·C，最右边的先作用 */
  mm(...ms) { return ms.reduce((A, B) => A.map(r => [0, 1, 2].map(j => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]))); },
};
/* 关键帧曲线：keys = [[t, v], ...]，Catmull-Rom 平滑穿过每个点 */
function track(keys, t) {
  const n = keys.length; if (t <= keys[0][0]) return keys[0][1]; if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t1, v1] = keys[i], [t2, v2] = keys[i + 1], v0 = keys[Math.max(0, i - 1)][1], v3 = keys[Math.min(n - 1, i + 2)][1], u = (t - t1) / (t2 - t1);
  return .5 * ((2 * v1) + (-v0 + v2) * u + (2 * v0 - 5 * v1 + 4 * v2 - v3) * u * u + (-v0 + 3 * v1 - 3 * v2 + v3) * u * u * u);
}
const FACES = [   // 法线 n，面内两轴 u、v，点数（对面相加得 7）
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], val: 1 }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], val: 6 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1], val: 3 }, { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], val: 4 },
  { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], val: 5 }, { n: [0, 0, 1], u: [-1, 0, 0], v: [0, 1, 0], val: 2 },
];
const PIPS = { 1: [[0, 0]], 2: [[-.5, -.5], [.5, .5]], 3: [[-.5, -.5], [0, 0], [.5, .5]], 4: [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]], 5: [[-.5, -.5], [.5, -.5], [0, 0], [-.5, .5], [.5, .5]], 6: [[-.5, -.55], [-.5, 0], [-.5, .55], [.5, -.55], [.5, 0], [.5, .55]] };
/* o: { a, wire 0..1（实体→金线框），label（线框面上的字，如 '1/6'），focal } */
function die(fr, cx, cy, size, R, o = {}) {
  const f = o.focal || 1500, a = o.a == null ? 1 : o.a, wire = o.wire || 0, x = fr.x; if (a <= 0) return;
  const P = v => { const r = M3.mul(R, v), s = f / (f + r[2] * size); return [cx + r[0] * size * s, cy + r[1] * size * s, r[2]]; };
  const L = [-.42, -.78, -.46];
  const vis = FACES.map(F => ({ F, n: M3.mul(R, F.n) })).filter(q => q.n[2] < -size / f * .2).sort((p, q) => q.n[2] - p.n[2]);
  for (const { F, n } of vis.reverse()) {
    const c = F.n, u = F.u, v = F.v, add = (p, q, k) => [p[0] + q[0] * k, p[1] + q[1] * k, p[2] + q[2] * k];
    const q4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => P(add(add(c, u, i * .93), v, j * .93)));
    const pc = P(c), A = P(add(c, u, 1)), B = P(add(c, v, 1)), ax = A[0] - pc[0], ay = A[1] - pc[1], bx = B[0] - pc[0], by = B[1] - pc[1];
    const dif = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]), br = .4 + .58 * dif;
    const quad = () => { const rr = .2; x.beginPath(); for (let i = 0; i < 4; i++) { const p = q4[i], pp = q4[(i + 3) % 4], pn = q4[(i + 1) % 4]; const s1 = [lerp(p[0], pp[0], rr), lerp(p[1], pp[1], rr)], s2 = [lerp(p[0], pn[0], rr), lerp(p[1], pn[1], rr)]; if (i === 0) x.moveTo(s1[0], s1[1]); else x.lineTo(s1[0], s1[1]); x.quadraticCurveTo(p[0], p[1], s2[0], s2[1]); } x.closePath(); };
    if (wire < 1) {
      x.save(); x.globalAlpha *= a * (1 - wire);
      const col = [238 * br, 228 * br, 208 * br].map(v => Math.min(255, v)), col2 = col.map(v => v * .8);
      const g = x.createLinearGradient(q4[0][0], q4[0][1], q4[2][0], q4[2][1]); g.addColorStop(0, rgba(col, 1)); g.addColorStop(1, rgba(col2, 1));
      quad(); x.lineJoin = 'round'; x.lineWidth = size * .15; x.strokeStyle = rgba(col.map(v => v * .93), 1); x.stroke(); x.fillStyle = g; x.fill();
      /* 点：在面的仿射坐标里画圆，自然变成透视里的椭圆；一点是红的、略大 */
      x.setTransform(ax, ay, bx, by, pc[0], pc[1]);
      for (const [pu, pv] of PIPS[F.val]) { const red = F.val === 1, r = red ? .25 : .155; const pg = x.createRadialGradient(pu - r * .25, pv - r * .25, 0, pu, pv, r); if (red) { pg.addColorStop(0, '#C8402A'); pg.addColorStop(1, '#8E2416'); } else { pg.addColorStop(0, '#3A2E26'); pg.addColorStop(1, '#17110D'); } x.fillStyle = pg; x.beginPath(); x.arc(pu, pv, r, 0, 6.2832); x.fill(); }
      x.restore();
    }
    if (wire > 0) {
      x.save(); x.globalAlpha *= a * wire; x.globalCompositeOperation = 'lighter';
      quad(); x.fillStyle = rgba('#D9B15F', .05); x.fill(); x.lineWidth = 2.2; x.strokeStyle = rgba('#E9C77B', .95); x.shadowColor = rgba('#E7C477', .9); x.shadowBlur = 14; x.stroke();
      if (o.label) {   // 字贴在面上：先把面的两根轴摆成"右、下"，否则有的面会镜像或倒着
        let ux = ax, uy = ay, vx = bx, vy = by; if (Math.abs(ux) < Math.abs(vx)) { [ux, uy, vx, vy] = [vx, vy, ux, uy]; }
        if (ux < 0) { ux = -ux; uy = -uy; } if (vy < 0) { vx = -vx; vy = -vy; }
        x.setTransform(ux / 100, uy / 100, vx / 100, vy / 100, pc[0], pc[1]); x.font = G.VK.fontOf('latinim', 66); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = rgba('#F3DFAE', 1); x.shadowBlur = 10; x.fillText(o.label, 0, 2);
      }
      x.restore();
    }
  }
}
/* 平面的骰面小图标（组合表、环绕标注用） */
function dieFace(fr, cx, cy, s, val, o = {}) {
  const a = o.a == null ? 1 : o.a; fr.rect(cx - s, cy - s, s * 2, s * 2, { r: s * .26, fill: o.fill || '#EFE6D3', a });
  for (const [pu, pv] of PIPS[val]) fr.circle(cx + pu * s * 1.05, cy + pv * s * 1.05, val === 1 ? s * .24 : s * .15, { fill: val === 1 ? '#B5301F' : '#2A211B', a });
}

/* ---------- 回纹边（A 的古代章节用） ---------- */
function meander(fr, y, a, color = '#8A6C3A') {
  const x = fr.x, u = 13; x.save(); x.globalAlpha *= a; x.strokeStyle = rgba(color, .55); x.lineWidth = 1.3; x.beginPath();
  for (let px = 60; px < W - 60; px += u * 2) { x.moveTo(px, y + u); x.lineTo(px, y); x.lineTo(px + u * 1.5, y); x.lineTo(px + u * 1.5, y + u * .75); x.lineTo(px + u * .5, y + u * .75); x.lineTo(px + u * .5, y + u * .35); x.lineTo(px + u, y + u * .35); }
  x.stroke(); x.beginPath(); x.moveTo(60, y + u + 5); x.lineTo(W - 60, y + u + 5); x.moveTo(60, y - 5); x.lineTo(W - 60, y - 5); x.strokeStyle = rgba(color, .3); x.stroke(); x.restore();
}

/* ---------- 数轴（细线 + 刻度 + 标注） ---------- */
function numberLine(fr, x0, x1, y, o) {
  const a = o.a == null ? 1 : o.a, k = o.k == null ? 1 : o.k, col = o.color || '#9FB6C8', lo = o.lo, hi = o.hi, X = v => lerp(x0, x1, (v - lo) / (hi - lo));
  fr.line(x0 - 30, y, lerp(x0 - 30, x1 + 30, k), y, { w: 1.3, color: col, a: .55 * a, cap: 'butt' });
  (o.ticks || []).forEach((v, i) => { const px = X(v), kk = ss(k, .2 + i * .08, .5 + i * .08); if (px < x0 - 31 || px > x1 + 31) return; fr.line(px, y - 9, px, y + 12, { w: 1.2, color: col, a: .6 * a * kk, cap: 'butt' }); fr.text(String(v), px, y + 38, { font: 'latin', size: 29, color: col, a: .85 * a * kk }); });
  return X;
}

/* 钟形曲线点列 */
function bellPts(x0, x1, yBase, hgt, n = 120, sig = .17) { const pts = []; for (let i = 0; i <= n; i++) { const u = i / n, g = Math.exp(-Math.pow((u - .5) / sig, 2) / 2); pts.push([lerp(x0, x1, u), yBase - hgt * g]); } return pts; }

/* ---------- B：仪表（把全片的核心概念做成一个读数，每来一个新例子就量一次） ----------
 * o: { value, max=150, redFrom=100, label='本能读数', zone='超常', caption='对象：自己的蛋', a } —— value 由外面按时间插值好再传进来 */
function gauge(fr, x, y, o) {
  const a = o.a == null ? 1 : o.a; if (a <= 0) return; const max = o.max || 150, red = o.redFrom == null ? 100 : o.redFrom, v = clamp(o.value, 0, max);
  const w = 346, h = 205, cx = x + w * .5, cy = y + h * .84, R = 118, A0 = Math.PI * 1.02, A1 = Math.PI * 1.98, ang = q => lerp(A0, A1, q / max), hot = v >= red;
  fr.g({ a }, () => {
    fr.rect(x, y, w, h, { r: 16, fill: '#14100C', a: .82 }); fr.rect(x, y, w, h, { r: 16, color: '#6E5F47', w: 1.2, a: .5 });
    if (hot) fr.glow(cx + 60, cy - 70, 150, '#FF5A3C', .22);
    fr.arc(cx, cy, R, A0, ang(red), { color: '#E9DFC8', w: 4, cap: 'butt' }); fr.arc(cx, cy, R, ang(red), A1, { color: '#E8402A', w: 6, cap: 'butt', glow: hot ? 12 : 0 });
    for (let q = 0; q <= max; q += 10) { const an = ang(q), big = q % 50 === 0, r0 = R - (big ? 15 : 8); fr.line(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0, cx + Math.cos(an) * R, cy + Math.sin(an) * R, { w: big ? 2.4 : 1.2, color: q >= red ? '#E8402A' : '#E9DFC8', a: .9, cap: 'butt' }); if (big && q > 0) fr.text(String(q), cx + Math.cos(an) * (R - 30), cy + Math.sin(an) * (R - 30) + 2, { font: 'sans', size: 17, color: q >= red ? '#F0705A' : '#D8CFBF' }); }
    fr.text(o.zone || '超常', cx + 86, y + 34, { font: 'sans', size: 21, color: '#F0705A', a: hot ? 1 : .55 });
    fr.text(o.label || '本能读数', cx, cy - 50, { font: 'sans', size: 21, track: 4, color: '#E9DFC8' });
    fr.text(String(Math.round(v)), cx, cy - 16, { font: 'sansh', size: 36, color: hot ? '#F0705A' : '#EEC672' });
    const an = ang(v); fr.line(cx, cy, cx + Math.cos(an) * (R - 20), cy + Math.sin(an) * (R - 20), { w: 3.2, color: hot ? '#F0705A' : '#EEC672' }); fr.circle(cx, cy, 8, { fill: '#C9A861' });
  });
  if (o.caption) { const cs = parseMark(o.caption), str = cs.map(c => c.ch).join(''); fr.chars(str, cx, y + h + 26, { font: 'sansm', size: 26, track: 2, color: '#F3EBDA', a, shadow: .7 }, i => cs[i].tone ? { color: '#F0705A' } : null); }
}

/* ---------- 全幅效果：都是往 fr.look.post 上叠，一帧可以叠好几个 ---------- */
function _post(fr, fn) { const prev = fr.look.post; fr.look.post = (x, t) => { if (prev) prev(x, t); fn(x, t); }; }
/* 闪：t0 是最亮的那一刻。A 用 rise .3 / fall .4 的暖米色；C 用 rise 0（一帧到顶）/ fall .35。o: { color, rise, fall, peak, edge } */
function flash(fr, t, t0, o = {}) {
  const rise = o.rise == null ? 0 : o.rise, fall = o.fall == null ? .35 : o.fall, pk = o.peak == null ? .85 : o.peak;
  const k = t < t0 ? (rise > 0 ? ss(t, t0 - rise, t0) : 0) : Math.exp(-(t - t0) * (3.2 / fall)); if (k < .01) return;
  _post(fr, x => { const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * .64), c = o.color || '#EADDB9'; g.addColorStop(0, rgba(c, k * pk)); g.addColorStop(1, rgba(o.edge || c, k * pk * .72)); x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over'; });
}
/* 一圈扩散的细环：和 flash 一起用，就是"定理落地"的那一下 */
function ripple(fr, t, t0, cx, cy, o = {}) { const k = seg(t, t0, t0 + (o.dur || 1.1)); if (k <= 0 || k >= 1) return; fr.circle(cx, cy, lerp(o.r0 || 40, o.r1 || 620, E.out3(k)), { color: o.color || '#DCEBFF', w: 1.6, a: (1 - k) * .8, add: true }); }
/* 泛黄旧片（B 讲"当年"的段落）：k 0..1。泛黄 + 椭圆暗角 + 片门抖动（整幅每隔一两秒横跳十几个像素，停几帧再回去）。
 * 它立刻作用在"已经画好的东西"上：先画场景，再调它，然后才画仪表和字幕 —— 这样仪表的红和字幕的白不会被染黄。o.weave === false 关掉抖动 */
function sepia(fr, k, o = {}) {
  if (k <= 0) return; const x = fr.x, g = Math.floor(fr.frame / 4); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
  if (o.weave !== false && hash(g * 7.13) > .86) x.drawImage(x.canvas, Math.round((hash(g * 3.7) - .5) * 28 * k), Math.round((hash(g * 5.1) - .5) * 8 * k));
  x.globalCompositeOperation = 'color'; x.fillStyle = rgba('#8C7550', k * .82); x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = rgba('#C9B38A', k * .35); x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
  x.translate(W / 2, H / 2); x.scale(1, H / W); const v = x.createRadialGradient(0, 0, W * .43, 0, 0, W * .72); v.addColorStop(0, rgba('#1E1408', 0)); v.addColorStop(1, rgba('#1E1408', .72 * k)); x.fillStyle = v; x.fillRect(-W, -W, W * 2, W * 2);
  x.restore();
}
/* 噪点：文案说到噪声时，画面真的变吵。k 0..1；按帧号取随机，seek 到哪一帧都一样 */
function noiseOverlay(fr, k, colors = ['#E84B75', '#64B8F6', '#FFFFFF']) { if (k <= 0) return; const f = fr.frame; _post(fr, x => { const r = rng(9173 + f * 31), n = Math.round(4200 * k); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { x.fillStyle = rgba(colors[i % colors.length], .25 + r() * .55 * k); x.fillRect(r() * W, r() * H, 2 + r() * 4, 1.5 + r() * 2); } x.globalCompositeOperation = 'source-over'; }); }
/* 章与章之间"暗一下"：返回 0..1 的亮度系数，乘到底和内容上。times = 每次最暗的时刻 */
function dips(t, times, half = .55) { let k = 1; for (const c of times) k = Math.min(k, 1 - (1 - smooth(clamp(Math.abs(t - c) / half))) ); return k; }

G.VKit = { gauge, flash, ripple, sepia, noiseOverlay, dips, PAL, SUB, parseMark, subs, track, odometer, hudYear, seal, chapterMark, rays, titleGilt, dustText, titleNight, M3, die, dieFace, meander, numberLine, bellPts };
})(window);
