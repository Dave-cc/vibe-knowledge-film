/* 复刻：《超常刺激》0–12.5s（冷开场：蛎鹬丢下自己的蛋去孵巨大的假蛋 → 压暗 → 金字片名）
 * 目的是对照参考片验证 B 家族（程序画的扁平插画场景 + 粗黑体字幕 + 同一张金字片名卡）。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = VK;
const K = VKit;

const SUBS = [
  { a: .3, b: 3.0, zh: '一只鸟，丢下了自己的蛋' },
  { a: 3.2, b: 5.7, zh: '去孵一颗大得离谱的{!假蛋}' },
  { a: 6.0, b: 8.25, zh: '你的手机里，也有一颗' },
];

/* ---------- 场景件 ---------- */
/* 远景层：天、云、太阳、海、沙。镜头推拉时它只动一点点（视差），所以单独一层 */
function beach(fr, t) {
  const x = fr.x;
  let g = x.createLinearGradient(0, -200, 0, 432); g.addColorStop(0, '#8FA6B1'); g.addColorStop(.5, '#B4C5C6'); g.addColorStop(1, '#E6DCC4');
  fr.rect(-900, -500, 3900, 940, { fill: g });
  for (let i = 0; i < 9; i++) { const y = -60 + i * 50 + hash(i) * 26, w = 900 + hash(i + 4) * 1500, cx = -300 + hash(i + 9) * 2400 + t * (5 + i); fr.ellipse(cx, y, w / 2, 7 + hash(i + 2) * 10, { fill: '#FFFFFF', a: .12 }); }
  fr.glow(1410, 396, 150, '#FFEFC4', .6); fr.circle(1410, 396, 21, { fill: '#FFF8E2', a: .95 });                 // 太阳：小而亮，贴着海平线
  g = x.createLinearGradient(0, 405, 0, 440); g.addColorStop(0, '#93AFB3'); g.addColorStop(1, '#B4C6BE'); fr.rect(-900, 405, 3900, 36, { fill: g });
  fr.line(-900, 407, 3000, 407, { w: 2, color: '#E9F1EC', a: .6, cap: 'butt' }); fr.glow(1410, 420, 90, '#FFF1CC', .35);
  g = x.createLinearGradient(0, 430, 0, 1300); g.addColorStop(0, '#E4D5AC'); g.addColorStop(.35, '#DBC898'); g.addColorStop(1, '#CBB584'); fr.rect(-900, 432, 3900, 1000, { fill: g });
  const r = rng(11);
  for (let i = 0; i < 420; i++) { const px = -700 + r() * 3300, py = 450 + r() * r() * 700; fr.circle(px, py, .8 + r() * 1.5, { fill: '#8E7A52', a: .08 + r() * .14 }); }
  for (let i = 0; i < 22; i++) { const px = -600 + r() * 3100, py = 560 + r() * 520; fr.ellipse(px, py, 8 + r() * 8, 3.5 + r() * 3, { fill: '#9C8960', a: .5 }); }
}
function tuft(fr, x0, y0, h, seed, t, col = '#7F9460') {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) { const lean = (r() - .5) * h * .9 + Math.sin(t * 1.3 + seed + i) * 5, hh = h * (.55 + r() * .5), bx = x0 + (r() - .5) * 26; fr.path(`M ${bx},${y0} Q ${bx + lean * .25},${y0 - hh * .65} ${bx + lean},${y0 - hh}`, { color: i % 3 ? col : '#96A873', w: 3.4 - r() * 1.6 }); }
}
function speckEgg(fr, cx, cy, rx, ry, seed, base = '#D9CFB6') {
  fr.ellipse(cx, cy, rx, ry, { fill: base }); const r = rng(seed), x = fr.x;
  x.save(); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); x.clip();
  for (let i = 0; i < 16; i++) fr.ellipse(cx + (r() - .5) * rx * 1.8, cy + (r() - .5) * ry * 1.8, 1.5 + r() * 4, 1.2 + r() * 2.6, { fill: '#5B4630', a: .75, rot: r() * 3 });
  fr.ellipse(cx - rx * .3, cy - ry * .35, rx * .45, ry * .3, { fill: '#FFFFFF', a: .25 }); x.restore();
}
function nest(fr, cx, cy) {   // 一窝三颗自己的蛋：小、灰、不起眼
  fr.ellipse(cx, cy + 6, 150, 30, { fill: '#B9A070', a: .7 }); fr.ellipse(cx, cy, 138, 24, { fill: '#C9B285' });
  for (let i = 0; i < 14; i++) fr.line(cx - 130 + i * 20, cy + 10 + hash(i) * 8, cx - 118 + i * 20, cy + 4 + hash(i + 2) * 8, { w: 3, color: '#F2E8CF', a: .8 });
  speckEgg(fr, cx - 34, cy - 12, 26, 20, 3); speckEgg(fr, cx + 30, cy - 14, 26, 20, 5); speckEgg(fr, cx - 2, cy + 2, 27, 21, 7);
}
/* 巨大的假蛋：暖黄底 + 深色大斑 + 两道高光 + 一圈红晕（"超常"永远用红晕标出来） */
function bigEgg(fr, cx, cy, s, t) {
  const x = fr.x, rx = 215 * s, ry = 162 * s;
  fr.glow(cx, cy, rx * 1.9, '#FF5A3C', .3 + .05 * Math.sin(t * 2)); fr.ellipse(cx + 8, cy + ry * .99, rx * .9, 20 * s, { fill: '#6B5532', a: .35 });
  const g = x.createRadialGradient(cx - rx * .35, cy - ry * .4, rx * .1, cx, cy, rx * 1.05); g.addColorStop(0, '#F3D684'); g.addColorStop(.6, '#DDAE4A'); g.addColorStop(1, '#B07C26');
  x.save(); x.beginPath(); x.ellipse(cx, cy, rx, ry, -.12, 0, 6.2832); x.fillStyle = g; x.fill(); x.clip();
  const r = rng(99);
  for (let i = 0; i < 46; i++) { const big = i < 12, px = cx + (r() - .5) * rx * 1.9, py = cy + (r() - .35) * ry * 1.7; fr.ellipse(px, py, (big ? 26 + r() * 40 : 4 + r() * 12) * s, (big ? 16 + r() * 22 : 3 + r() * 8) * s, { fill: '#3B2414', a: .92, rot: r() * 3 }); }
  fr.ellipse(cx - rx * .2, cy - ry * .42, rx * .5, ry * .34, { color: '#FFFFFF', w: 9 * s, a: .5, a0: 3.5, a1: 4.9 });
  fr.ellipse(cx - rx * .05, cy - ry * .2, rx * .3, ry * .2, { color: '#FFFFFF', w: 6 * s, a: .35, a0: 3.7, a1: 4.6 }); x.restore();
}
/* 蛎鹬：黑背白腹、橙红长喙、红眼、粉腿。原点在两脚之间，朝右；step 走路相位，bow 低头角度，sit 卧下，wing 振翅 0..1 */
function bird(fr, cx, cy, s, step, bow, sit = 0, wing = 0) {
  fr.g({ at: [cx, cy], s }, () => {
    const lift = Math.sin(step * 6.2832), legA = lift * 16 * (1 - sit), body = -Math.abs(Math.cos(step * 6.2832)) * 4 * (1 - sit) + sit * 40;
    if (sit < .95) { fr.line(-10, -66 + body, -12 - legA, 0, { w: 6, color: '#E7A2A0' }); fr.line(14, -66 + body, 14 + legA, 0, { w: 6, color: '#E7A2A0' }); fr.line(-12 - legA, 0, 6 - legA, 2, { w: 5, color: '#E7A2A0' }); fr.line(14 + legA, 0, 32 + legA, 2, { w: 5, color: '#E7A2A0' }); }
    fr.g({ at: [0, body], rot: bow * .35 - wing * .25 }, () => {
      if (wing > 0) for (const [wx, k] of [[-46, 1], [0, .8]]) fr.g({ at: [wx, -120], rot: -.5 - wing * .5, s: [1, wing * k] }, () => { fr.path('M -70,0 C -66,-90 -40,-150 -92,-196 C -30,-170 10,-90 30,0 Z', { fill: '#1B1A1D' }); fr.path('M -40,-40 C -44,-90 -52,-130 -70,-160', { color: '#F3F0E8', w: 4, a: .8 }); });
      fr.path('M -160,-96 C -95,-152 15,-172 72,-136 C 98,-116 92,-82 52,-68 C 0,-54 -85,-62 -160,-96 Z', { fill: '#1B1A1D' });
      fr.path('M -66,-71 C -22,-52 42,-56 74,-86 C 60,-100 18,-93 -12,-89 C -34,-85 -52,-79 -66,-71 Z', { fill: '#F3F0E8' });
      fr.path('M -120,-98 C -70,-118 -20,-118 30,-104', { color: '#F3F0E8', w: 3.5, a: .85 }); fr.path('M -128,-90 C -80,-106 -30,-106 14,-95', { color: '#F3F0E8', w: 2, a: .6 });
      fr.g({ at: [78, -138], rot: bow }, () => {
        fr.circle(10, -12, 31, { fill: '#1B1A1D' });
        const g = fr.grad(34, 0, 136, 0, [[0, '#E4582A'], [1, '#F29544']]); fr.path('M 34,-22 L 138,-2 L 34,-4 Z', { fill: g });
        fr.circle(18, -18, 8, { fill: '#D8392A' }); fr.circle(18, -18, 3.6, { fill: '#140E0E' }); fr.circle(18, -18, 8, { color: '#F29544', w: 1.6 });
      });
    });
  });
}

function titleMotif(fr, lt, a) {                                 // 片名卡的母题：一枚蛋形的细线
  fr.ellipse(W / 2, 520, 300 * ss(lt, .1, 1.1), 420 * ss(lt, .1, 1.1), { color: '#C9A861', w: 1.4, a: .45 * a });
}

/* 机位量自参考帧：演员层先贴近再拉开（1.7×→1.0×），远景层只跟着动一成八 */
const CX = [[0, 905], [2.2, 922], [4.5, 1102], [6.9, 949], [8.2, 949]], CY = [[0, 640], [2.2, 636], [4.5, 600], [6.9, 543], [8.2, 540]], CS = [[0, 1.7], [2.2, 1.61], [4.5, 1.31], [6.9, 1.03], [8.2, 1.0]];
VK.film({
  dur: 12.5, theme: 'flat', meta: { title: '超常刺激', family: 'B', bgm: 'external' },
  draw(fr, t) {
    fr.look.bgo = { color: '#0C0705' };
    const dark = ss(t, 7.4, 7.95);                               // 场景压暗进片名
    fr.look.bloom = lerp(.12, .36, dark);
    if (dark < 1) {
      const cx = K.track(CX, t), cy = K.track(CY, t), cs = K.track(CS, t), sb = 1 + (cs - 1) * .18;
      fr.g({ at: [W / 2, H / 2], s: sb }, () => fr.g({ at: [-W / 2 - (cx - 949) * .25, -H / 2] }, () => {
        beach(fr, t);
        for (const [gx, gy, gh, sd] of [[-40, 470, 90, 1], [330, 452, 70, 2], [640, 468, 96, 3], [1010, 450, 66, 4], [1320, 470, 84, 5], [1640, 455, 100, 6], [1930, 472, 80, 7], [-360, 465, 90, 8], [2240, 460, 90, 9]]) tuft(fr, gx, gy, gh, sd, t);
      }));
      fr.g({ at: [W / 2, H / 2], s: cs }, () => fr.g({ at: [-cx, -cy] }, () => {
        fr.g({ at: [576, 724], s: .72 }, () => nest(fr, 0, 0));
        /* 走到蛋边 → 扑上去 → 卧下 */
        const w1 = E.io3(seg(t, .2, 1.7)), w2 = E.io3(seg(t, 3.0, 4.05)), hop = seg(t, 4.1, 5.0), sit = ss(t, 4.95, 5.4), eh = E.io3(hop);
        const bx = lerp(lerp(740, 900, w1), 1010, w2) + eh * 205, by = 735 - eh * 177 - Math.sin(hop * Math.PI) * 115 + Math.sin(t * 2.2) * 1.5 * sit;
        bigEgg(fr, 1210, 660, .67, t);
        const look = t < 3.2 ? .08 + .1 * Math.sin(t * 1.5) * ss(t, 1.7, 2.2) : 0;
        bird(fr, bx, by, .7, (w1 * 160 + w2 * 110) / 62, look - sit * .05, sit, Math.sin(hop * Math.PI));
      }));
      for (const [gx, gy, gh, sd] of [[30, 1105, 240, 11], [1885, 1110, 280, 12], [1700, 1120, 200, 13]]) tuft(fr, gx - (cx - 949) * .5, gy, gh, sd, t, '#657A4B');   // 前景草：视差更大
      fr.rect(0, 0, W, H, { fill: fr.rgrad(W / 2, H / 2, H * .5, W * .75, [[0, '#2A1C0C', 0], [1, '#2A1C0C', .34]]) });                            // 画面自带一圈暖暗角
      if (dark > 0) fr.rect(0, 0, W, H, { fill: '#0C0705', a: dark * .98 });
    }
    if (t > 7.5) { const lt = t - 7.75, a = 1 - ss(t, 11.9, 12.45); if (lt > 0) K.titleGilt(fr, lt, { cy: 455, size: 196, track: 26, rays: 1.1, tagDy: 212, la: 'SUPERNORMAL STIMULI', zh: '超常刺激', tag: '为什么奶茶戒不掉，短视频停不下来', motif: titleMotif, a }); if (t >= 7.75 && t < 7.784) fr.sfx(7.75, 'bloom', { gain: .9 }); }
    K.subs(fr, t, SUBS, 'flat');
  },
});
})();
