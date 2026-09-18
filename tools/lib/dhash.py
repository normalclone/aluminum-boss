# Bam anh theo NOI DUNG, khong theo byte.
#
# VI SAO CAN
#
# images-bossdoor.js da co mot buoc bo anh trung: bam md5 moi tep, hai muc cung ma thi muc sau
# de trong. No bat duoc 8 muc dung chung mot tam anh nha 400x224 — nhung no chi bat duoc khi hai
# tep GIONG NHAU TUNG BYTE.
#
# Lo 18/09/2026 lot mot cap ma md5 khong the thay: `high-speed-doors.png` va
# `industrial-shutters.jpg` la CUNG MOT tam anh nha kho, khac khung cat va khac dinh dang. Hai
# the tin canh nhau tren trang danh sach, cung mot tam anh. md5 cua chung khong co gi giong nhau.
#
# CACH BAM
#
# dHash: thu nho ve 9x8 xam, so moi diem anh voi diem ben phai no, duoc 64 bit. Hai anh cung noi
# dung nhung khac kich thuoc, khac dinh dang, khac muc nen se cho ra hai ma lech nhau vai bit.
# Khoang cach Hamming cang nho cang giong. Nguong mac dinh la 8.
#
# NGUONG NAY KHONG PHAI MOT VACH. Toi viet doan tren truoc khi do, va da ghi rang "khong co gi
# nam giua 8 va 19 bit". Do that thi sai: tren 1.081 cap cua lo nay phan bo lien tuc — 0, 0, 1,
# 1, 3, 4, 6, 6, 6, 6, 7, 7, 8, 8, 9, 9, 9, 10... Khong co cho nao de dat mot vach ma khong cat
# vao giua. Cap nha kho (high-speed-doors / industrial-shutters) lech dung 1 bit.
#
# Nen cong cu nay dua ra MOT DANH SACH NGAN de nhin, giong het `textScore` trong images-text.py:
# no thu hep 1.081 cap xuong 14 cap dang ngo, va nguoi nhin quyet dinh cap nao that su la mot
# tam. Doi nguong len bat them anh gan giong; ha xuong bo sot. Ca hai deu la lua chon, khong
# phai mot phep do dung hay sai.
#
# dHash KHONG bat duoc anh bi lat, xoay, hoac cat sau. Do la gioi han that va no khong duoc gia
# vo la khong co: nhung phep do do can mot thu vien anh that, con day chi can PIL.
from PIL import Image


def dhash(path, size=8):
    """Ma 64 bit theo noi dung anh. Tra ve mot so nguyen."""
    with Image.open(path) as im:
        g = im.convert('L').resize((size + 1, size), Image.LANCZOS)
        px = g.load()
    bits = 0
    for y in range(size):
        for x in range(size):
            bits = (bits << 1) | (1 if px[x, y] > px[x + 1, y] else 0)
    return bits


def cach(a, b):
    """Khoang cach Hamming giua hai ma."""
    return bin(a ^ b).count('1')


def nhom(paths, nguong=8):
    """Gom cac tep cung noi dung. Tra ve list cac nhom, moi nhom la list duong dan (>= 2 tep)."""
    ma = {}
    for p in paths:
        try:
            ma[p] = dhash(p)
        except Exception:
            pass
    con = list(ma)
    da = set()
    out = []
    for i, a in enumerate(con):
        if a in da:
            continue
        g = [a]
        for b in con[i + 1:]:
            if b not in da and cach(ma[a], ma[b]) <= nguong:
                g.append(b)
                da.add(b)
        da.add(a)
        if len(g) > 1:
            out.append(g)
    return out


def giong(path, gallery, nguong=8):
    """Tep nay co trung noi dung voi tam nao trong `gallery` khong. Tra ve duong dan do hoac None."""
    try:
        h = dhash(path)
    except Exception:
        return None
    for q in gallery:
        try:
            if cach(h, dhash(q)) <= nguong:
                return q
        except Exception:
            pass
    return None
