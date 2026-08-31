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

Bổ sung cho bộ lọc v3 (kiểm chứng 31/08/2026):

    Dòng tiền tự do ✓  báo cáo lưu chuyển tiền tệ VCI, năm gần nhất:
                       tiền thuần từ kinh doanh CỘNG chi mua sắm TSCĐ (số đã âm sẵn)
    DTKD / LNST     ✓  cùng nguồn, chia cho lợi nhuận sau thuế trong báo cáo KQKD
    NIM ba quý      ✓  chỉ số KBS, trường net_interest_margin_nim — lấy chung
                       một lời gọi với P/E, P/B, ROE cho đỡ chạm trần tốc độ

Hai ô dòng tiền CHỈ tính cho doanh nghiệp thường. Báo cáo lưu chuyển tiền tệ của
ngân hàng không so sánh được: cho vay ra bị ghi thành dòng tiền âm, nên một ngân
hàng tăng trưởng tốt lại hiện ra như đang đốt tiền.

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
import threading
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


class _HetGio(Exception):
    """Lời gọi vượt quá hạn giờ cho phép."""


def _chay_co_han(ham, a, kw):
    """Chạy ham(*a, **kw) trong luồng nền, ném _HetGio nếu quá hạn.

    Cố ý KHÔNG dùng ThreadPoolExecutor. Bản đầu viết bằng nó và tưởng là xong,
    nhưng `with ThreadPoolExecutor(...)` khi thoát khối sẽ gọi shutdown(wait=True)
    — tức là ĐỢI luồng đang treo chạy xong. Hạn giờ vì thế vô tác dụng: result()
    ném TimeoutError đúng lúc, rồi chương trình đứng ngay tại dấu ngoặc đóng.
    Chạy thật vẫn kẹt hơn bảy phút ở mã VNM dù đã đặt hạn 90 giây.

    Luồng daemon thì khác: không ai đợi nó, và nó cũng không giữ tiến trình lại
    lúc thoát. Luồng treo cứ treo cho tới khi cả tiến trình kết thúc.
    """
    hop = []
    def chay():
        try:
            hop.append(("ok", ham(*a, **kw)))
        except (Exception, SystemExit) as e:      # SystemExit: vnstock hay gọi sys.exit
            hop.append(("loi", e))

    t = threading.Thread(target=chay, daemon=True)
    t.start()
    t.join(HAN_MOI_LOI_GOI)
    if not hop:
        raise _HetGio()
    return hop[0]


def goi(mo_ta, ham, *a, **kw):
    """Gọi một hàm lấy dữ liệu, nuốt mọi lỗi, chờ khi bị chặn, và BỎ khi treo.

    Ba lớp bảo vệ, mỗi lớp sinh ra từ một lần hỏng thật:

    1. vnstock giới hạn số lượt gọi mỗi phút ở tài khoản thường. Khi chạm trần nó
       không ném Exception bình thường mà gọi thẳng sys.exit — tức là ném
       SystemExit, và `except Exception` KHÔNG bắt được. Phải bắt cả hai, nếu
       không cả tiến trình chết giữa chừng và ta mất luôn những mã đã lấy xong.

    2. Chạm trần thì nghỉ một nhịp rồi thử lại đúng một lần.

    3. QUAN TRỌNG NHẤT: vnstock có thể TREO HẲN, không ném lỗi, không trả về gì.
       Quan sát thật ngày 31/08/2026: tiến trình đứng im hơn mười phút ở mã GAS,
       không thêm một dòng log nào. Bọc try/except không cứu được vì có lỗi nào
       đâu mà bắt. Nên mỗi lời gọi phải chạy trong luồng riêng có hạn giờ; quá
       hạn thì bỏ mã đó và đi tiếp. Một mã thiếu số còn hơn cả mẻ chết cứng, và
       trên GitHub Actions thì treo đồng nghĩa với đốt trọn timeout của job.
       Xem _chay_co_han() để biết vì sao không dùng ThreadPoolExecutor.
    """
    for lan in range(2):
        try:
            ket = _chay_co_han(ham, a, kw)
        except _HetGio:
            log("  ! %s treo quá %ds — bỏ qua" % (mo_ta, HAN_MOI_LOI_GOI))
            return None
        try:
            if ket[0] == "loi":
                raise ket[1]
            return ket[1]
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
HAN_MOI_LOI_GOI = 90      # giây tối đa cho MỘT lời gọi, chống treo vô hạn


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


def chi_so_kbs(ma, lay_nim=False):
    """P/E, P/B, ROE — và cả NIM ba quý nếu là ngân hàng. MỘT lời gọi duy nhất.

    Trước đây NIM có hàm riêng, nhưng nó gọi ĐÚNG cái endpoint này lần thứ hai.
    Nguồn miễn phí chặn tốc độ theo số lượt gọi mỗi phút, nên gọi trùng là tự làm
    khó mình: mỗi ngân hàng tốn 4 lượt thay vì 3, và với 20 mã thì đủ để cả mẻ
    chạy quá giờ. Lấy một lần rồi bóc cả hai thứ ra.
    """
    from vnstock.api.financial import Finance

    r = Finance(symbol=ma, source="KBS").ratio(
        period="quarter", lang="en", dropna=True, flatten_columns=True
    )
    ky = [c for c in r.columns if c not in ("item", "item_id", "item_en")]
    if not ky:
        return {}, None
    # KBS không trả cột theo thứ tự thời gian — xem cot_theo_thoi_gian()
    sach = cot_theo_thoi_gian(ky)
    cot = sach[0]
    lay = dict(zip(r["item_id"], r[cot]))
    out = {
        "pe": so(lay.get("pe_ratio")),
        "pb": so(lay.get("pb_ratio")),
        "roe": so(lay.get("roe_trailling")),   # ROE bình quân 4 quý, đơn vị %
    }
    if lay_nim:
        for i, k in enumerate(sach[:3]):
            v = so(dict(zip(r["item_id"], r[k])).get("net_interest_margin_nim"))
            if v is not None:
                out[["nim", "nim1", "nim2"][i]] = v
    return out, str(cot)


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


def dong_tien(ma):
    """Dòng tiền tự do và tỷ lệ dòng tiền trên lợi nhuận — doanh nghiệp thường.

    FCF = tiền thuần từ hoạt động kinh doanh + chi mua sắm tài sản cố định.
    Dấu cộng là đúng: nguồn trả về khoản chi dưới dạng SỐ ÂM sẵn rồi.
    """
    from vnstock.api.financial import Finance

    f = Finance(symbol=ma, source="VCI")
    cf = f.cash_flow(period="year", lang="en", dropna=True)
    ky = [c for c in cf.columns if c not in ("item", "item_en", "item_id")]
    if not ky:
        return {"fcf": None, "cfoni": None}
    cot = ky[0]                                   # cột đầu là năm gần nhất
    lay = dict(zip(cf["item_id"], cf[cot]))

    cfo = so(lay.get("net_cash_inflows_outflows_from_operating_activities"), 0)
    capex = so(lay.get("purchases_of_fixed_assets_and_other_long_term_assets"), 0)
    if cfo is None:
        return {"fcf": None, "cfoni": None}

    fcf = cfo + (capex or 0)

    # lợi nhuận sau thuế để tính chất lượng lợi nhuận
    lnst = None
    try:
        inc = f.income_statement(period="year", lang="en", dropna=True)
        kyi = [c for c in inc.columns if c not in ("item", "item_en", "item_id")]
        if kyi:
            di = dict(zip(inc["item_id"], inc[kyi[0]]))
            for k in ("post_tax_profit", "profit_after_tax", "net_profit_for_the_year",
                      "attributable_to_parent_company"):
                if di.get(k) is not None:
                    lnst = so(di[k], 0)
                    if lnst:
                        break
    except Exception as e:
        log("  ! báo cáo KQKD hỏng:", type(e).__name__, str(e)[:100])

    return {
        # quy về TỶ đồng cho khớp ô nhập trong app
        "fcf": so(fcf / 1e9, 0),
        "cfoni": so(cfo / lnst, 2) if (lnst and lnst > 0) else None,
    }


def cot_theo_thoi_gian(cols):
    """Sắp cột kỳ báo cáo theo thứ tự thời gian, MỚI NHẤT TRƯỚC.

    Bắt buộc phải có. KBS trả về cột KHÔNG theo thứ tự — quan sát thật ngày
    31/08/2026 với VPB: ['2026-Q2', '2025-Q4', '2026-Q1', '2025-Q4_1']. Nếu cứ
    lấy theo thứ tự nguồn trả thì NIM ba quý ra 1,33 · 1,42 · 1,39, tức là quý
    giữa và quý cuối bị đảo. Hậu quả không phải sai số nhỏ: phép kiểm tra "NIM co
    lại hai quý liên tiếp" sẽ không bao giờ đúng, và cờ đỏ quan trọng nhất của
    chế độ ngân hàng im lặng vĩnh viễn. Đúng thứ tự phải là 1,33 · 1,39 · 1,42.

    Cũng loại luôn cột trùng tên kiểu "2025-Q4_1" mà nguồn hay kèm theo.
    """
    import re

    seen, sach = set(), []
    for c in cols:
        ten = str(c).split("_")[0]
        if ten in seen:
            continue
        seen.add(ten)
        m = re.match(r"^(\d{4})[-–]?Q?(\d)?", ten)
        khoa = (int(m.group(1)), int(m.group(2) or 0)) if m else (0, 0)
        sach.append((khoa, c))
    sach.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in sach]



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
            "fcf": None, "cfoni": None,       # v3 · dòng tiền, chỉ doanh nghiệp thường
            "car": None, "npl": None, "pcr": None,
            "nim": None, "nim1": None, "nim2": None,
            "froom": None,                    # bảng giá không có phần room còn lại
            "chg12": None,
        }

        # ngân hàng: lấy luôn NIM trong cùng lời gọi, khỏi tốn thêm một lượt API
        r = goi("chỉ số KBS " + ma, chi_so_kbs, ma, la_bank)
        if r:
            d.update(r[0])
            d["kyBaoCao"] = r[1]

        if la_bank:
            r = goi("chỉ số ngân hàng " + ma, chi_so_ngan_hang, ma)
            if r:
                d.update(r[0])
                d["kyNganHang"] = r[1]
        else:
            # Dòng tiền chỉ có nghĩa với doanh nghiệp thường — xem ghi chú đầu tệp.
            dt = goi("dòng tiền " + ma, dong_tien, ma)
            if dt:
                d.update(dt)

        d["chg12"] = goi("đà giá " + ma, da_gia_12_thang, ma)

        # ô nào null thì nói thẳng ra, app dùng để nhắc người dùng nhập tay
        rieng_bank = ("car", "npl", "pcr", "nim", "nim1", "nim2")
        rieng_thuong = ("de", "fcf", "cfoni")
        d["nhapTay"] = [
            k for k in ("cap", "pe", "pb", "roe", "de", "fcf", "cfoni",
                        "car", "npl", "pcr", "nim", "froom", "chg12")
            if d.get(k) is None
            and not (la_bank and k in rieng_thuong)
            and not (not la_bank and k in rieng_bank)
        ]
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
