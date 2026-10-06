# -*- coding: utf-8 -*-
"""生成"折好的一团"的珠子位置 → layout.js

在珠距为 D 的六角格子上取一个近似圆盘（146 个格点），找一条走遍所有格点、每步只走到相邻格点的路。
路径上第 i 个点就是第 i 颗珠子折好以后的位置，所以相邻两颗珠子的距离始终是 D。

形状上的三个要求：
- 最右边单独鼓出一个点（knob）——那是第 6 颗珠子，错的那颗，露在表面；
- 最左边缺一个点（notch），上下各有一个"爪"——相邻的一团把自己的 knob 卡进来，两团之间不会有别的珠子相撞；
- 中间缺两个相邻的点（cavity）——放血红素、抓氧分子的小窝。

  python gen_blob.py            # 写出同目录的 layout.js
"""
import json, math, random, sys, time
from pathlib import Path

D = 31.5
SQ3 = math.sqrt(3) / 2
xy = lambda n: (D * (n[0] + n[1] / 2), D * SQ3 * n[1])
NB = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)]

# 圆盘：i² + ij + j² ≤ 39 的 151 个格点
S = {(i, j) for i in range(-9, 10) for j in range(-9, 10) if i * i + i * j + j * j <= 39}
assert len(S) == 151
KNOB, NOTCH = (6, 0), (-6, 0)
CAVITY = [(-2, 1), (-1, 1)]
S -= {(5, 2), (7, -2)}          # 右边只留 knob 一个点鼓出来
S -= {NOTCH}                    # 左边的凹口
S -= set(CAVITY)                # 中间的小窝
assert len(S) == 146, len(S)
# 两团并排（平移 12 个格）时不能有格点重合
assert not any((i + 12, j) in S for (i, j) in S), "相邻两团会撞"

adj = {n: [(n[0] + a, n[1] + b) for a, b in NB if (n[0] + a, n[1] + b) in S] for n in S}


def connected(free, start):
    seen, st = {start}, [start]
    while st:
        n = st.pop()
        for m in adj[n]:
            if m in free and m not in seen:
                seen.add(m); st.append(m)
    return len(seen) == len(free)


def search(seed, limit=4.0):
    rnd = random.Random(seed)
    # 前缀：第 1–5 颗沿着边走到 knob 旁边，第 6 颗 = knob，第 7 颗是 knob 的另一个邻居
    a, b = rnd.sample(adj[KNOB], 2)
    pre = [a]
    used = {KNOB, a, b}
    while len(pre) < 5:
        cands = [m for m in adj[pre[-1]] if m not in used]
        if not cands: return None
        cands.sort(key=lambda m: (len(adj[m]), rnd.random()))      # 邻居少的 = 靠边的
        pre.append(cands[0]); used.add(cands[0])
    path = pre[::-1] + [KNOB, b]
    free = S - set(path)
    if not connected(free | {b}, b): return None
    t0 = time.time()
    sys.setrecursionlimit(10000)

    def go(cur):
        if not free: return True
        if time.time() - t0 > limit: return False
        nxt = [m for m in adj[cur] if m in free]
        # 出路最少的先走（Warnsdorff），平局随机
        nxt.sort(key=lambda m: (sum(1 for q in adj[m] if q in free), rnd.random()))
        for m in nxt:
            free.discard(m); path.append(m)
            # 剪枝：剩下的点里不能有走不到的死角（除了可能的终点，最多一个）
            dead = sum(1 for q in free if not any(r in free or r == m for r in adj[q]))
            if dead <= 0 and (len(free) < 2 or len(free) % 6 or connected(free, next(iter(free)))):
                if go(m): return True
            path.pop(); free.add(m)
        return False

    return path if go(b) else None


def main():
    for seed in range(1, 400):
        p = search(seed)
        if p:
            assert len(p) == 146 and len(set(p)) == 146 and p[5] == KNOB
            assert all(p[i + 1] in adj[p[i]] for i in range(145))
            pts = [[round(v, 2) for v in xy(n)] for n in p]
            cav = [sum(xy(c)[0] for c in CAVITY) / 2, sum(xy(c)[1] for c in CAVITY) / 2]
            out = {"D": D, "pts": pts, "cavity": [round(v, 2) for v in cav], "notch": [round(v, 2) for v in xy(NOTCH)],
                   "knob": 5, "R": round(max(math.hypot(*xy(n)) for n in S), 2), "pitch": 12 * D, "seed": seed}
            Path(__file__).with_name("layout.js").write_text(
                "/* 由 gen_blob.py 生成：折好的一团里 146 颗珠子的位置（六角格子上的一条哈密顿路径） */\nwindow.FOLD = "
                + json.dumps(out, separators=(",", ":")) + ";\n", encoding="utf8")
            print("seed", seed, "ok; R =", out["R"], "; first 8:", p[:8])
            return
    sys.exit("没找到路径：把 CAVITY 去掉再试")


if __name__ == "__main__":
    main()
