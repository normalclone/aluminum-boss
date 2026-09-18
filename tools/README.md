# Bộ đo

Mỗi công cụ ở đây tồn tại vì nó đã bắt được một lỗi thật mà việc đọc mã không bắt được. Phần
"đã bắt được gì" không phải để trang trí — nó cho biết công cụ nào đáng chạy khi nào.

Mọi công cụ nhận gốc site làm tham số đầu tiên, mặc định `http://127.0.0.1:5117`, và **thoát với
mã 1 khi phép đo không đạt** nên dùng được trong CI.

```bash
cd tools && npm install
npm run check                 # crawl + textmass + overlap
node crawl.js https://normalclone.github.io/aluminum-boss
```

**Đăng nhập khu quản trị** dùng chung `lib/admin.js`. Nó thử `AB_ADMIN_PASS` (mặc định
`changeme-please`), không được thì thử mật khẩu gốc trong mã nguồn, và nếu máy chủ đẩy sang cổng
đổi mật khẩu thì **đi qua đúng đường người thật đi** — đổi rồi làm tiếp, và in ra rằng nó đã đổi.
Nghĩa là lần chạy đầu tiên trên một máy mới sẽ đổi mật khẩu của tài khoản `admin`.

**Mốc nền của `parity.js`:** dùng `baseline/task15`, không dùng `baseline/` trần. Thư mục trên
cùng là mốc từ trước Task 10, đặt tên tệp theo lối đường dẫn cũ, nên so với nó ra 15 trang lệch
mà không có gì sai cả.

---

## `crawl.js` — liên kết chết và request hỏng

Tải 15 trang bằng Chrome thật, bắt mọi request trả 4xx/5xx, rồi **fetch từng liên kết** trên mỗi
trang để biết nó thật sự trả về gì.

> **Đã bắt được:** 42 request chết sau khi đổi tên thư mục tài nguyên · một liên kết trong
> `_app/home.js` viết tương đối theo trang nên resolve sâu hơn một cấp và 404 từ ngày viết ra,
> không ai bấm nên không lộ · bảy thẻ `<link>`/`<script>` của theme trỏ tới file chưa bao giờ
> được tải về, tốn 6 request hỏng mỗi lượt vào trang.

Đọc diff không bắt được loại lỗi này: một liên kết sai trông hoàn toàn bình thường trong mã, chỉ
hỏng khi có thứ gì đó resolve nó.

Từ Task 10 nó còn đếm riêng **liên kết nội bộ trả 301**. Một liên kết như vậy không làm hỏng trang
nào — người bấm vẫn tới đúng chỗ — nên không phép đo nào khác nhìn thấy nó; nhưng nó là dấu vết
của một lớp liên kết bị bỏ quên lúc đổi đường dẫn. Liên kết nằm ở bốn lớp (renderer, bản dự phòng
JS, `href` viết cứng trong chân trang, và `href` nằm trong chính dữ liệu) và bỏ quên một lớp
không gây 404.

---

## `textmass.js` — bot đọc được bao nhiêu

So số ký tự chữ trong **HTML thô** với số ký tự **sau khi JavaScript chạy**.

> **Đã bắt được:** toàn bộ chữ một bot đọc được trên trang bài viết là nav và footer — 672 ký tự
> khung, không một chữ nào của bài. Phát hiện này lật ngược một quyết định kiến trúc.

Dấu hiệu quan trọng: **nhiều trang cho ra con số HTML thô giống hệt nhau** nghĩa là chúng chỉ có
phần khung chung, nội dung thật bằng không.

GPTBot, ClaudeBot, PerplexityBot, CCBot tải HTML rồi đọc thẳng — chúng không chạy JavaScript.

---

## `nojs.js` — trang trông thế nào khi tắt JavaScript

`textmass.js` đếm chữ còn lại; cái này **chụp ảnh** phần còn lại. Đó là đúng thứ một trình thu
thập nhận được.

```bash
node nojs.js http://localhost:5199 --only colors 1440 out/
```

Đây là chỗ `parity.js` không với tới được: nó chờ script chạy xong rồi mới chụp, nên nó so trang
mà **người** nhìn thấy. Một trang có HTML máy chủ dựng sai vẫn giống hệt trong phép so đó, vì
script thay nó đi ngay sau. Bot không có khoảnh khắc ấy.

> **Dùng để làm gì:** sau mỗi loại nội dung chuyển sang dựng phía máy chủ, mở ảnh ra **nhìn bằng
> mắt**. Con số "2.208 ký tự" không phải là lời khẳng định "trang đọc được".

---

## `parity.js` + `compare.py` — refactor có đổi hình thức không

Chụp 15 trang từ hai nguồn rồi trừ pixel.

```bash
node parity.js --save http://127.0.0.1:5117 baseline 1440     # chụp mốc nền
node parity.js --against http://127.0.0.1:5117 baseline 1440  # so lại sau khi sửa
python compare.py baseline after                              # lệch bao nhiêu
node parity.js --only colors http://127.0.0.1:5117 <nguồn-B>  # chỉ trang có "colors"
```

`--only <chuỗi>` lọc theo đường dẫn. Khi đang sửa một danh sách, chụp mười bốn trang không đụng
tới chỉ tốn bốn phút mỗi vòng. **Trong Git Bash đừng viết `--only /colors/`** — nó tưởng đó là
đường dẫn Unix và đổi thành `C:/Program Files/colors/`; viết `--only colors`.

> **Đã ký duyệt:** port từ bản clone tĩnh vào app .NET · dời cả cây lên một cấp · mọi lần đổi
> nội dung kể từ đó.

**Mốc nền đang dùng: `baseline/task23`** (trước đó `task22`, `task19`). Thư mục `baseline/` ở cấp trên
cùng là mốc **trước Task 10**, còn dùng lối đặt đường dẫn cũ — so với nó thì cả 15 trang đều báo
lệch, và đó không phải hồi quy.

**Khác byte không phải câu hỏi.** Công cụ tự đếm pixel lệch quá 32/255 khi hai ảnh khác byte,
rồi mới kết luận. Trước đó nó báo "KHÁC — chạy compare.py" và để người tự làm; trong một buổi
chiều, cách đó báo động giả ba lần liền trên những trang không lệch một pixel nào.

**Hai ảnh khác CHIỀU CAO thì nó nói thẳng cao khác bao nhiêu.** Không còn pixel nào để trừ,
nhưng đó là một câu trả lời thật chứ không phải phép đo hỏng — và `CAO KHÁC: -159px so voi moc`
chỉ ngay ra khối nào mất chỗ, trong khi dòng cũ (`khong chay duoc python`) gửi người đọc đi tìm
Python cả buổi. Đã gặp thật: một script trang chủ gọi `highlights.json` sau khi tệp ấy đổi tên,
báo lỗi ngay trong khối "New" và làm trang ngắn đi đúng 159px.

**`/news/` lệch vài trăm pixel mà không ai sửa gì: đó là NGÀY, không phải hồi quy.** Danh sách
tin in ngày theo lối tương đối — "25 days ago", "2 months ago" — nên mọi mốc nền tự hỏng dần theo
thời gian. Đo được: mốc chụp ngày 13/09, chạy lại ngày 16/09, lệch **878 pixel** gọn trong hai
dòng ngày. Vùng lệch nằm đúng dưới chữ ngày thì đọc tên tệp `locate-diff` ra là biết ngay.

**Một trang lệch đơn lẻ thì chụp lại trước khi coi là hồi quy.** Cách phân biệt: chụp cùng một
trang hai lần từ **cùng một máy chủ** rồi so hai ảnh đó với nhau. Khác nhau nghĩa là phép chụp
không ổn định; giống nhau mà vẫn lệch với mốc nền thì mới là hồi quy thật. Đã gặp thật hai lần —
175 pixel trên một thẻ `<select>`, và 4.827 pixel trên trang chủ.

**Ảnh SVG dạng `data:` bị ẩn khi chụp.** Cùng một vấn đề với ô điều khiển, chỉ sâu hơn một tầng:
một SVG phục vụ qua thẻ `<img>` tự vẽ chữ của nó, và trình duyệt dựng chữ đó theo một trong hai
cách tuỳ lúc giải mã xong. Đo được: hai lần chụp trang chủ từ **cùng một máy chủ** lệch đúng
**4.827 pixel**, lần nào cũng đúng con số ấy, gói gọn trong hai dòng chữ bên trong mỗi ảnh
placeholder của khối gallery — trong khi DOM giống nhau từng ký tự và `settle.js` cho thấy cả
mười một vùng có cùng đỉnh, cùng chiều cao qua bốn lần tải. Ẩn chúng vẫn giữ nguyên cái khung,
tức là giữ nguyên bố cục, trong phép so. Không mất gì: `ph-parity.js` đối chiếu hình máy chủ vẽ
với hình trình duyệt vẽ **từng ký tự**, chặt hơn nhìn ảnh chụp của chúng.

**Ảnh `loading="lazy"` phải được ép tải trước khi chụp.** Ảnh chụp toàn trang không cuộn, nên
ảnh dưới màn hình vẫn trống. Vô hại khi cả hai bên cùng hoãn như nhau; nguy hiểm ngay khi không:
danh sách do máy chủ dựng đặt ảnh sẵn trong HTML nên trình duyệt hoãn thật, còn danh sách do JS
chèn sau thì tải ngay. Đo được: riêng khác biệt đó báo **235.008 pixel lệch** trên một trang mà
chữ giống hệt nhau. Công cụ giờ đổi mọi ảnh sang `eager` và chờ `decode()` xong.

**Chữ trong ô điều khiển gốc của trình duyệt không tất định.** Ba lần chụp cùng một trang cho ra
hai kết quả, lệch đúng 175 pixel trên vùng 50×12px chứa chữ `Select...` của một `<select>`. Hai
ảnh nhìn bằng mắt giống hệt; chữ chỉ dịch một phần pixel. Công cụ làm trong suốt chữ trong
`select` / `input` / `textarea`, giữ nguyên khung viền nên vẫn bắt được thay đổi bố cục.

**Con số quyết định là "bao nhiêu pixel lệch quá 32/255", không phải "có giống hệt không".** Khử
răng cưa và giải mã JPEG luôn để lại vài đơn vị nhiễu trên một nhúm pixel, kể cả giữa hai lần
tải **cùng một trang**. Ngưỡng 32 luôn bằng 0 qua mọi thay đổi trên site này; ngưỡng "khác chút
nào" thì chưa bao giờ bằng 0.

---

## `scroll.js` — cuộn có giật không, và giật ở đoạn nào

Thời gian khung hình theo vị trí cuộn, quy về từng vùng của trang.

> **Đã bắt được:** một vùng giữ trang ở 25–40fps trong khi mọi phép đo toàn trang đều nói cuộn
> vẫn tốt.

Hai cái bẫy công cụ này tồn tại để tránh:

- **Cửa sổ không được đưa lên trước thì `requestAnimationFrame` bị điều tiết về ~1Hz**, cho ra
  "1007ms mỗi khung" trên một trang hoàn toàn khoẻ mạnh. Công cụ khẳng định `visibilityState`
  trước khi tin bất kỳ con số nào.
- **Mức nền thay đổi.** Máy báo 8,3ms hôm nay và 9,9ms hôm sau là đã đổi tần số quét màn hình,
  không phải website đổi. **Luôn so với một lần chạy cùng phiên.**

---

## `idle.js` — chi phí khi trang đứng yên

> **Đã bắt được:** người dùng báo trang giật, mọi phép đo cuộn đều nói ổn. Cuộn **thật sự** ổn —
> bộ dừng-khi-cuộn giữ hai khối canvas ở 2 lần vẽ/giây trong lúc bánh xe quay. Chi phí xuất hiện
> đúng lúc dừng tay, tức là phần lớn thời gian người ta ở trên trang, và không phép đo cuộn nào
> nhìn vào đó.

Thêm `--isolate` để ẩn mọi khối động trừ khối đang đo. Cần thiết: một khối trông đắt có thể chỉ
đang nằm cạnh một khối đắt. Trên site này, con số 24,7ms từng bị gán cho bản đồ nhà máy hoá ra
là quả địa cầu vẫn chạy vì còn hở 89px trong tầm quan sát.

Chạy cả `dpr 1` và `dpr 1.5` — 1.5 là mức tỉ lệ hiển thị máy Windows hay dùng, và là mức tệ nhất.

---

## `overlap.js` — chữ đè lên chữ

Đi dọc khoảng cuộn, báo chỗ nào có chữ nổi đè lên chữ **vẫn còn nhìn thấy** (kiểm cả `opacity`).

> **Đã bắt được:** wordmark đè lên chữ lớn của hero suốt 400px cuộn, chồng tới 69px.

Đây là lớp lỗi mà phép đo bình thường không thấy. Bốn lần dựng khối trên site này, mỗi lần đều
giao một placeholder tự in lại đúng chữ đã có trên thẻ — và cả bốn đều báo 0 lỗi, không tràn
ngang, link 200. Một trong số đó tự viết phép kiểm *"src có bắt đầu bằng `data:` không"* — loại
khẳng định luôn xanh trong khi trang trông sai.

**Quy tắc rút ra: chụp ảnh và mở ra xem. Phép đo không thay được việc nhìn.**

---

## `locate-diff.py` — lệch ở CHỖ NÀO

`compare.py` trả lời "lệch bao nhiêu"; cái này trả lời "lệch ở đâu", và cắt vùng đó ra thành hai
ảnh để mở lên nhìn.

```bash
python locate-diff.py baseline/products_1440.png after/products_1440.png diff
```

> **Đã bắt được:** một phép so báo 235.000 pixel lệch. Cắt ra nhìn thì thấy chữ giống hệt nhau,
> chỉ thiếu ảnh — hoá ra là ảnh `lazy` chưa kịp tải, không phải hồi quy. Không có công cụ này thì
> con số đó dẫn thẳng tới việc đi truy một lỗi không tồn tại.

Một dấu hiệu đáng nhớ: **số pixel lệch giống hệt nhau ở hai bề ngang khác nhau** nghĩa là vùng
lệch có kích thước cố định — thường là một ô điều khiển, không phải nội dung chạy theo bố cục.

---

## `ph-parity.js` — bản port có còn là bản port không

`Content/Placeholder.cs` là bản chuyển của `AB.ph` trong `_app/app.js`. Hai bên vẽ cùng một cái
hố trên cùng một trang — máy chủ vẽ cho lần tải đầu, trình duyệt vẽ trong lúc có người đang sửa.
Lệch nhau là nhấp nháy mỗi lần gõ phím.

```bash
node ph-parity.js http://localhost:5199
```

> **Đã bắt được:** `Math.Round` của .NET làm tròn số rưỡi về số **chẵn**, `Math.round` của JS làm
> tròn **lên**. Một toạ độ tính ra 160,5 thành 161 ở trình duyệt và 160 ở máy chủ, đẩy dòng chữ
> thông số lên đúng một pixel — 450 pixel lệch. Lỗi đó tìm ra bằng cách chụp cả trang rồi khoanh
> vùng; công cụ này tìm ra trong bốn giây và chỉ đúng ký tự thứ mấy.

---

## `behaviour.js` — bấm thử những thứ vẫn phải chạy

Script không dựng DOM nữa; chúng gắn hành vi lên HTML **máy chủ** viết ra. Mọi handler giờ chạy
trên thứ nó không tự viết, và **ảnh chụp không nhìn thấy điều đó**: bộ lọc, bộ xem ảnh và phép
kiểm biểu mẫu đều đẹp như thường trong ảnh chụp một trang chưa ai chạm vào.

> **Đã bắt được (qua phép so pixel, không qua công cụ này):** bỏ lần dựng đầu cũng bỏ luôn vòng
> lặp đếm kết quả, nên dòng tổng đọc thành "0 of 25 documents". Cái đó còn hiện ra trong ảnh.
> Bộ lọc gãy, bộ xem ảnh không mở, biểu mẫu im lặng thì không.

---

## `settle.js` — trang có đứng yên giữa các lần tải không

Tải cùng một trang vài lần rồi báo vùng nào ra chiều cao khác.

> **Đã dùng để loại trừ:** trang chủ lệch 4.827 pixel giữa hai lần chụp từ cùng một máy chủ. Giả
> thuyết đầu tiên bao giờ cũng là "có thứ gì đó bên trên đổi chiều cao". Công cụ này cho thấy cả
> mười một vùng có cùng đỉnh và cùng chiều cao qua bốn lần tải, chiều cao tài liệu không đổi một
> pixel — nên nguyên nhân nằm ở chỗ khác, và đó là chữ bên trong ảnh SVG.

Loại trừ cũng là kết quả: không có nó thì rất dễ đi sửa một dịch chuyển bố cục không tồn tại.

---

## `trees.py` — `site/` và `wwwroot/` có nói cùng một thứ không

`wwwroot/` là thứ máy chủ đọc; `site/` là bản tĩnh GitHub Pages phục vụ. Không có gì ép hai bên
giống nhau.

```bash
python trees.py
```

> **Đã bắt được:** thêm `familySpecs` vào `wwwroot/_data/colors.json` mà quên chép sang `site/`,
> nên trang chi tiết màu **trên bản đang chạy** hiện "—" ở ba dòng thông số. Không phép đo nào
> khác bắt được, vì tất cả đều chỉ chạm vào máy chủ.

File dữ liệu và script phải giống **từng byte**. File HTML so sau khi giải mã thực thể và bỏ
khoảng trắng cạnh thẻ, vì bản tĩnh viết `Böss` còn khuôn viết `B&ouml;ss`, và bộ ghép nối các
dòng bằng `<br>` không xuống dòng.

---

## `crawl-bossdoor.js` + `extract-bossdoor.js` — lấy nội dung từ bossdoor.vn

bossdoor.vn là site của cùng một nhà (BossGroup / Tân Trường Sơn) nhưng là một dòng sản phẩm
khác: cửa cuốn hoàn chỉnh. Kế hoạch nhập ở
`docs/superpowers/plans/2026-09-13-nhap-noi-dung-bossdoor.md`.

```bash
node crawl-bossdoor.js                  # cào, bỏ qua trang đã có trên đĩa
node crawl-bossdoor.js --limit 3        # ba mục mỗi loại, để thử
node crawl-bossdoor.js --fresh          # cào lại từ đầu
node extract-bossdoor.js                # bóc HTML thành import/extracted.json
```

**Bốn thứ đo được trước khi viết, và cả bốn đều đổi cách viết:**

1. **Máy chủ trả 403 cho `curl` trần.** `robots.txt` ghi `Allow: /` — đây là WAF lọc theo
   header, không phải chặn bot. Bộ header trình duyệt đầy đủ thì 200. Bẫy kèm theo: **trang 403
   của WAF cũng là HTML**, nên rất dễ lưu vào đĩa mà không biết; công cụ nhận ra nó bằng chính
   `<title>403 Forbidden` và báo ra.
2. **Link bài viết trong trang danh sách là TUYỆT ĐỐI.** Bộ lọc đầu tiên chỉ tìm `href` bắt đầu
   bằng `/` đọc ra **0 bài** trên một trang có 11 bài — không lỗi, không báo gì.
3. **Đường dẫn dài hơn giới hạn của Windows.** Họ có bài mà *cả đoạn mở đầu* bị nhét vào slug,
   dài 286 ký tự; Windows từ chối mở đường dẫn quá 260. Đợt cào đầu chết đứng ở đó **sau 113
   trang**. Giờ tên tệp cắt còn 100 ký tự + một mã băm, và một chỗ không ghi được không làm đổ cả
   đợt cào — nó vào bảng "chỗ không đọc được".
4. **Không dùng `sitemap.xml`.** Nó có 442 URL nhưng mọi `lastmod` đều là 2023-02-08 và thiếu hết
   nội dung 2025–2026. Đi theo phân trang, đọc số trang từ chính link `last-page` của họ.

**Không cào ảnh.** ~1.500 lượt ảnh, có tấm 1,44 MB; tải hết là vài GB mà tới đợt 4 mới biết giữ
bài nào. Đợt 1 chỉ ghi URL ảnh vào `import/index.json`.

**`extract-bossdoor.js` tách hai loại thất bại, và đó là điểm chính của nó:** *"không đọc được
tiêu đề"* là công cụ bóc sai khuôn; *"trang nguồn không có nội dung"* là một phát hiện về
bossdoor.vn. Gộp hai thứ vào một bảng thì mỗi lần chạm thêm một trang rỗng lại trông như lỗi ở
đây. (Đã kiểm tay một trường hợp: `regina-hai-phong-dpj23` — khối nội dung trên bossdoor.vn rỗng
thật.)

Thân bài ra thành **khối** (đoạn, tiêu đề, gạch đầu dòng, bảng) chứ không ra một cục chữ: site
hiện tại lưu bài viết dưới dạng mảng đoạn văn, và một cục chữ thì tới đợt 5 lại phải cắt ra —
lúc ấy không còn thẻ HTML nào để biết chỗ nào hết đoạn.

---

## `hidden.js` — ẩn một mục có thật sự biến mất trên bản tĩnh không

```bash
node hidden.js            # bài tin đầu tiên
node hidden.js products   # hoặc products / projects
```

Ẩn thật một mục, phục vụ `site/` **đúng như GitHub Pages phục vụ nó** (một máy chủ tệp tĩnh dựng
ngay trong công cụ), đếm thẻ, kiểm thư mục trang riêng, rồi trả lại nguyên văn.

> **Đã bắt được:** không một script danh sách nào trong hai mươi tệp của bản tĩnh nhìn vào
> `visible`. Máy chủ lọc đúng từ lâu (`Arr()`), nên hai bản nói hai chuyện khác nhau: khách ẩn
> một sản phẩm trong Content, nó vẫn công khai trên Pages. Sửa bằng cách lọc **ở cửa** —
> `AB.load()` lược bỏ mọi mục `visible:false` ở mọi độ sâu — chứ không phải ở hai mươi chỗ đọc,
> vì hai mươi chỗ là hai mươi chỗ để quên, và các danh sách lồng (sản phẩm trong một dòng, tài
> liệu trong một nhóm) chính là những chỗ bị quên. `fanout.py` cũng thôi trải thư mục cho mục đã
> ẩn, nên đường dẫn riêng của nó trả 404 giống máy chủ.

**Không tìm thấy thẻ nào là BỘ CHỌN sai, không phải "danh sách rỗng".** Công cụ chặn ở đó và báo
KHÔNG ĐẠT — nếu không thì `0 → 0` sẽ lặng lẽ đi qua phép so `now === was - 1` vào một ngày nào đó.

---

## `hero-shots.js` — sáu chữ trên hero còn đọc được không

```bash
node hero-shots.js http://localhost:5199
```

Chụp khối hero với **từng** dòng sản phẩm được chọn, ở 1440 và 390 — mười hai tấm để mở ra nhìn.
Không kết luận gì cả, và đó là toàn bộ công việc của nó.

`home.js` mang một giả định viết thành lời trong chính nó: *"không cần lớp phủ — chữ rơi xuống
mảng tường nhạt mà bức ảnh đặt sẵn dưới đó"*. Giả định ấy đúng với ảnh nền sáng. Khách đổi một
tấm sang ảnh tối là sáu chữ trên hero và dòng chữ góc dưới có thể không đọc được nữa, và **không
phép đo nào bắt được** — `parity` chỉ nói "khác mốc nền", đúng cả khi cái khác ấy là cái đẹp hơn.

> Đo được ở lô banner đầu: năm tấm nền sáng, một tấm (`Door's Accessory`) nền xám đậm — mà vẫn
> đọc tốt, vì ảnh neo phải nên phần gradient nhạt nằm đúng dưới sáu chữ. Chỗ khó đọc lại là tấm
> `Facade`: dòng chú thích góc dưới phải nằm trên phần kính phản chiếu toà nhà tối. Chỉ ở 1440;
> ở 390 bố cục xếp ảnh trên, chữ dưới trên nền trắng.

---

## `ingest-images.py` — đưa một lô ảnh của khách vào site

Khách gửi ảnh theo lô, và mỗi lần đều là cùng ba việc: chuyển sang JPEG, chép vào **cả hai cây**,
rồi trỏ dữ liệu vào tên tệp. Làm tay ba việc ấy cho sáu tấm là sáu lần có thể quên một bước —
và bước hay quên nhất là cây `site/`, vốn là bản GitHub Pages đang phục vụ.

```bash
python tools/ingest-images.py tools/manifests/2026-09-16-banner-trang-chu.json --dry   # xem trước
python tools/ingest-images.py tools/manifests/2026-09-16-banner-trang-chu.json         # làm thật
python tools/trees.py                                                                  # kiểm hai cây
```

Manifest là một danh sách, mỗi dòng một tấm:

```jsonc
[{ "src":   "C:/.../1. Profiles.png",
   "doc":   "products", "array": "categories",
   "id":    "profile",          // tìm theo id, KHÔNG theo số thứ tự
   "field": "image",
   "as":    "hero-profile.jpg",
   "from":  "Drive AluminumBoss / 1x - Banner Header ... (id 1Vrsh...)" }]
```

**Tìm theo `id`, không theo chỉ số.** Khách kéo một dòng lên trên trong màn hình Content là chỉ
số đổi; `id` thì không. Một manifest chạy lại sau ba tháng vẫn trỏ đúng chỗ.

**`from` không làm gì cả, và đó là lý do nó ở đây.** Sáu tấm ảnh nằm trong `_media/` mà không ai
còn nhớ lấy từ đâu là sáu tấm không ai dám thay. Manifest được commit cùng ảnh.

**Thông số nén lấy từ `build/hero-image.py`** — JPEG quality 82, optimize, progressive — chứ
không tự đặt bộ mới: hai bộ khác nhau cho cùng một loại ảnh thì tấm này nét hơn tấm kia và không
ai biết vì sao. Trần 2000px cạnh dài, đúng con số tài liệu bàn giao nói với khách, vì **máy chủ
không thu nhỏ ảnh** — nó trả đúng tệp nhận được.

> Đo được ở lô đầu: sáu banner 1440×696 PNG, 1,0–1,5 MB mỗi tấm → 55–160 KB JPEG. Cả sáu cộng lại
> nhẹ hơn một tấm PNG gốc.

---

## `seed-shelves.js` — gieo hạt cho bốn cái giá của trang chủ

Bốn khối trên trang chủ — New, Products, Colors, Recent projects — lấy nội dung từ một **cái
giá**: `wwwroot/_data/home-*.json`, mỗi tệp chỉ là một danh sách id trỏ vào kho. Trước Task 21
không có giá nào; mỗi khối tự chọn bằng một quy tắc viết cứng trong `SectionRenderer`.

```bash
node seed-shelves.js            # chỉ viết vào giá đang rỗng
node seed-shelves.js --force    # ghi đè cả giá đã có nội dung
```

Nó viết ra **đúng những gì quy tắc cũ sinh ra hôm nay**, ở cả hai cây. Đó là hai việc trong một:
cái giá có nội dung để bắt đầu, và trang chủ **không đổi một pixel** khi chuyển sang cơ chế giá.
Nên bước tiếp theo phải là parity, chạy **một mình**, trước khi đổi bất cứ thứ gì khác:

```bash
node parity.js --against http://localhost:5199 baseline/task19
```

Quy tắc được **viết lại** trong script chứ không gọi vào renderer: gọi thẳng vào C# thì phép đo
sẽ hợp lệ cả khi cả hai cùng sai. Hai bên lệch nhau thì parity phải kêu lên.

> Giá rỗng **không** có nghĩa là khối rỗng — renderer rơi về đúng quy tắc cũ. Nên script này an
> toàn khi chạy lại, và xoá một tệp `home-*.json` đi thì trang chủ quay về như trước.

---

## `restart.ps1` — dừng, dựng lại, chạy lại

```bash
powershell -File tools/restart.ps1 5199
```

Bỏ bước dừng thì MSBuild chờ 30 giây rồi báo `Exceeded retry count of 10` về `apphost.exe` —
một thông báo nói về chuyện khác hẳn, rất dễ đọc nhầm thành lỗi biên dịch. Nguyên nhân thật là
bản `.exe` đang chạy khoá chính file cần ghi đè.

---

## `json-fallback.py` — bản dự phòng trong thẻ `data-ab-json`

Hai khối canvas đọc dữ liệu từ một thẻ JSON nằm ngay trong trang. Bộ ghép đặt nội dung thật vào
đó; bản nằm sẵn trong khuôn là đường lui cho thư mục `site/` phục vụ tĩnh — và đường lui đó không
có gì ép nó phải đúng.

```bash
python json-fallback.py            # ghi lại bản dự phòng từ file JSON
python json-fallback.py --check    # chỉ báo có lệch không, thoát 1 nếu lệch
```

> **Vì sao cần:** sửa `globe.json` mà quên sửa bản dự phòng thì máy chủ vẫn đúng, GitHub Pages vẫn
> vẽ quả địa cầu bằng dữ liệu cũ, và không ai thấy. Cùng một lớp lỗi với `trees.py`, chỉ khác chỗ
> giấu.

---

## `admin-shots.js` — mọi màn hình trong khu quản trị, chụp lại

Bộ đo còn lại kiểm **hành vi**: `collection.js` hỏi "thêm rồi xoá có trả về nguyên văn không",
`editor-shot.js` hỏi "gõ chữ thì khung xem thử có đổi không". Không cái nào trả lời được câu
**"màn hình ấy trông ra sao"** — một bảng không có dòng nào, một nút không có nhãn, một dòng kẻ
đứt quãng, đều đi qua cả hai mà không ai biết.

```bash
node admin-shots.js http://localhost:5199
node admin-shots.js http://localhost:5199 --width 390 --out C:/tmp/shots
```

Chụp 30 ảnh, theo đúng thứ tự một người gặp chúng: đăng nhập → màn soạn → bảng chọn ảnh → mười
màn danh sách → Pictures → Enquiries → History → đổi mật khẩu. Rồi đi hết **một đường thật**:
Content → Products → Add an item → Edit → gõ tên → Save → trang công khai → Delete → xác nhận →
đã dọn sạch, và đối chiếu `products.json` với lúc bắt đầu.

Ba thứ nó tự bắt được bằng máy, và đều là thứ mắt lướt qua sẽ bỏ sót: trang lỗi của ASP.NET, màn
hình không có `<h1>` nào (khung layout vẽ được nhưng nội dung thì không), và lỗi script trong
console.

> **Bốn thứ nó tìm ra ngay lần chạy đầu:** khu quản trị không khai báo icon nên mọi trang xin
> `/favicon.ico` và nhận 404; màn soạn là màn duy nhất không có `<h1>`; ô nhập của chính mục
> đang sửa nằm **dưới** ba mươi tám ô của header và footer; và cột Order đặt `display:flex` lên
> một `<td>` nên ô ấy thôi làm ô bảng — đường kẻ ngang đứt một đoạn ở mỗi dòng.

Và một bảng riêng cho bốn địa chỉ của bản mẫu — `/Admin/Dashboard`, `/Admin/Content`,
`/Admin/Layout`, `/Admin/Seo`. Chúng bị xoá ở Task 16, nên phép đo ở đây là **404**: một cái vẽ
ra được lần nữa nghĩa là ai đó đã hồi sinh một màn hình có nút Save không lưu gì.

Hỏi bằng `ctx.request.get` chứ không mở bằng trình duyệt: một 404 của MVC không có thân trang
nào, và Chrome coi trang rỗng kèm mã lỗi là `ERR_HTTP_RESPONSE_CODE_FAILURE` rồi ném ra. Dùng
đúng ngữ cảnh của trang nên cookie đăng nhập vẫn đi theo — phải hỏi với tư cách người đã đăng
nhập, không thì 404 chỉ nghĩa là "chưa đăng nhập".

---

## `canvas-titles.py` — ba con số cuối cùng còn nằm trong HTML

Chạy một lần, giữ lại vì nó là bản ghi của việc đã làm và vì `--check` trả lời được câu "đã làm
chưa". Nó biến hai tiêu đề canvas và thẻ tally thành tham số:

```
<h2 id="vgx-title">One origin, <em>four markets</em>.</h2>
<h1 id="vfx-title">Five factories, <em>one coastline</em>.</h1>
<b id="vfx-tally">5</b>
```

```bash
python canvas-titles.py           # sửa cả hai cây
python canvas-titles.py --check   # chỉ báo đã sửa chưa, thoát 1 nếu chưa
```

Hai tiêu đề thành cặp `lead`/`tail` y như wordmark, vì `data-ab-t` ghi `textContent` và ghi
`textContent` là thẻ `<em>` biến mất. Con số thành `data-ab-count="factories.sites"` — **đếm số
mục đang hiện**, lúc trả trang; không ai gõ một con số đếm vào ô nhập mà nó đúng mãi được.

> Chạy xong phải chạy `python json-fallback.py`, vì hai tệp dữ liệu vừa đổi.

---

## `compose.js` — trang có thật sự được ghép không

Bộ ghép từ chối phục vụ trang có địa chỉ không phân giải được: nó ghi log rồi trả về khuôn, mà
chữ dự phòng trong khuôn vẫn đúng. Đó là hành vi đúng, và nó hoàn toàn vô hình.

```bash
node compose.js http://localhost:5199
```

> **Đã bắt được:** mọi địa chỉ trên trang chủ ghi `home.title` trong khi dữ liệu ở
> `site.home.title` — đoạn đầu của địa chỉ là **tên tài liệu** và không có `home.json`. Trang rơi
> về khuôn từ ngày những địa chỉ đó được viết. Chữ đúng, pixel khớp, crawl sạch, và không một chữ
> nào trên trang chủ là tham số. Chỉ log biết, mà không ai đọc log.

Cách nhận biết: một trang đã ghép thì **luôn** khác khuôn, vì nội dung khối đổi từ rỗng thành
markup. Giống hệt khuôn nghĩa là đã rơi về khuôn.

---

## `publish-static.js` — bản tĩnh, và bằng chứng nó giống máy chủ

Trả lời một câu hỏi thật: nếu ngày mai không còn máy chủ nữa thì còn lại gì. Câu trả lời phải là
"một thư mục mở bằng trình duyệt là chạy".

```bash
node publish-static.js http://localhost:5199        # ghi ra export/, đối chiếu từng tệp
node publish-static.js --serve export 5210          # phục vụ nó để parity.js so
node parity.js http://localhost:5199 http://127.0.0.1:5210 1440
```

Danh sách trang lấy từ chính `/sitemap.xml` của máy chủ — một danh sách thứ hai viết ở đây là một
chỗ để hai bên lệch nhau mà không ai thấy. 102 URL, cộng ba tệp máy chủ tự sinh
(`sitemap.xml`, `robots.txt`, `llms.txt`), cộng 369 tệp tài nguyên chép từ `wwwroot/` (trừ mọi
`.html`, vì mỗi cái là một khuôn, và trừ `admin/`).

> **Ghi ra `export/`, KHÔNG ghi vào `site/`.** Trước Task 9, `site/` là bản in ra của máy chủ và
> ghi đè lên nó là đúng. Từ Task 9 thì ngược lại: `site/` là **khuôn song song**, chính những tệp
> mang `data-ab-section` mà bộ ghép đọc vào. Ghi HTML đã ghép lên đó là phá luôn nguồn.
> `trees.py` vẫn là thứ giữ `wwwroot/` và `site/` khớp nhau.

Công cụ mang luôn một máy chủ tĩnh nhỏ (`--serve`) vì nếu không thì không chứng minh được gì: một
thư mục không so ảnh với một máy chủ được. Đo lần cuối: **15/15 trang giống hệt ở 1440 và 390.**

---

## `slugs.py` — mỗi mục có đường dẫn riêng dùng được không

Từ Task 10, `id` của một mục trở thành một đoạn URL công khai: `/news/press-line-2500/`. Hai điều
phải đúng và không có gì trong JSON ép chúng phải đúng — id viết được thành đoạn đường dẫn, và
trong cùng một mục không có hai id trùng nhau.

```bash
python slugs.py            # in bảng, thoát 1 nếu có chỗ sai
python slugs.py --urls     # in danh sách URL, mỗi dòng một cái
```

> **Vì sao chạy trước khi viết bộ định tuyến:** `documents` gộp các danh mục thành một danh sách
> phẳng, nên hai tài liệu ở hai danh mục khác nhau vẫn có thể trùng id — và khi trùng thì một
> trong hai mất URL, im lặng.

---

## `redirects.js` — đường dẫn cũ còn sống không

Với từng mục trong bảy mục, gọi địa chỉ cũ `?id=` và đối chiếu ba điều: trả **301** (không phải
302), trỏ tới đúng đường dẫn mới **của chính mục đó**, và đường dẫn mới trả 200. Kèm tám trường
hợp biên: thiếu id, gọi tên `index.html`, thiếu dấu gạch cuối, tiền tố `/usa/` nơi cả site từng
nằm, và một slug không ai có (phải 404, không được rơi về mục đầu).

```bash
node redirects.js http://localhost:5199
```

> **Vì sao cần:** một chuyển hướng sai không làm hỏng gì cả. Nó trả về một trang, có nội dung,
> trông đẹp — chỉ là không phải trang người ta bấm vào. Không phép đo nào khác trong bộ này nhìn
> thấy điều đó.

---

## `editor-shot.js` — màn hình soạn có thật sự dùng được không

Cả bộ đo còn lại chỉ chạm vào site công khai. Khu soạn thì không phép đo nào với tới, mà thứ phải
nhìn ở đây lại đúng là thứ không đọc bằng DOM được: hai cột có cân nhau không, khung xem thử có
vừa cột không, đổi bề ngang 390 thì trang có thật sự nhảy sang bố cục điện thoại không.

```bash
node editor-shot.js http://localhost:5199 [thư-mục-ra]
```

Mười hai phép thử, sáu ảnh: đăng nhập thật (không tắt `[Authorize]` cho dễ đo) · gõ vào ô nhập
thì chữ trong khung xem thử đổi theo · bấm chữ trong khung thì ô nhập tương ứng được cuộn tới và
làm nổi lên · ba bề ngang, mỗi lần đối chiếu `innerWidth` mà chính khung báo về · ô ảnh trên một
trang có ảnh · mỗi ô ảnh nói được cỡ nên tải lên · bảng chọn ảnh mở ra được và nhắc lại cỡ ấy ·
và chữ của chính một MỤC (không chỉ chữ của khung trang) sửa được, vá sống được.

`labels.js` đọc cả ô gõ lẫn **ô chọn**: từ Task 19 ba trường của một màu là `<select>`, và cái
nhãn trên chúng đi qua đúng bảng chữ ấy.

Phép đo cỡ ảnh đọc **số**, không đọc chữ: cái nhãn đổi cách viết lúc nào cũng được, còn quy tắc
thì không — khuyến nghị không được nhỏ hơn ô thật, và không được vượt 2000 px cạnh dài.

> **Đã bắt được:** nhãn ô nhập ghi `nav › 0 › label` — tức là đường dẫn trong JSON, đúng thứ yêu
> cầu gốc nói khách không được nhìn thấy. Con số đo không thấy; mở ảnh ra thì thấy ngay. Nay là
> `Nav #1`, đếm từ một, và đường dẫn thật nằm trong tooltip.
>
> Và một cái nặng hơn: `.ed-shelf { display: flex }` thắng `[hidden] { display: none }` của chính
> trình duyệt, nên bảng chọn ảnh **luôn mở** — trắng trên trắng, phủ kín khung xem thử và nuốt mọi
> cú bấm nhắm vào trang bên dưới. Không có gì trông sai cả; khung xem thử chỉ đơn giản là không
> trả lời nữa. Phép thử "bấm chữ → chọn ô nhập" là thứ duy nhất đổi màu.

---

## `labels.js` — cái nhãn trên ô nhập có còn là tiếng người không

Địa chỉ là đường đi trong một tệp JSON, và khách đã được hứa không bao giờ phải nhìn thấy một tệp
JSON. Trình soạn có một bảng chữ (`WORDS` trong `wwwroot/admin/editor.js`) đổi tên khoá sang tên
khách gọi: `products.categories` là **Product family**, và `products.categories.N.items` bên
trong nó là **Product**.

Bảng chữ thì lạc hậu dần. Thêm một danh sách vào dữ liệu là thêm một từ chưa ai đặt tên, và cái
nhãn lặng lẽ quay về giống một cơ sở dữ liệu — không có gì kêu lên.

```bash
node labels.js http://localhost:5199          # chỉ in những chỗ còn thiếu
node labels.js http://localhost:5199 --all    # in cả 118 cái nhãn để đọc một lượt
```

Mở cả 15 trang trong ô **Page**, gom mọi dạng ô nhập, rồi hỏi hai câu: danh sách nào không có
trong bảng chữ, và cái nhãn nào còn mang nguyên một từ của tệp.

> **Đã bắt được:** năm danh sách chưa đặt tên (`about.chapters.N.body`, `contact.consent`,
> `contact.routes.N.fields`, `news.items.N.body`, `projects.albums.N.photos`) và `familySpecs`
> lọt ra nguyên dạng camelCase.
>
> Và chính nó, lần đầu: nó báo "không còn cái nào" trên một site còn năm chỗ chưa đặt tên, vì hàm
> tách khúc danh sách tìm số thứ tự bằng `/^\d+$/` trong khi thứ truyền vào đã thay hết số bằng
> `N`. Nó không tìm thấy danh sách nào cả. Nay bảng in kèm **số danh sách tìm được**, vì một bảng
> rỗng bên dưới số 0 trông giống hệt một bảng rỗng bên dưới số 33.

---

## `forwarded.js` — sau một proxy, ai là khách

Biểu mẫu liên hệ cho mỗi địa chỉ tám lần một giờ. Đặt sau nginx thì **mọi** yêu cầu đến từ
`127.0.0.1`, nên tám người là hết hạn mức của cả Internet, và người thứ chín bị từ chối vì người
thứ tám — từ bên ngoài không ai đoán ra chuyện gì đang xảy ra.

```bash
node forwarded.js http://localhost:5199 --expect shared   # Proxy:TrustedIps rỗng
node forwarded.js http://localhost:5199 --expect split    # Proxy:TrustedIps có 127.0.0.1
```

Gửi chín yêu cầu, mỗi cái một `X-Forwarded-For` khác nhau, rồi đếm. `shared` mong 8 nhận / 1 từ
chối; `split` mong cả 9 nhận. Đo bằng hành vi chứ không đọc cấu hình.

> **Lưu ý:** bộ đếm hạn mức nằm trong bộ nhớ máy chủ. Chạy `shared` hai lần liên tiếp mà không
> khởi động lại máy chủ thì lần hai hỏng ngay từ yêu cầu đầu — đó là đúng, không phải lỗi. Mỗi
> lần chạy để lại chín dòng trong `App_Data/enquiries.jsonl`, route `tools/forwarded`.

---

## `image-edit.js` — đổi một tấm ảnh, từ đầu đến cuối

Phép đo duy nhất đi hết đường: bấm vào ảnh trong khung xem thử, tải một file lên, chọn nó, bấm
Lưu — rồi kiểm ba chỗ một thay đổi **phải** xuất hiện, và một chỗ nó **không được** xuất hiện.

```bash
node image-edit.js http://localhost:5199
```

1. `wwwroot/_data/news.json` đổi · 2. bản sao trong `site/_data` giống hệt · 3. trang công khai —
không `?edit=1`, không trình soạn — hiện đúng tấm ảnh đó · 4. và trang công khai vẫn **không** có
cầu nối. Rồi đặt lại như cũ và kiểm JSON trở về nguyên văn, vì một phép thử để lại rác trong dữ
liệu của khách là một phép thử không ai dám chạy lần hai.

> **Đã bắt được:** bộ ghi JSON thụt lề kết thúc dòng bằng `Environment.NewLine`, trên máy này là
> CRLF — nên sửa một trường ghi lại cả 141 dòng của file, và `trees.py` so hai cây từng byte. Chỉ
> phép thử "đặt lại như cũ" mới thấy: mọi phép đo khác đều đạt.
>
> Và một cái nữa cùng lớp: một địa chỉ sai trong lô cũng khiến file bị ghi lại — cùng nội dung,
> tuần tự hoá lại, một diff trên toàn bộ tài liệu không ai sửa. Phép thử đơn vị bắt cái đó.

---

## `guide-video.js` — quay phim hướng dẫn, phụ đề cháy sẵn vào hình

HANDOVER nói được cách sửa nội dung, nhưng người dùng site lần đầu không đọc tài liệu — họ mở màn
hình lên và nhìn. Công cụ này đi đúng một đường thật trên chính máy chủ đang chạy và quay lại:
cuộn tới đâu thao tác tới đó, con trỏ bay tới chỗ sắp bấm trước khi bấm.

```bash
node guide-video.js http://localhost:5199
node guide-video.js http://localhost:5199 --out D:/tmp --keep-webm
```

Mười cảnh, khoảng 57 giây: mở /Admin → cuộn khung xem thử tới khối "New" của trang chủ → bấm
thẳng vào tiêu đề trong khung → ô nhập tự sáng lên bên trái → gõ, khung đổi theo từng phím → ô
ảnh và hai dòng cỡ → Choose picture → chọn ảnh → Save → và trang công khai thật.

Ba thứ nó tự kiểm trong lúc quay, nên một đoạn phim quay ra là một đoạn phim **đúng**: khung xem
thử có đổi theo từng phím không, ô ảnh có nói được cỡ cần tải lên không, và bảng chọn ảnh có nhắc
lại cỡ ấy không. Quay xong nó ghi `home-news.json` ở **cả hai cây** trở lại nguyên văn và kiểm
từng byte — một công cụ để lại rác trong dữ liệu của khách là công cụ không ai dám chạy lần hai.
Một dòng trong History thì vẫn còn, và đó là sự thật: đoạn phim đã bấm Save thật.

> **Hai chỗ hỏng đoạn phim mà không báo lỗi gì:**
>
> `recordVideo.size` mặc định của Playwright ép khung hình lọt vào 800×800, nên một cửa sổ
> 1440×900 được ghi ra ở 800×500 — chữ nhoè thành vệt, và không có thông báo nào. `newCtx` nay
> luôn đặt size bằng đúng viewport.
>
> Máy quay chạy **ngay từ lúc ngữ cảnh được tạo**, nên đăng nhập trong đó là quay luôn cả biểu
> mẫu đăng nhập và mấy khung hình trắng. Đăng nhập ở một ngữ cảnh khác rồi mang cookie sang.

Phụ đề cháy thẳng vào hình, không xuất `.vtt` rời: đoạn phim sẽ được gửi qua Telegram, dán vào
tài liệu, chép sang USB — một tệp phụ đề đi kèm sẽ lạc mất ngay lần chuyển thứ nhất. Không lồng
tiếng. Con trỏ là một chấm tự vẽ, vì Chrome khi quay không vẽ con trỏ thật vào khung hình.

Ra `tools/out/` (đã gitignore), mp4 h264 qua ffmpeg; không có ffmpeg thì giữ nguyên webm.

---

## `fanout.py` — trải khuôn chi tiết ra bản tĩnh

Máy chủ tự ghép `/news/press-line-2500/` từ khuôn `/news/detail/`. GitHub Pages không ghép gì cả,
nên bản tĩnh phải có sẵn một thư mục cho mỗi mục — 94 thư mục.

```bash
python fanout.py            # trải ra, và xoá thư mục của mục đã bị xoá khỏi JSON
python fanout.py --check    # chỉ báo có lệch không, thoát 1 nếu lệch
```

Bản sao là **bản sao từng byte của khuôn**, không phải đầu ra đã ghép: khuôn dựng trang bằng JS và
`AB.itemId()` đọc đoạn cuối đường dẫn, nên một file giống hệt nhau dựng ra 94 trang khác nhau.
Nhờ vậy `trees.py` vẫn so được HTML hai cây, và git chỉ lưu một blob cho cả 94 file.
