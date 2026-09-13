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
