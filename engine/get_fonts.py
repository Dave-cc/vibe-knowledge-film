# -*- coding: utf-8 -*-
"""把引擎用到的字体下到 engine/fonts/（已有的跳过）。全部是 SIL OFL 1.1 授权的开源字体，来自 github.com/google/fonts。
  python get_fonts.py          缺哪个下哪个
  python get_fonts.py --check  只检查，不下载
中文两款各 20MB 左右，所以仓库里可以不带字体，装好 skill 后跑一次这个脚本。"""
import sys, urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
FONTS = {   # 本地文件名: 仓库路径
    "NotoSerifSC-VF.ttf": "notoserifsc/NotoSerifSC%5Bwght%5D.ttf",             # 宋体（思源宋体），可变字重 200–900
    "NotoSansSC-VF.ttf": "notosanssc/NotoSansSC%5Bwght%5D.ttf",                # 黑体（思源黑体），可变字重 100–900
    "CormorantGaramond.ttf": "cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf",
    "CormorantGaramond-Italic.ttf": "cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf",
    "Lora.ttf": "lora/Lora%5Bwght%5D.ttf",
    "Lora-Italic.ttf": "lora/Lora-Italic%5Bwght%5D.ttf",
    "JetBrainsMono.ttf": "jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
    "CourierPrime-Regular.ttf": "courierprime/CourierPrime-Regular.ttf",
    "OFL-NotoSerifSC.txt": "notoserifsc/OFL.txt", "OFL-NotoSansSC.txt": "notosanssc/OFL.txt",
    "OFL-CormorantGaramond.txt": "cormorantgaramond/OFL.txt", "OFL-Lora.txt": "lora/OFL.txt",
    "OFL-JetBrainsMono.txt": "jetbrainsmono/OFL.txt", "OFL-CourierPrime.txt": "courierprime/OFL.txt",
}

if __name__ == "__main__":
    d = Path(__file__).resolve().parent / "fonts"; d.mkdir(exist_ok=True)
    missing = [k for k in FONTS if not (d / k).exists() or (d / k).stat().st_size < 1000]
    if "--check" in sys.argv:
        print("字体齐全" if not missing else "缺：" + "、".join(missing)); sys.exit(1 if missing else 0)
    for k in missing:
        print("下载", k, "…", flush=True)
        try:
            with urllib.request.urlopen(BASE + FONTS[k], timeout=180) as r: (d / k).write_bytes(r.read())
        except Exception as e:
            print("  失败：", e, "\n  可以手动从", BASE + FONTS[k], "下载后放到", d / k)
    print("完成。" if not [k for k in FONTS if not (d / k).exists()] else "还有没下到的，重跑一次或手动放进去。")
