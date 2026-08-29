# -*- coding: utf-8 -*-
import muathue as M

ok = True
def check(name, got, want, tol=1e-6):
    global ok
    p = abs(got-want) <= tol*max(1,abs(want))
    ok = ok and p
    print(('  OK  ' if p else '  FAIL') + ' %-52s got=%.4f want=%.4f' % (name, got, want))

print('KIỂM CHỨNG MÔ HÌNH')
print('-'*78)

# 1. Công thức trả nợ đối chiếu bảng tính gốc của hieu.tv (AUD, 3,13%, 30 năm)
check('PMT 400.000 @3,13%/30 năm x 360 = 617.253 (bảng gốc)',
      M.pmt(400000,0.0313,30)*360, 617253, 2e-6)

# 2. Mua đứt, không phí, không thuê, nhà tăng = lợi suất đầu tư
#    -> hai bên phải bằng nhau
r = M.so_sanh(gia=1000, von=1000, nam=10, ky_han=10, lai=0.0,
              loi_suat=0.10, tang_gia=0.10, phi_thang=0.0,
              co_phi_bao_tri=False, thue_thang=0.0, lam_phat=0.0)
sav = (M.TRUOC_BA, M.CONG_CHUNG, M.PHI_HO_SO, M.THUE_TNCN, M.MOI_GIOI)
M.TRUOC_BA=M.CONG_CHUNG=M.PHI_HO_SO=M.THUE_TNCN=M.MOI_GIOI=0.0
r = M.so_sanh(gia=1000, von=1000, nam=10, ky_han=10, lai=0.0,
              loi_suat=0.10, tang_gia=0.10, phi_thang=0.0,
              co_phi_bao_tri=False, thue_thang=0.0, lam_phat=0.0)
check('Không phí, nhà tăng = lợi suất -> MUA == THUÊ', r['chenh'], 0.0, 1e-9)
check('  ... và cả hai = 1000 x 1,1^10 = 2593,7', r['nw_mua'], 1000*1.1**10, 1e-9)

# 3. Nhà tăng cao hơn lợi suất -> MUA thắng; thấp hơn -> THUÊ thắng
a = M.so_sanh(gia=1000, von=1000, nam=10, ky_han=10, lai=0.0, loi_suat=0.10,
              tang_gia=0.14, phi_thang=0.0, co_phi_bao_tri=False,
              thue_thang=0.0, lam_phat=0.0)['chenh']
b = M.so_sanh(gia=1000, von=1000, nam=10, ky_han=10, lai=0.0, loi_suat=0.10,
              tang_gia=0.06, phi_thang=0.0, co_phi_bao_tri=False,
              thue_thang=0.0, lam_phat=0.0)['chenh']
check('Nhà +14% > đầu tư 10% -> chênh > 0', 1.0 if a>0 else 0.0, 1.0)
check('Nhà  +6% < đầu tư 10% -> chênh < 0', 1.0 if b<0 else 0.0, 1.0)
M.TRUOC_BA,M.CONG_CHUNG,M.PHI_HO_SO,M.THUE_TNCN,M.MOI_GIOI = sav

# 4. Điểm hoà vốn phải thoả: đặt tang_gia = điểm hoà vốn thì chênh ~ 0
d = M.diem_hoa_von()
r2 = M.so_sanh(tang_gia=d)
check('Điểm hoà vốn mặc định (%.4f) cho chênh lệch ~ 0' % d, r2['chenh'], 0.0, 1e-4)

# 5. Tổng tiền thuê 25 năm, thuê 10tr/tháng tăng 4%/năm
tong = sum(10*12*(1.04**y) for y in range(25))
check('Tổng tiền thuê 25 năm (10tr, +4%/năm)', M.so_sanh()['tong_thue_nha']*1.0,
      tong/12*1.0 if False else sum(10*(1.04**(t//12)) for t in range(300)), 1e-9)

# 6. Chuyển nhà nhiều lần luôn tệ hơn ở yên (vì tốn phí)
x1 = M.so_sanh(so_lan_chuyen=1)['nw_mua']
x3 = M.so_sanh(so_lan_chuyen=3)['nw_mua']
check('Chuyển 3 lần < ở yên', 1.0 if x3 < x1 else 0.0, 1.0)

# 7. Lãi vay cao hơn -> mua tệ hơn
y1 = M.so_sanh(lai=0.07)['chenh']; y2 = M.so_sanh(lai=0.13)['chenh']
check('Lãi vay 13% xấu hơn 7%', 1.0 if y2 < y1 else 0.0, 1.0)

print('-'*78)
print('KẾT QUẢ:', 'TẤT CẢ ĐẠT' if ok else 'CÓ LỖI')
