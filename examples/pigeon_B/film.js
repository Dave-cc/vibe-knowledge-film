/* 《鸽子的迷信》开头 · 寓言 · 33 秒 · 六个镜头，只讲一件事：食物按时间来，它却碰巧在转圈。分镜表见同目录 storyboard.md。
 * 事实（2026-10-06 联网核对）：B. F. Skinner, "'Superstition' in the pigeon", J. Exp. Psychol. 38 (1948)。
 *   八只饿着的鸽子各关一个箱子，食槽每 15 秒打开一次，和鸽子做什么无关；六只练出了各自重复的动作，
 *   其中一只是逆时针转圈，两次喂食之间转两三圈。
 * 示意：箱子、计时器和鸽子的样子是画的；其余几只鸽子的动作按论文的描述取了转圈、点头、左右摆、扑翅。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, ss, E } = VK;
const K = VKit;

const T = { s2: 4.0, s3: 9.0, s4: 15.6, s5: 19.2, s6: 26.5, end: 32.8 }, FOOD = [15, 30];     // 计时器按真实时间走：第 15 秒、第 30 秒各掉一次
const SUBS = [
  { a: .4,   b: 3.6,  zh: '1948 年，一只饿着的鸽子被关进箱子' },
  { a: 4.3,  b: 8.6,  zh: '墙上的食槽，每 15 秒打开一次' },
  { a: 9.4,  b: 12.8, zh: '鸽子不知道。它只是饿，到处找吃的' },
  { a: 15.4, b: 18.8, zh: '食物掉下来那一刻，它碰巧在转圈' },
  { a: 19.8, b: 23.4, zh: '于是，它又转了一圈' },
  { a: 26.9, b: 29.6, zh: '再转一圈' },
  { a: 30.3, b: 32.3, zh: '15 秒到了，食物又来了', tone: 'gold' },
];
const WOOD = '#7A5236', WOOD2 = '#5C3C26', WALL = '#D8C9A8', GRAIN = '#E9B93A';

/* ---------- 一只鸽子：色块拼的。turn 身体转了多少（弧度），peck 低头啄，flap 扑翅，sway 左右摆 ---------- */
function pigeon(fr, x, y, s, o = {}) {
  const c = Math.cos(o.turn || 0), sx = (Math.abs(c) < .32 ? .32 * (c < 0 ? -1 : 1) : c) * s, peck = o.peck || 0, a = o.a == null ? 1 : o.a;
  fr.ellipse(x, y + 4 * s, 64 * s, 10 * s, { fill: '#000000', a: .22 * a });
  fr.g({ at: [x + (o.sway || 0) * 14 * s, y], s: [sx, s], a }, () => {
    fr.line(-8, -18, -8, 0, { w: 6, color: '#D9707E' }); fr.line(18, -18, 18, 0, { w: 6, color: '#D9707E' }); fr.line(-18, 0, 4, 0, { w: 5, color: '#D9707E' }); fr.line(8, 0, 30, 0, { w: 5, color: '#D9707E' });
    fr.g({ rot: peck * .55 + (o.sway || 0) * .12 }, () => {
      fr.path('M -58,-78 L -128,-58 L -122,-40 L -52,-46 Z', { fill: '#5E6B82' });
      fr.ellipse(0, -62, 72, 48, { fill: '#93A0B6' });
      fr.g({ at: [-6, -70], rot: -(o.flap || 0) * 1.1 }, () => { fr.ellipse(-4, 6, 50, 30, { fill: '#6F7D96' }); fr.rect(-40, 8, 64, 7, { r: 3, fill: '#3F4A5E' }); fr.rect(-44, 22, 58, 7, { r: 3, fill: '#3F4A5E' }); });
      fr.ellipse(50, -100, 26, 40, { fill: '#8492AA', rot: .25 }); fr.ellipse(50, -92, 23, 17, { fill: '#4E9A7E', rot: .25 }); fr.ellipse(54, -82, 20, 11, { fill: '#8A62A8', rot: .25 });
      const hb = (o.bob || 0) * 8;
      fr.circle(62 + hb, -138, 23, { fill: '#93A0B6' }); fr.path(`M ${82 + hb},-142 L ${108 + hb},-134 L ${82 + hb},-128 Z`, { fill: '#3A3A44' }); fr.circle(84 + hb, -142, 5, { fill: '#F2EDE2' });
      fr.circle(68 + hb, -143, 6.5, { fill: '#E8842A' }); fr.circle(68 + hb, -143, 3, { fill: '#1E1A1A' });
    });
  });
}
/* 计时器：一圈 15 秒。全片的那把尺子 */
function timer(fr, x, y, r, t, a = 1) {
  const ph = ((t % 15) + 15) % 15, ang = -Math.PI / 2 + ph / 15 * Math.PI * 2, hit = 1 - seg(ph, 0, .5);
  fr.g({ a }, () => {
    fr.circle(x, y, r * 1.12, { fill: '#2B2420' }); fr.circle(x, y, r, { fill: '#F3EAD6' });
    for (let i = 0; i < 15; i++) { const b = -Math.PI / 2 + i / 15 * 6.2832; fr.line(x + Math.cos(b) * r * .82, y + Math.sin(b) * r * .82, x + Math.cos(b) * r * .94, y + Math.sin(b) * r * .94, { w: i % 5 ? r * .025 : r * .05, color: '#3A2A22', cap: 'butt' }); }
    fr.path(`M ${x},${y} L ${x},${y - r * .94} A ${r * .94} ${r * .94} 0 ${ph > 7.5 ? 1 : 0} 1 ${x + Math.cos(ang) * r * .94},${y + Math.sin(ang) * r * .94} Z`, { fill: '#E0592F', a: .28 });
    fr.line(x, y, x + Math.cos(ang) * r * .78, y + Math.sin(ang) * r * .78, { w: r * .07, color: '#E0592F' }); fr.circle(x, y, r * .09, { fill: '#3A2A22' });
    fr.text('15', x, y + r * .42, { font: 'sansh', size: r * .34, color: '#3A2A22' }); fr.text('秒', x, y + r * .66, { font: 'sans', size: r * .17, color: '#6B5846' });
    if (hit > 0) fr.glow(x, y, r * 2, '#FFD27A', .5 * hit);
  });
}
/* 箱子里：墙、地、右边的食槽。drop = 这一刻有没有食物掉下来（0..1 的进度） */
function box(fr, t, drop) {
  fr.rect(0, 0, W, H, { fill: WOOD2 }); fr.rect(70, 60, W - 140, 770, { fill: WALL });
  for (let i = 0; i < 9; i++) fr.rect(70, 60 + i * 86, W - 140, 2, { fill: '#C4B38E', a: .7 });
  fr.rect(70, 760, W - 140, 70, { fill: '#B49D74' }); fr.rect(70, 756, W - 140, 8, { fill: '#9A835C' });
  fr.rect(0, 0, 70, H, { fill: WOOD }); fr.rect(W - 70, 0, 70, H, { fill: WOOD }); fr.rect(0, 0, W, 60, { fill: WOOD }); fr.rect(0, 830, W, 250, { fill: WOOD2 });
  /* 食槽：墙上一个口，下面一个盘 */
  const open = drop > 0 ? Math.min(1, Math.min(drop * 5, (1 - drop) * 3)) : 0;
  fr.rect(1560, 520, 220, 150, { r: 12, fill: '#2B2420' }); fr.rect(1574, 534, 192, 122 * (1 - open), { r: 8, fill: '#8A7250' });
  fr.path('M 1530,700 L 1800,700 L 1770,760 L 1560,760 Z', { fill: '#3A2A22' });
  for (let i = 0; i < 16; i++) { const k = clamp(drop * 2.2 - i * .04); if (drop <= 0) break; const gx = 1600 + (i * 37 % 140), gy = lerp(600, 712 + (i % 3) * 6, E.in2(k)); fr.circle(gx, gy, 9, { fill: GRAIN, a: k > 0 ? 1 : 0 }); }
}
const dropAt = (t, t0) => seg(t, t0, t0 + 1.8);
/* 转圈的轨迹：一道带箭头的弧 */
function spin(fr, x, y, r, a) { if (a <= 0) return; fr.g({ a: a * .85 }, () => { fr.ellipse(x, y, r, r * .9, { color: '#E0592F', w: 9, a0: -2.5, a1: 2.0, dash: [26, 18] }); const ex = x + Math.cos(2.0) * r, ey = y + Math.sin(2.0) * r * .9; fr.path(`M ${ex + 30},${ey - 26} L ${ex - 34},${ey - 2} L ${ex + 20},${ey + 34} Z`, { fill: '#E0592F' }); }); }

/* ---------- 六个镜头 ---------- */
function s1(fr, t) {                                        // 全景：实验室桌上的一只箱子
  const x = fr.x, g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3B3440'); g.addColorStop(1, '#241F28'); fr.rect(0, 0, W, H, { fill: g });
  fr.glow(960, 250, 620, '#FFD9A0', .22); fr.path('M 900,0 L 1020,0 L 1060,150 L 860,150 Z', { fill: '#1E1A20' }); fr.ellipse(960, 152, 100, 16, { fill: '#FFE7B0' });
  fr.rect(0, 720, W, 360, { fill: '#5A4034' }); fr.rect(0, 712, W, 14, { fill: '#7A5846' });
  const k = E.out3(seg(t, 0, 3.4)), s = lerp(.92, 1.06, k);
  fr.g({ at: [960, 500], s }, () => {
    fr.rect(-330, -210, 660, 430, { r: 10, fill: WOOD }); fr.rect(-300, -180, 600, 370, { fill: WALL }); fr.rect(-300, 140, 600, 50, { fill: '#B49D74' });
    fr.rect(210, -30, 70, 60, { r: 6, fill: '#2B2420' }); fr.rect(190, 60, 110, 22, { fill: '#3A2A22' });
    pigeon(fr, -40, 144, .92, { bob: Math.sin(t * 5) * .5 + .5 });
    fr.rect(-330, -210, 660, 30, { fill: WOOD2 });
  });
  timer(fr, 380, 420, 82, t, ss(t, 1.4, 2.0));
  fr.text('1948', 110, 96, { font: 'sansh', size: 44, color: '#EEC672', align: 'l', a: ss(t, .6, 1.1) }); fr.text('斯金纳的实验室', 250, 98, { font: 'sans', size: 30, color: '#B9AFA0', align: 'l', a: ss(t, .8, 1.3) });
}
/* 鸽子这 30 秒在干什么：找吃的 → 碰巧转了一圈 → 吃 → 又转、再转。返回 { x, turn, peck, bob, trail } */
const K3 = (t, pts) => { let i = 0; while (i < pts.length - 2 && t >= pts[i + 1][0]) i++; const p = pts[i], q = pts[i + 1]; return lerp(p[1], q[1], E.io3(seg(t, p[0], q[0]))); };
function act(t) {
  const x = K3(t, [[9, 760], [10.3, 1040], [11.6, 1040], [13.2, 800], [15.2, 800], [16.0, 1330], [19.0, 1330], [19.9, 860], [30.2, 860], [30.9, 1330], [33, 1330]]);
  const PI = Math.PI, turn = K3(t, [[9, 0], [11.5, 0], [11.9, PI], [13.4, PI], [15.0, 3 * PI], [15.3, 4 * PI], [19.0, 4 * PI], [19.3, 5 * PI], [20.2, 5 * PI], [22.2, 7 * PI], [23.6, 7 * PI], [25.6, 9 * PI], [26.4, 9 * PI], [28.0, 11 * PI], [28.4, 11 * PI], [29.9, 13 * PI], [30.2, 14 * PI], [33, 14 * PI]]);
  const pk = (a, b) => t > a && t < b ? Math.max(0, Math.sin((t - a) * 9)) * .8 : 0, peck = pk(10.4, 11.5) + pk(16.2, 18.9) + pk(31.1, 32.6);
  const moving = (t > 9 && t < 10.3) || (t > 11.9 && t < 13.2) || (t > 15.2 && t < 16) || (t > 19 && t < 19.9) || (t > 30.2 && t < 30.9);
  const trail = Math.max(seg(t, 13.5, 13.9) * (1 - ss(t, 15.0, 15.3)), seg(t, 20.2, 20.6) * (1 - ss(t, 29.9, 30.2)));
  return { x, turn, peck, bob: moving ? Math.sin(t * 12) * .5 + .5 : .5, trail };
}
const drops = t => t < 19.2 ? dropAt(t, FOOD[0]) : dropAt(t, FOOD[1]);
function bird(fr, t, s = 2.1) { const a = act(t); spin(fr, a.x, 610, 330, a.trail); pigeon(fr, a.x, 760, s, a); }

function s2(fr, t) {                                        // 特写：计时器和食槽（还没到时间，挡板关着）
  box(fr, t, 0); timer(fr, 640, 430, 260, t);
  fr.line(930, 430, 1500, 590, { w: 5, color: '#3A2A22', a: .5 * ss(t, 5.0, 5.8), dash: [18, 14] });      // 计时器连着食槽
}
function s3(fr, t) { box(fr, t, drops(t)); timer(fr, 230, 220, 110, t); bird(fr, t); }                       // 中景：找吃的；碰巧转了一圈；食物掉下来
function s4(fr, t) { fr.g({ at: [960, 560], s: 1.55 }, () => fr.g({ at: [-1400, -640] }, () => { box(fr, t, drops(t)); bird(fr, t); })); }      // 近景：它在食槽边吃
function s5(fr, t) { const z = lerp(1.08, 1.2, seg(t, T.s5, T.s6)); fr.g({ at: [960, 600], s: z }, () => fr.g({ at: [-900, -600] }, () => { box(fr, t, drops(t)); timer(fr, 300, 240, 110, t); bird(fr, t); })); }   // 它又转；镜头慢慢推
function s6(fr, t) {                                        // 计时器在前，它在后面转；第 30 秒，食物又来了
  box(fr, t, drops(t)); const a = act(t);
  const px = Math.min(a.x + 330, 1400); spin(fr, px, 640, 250, a.trail); pigeon(fr, px, 760, 1.6, a);
  timer(fr, 560, 430, 270, t);
}
const SHOTS = [[0, T.s2, s1], [T.s2, T.s3, s2], [T.s3, T.s4, s3], [T.s4, T.s5, s4], [T.s5, T.s6, s5], [T.s6, T.end, s6]];

VK.film({
  dur: T.end, theme: 'flat', meta: { title: '鸽子的迷信', root: 0 },
  draw(fr, t) {
    fr.look.bgo = { color: '#17121E' };
    const sh = SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];
    const cut = Math.min(ss(t, sh[0], sh[0] + (sh[0] ? .22 : .5)), 1 - ss(t, sh[1] - (sh[1] >= T.end ? .6 : .22), sh[1]));     // 镜头之间暗一下
    fr.g({ a: cut }, () => {
      sh[2](fr, t);
      const x = fr.x, g = x.createRadialGradient(W / 2, 520, H * .55, W / 2, 520, W * .72); g.addColorStop(0, 'rgba(20,10,10,0)'); g.addColorStop(1, 'rgba(20,10,10,.5)'); fr.rect(0, 0, W, H, { fill: g });
      const b = x.createLinearGradient(0, 820, 0, H); b.addColorStop(0, 'rgba(18,12,20,0)'); b.addColorStop(.5, 'rgba(18,12,20,.75)'); b.addColorStop(1, 'rgba(18,12,20,.9)'); fr.rect(0, 820, W, 260, { fill: b });
    });
    fr.sfx(.3, 'chord', { root: 0, gain: .6 });
    for (let i = 1; i < 30; i++) fr.sfx(i, 'tick', { pitch: 0, gain: i % 15 > 11 ? .55 : .25 });                 // 计时器每秒一声，快到点时响一些
    FOOD.forEach(f => { fr.sfx(f, 'tock', { pitch: 1 }); fr.sfx(f + .1, 'thud', { gain: .6 }); });
    fr.sfx(30.3, 'chord', { root: -5, gain: .7 });
    K.subs(fr, t, SUBS, 'flat');
  },
});
})();
