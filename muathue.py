# -*- coding: utf-8 -*-
"""MUA vs THUÊ nhà — mô hình Việt hoá, so sánh theo tháng.
Mọi giá trị tính bằng TRIỆU VND.

Nguyên tắc so sánh (khác với bảng tính gốc của hieu.tv — xem ghi chú cuối file):
hai bên bỏ ra CÙNG MỘT SỐ TIỀN mỗi tháng. Ai chi ít hơn thì phần dư được đem
đầu tư. Nhờ vậy phần chênh lệch cũng được hưởng lãi kép, thay vì bị cộng dồn
theo giá trị danh nghĩa.
"""

# ---------------- THAM SỐ MẶC ĐỊNH (VN) ----------------
GIA_NHA   = 3000.0   # triệu — 3 tỷ
VON_CO    = 900.0    # triệu — 30%
SO_NAM    = 25
KY_HAN_VAY= 25       # có thể ngắn hơn SO_NAM
LAM_PHAT  = 0.04
LAI_VAY   = 0.11     # lãi thả nổi sau ưu đãi
LOI_SUAT  = 0.10     # quỹ chỉ số dài hạn

TRUOC_BA    = 0.005  # Nghị định 10/2022 — 0,5% giá trị nhà đất
CONG_CHUNG  = 2.2    # Thông tư 257/2016, bậc 1–3 tỷ
PHI_HO_SO   = 5.0    # thẩm định + định giá + hồ sơ vay
PHI_BAO_TRI = 0.02   # 2% — CHỈ chung cư mua từ chủ đầu tư
THUE_TNCN   = 0.02   # 2% giá bán, người bán chịu
MOI_GIOI    = 0.015  # 1,5%

PHI_TH_CHUNGCU = 1.2 # quản lý + gửi xe + bảo hiểm, mỗi tháng
PHI_TH_NHADAT  = 0.6 # bảo trì + bảo hiểm, mỗi tháng
TANG_CHUNGCU = 0.05
TANG_NHADAT  = 0.08
THUE_THANG   = 10.0  # ~4%/năm gross yield trên giá 3 tỷ


def pmt(P, r_year, n_year):
    i = r_year / 12.0
    N = int(round(n_year * 12))
    if i == 0: return P / N
    return P * i / (1 - (1 + i) ** (-N))


def so_sanh(gia=GIA_NHA, von=VON_CO, nam=SO_NAM, ky_han=KY_HAN_VAY,
            lai=LAI_VAY, lam_phat=LAM_PHAT, loi_suat=LOI_SUAT,
            tang_gia=TANG_CHUNGCU, phi_thang=PHI_TH_CHUNGCU,
            co_phi_bao_tri=True, thue_thang=THUE_THANG, so_lan_chuyen=1):

    vay = max(gia - von, 0.0)
    tra_no = pmt(vay, lai, ky_han) if vay > 0 else 0.0

    chi_phi_mua = (gia * TRUOC_BA + CONG_CHUNG + PHI_HO_SO
                   + (gia * PHI_BAO_TRI if co_phi_bao_tri else 0.0))

    # Cả hai bên khởi đầu với cùng số tiền mặt.
    tien_mat_dau = von + chi_phi_mua
    dm_thue = tien_mat_dau   # người thuê đem đi đầu tư hết
    dm_mua  = 0.0            # người mua tiêu hết vào nhà + phí

    i_dt = (1 + loi_suat) ** (1 / 12.0) - 1
    N = int(round(nam * 12))
    N_vay = int(round(ky_han * 12))

    tong_tra_no = tong_phi = tong_thue_nha = 0.0
    for t in range(N):
        y = t // 12
        r_t   = thue_thang * (1 + lam_phat) ** y          # tiền thuê tăng
        f_t   = phi_thang  * (1 + lam_phat) ** y          # phí sở hữu tăng
        n_t   = tra_no if t < N_vay else 0.0              # trả nợ cố định
        chi_mua_t = n_t + f_t
        ngan_sach = max(r_t, chi_mua_t)

        dm_thue = dm_thue * (1 + i_dt) + (ngan_sach - r_t)
        dm_mua  = dm_mua  * (1 + i_dt) + (ngan_sach - chi_mua_t)

        tong_tra_no += n_t; tong_phi += f_t; tong_thue_nha += r_t

    gia_cuoi = gia * (1 + tang_gia) ** nam
    phi_ban  = gia_cuoi * (THUE_TNCN + MOI_GIOI)
    # mỗi lần chuyển nhà trong kỳ = thêm 1 lượt bán + 1 lượt mua
    phi_chuyen = (chi_phi_mua + gia_cuoi * (THUE_TNCN + MOI_GIOI)) * (so_lan_chuyen - 1)

    nw_mua  = gia_cuoi - phi_ban - phi_chuyen + dm_mua
    nw_thue = dm_thue

    return {
        'tra_no_thang': tra_no, 'chi_phi_mua': chi_phi_mua,
        'tien_mat_dau': tien_mat_dau,
        'tong_tra_no': tong_tra_no, 'tong_phi': tong_phi,
        'tong_thue_nha': tong_thue_nha,
        'gia_cuoi': gia_cuoi, 'phi_ban': phi_ban, 'phi_chuyen': phi_chuyen,
        'dm_mua': dm_mua, 'dm_thue': dm_thue,
        'nw_mua': nw_mua, 'nw_thue': nw_thue, 'chenh': nw_mua - nw_thue,
    }


def diem_hoa_von(**kw):
    """Mức tăng giá nhà mỗi năm để MUA hoà với THUÊ (dò nhị phân)."""
    lo, hi = -0.05, 0.40
    for _ in range(80):
        mid = (lo + hi) / 2
        kw2 = dict(kw); kw2['tang_gia'] = mid
        if so_sanh(**kw2)['chenh'] < 0: lo = mid
        else: hi = mid
    return (lo + hi) / 2


def ty(x): return '%.2f tỷ' % (x / 1000.0)


if __name__ == '__main__':
    print('=' * 78)
    print('MUA vs THUÊ — nhà %s, vốn %s, %d năm, lãi vay %.0f%%, lạm phát %.0f%%,'
          ' đầu tư %.0f%%' % (ty(GIA_NHA), ty(VON_CO), SO_NAM, LAI_VAY*100,
                              LAM_PHAT*100, LOI_SUAT*100))
    print('=' * 78)

    r = so_sanh()
    print('\n-- CHUNG CƯ, tăng 5%/năm, ở yên một chỗ --')
    print('  Vay                    : %10s' % ty(GIA_NHA - VON_CO))
    print('  Trả nợ mỗi tháng       : %10.1f triệu' % r['tra_no_thang'])
    print('  Chi phí lúc mua        : %10.1f triệu' % r['chi_phi_mua'])
    print('  Tiền mặt cả hai bên có : %10.1f triệu' % r['tien_mat_dau'])
    print('  Chi/tháng của người MUA: %10.1f triệu (năm 1)'
          % (r['tra_no_thang'] + PHI_TH_CHUNGCU))
    print('  Tiền thuê              : %10.1f triệu (năm 1)' % THUE_THANG)
    print('  --')
    print('  Giá nhà sau %d năm      : %10s' % (SO_NAM, ty(r['gia_cuoi'])))
    print('  Phí khi bán (2%%+1,5%%)  : %10s' % ty(r['phi_ban']))
    print('  Danh mục người MUA     : %10s' % ty(r['dm_mua']))
    print('  => NET WORTH khi MUA   : %10s' % ty(r['nw_mua']))
    print('  Danh mục người THUÊ    : %10s' % ty(r['nw_thue']))
    print('  => NET WORTH khi THUÊ  : %10s' % ty(r['nw_thue']))
    print('  CHÊNH LỆCH (mua − thuê): %10s' % ty(r['chenh']))

    print('\n' + '=' * 78)
    print('8 KỊCH BẢN')
    print('=' * 78)
    rows = []
    for ten, tg, pt, bt in (('Chung cư', TANG_CHUNGCU, PHI_TH_CHUNGCU, True),
                            ('Nhà đất ', TANG_NHADAT,  PHI_TH_NHADAT,  False)):
        for lan, nhan in ((1, 'ở yên       '), (3, 'chuyển 3 lần')):
            x = so_sanh(tang_gia=tg, phi_thang=pt, co_phi_bao_tri=bt,
                        so_lan_chuyen=lan)
            rows.append(('MUA  %s %s (+%.0f%%/năm)' % (ten, nhan, tg*100),
                         x['nw_mua']))
    for ls in (0.09, 0.10, 0.11, 0.13):
        x = so_sanh(loi_suat=ls)
        rows.append(('THUÊ + đầu tư %.0f%%/năm' % (ls*100), x['nw_thue']))
    for ten, v in sorted(rows, key=lambda z: -z[1]):
        print('  %-42s %12s' % (ten, ty(v)))

    print('\n' + '=' * 78)
    print('ĐỘ NHẠY — MUA cần nhà tăng bao nhiêu %/năm mới hoà với THUÊ?')
    print('=' * 78)
    for lai in (0.07, 0.09, 0.11, 0.13):
        out = []
        for ls in (0.08, 0.10, 0.12):
            d = diem_hoa_von(lai=lai, loi_suat=ls)
            out.append('đầu tư %2.0f%% → %5.1f%%' % (ls*100, d*100))
        print('  lãi vay %2.0f%%/năm:  %s' % (lai*100, '   |   '.join(out)))
