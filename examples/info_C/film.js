/* 复刻：《信息论 · 惊奇之学》0–47s（填空钩子 ×2 → 坍缩成一点 → 闪 → 片名 → 第一章：猜数）
 * 目的是对照参考片验证 C 家族（夜曲 + 双语字幕 + 代码合成的声音）。 */
(function () {
'use strict';
const { W, H, clamp, lerp, seg, smooth, ss, E, fade, hash, rng, rgba, mix } = VK;
const K = VKit, P = K.PAL.night;

const SUBS = [
  { a: 4.0, b: 8.5, zh: '你一定猜到了下一个字。', en: 'You already know the next character.' },
  { a: 9.0, b: 13.6, zh: '所以它出现的时候，几乎没有带来任何新东西。', en: 'So when it arrives, it brings almost nothing new.' },
  { a: 16.0, b: 23.0, zh: '这一次，你猜不到。而猜不到的，才是信息。', en: 'This time you can’t guess. And what you can’t guess — that is information.' },
  { a: 39.0, b: 44.5, zh: '我心里想了一个数，在1到1024之间。', en: 'I’m thinking of a number between 1 and 1,024.' },
  { a: 45.0, b: 51.0, zh: '你只能问“是”或“否”的问题。最少要问几次？', en: 'You may only ask yes-or-no questions. How few will do?' },
];
const MARKS = [{ t: .4, no: '00', zh: '序', en: 'PROLOGUE' }, { t: 38.6, no: '01', zh: '猜', en: 'THE GUESS' }];

/* 逐字打出一行大字；返回排布，供光标/空格定位。at[i] = 第 i 个字敲下的时刻（同时登记一声"嗒"） */
function typeLine(fr, t, str, at, o, a = 1) {
  const lay = fr.layout(str + '　', W / 2, o);          // 末尾留一个全角空位给"空"
  fr.chars(str, lay[0].x, o.y, Object.assign({}, o, { align: 'l', a }), i => { const k = seg(t, at[i], at[i] + .34); if (t >= at[i] && t < at[i] + .034) fr.sfx(at[i], 'tick', { pitch: i }); return { a: .16 * ss(t, at[i] - .12, at[i]) + .84 * smooth(k) }; });
  return lay;
}
/* 惊奇刻度：一条细线 + 小刻度 + 一个发光的点；v 0..1 */
function meter(fr, t, x0, x1, y, v, color, label, a) {
  if (a <= 0) return [x0, y];
  fr.line(x0, y, x1, y, { w: 1.1, color: '#6F8AA0', a: .45 * a, cap: 'butt' });
  for (let i = 0; i <= 8; i++) fr.line(lerp(x0, x1, i / 8), y, lerp(x0, x1, i / 8), y + 6, { w: 1, color: '#6F8AA0', a: .4 * a, cap: 'butt' });
  fr.text('惊奇', x0, y - 32, { font: 'serifr', size: 22, track: 3, color: P.label, align: 'l', a });
  fr.text('SURPRISE', x0 + 66, y - 31, { font: 'latin', size: 23, track: 5, color: P.label, align: 'l', a });
  fr.text(label, x1 + 6, y - 35, { font: 'lora', size: 27, color, align: 'r', a });
  const px = lerp(x0, x1, v);
  if (v > .01) fr.line(x0, y, px, y, { w: 5, color, a, glow: 18, add: true });
  fr.spark(px, y, 15, color, a);
  return [px, y];
}

function hook1(fr, t) {
  const a = 1 - ss(t, 13.55, 13.95), o = { font: 'serifl', size: 100, track: 29, y: 437, color: P.ink, glow: 16, glowColor: '#BFD9F2', glowA: .35 };
  const lay = typeLine(fr, t, '床前明月', [1.02, 1.44, 1.86, 2.28], o, a), slot = lay[4];
  /* 空位：金色底线 + 一闪一闪的竖光标；5.7s 那个"猜得到的字"自己浮出来 */
  const ua = ss(t, 2.9, 3.3) * a, blink = ((t - 3.38) % 1) < .58 ? 1 : 0, guess = ss(t, 5.7, 6.2);
  fr.line(slot.x + 4, 487, slot.x + slot.w - 4, 487, { w: 2, color: P.gold, a: .8 * ua, glow: 6 });
  if (guess < 1) fr.line(slot.cx, 395, slot.cx, 480, { w: 2.2, color: P.gold, a: ua * blink * (1 - guess), glow: 8 });
  fr.text('光', slot.cx, 437, { font: 'serifl', size: 100, color: '#C9BE9C', a: guess * a * .82, glow: 10, glowA: .2 });
  if (t >= 5.7 && t < 5.734) fr.sfx(5.7, 'soft', {});
  meter(fr, t, 707, 1221, 640, 0, P.ice, '≈ 0 bit', ss(t, 6.3, 7.1) * a);
}
const CAND = Array.from('雪鱼星花灰火光歌信雨风梦');
function hook2(fr, t) {
  const a = Math.min(ss(t, 14.1, 14.3), 1 - ss(t, 22.6, 23.4)), o = { font: 'serifl', size: 92, track: 15, y: 436, color: P.ink, glow: 16, glowColor: '#BFD9F2', glowA: .35 };
  const str = '那天夜里，窗外下起了', at = Array.from(str).map((_, i) => 14.23 + i * .13);
  const lay = typeLine(fr, t, str, at, o, a), slot = lay[lay.length - 1];
  /* 空位上，候选字像老虎机一样往上滚：中间那个最亮，谁也停不下来 */
  const ca = ss(t, 15.8, 16.4) * a;
  if (ca > 0) {
    const p = (t - 15.8) / .46, base = Math.floor(p), f = p - base, ef = E.io3(f);
    fr.glow(slot.cx, 436, 170, P.gold, .3 * ca);
    for (let j = -2; j <= 2; j++) {
      const ch = CAND[((base + j) % CAND.length + CAND.length) % CAND.length], d = j - ef, y = 436 + d * 112, w = Math.exp(-d * d * 1.6);
      fr.text(ch, slot.cx, y, { font: 'serifl', size: 92, color: mix('#5A6470', P.gold, w), a: ca * (.14 + .86 * w), glow: 18 * w, glowA: .5, blur: (1 - w) * 2.2 });
    }
    if (f < .08 && t > 16) fr.sfx(15.8 + base * .46, 'tick', { pitch: base % 7, gain: .5 });
  }
  /* 这一次刻度被推到很右：金色 */
  const v = E.out3(seg(t, 16.5, 17.9)) * .82;
  return meter(fr, t, 707, 1221, 640, v, P.gold, '? bits', ss(t, 16.2, 16.9) * (1 - ss(t, 22.6, 23.2)));
}

/* 第一章：1 到 1024 的数轴，中间一团"想好了的数" */
function ch1(fr, t) {
  const lt = t - 38.6, a = ss(lt, 0, .9), up = E.io3(seg(t, 44.6, 45.6));
  const y = lerp(546, 300, up) + 246 * up;                                  // 数轴位置不动，只是给"?"让出上方
  const X = K.numberLine(fr, 154, 1759, 546, { lo: 1, hi: 1024, ticks: [200, 400, 600, 800, 1000], k: E.out3(seg(lt, 0, .7)), a, color: '#9FB6C8' });
  fr.line(154, 540, lerp(154, 1759, E.out3(seg(lt, .05, .75))), 540, { w: 6, color: '#F3D28A', a, glow: 20, add: true, cap: 'butt' });
  fr.line(154, 528, 154, 552, { w: 2, color: '#F3D28A', a }); if (lt > .7) fr.line(1759, 528, 1759, 552, { w: 2, color: '#F3D28A', a });
  fr.glow(960, 540, 120 + Math.sin(t * 2.1) * 14, P.gold, (.5 + .12 * Math.sin(t * 2.1)) * ss(lt, .5, 1.2));
  /* 巨大的金色问号：问题本身成了画面 */
  const qa = ss(t, 44.9, 45.8);
  if (qa > 0) { fr.glow(960, 262, 330, P.gold, .36 * qa); fr.text('?', 960, 262, { font: 'latin', size: 215, color: '#F1C98A', a: qa * (.86 + .14 * Math.sin(t * 2.6)), glow: 30, glowA: .6 }); if (t >= 45.0 && t < 45.034) fr.sfx(45.0, 'rise', { dur: .9 }); }
}

VK.film({
  dur: 47, theme: 'night', meta: { title: '信息论', family: 'C', bgm: 'synth' },
  draw(fr, t) {
    /* 夜空在片名处最满，章节之间整片暗一下 */
    const dip = K.dips(t, [14.05, 38.25]);
    fr.look.bgo = { core: (.75 + .25 * ss(t, 24, 26)) * dip, stars: lerp(.55, 1.25, ss(t, 24, 25.5) * (1 - ss(t, 37.5, 38.5))) * dip };
    K.chapterMark(fr, t, MARKS, 47.5);
    if (t < 14.0) hook1(fr, t);
    let dot = [1128, 640];
    if (t >= 14.0 && t < 23.5) dot = hook2(fr, t);
    /* 坍缩：刻度上的那个光点留下来，滑到正中，越来越亮 */
    if (t >= 22.6 && t < 24.05) { const k = E.io3(seg(t, 23.0, 23.9)); fr.spark(lerp(dot[0], 960, k), lerp(640, 573, k), lerp(15, 30, k), P.gold, ss(t, 22.6, 23.0)); if (t >= 23.0 && t < 23.034) fr.sfx(23.0, 'rise', { dur: 1.0 }); }
    /* 片名 */
    if (t >= 24.03 && t < 38.2) { const a = 1 - ss(t, 37.3, 38.0); K.titleNight(fr, t - 24.03, { zh: '信息论', sub: '惊奇之学', en: 'INFORMATION THEORY   ·   THE ART OF SURPRISE', a }); if (t < 24.064) fr.sfx(24.03, 'chord', { root: 0, gain: 1 }); }
    if (t >= 38.6) { ch1(fr, t); if (t < 38.634) fr.sfx(38.6, 'chord', { root: 5, gain: .7 }); }
    K.flash(fr, t, 24.03, { fall: .35, color: '#B9A679', edge: '#6E6247', peak: .92 });   // 闪：一帧到顶，约 0.35s 衰减
    K.subs(fr, t, SUBS, 'night');
  },
});
})();
