# Cho khach sua duoc SEO tung trang

25/09/2026. Yeu cau: "Co phan de nguoi dung edit seo chua?" — chua co. Ke hoach nay them mot
nhom **Search result** vao cot trai cua trinh soan, cho moi trang: tieu de tim kiem, mo ta tim
kiem, va (voi trang danh sach) anh chia se.

## Cai da co, va cai chua co

`Content/PageHead.cs` dung SAN `seoTitle` / `seoDescription` tren tung muc: chung dung dau chuoi
`Pick(...)`, tuc la neu co thi thang. Kiem chung truoc khi lam bat cu gi (buoc 0 duoi day):
`Pick` tra ve gia tri **khong rong** dau tien, khong phai khoa **ton tai** dau tien — nen mot
`seoTitle` rong KHONG the lam trang mat tieu de. Do la cai bay duy nhat dang so, va no khong co.

Chua co ba thu:

1. Khong o nhap nao tren man hinh. 94 trang muc co `seoTitle` ma khong ai ghi vao duoc.
2. Khong muc nao trong `_data/*.json` co san hai khoa do — ma `ContentEditor` co luat
   "mot truong khong ton tai thi khong duoc tao ra".
3. Trang DANH SACH (8 trang) khong di qua `PageHead` chut nao: tieu de va mo ta cua chung nam
   cung trong `build/reskin.py` (`TITLE` / `BLURB`), tuc la trong ma nguon Python.

## Cai KHONG nam trong pham vi nay

Trang tinh tren GitHub Pages van mang dau trang cua khuon mau cho MOI muc. Viec nay da bao
rieng va chua co quyet dinh (deploy `export/` hay them buoc nuong lai truoc khi push). Ke hoach
nay them o sua; no khong dong khe ho ay.

---

## Buoc 0 — Xac minh `Pick` (xong)

`Content/PageHead.cs` dong 83: `if (value.Length > 0) return value;` → mot o rong roi xuong
khoa sau. Khong can va gi truoc. Ghi lai thanh phep kiem dau tien cua `tools/seo-fields.js`.

## Buoc 1 — Cho phep tao hai khoa do, va chi hai khoa do

`Content/ContentEditor.Apply` them mot ngoai le CO TEN cho `seoTitle` / `seoDescription`:

- chi hai ten la, va chi khi doi tuong chua chung DA co san → mot dia chi go sai van khong de
  ra truong moi;
- ghi rong = **xoa khoa**, khong ghi `""` — cung ly le voi `visible` o `Structure`: mot o chua
  ai ghi va mot o vua bi xoa trang phai de lai cung mot trang thai trong tep;
- ghi dung cai da co = nhan, nhung khong danh dau tep la da doi (khong ghi lai ca tep).

## Buoc 2 — Dua tieu de/mo ta trang danh sach vao `site.json`

`site/_data/site.json` + `wwwroot/_data/site.json` them khoa `seo`:

```
"seo": { "home": { "title": ..., "description": ..., "image": "" }, "colors": {...}, ... }
```

Khoa = doan dau cua duong dan; trang chu la `"home"` chu khong phai `""` — `ContentPath` bo cac
doan rong, nen `site.seo..title` se thanh `site.seo.title` va tro nham cho.

Gia tri chep **nguyen van tu trang da dung**, khong chep tu `TITLE`/`BLURB` — vi mot so tieu de
hien nay den tu the `<title>` co san chu khong tu `TITLE` (vi du "About us | AluminumBoss", ma
`TITLE` khong he co muc `about-us`). Chep tu ma nguon Python se doi tieu de 7 trang ma khong ai
yeu cau.

`build/reskin.py` doi thanh **ben doc** `site.json`.

Bang chung chep dung, ban dau tinh la "chay lai `reskin.py`, `git diff site/` phai rong". **Phep
do do sai** va da do roi moi biet: `reskin.py` la buoc GIUA, sau no con `tools/add-addresses.js`
moi dong cac `data-ab-*` len dau trang. Chay mot minh `reskin.py` tren cay SACH da lam doi 152
trang - bo het dia chi - truoc khi toi dong vao gi ca. Mot phep kiem luon that bai thi khong noi
duoc gi.

Phep do dung: chay **ban cu** va **ban moi** tren cung mot cay sach, moi ban mot luot, roi so hai
ket qua. Da chay: **giong het tren ca 152 trang**.

Tieu de la tieu de DAY DU, dung nhu tren the trinh duyet. Khong ghep them " | AluminumBoss" o
dau ca — trang chu von da co dang khac han, va mot o "tieu de tim kiem" ma gia tri that lai co
duoi phu them la mot o noi doi.

## Buoc 3 — Trang danh sach di qua `PageHead`

`PageComposer.Describe` them nhanh khi `item is null`: lay doan dau cua duong dan, doc
`site.seo.<key>`, ap qua `PageHead.ForPage` (title / description / og:* / og:image / canonical).

Cung luc, `PageHead.ForItem` doi mot diem: khi `seoTitle` **duoc ghi** thi dung **nguyen van**,
khong ghep " | <ten site>"; khi tieu de la SUY RA tu `title`/`name`/... thi van ghep nhu cu. Ly
do: o nhap phai giu ca tieu de, giong het trang danh sach. Hien khong muc nao co `seoTitle` nen
thay doi nay khong dong vao du lieu dang co.

## Buoc 4 — Khoi SEO an, chi co khi `?edit=1`

`PageComposer` dung san `WithBridge` lam cho de moi thu chi-danh-cho-trinh-soan di vao, vi ban
tinh khong duoc mang chung. Them mot khoi:

```html
<div hidden>
  <span data-ab-t="news.items.3.seoTitle"       data-ab-seo="title"       data-ab-hint="..."></span>
  <span data-ab-t="news.items.3.seoDescription" data-ab-seo="description" data-ab-hint="..."></span>
</div>
```

`data-ab-hint` la gia tri **dang tu sinh** — cai trang se dung neu o de trong. Khoi nay duoc
chen SAU cac luot thay the, nen gia tri duoc ghi thang vao `textContent`.

Trang danh sach them o thu ba `data-ab-seo="image"` tren mot `<img data-ab-img=...>`. Trang muc
KHONG co o anh: anh chia se cua mot muc chinh la anh cua muc do, ma o do da co san o cot trai —
hai o cho mot gia tri la hai cho de hoi cai nao that.

## Buoc 5 — Hai dau cau noi

`edit-bridge.js`: `fields()` gan them `seo` (vai tro) va `hint`. Sua luon phan HOP DONG o dau
tep — hop dong nam trong chu thich do, va doi ma truoc khi doi chu thich la cach no thanh sai.

`editor.js`:
- nhom rieng `Search result`, dat theo thu tu xuat hien nen no roi vao sau cac nhom cua trang va
  truoc `Site`;
- nhan co dinh theo vai tro: "Search title" / "Search description" / "Share picture";
- `hint` thanh `placeholder` — o trong hien dung cai trang dang dung;
- dem ky tu: **khong** o nao la nguong ma phan mem nay ap dung, va phai noi dung nhu vay.
  `PageHead.Trim(…,160)` chi cat cai **tu sinh** — mot mo ta do nguoi go vao thi giu nguyen van
  (mo ta trang chu hien dai 165 ky tu, cat no di la tu y sua noi dung khach da viet). Nen o dem
  ghi "khoang 160 la cho ket qua tim kiem cat", "khoang 60" cho tieu de — la cach Google cat,
  noi ro la cua Google.

## Buoc 6 — Kiem

`tools/seo-fields.js` (moi), chay voi may chu :5199:

1. `Pick` bo qua chuoi rong (doc thang `PageHead.cs`).
2. Trang muc `?edit=1` co nhom "Search result" voi dung 2 o; `placeholder` cua o tieu de bang
   dung tieu de dang tu sinh.
3. Trang danh sach `?edit=1` co 3 o (co o anh).
4. Khoi SEO **khong co** khi khong co `?edit=1`.
5. Go tieu de → Save → tai `/news/<slug>/` (khong `edit`) va `<title>` dung bang cai vua go,
   khong ghep duoi.
6. Ca hai cay `_data` deu doi (`tools/trees.py` sach).
7. Xoa trang o do → Save → khoa bien mat khoi JSON, `<title>` quay ve gia tri tu sinh.

Va: so ban cu/ban moi cua `reskin.py` (tren) giong het; `python tools/trees.py` sach;
`node tools/editor-clicks.js` van 18/18.

## Buoc 7 — Dung lai + khoi dong lai

Co sua C# nen phai `dotnet build` (dung tien trinh truoc, MSB3027), roi chay lai :5199.

---

## Da lam — 25/09/2026

| Buoc | Ket qua |
|---|---|
| 0. `Pick` bo qua chuoi rong | Xac minh trong ma nguon; thanh phep kiem so 1 |
| 1. Ngoai le co ten trong `ContentEditor` | `SeoLeaf` + `Seo`; rong = xoa khoa |
| 2. `site.seo.*` trong ca hai cay; `reskin.py` thanh ben doc | Ban cu/ban moi giong het tren 152 trang |
| 3. `PageHead.ForPage` + `Automatic`; trang danh sach di qua composer | `/colors/` doi tieu de khi luu |
| 4. Khoi SEO an, chi co voi `?edit=1` | Khong `?edit=1` thi khong mot `data-ab-seo` nao |
| 5. `edit-bridge.js` (`seo`, `hint`) + `editor.js` (nhom, nhan, dem) | Hop dong da sua truoc ma |
| 6. `tools/seo-fields.js` | **18/18 DAT** |
| 7. Dung lai + khoi dong lai | `tools/editor-clicks.js` van **18/18**, `tools/seo.js` tren :5199 **DAT het** |

Hai cho lech so voi ke hoach, ca hai deu do do roi moi biet — chep sang `docs/QUYET-DINH.md`
muc 12: phep do "reskin zero-diff" **luon that bai** nen phai doi cach do; va luat cat 160 chi ap
cho gia tri **tu sinh**, chu go tay thi giu nguyen van.

## Hai loi CU tim ra trong luc kiem, va da sua

Ca hai khong thuoc phan SEO, nhung ca hai chan duong kiem phan SEO nen sua luon.

**1. Bang chon anh vo bo cuc — `wwwroot/admin/editor.css`.** Moi hang cua bang chon anh cao dung
56px, nen moi hinh thu bi cat thanh mot dai va ten tep bi cat mat: ca thu vien khong doc duoc.
Da o trang thai do tu truoc, khong lien quan gi den thay doi lan nay — do lai bang cach tra
`editor.css` ve ban goc, so vao van y het.

Nguyen nhan: hang `auto` cua CSS grid lay chieu cao theo **min-content** cua cac o, ma mot o la
mot `<button>` co `overflow: hidden`, nen tam anh ben trong khong dong gop gi — toi thieu tinh
ra bang dung dong ten tep. Sua mot dong: `grid-auto-rows: max-content`.

Cho nay dang chu y vi no la **o "Anh chia se" cua chinh phan SEO** dua vao. Neu khong di het mot
vong chon anh that (phep kiem 9), toi da giao mot o mo ra mot bang khong dung duoc.

**2. `tools/editor-shot.js` hong co dinh.** Phep thu "bam chu -> chon o nhap" van bam THUONG,
trong khi tu 21/09/2026 luat da doi: bam thuong = trang chay nhu that, chi Ctrl+bam moi la chon.
Cong cu ay hong moi lan chay tu hom do den gio. Mot phep thu luon do thi khong con canh duoc gi.
Da doi thanh Ctrl+bam; gio ca 12 phep deu dat.
