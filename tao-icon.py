# -*- coding: utf-8 -*-
"""Sinh icon PWA từ ký hiệu la bàn của app.

Vẽ ở độ phân giải gấp 4 rồi thu nhỏ để có viền mượt — không cần thư viện vector.
Màu lấy đúng từ design token trong app.

Chạy:  python tao-icon.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "icons")
os.makedirs(OUT, exist_ok=True)

GROUND = (15, 20, 26, 255)    # --ground tối  #0F141A
RING   = (123, 135, 149, 255) # --ink3 tối    #7B8795
BRASS  = (217, 164, 65, 255)  # --brass tối   #D9A441
ACCENT = (91, 155, 229, 255)  # --accent tối  #5B9BE5

SS = 4  # hệ số vẽ quá cỡ


def ve(size, ty_le_noi_dung, bo_goc):
    """ty_le_noi_dung: phần đường kính dành cho hình vẽ (maskable cần chừa lề).
       bo_goc: bán kính bo góc theo tỷ lệ cạnh; 0.5 = hình tròn."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # nền
    r = int(S * bo_goc)
    if r >= S // 2:
        d.ellipse([0, 0, S - 1, S - 1], fill=GROUND)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=GROUND)

    c = S / 2.0
    R = S * ty_le_noi_dung / 2.0   # bán kính vùng nội dung

    # vòng ngoài của mặt la bàn
    vr = R * 0.88
    w = max(2, int(S * 0.022))
    d.ellipse([c - vr, c - vr, c + vr, c + vr], outline=RING, width=w)

    # bốn vạch chia ở 4 hướng
    for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
        x1, y1 = c + dx * vr * 0.99, c + dy * vr * 0.99
        x2, y2 = c + dx * vr * 0.80, c + dy * vr * 0.80
        d.line([x1, y1, x2, y2], fill=RING, width=w)

    # kim la bàn — hình thoi lệch, đúng dáng trong app
    kim = [
        (c,               c - R * 0.74),   # mũi bắc
        (c + R * 0.20,    c - R * 0.06),
        (c,               c + R * 0.70),   # đuôi nam
        (c - R * 0.20,    c - R * 0.06),
    ]
    d.polygon(kim, fill=BRASS)

    # trục giữa
    tr = R * 0.13
    d.ellipse([c - tr, c - tr, c + tr, c + tr], fill=ACCENT)

    return img.resize((size, size), Image.LANCZOS)


def luu(img, ten):
    p = os.path.join(OUT, ten)
    img.save(p, "PNG", optimize=True)
    print("%-26s %6.1f KB" % (ten, os.path.getsize(p) / 1024.0))


# icon thường: bo góc nhẹ, nội dung gần full khung
luu(ve(192, 0.80, 0.22), "icon-192.png")
luu(ve(512, 0.80, 0.22), "icon-512.png")
# maskable: Android cắt theo hình launcher nên nội dung phải nằm trong vòng an toàn 80%
luu(ve(512, 0.58, 0.50), "icon-maskable-512.png")
# favicon cho trình duyệt máy tính
luu(ve(32, 0.86, 0.22), "favicon-32.png")
print("Xong — %s" % OUT)
