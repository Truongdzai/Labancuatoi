# -*- coding: utf-8 -*-
"""Lấy số liệu công khai của thị trường và ghi ra app/data.json.

    python scraper.py                     # dùng danh sách mã mặc định
    python scraper.py --ma VPB,ACB,FPT    # chỉ định mã
    python scraper.py --ra app/data.json  # đổi chỗ ghi

BẢN CHẤT CỦA TỆP NÀY
--------------------
Chỉ chạm vào dữ liệu công khai của thị trường. Không đọc, không ghi, không gửi
bất cứ thứ gì của người dùng. Tệp kết quả nằm cùng chỗ với trang web và ai
cũng tải được — đừng bao giờ để thứ gì riêng tư lọt vào đây.

NHỮNG GÌ LẤY ĐƯỢC VÀ KHÔNG LẤY ĐƯỢC
-----------------------------------
Đã kiểm chứng bằng tay ngày 31/08/2026 trên vnstock, tài khoản thường:

    Vốn hoá        ✓  listed_share × giá khớp (bảng giá VCI)
    P/E, P/B       ✓  chỉ số tài chính KBS, quý gần nhất
    ROE            ✓  KBS, ROE bình quân 4 quý (roe_trailling)
    Đà giá 12 th   ✓  tự tính từ lịch sử giá VCI
    Nợ xấu (NPL)   ~  VCI có trường npl nhưng nguồn miễn phí đứng ở 2018.
                      Chỉ ghi ra khi kỳ báo cáo còn mới, còn lại để null.
    Bao phủ (PCR)  ~  như trên, và VCI trả về SỐ ÂM nên phải lấy trị tuyệt đối
    CAR            ✗  VCI trả về 0 cho mọi mã — coi như không có
    Room ngoại     ✗  bảng giá chỉ có total_room (giới hạn sở hữu), không có
                      phần còn lại chưa dùng
    Nợ vay/Vốn chủ ✗  chỉ có ở nguồn VCI đã cũ, không đáng tin để tự điền

Ô nào không lấy được thì ghi null và app sẽ để người dùng tự nhập. Thà để
trống còn hơn điền một con số của năm 2018 rồi để người ta tưởng là số hôm nay.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
import warnings
from datetime import datetime, timedelta, timezone

warnings.filterwarnings("ignore")
os.environ.setdefault("ACCEPT_TC", "tôi đồng ý")   # vnstock hỏi điều khoản khi chạy tự động

VN = timezone(timedelta(hours=7))

# Nhóm ngân hàng niêm yết. Danh sách tường minh thay vì đoán theo mã ngành:
# nó ổn định, đọc là hiểu, và sai thì sửa một dòng.
NGAN_HANG = {
    "ABB", "ACB", "BAB", "BID", "BVB", "CTG", "EIB", "HDB", "KLB", "LPB",
    "MBB", "MSB", "NAB", "NVB", "OCB", "PGB", "SGB", "SHB", "SSB", "STB",
    "TCB", "TPB", "VAB", "VBB", "VCB", "VIB", "VPB",
}

# Mặc định: nhóm vốn hoá lớn hay được nhắc trong cẩm nang. Đổi bằng --ma.
MA_MAC_DINH = [
    "VCB", "BID", "CTG", "TCB", "VPB", "MBB", "ACB", "HDB", "STB", "VIB",
    "FPT", "HPG", "VNM", "MWG", "GAS", "MSN", "VIC", "VHM", "SSI", "PNJ",
]

# Số liệu báo cáo cũ hơn ngần này thì coi như không dùng được nữa.
HAN_QUY = 3          # quý
KHONG_LAY_DUOC = ["CAR", "Room ngoại còn lại", "Nợ vay / Vốn chủ"]


# ----------------------------------------------------------------------------
# tiện ích
# ----------------------------------------------------------------------------
def so(x, chuso=2):
    """Về float đã làm tròn, hoặc None nếu không phải số dùng được."""
    try:
        if x is None:
            return None
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return round(v, chuso)
    except (TypeError, ValueError):
        return None


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def goi(mo_ta, ham, *a, **kw):
    """Gọi một hàm lấy dữ liệu, nuốt mọi lỗi, và chờ khi bị chặn tốc độ.

    vnstock giới hạn số lượt gọi mỗi phút ở tài khoản thường. Khi chạm trần nó
    không ném Exception bình thường mà gọi thẳng sys.exit — tức là ném SystemExit,
    và `except Exception` KHÔNG bắt được. Phải bắt cả hai, nếu không cả tiến trình
    chết giữa chừng và ta mất luôn những mã đã lấy xong.
    """
    for lan in range(2):
        try:
            return ham(*a, **kw)
        except (Exception, SystemExit) as e:
            dau = (str(e) + " " + type(e).__name__).lower()
            chan = any(k in dau for k in ("rate limit", "giới hạn", "too many", "429"))
            if chan and lan == 0:
                log("  · chạm trần tốc độ ở %s — nghỉ %ds rồi thử lại" % (mo_ta, NGHI_KHI_CHAN))
                time.sleep(NGHI_KHI_CHAN)
                continue
            log("  ! %s hỏng: %s %s" % (mo_ta, type(e).__name__, str(e)[:120]))
            return None
    return None


NGHI_KHI_CHAN = 65        # giây chờ sau khi chạm trần tốc độ — cửa sổ giới hạn là 1 phút


# ----------------------------------------------------------------------------
# các nguồn
# ----------------------------------------------------------------------------
def bang_gia(ma_list):
    """Vốn hoá, giá khớp, tên công ty, sàn — từ bảng giá VCI."""
    from vnstock.api.trading import Trading

    out = {}
    try:
        pb = Trading(symbol=ma_list[0], source="VCI").price_board(ma_list)
    except Exception as e:
        log("  ! bảng giá hỏng:", type(e).__name__, e)
        return out

    for _, r in pb.iterrows():
        try:
            ma = str(r[("listing", "symbol")]).upper()
            cp = so(r[("listing", "listed_share")], 0)
            gia = so(r[("match", "match_price")], 0)
            # giá khớp có thể rỗng ngoài phiên — lùi về giá tham chiếu
            if not gia:
                gia = so(r[("listing", "ref_price")], 0)
            out[ma] = {
                "ten": str(r[("listing", "organ_name")] or "").strip() or None,
                "san": str(r[("listing", "exchange")] or "").strip() or None,
                "gia": gia,
                # vốn hoá quy về TỶ đồng cho khớp ô nhập trong app
                "cap": so(cp * gia / 1e9, 0) if (cp and gia) else None,
                "phien": str(r[("listing", "trading_date")] or "")[:10] or None,
            }
        except Exception as e:
            log("  ! bỏ qua một dòng bảng giá:", type(e).__name__, e)
    return out


def chi_so_kbs(ma):
    """P/E, P/B, ROE của quý gần nhất — nguồn KBS còn cập nhật."""
    from vnstock.api.financial import Finance

    r = Finance(symbol=ma, source="KBS").ratio(
        period="quarter", lang="en", dropna=True, flatten_columns=True
    )
    ky = [c for c in r.columns if c not in ("item", "item_id", "item_en")]
    if not ky:
        return {}, None
    cot = ky[0]                       # cột đầu là kỳ mới nhất
    lay = dict(zip(r["item_id"], r[cot]))
    return {
        "pe": so(lay.get("pe_ratio")),
        "pb": so(lay.get("pb_ratio")),
        "roe": so(lay.get("roe_trailling")),   # ROE bình quân 4 quý, đơn vị %
    }, str(cot)


def chi_so_ngan_hang(ma):
    """Nợ xấu và bao phủ nợ xấu — chỉ trả về khi kỳ báo cáo còn mới.

    VCI là nguồn duy nhất có hai trường này, nhưng bản miễn phí thường đứng
    ở 2018. Nên phải tự đọc năm/quý trong chính bảng đó rồi so với hôm nay.
    """
    from vnstock.api.financial import Finance

    try:
        r = Finance(symbol=ma, source="VCI").ratio(
            period="quarter", lang="en", dropna=False, flatten_columns=True
        )
    except Exception as e:
        log("  ! VCI ratio hỏng:", type(e).__name__, e)
        return {"npl": None, "pcr": None, "car": None}, None

    ky = [c for c in r.columns if c not in ("item", "item_id", "item_en")]
    if not ky:
        return {"npl": None, "pcr": None, "car": None}, None

    lay_cot = lambda c: dict(zip(r["item_id"], r[c]))
    # chọn cột có (năm, quý) lớn nhất
    tot, moi = None, (-1, -1)
    for c in ky:
        d = lay_cot(c)
        n, q = so(d.get("year"), 0), so(d.get("quarter"), 0)
        if n and q and (n, q) > moi:
            moi, tot = (n, q), d
    if tot is None:
        return {"npl": None, "pcr": None, "car": None}, None

    nam, quy = int(moi[0]), int(moi[1])
    nhan = "%d-Q%d" % (nam, quy)

    # còn mới không? quy về số quý rồi so
    gio = datetime.now(VN)
    quy_nay = (gio.year, (gio.month - 1) // 3 + 1)
    cach = (quy_nay[0] - nam) * 4 + (quy_nay[1] - quy)
    if cach > HAN_QUY:
        log("  · số liệu ngân hàng của %s đứng ở %s (cách %d quý) — bỏ" % (ma, nhan, cach))
        return {"npl": None, "pcr": None, "car": None}, nhan

    npl = so(tot.get("npl"), 6)
    pcr = so(tot.get("loan_loss_reserves_to_npls"), 6)
    car = so(tot.get("car"), 6)
    return {
        # VCI trả về dạng tỷ lệ (0,0349) chứ không phải phần trăm
        "npl": so(npl * 100) if npl is not None else None,
        # trường này ở VCI mang dấu âm theo quy ước kế toán — lấy trị tuyệt đối
        "pcr": so(abs(pcr) * 100, 0) if pcr else None,
        # CAR luôn về 0 ở nguồn miễn phí; 0 nghĩa là không có, không phải "vốn bằng 0"
        "car": so(car * 100) if car else None,
    }, nhan


def da_gia_12_thang(ma):
    """Phần trăm thay đổi giá 12 tháng, tự tính từ lịch sử giá."""
    from vnstock.api.quote import Quote

    hom_nay = datetime.now(VN).date()
    try:
        h = Quote(symbol=ma, source="VCI").history(
            start=str(hom_nay - timedelta(days=400)), end=str(hom_nay), interval="1D"
        )
    except Exception as e:
        log("  ! lịch sử giá hỏng:", type(e).__name__, e)
        return None
    if h is None or len(h) < 60:
        return None

    h = h.sort_values("time")
    cuoi = so(h["close"].iloc[-1], 4)
    moc = hom_nay - timedelta(days=365)
    truoc = h[h["time"].dt.date <= moc]
    if truoc.empty or not cuoi:
        return None
    dau = so(truoc["close"].iloc[-1], 4)
    if not dau:
        return None
    return so((cuoi - dau) / dau * 100, 1)


# ----------------------------------------------------------------------------
# gom lại
# ----------------------------------------------------------------------------
def thu_thap(ma_list, nghi):
    gia = goi("bảng giá", bang_gia, ma_list) or {}
    ket, phien = {}, None

    for i, ma in enumerate(ma_list):
        # Nghỉ giữa các mã cho khỏi chạm trần tốc độ. Mỗi mã tốn 2–3 lượt gọi API,
        # nên với trần khoảng 20 lượt/phút thì 4 giây một mã là vừa đủ an toàn.
        if i and nghi > 0:
            time.sleep(nghi)
        log("·", ma)
        g = gia.get(ma, {})
        phien = phien or g.get("phien")
        la_bank = ma in NGAN_HANG

        d = {
            "ten": g.get("ten"),
            "san": g.get("san"),
            "nganh": "bank" if la_bank else "normal",
            "gia": g.get("gia"),
            "cap": g.get("cap"),
            "pe": None, "pb": None, "roe": None,
            "de": None,                       # chưa có nguồn đáng tin — để người dùng nhập
            "car": None, "npl": None, "pcr": None,
            "froom": None,                    # bảng giá không có phần room còn lại
            "chg12": None,
        }

        r = goi("chỉ số KBS " + ma, chi_so_kbs, ma)
        if r:
            d.update(r[0])
            d["kyBaoCao"] = r[1]

        if la_bank:
            r = goi("chỉ số ngân hàng " + ma, chi_so_ngan_hang, ma)
            if r:
                d.update(r[0])
                d["kyNganHang"] = r[1]

        d["chg12"] = goi("đà giá " + ma, da_gia_12_thang, ma)

        # ô nào null thì nói thẳng ra, app dùng để nhắc người dùng nhập tay
        d["nhapTay"] = [k for k in
                        ("cap", "pe", "pb", "roe", "de", "car", "npl", "pcr", "froom", "chg12")
                        if d.get(k) is None and not (la_bank and k == "de")
                        and not (not la_bank and k in ("car", "npl", "pcr"))]
        ket[ma] = d

    return ket, phien


def main():
    ap = argparse.ArgumentParser(description="Lấy số liệu thị trường ra app/data.json")
    ap.add_argument("--ma", default="", help="danh sách mã, cách nhau bằng dấu phẩy")
    ap.add_argument("--ra", default="app/data.json", help="đường dẫn tệp kết quả")
    ap.add_argument("--nghi", type=float, default=4.0,
                    help="giây nghỉ giữa hai mã, tránh chạm trần tốc độ (mặc định 4)")
    a = ap.parse_args()

    ma_list = [x.strip().upper() for x in a.ma.split(",") if x.strip()] or MA_MAC_DINH
    log("Lấy số liệu cho %d mã, nghỉ %.1fs giữa mỗi mã…" % (len(ma_list), a.nghi))

    ket, phien = thu_thap(ma_list, a.nghi)
    dat = sum(1 for d in ket.values() if d.get("pe") is not None)

    ra = {
        "capNhat": datetime.now(VN).strftime("%d/%m/%Y %H:%M (+07)"),
        "phien": phien,
        "nguon": "vnstock · bảng giá VCI + chỉ số KBS · dữ liệu công khai",
        "laiTietKiem": None,          # chưa có nguồn tự động, người dùng tự nhập
        "khongLayDuoc": KHONG_LAY_DUOC,
        "soMa": len(ket),
        "ma": ket,
    }

    os.makedirs(os.path.dirname(a.ra) or ".", exist_ok=True)
    with open(a.ra, "w", encoding="utf-8", newline="\n") as f:
        json.dump(ra, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")

    log("Đã ghi %s — %d mã, %d mã có chỉ số định giá." % (a.ra, len(ket), dat))
    # Không có mã nào ra hồn thì báo lỗi, để CI đừng commit đè một tệp rỗng.
    if dat == 0:
        log("KHÔNG lấy được chỉ số của mã nào. Thoát với mã lỗi để CI không commit.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
