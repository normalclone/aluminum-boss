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

**Khác byte không phải câu hỏi.** Công cụ tự đếm pixel lệch quá 32/255 khi hai ảnh khác byte,
rồi mới kết luận. Trước đó nó báo "KHÁC — chạy compare.py" và để người tự làm; trong một buổi
chiều, cách đó báo động giả ba lần liền trên những trang không lệch một pixel nào.

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

## `publish-static.js` — sinh `site/` từ đầu ra máy chủ

Gọi 15 trang trên máy chủ đang chạy, ghi HTML đã ghép ra `site/`. Giữ GitHub Pages sống trong
lúc chuyển sang dựng phía máy chủ, và cho một bản sao tĩnh dùng làm sao lưu.
