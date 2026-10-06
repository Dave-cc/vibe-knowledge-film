/* 货架图：把 vk-kit.js 里的件各演一遍。不是一条片子，是给人翻的样品。
 *   python engine/render.py examples/kit_gallery --sheet 1.6 4.6 7.6 10.4 13.4 16.4 19.6 22.3
 */
(function () {
'use strict';
const { W, H, lerp, seg, ss, E, fade, rgba } = VK;
const K = VKit, M3 = K.M3;

const SUBS_A = [{ a: .2, b: 2.9, zh: '字幕逐字由虚变实，{关键词}染金，{!负面词}染红。' }, { a: 6.2, b: 8.9, zh: '全片最重的一句，可以{放大}。', big: 1 }];
const SUBS_B = [{ a: 9.2, b: 11.9, zh: '粗黑体逐字亮起，{!超常}的东西永远是红的' }];
const SUBS_C = [{ a: 12.2, b: 14.9, zh: '整行淡入，下面跟一行英文。', en: 'The line fades in; an English line follows.' }, { a: 21.2, b: 23.8, zh: '说到{!噪声}，画面真的变吵。', en: 'When the script says noise, the picture gets noisy.' }];
const YEARS = [{ t: 0, year: '1494', place: '威尼斯 · 帕乔利', src: { la: 'Summa de Arithmetica', zh: '《算术大全》', by: '卢卡·帕乔利 · 威尼斯 · 1494', until: 1.6 } }, { t: 1.6, year: '1654', place: '巴黎 · 帕斯卡', src: { la: 'Traité du triangle arithmétique', zh: '《论算术三角》', by: '布莱兹·帕斯卡 · 巴黎 · 1654' } }];
const MARKS = [{ t: 12, no: '02', zh: '惊', en: 'SURPRISE' }];

VK.film({
  dur: 24, theme: 'gilt', meta: { title: 'kit gallery' },
  draw(fr, t) {
    if (t < 3) {                                   // A：年份栏 + 出处 + 字幕
      fr.look.bgo = { warm: .9, floor: .4 }; K.hudYear(fr, t, YEARS, 3.2);
      fr.text('hudYear · subs(gilt)', W / 2, 520, { font: 'mono', size: 26, color: '#6E675C' });
    } else if (t < 6) {                            // A / B：金字片名卡
      fr.look.bgo = { warm: .35, pool: .7 }; K.flash(fr, t, 3.05, { rise: .05, fall: .4, peak: .6 });
      K.titleGilt(fr, t - 3.05, { la: 'TITULUS LATINUS', zh: '片名四字', tag: '一句人话的副题', motif: (f, lt, a) => { const p = K.bellPts(515, 1405, 707, 92); f.poly(p, { k: E.io3(seg(lt, .85, 1.5)), color: '#F1D694', w: 2.2, a, glow: 10 }); } });
    } else if (t < 9) {                            // A：骰子（实体 → 线框）、骰面图标、朱印
      fr.look.bgo = { warm: .7, horizon: 1 }; const lt = t - 6, R = M3.mm(M3.rx(.6), M3.ry(.8 + lt * .25));
      K.die(fr, 620, 430, 120, R, { wire: ss(lt, 1.2, 1.9), label: '1/6' });
      for (let v = 1; v <= 6; v++) K.dieFace(fr, 980 + v * 64, 380, 22, v);
      K.seal(fr, 1210, 520, 54, ['中', '断'], ss(lt, .4, .6), { rot: -.12 }); K.seal(fr, 1400, 520, 22, ['文', '献']);
    } else if (t < 12) {                           // B：仪表 + 泛黄旧片
      fr.look.bg = 'flat'; fr.look.bgo = { color: '#D9C596' }; fr.look.bloom = .12; const lt = t - 9;
      fr.rect(0, 0, W, 432, { fill: fr.grad(0, 0, 0, 432, [[0, '#8FA6B1'], [1, '#E6DCC4']]) });
      K.sepia(fr, ss(lt, 1.6, 2.2));               // 先场景，再泛黄，然后才是仪表和字幕
      K.gauge(fr, 46, 40, { value: lerp(60, 149, E.io3(seg(lt, .4, 1.8))), caption: lt < 1.1 ? '对象：自己的蛋' : '对象：{大一号的假蛋}' });
      fr.text('gauge · sepia · subs(flat)', W / 2, 520, { font: 'mono', size: 26, color: '#5C4F38' });
    } else if (t < 15) {                           // C：章节标、光点、彗尾、数轴、双语字幕
      fr.look.bg = 'night'; fr.look.bloom = 1; const lt = t - 12; K.chapterMark(fr, t, MARKS, 15.2);
      fr.text('床前明月光', W / 2, 330, { font: 'serifl', size: 100, track: 29, color: '#F8F9F8', glow: 16, glowColor: '#BFD9F2', glowA: .35 });
      const X = K.numberLine(fr, 400, 1520, 560, { lo: 0, hi: 10, ticks: [0, 2, 4, 6, 8, 10], k: E.out3(seg(lt, 0, .8)) });
      fr.spark(X(3), 560, 14, '#64E3F6'); fr.comet(lerp(700, 1500, seg(lt, .3, 2.6)), 660, 240, 13, '#CFE6FF', 1);
    } else if (t < 21) {                           // C：点阵聚成片名
      fr.look.bg = 'night'; fr.look.bloom = 1; K.flash(fr, t, 15.03, { fall: .35, color: '#B9A679', peak: .8 });
      K.titleNight(fr, t - 15.03, { zh: '片名', sub: '四字副题', en: 'ENGLISH LINE   ·   IN SMALL CAPS', a: 1 - ss(t, 20.4, 20.95) });
    } else {                                       // C：定理落地（闪 + 细环 + 静音）之前，先吵起来
      fr.look.bg = 'night'; fr.look.bloom = 1; const k = K.dips(t, [21.0]); fr.look.bgo = { core: k, stars: k };
      K.noiseOverlay(fr, ss(t, 21.2, 22.4) * (t < 22.6 ? 1 : 0)); K.flash(fr, t, 22.6, { fall: .5, color: '#CFE0F2', peak: .8 }); K.ripple(fr, t, 22.6, W / 2, 430);
      fr.text('我，不可证明。', W / 2, 430, { font: 'serifl', size: 96, track: 16, color: t < 22.6 ? '#F8F9F8' : '#F8D893', glow: 18, glowA: .4 });
      if (t >= 22.6 && t < 22.634) { fr.sfx(22.6, 'chord', { gain: .8 }); fr.sfx(22.75, 'hush', { dur: 1.0 }); }
    }
    K.subs(fr, t, SUBS_A, 'gilt'); K.subs(fr, t, SUBS_B, 'flat'); K.subs(fr, t, SUBS_C, 'night');
  },
});
})();
