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

## `parity.js` + `compare.py` — refactor có đổi hình thức không

Chụp 15 trang từ hai nguồn rồi trừ pixel.

```bash
node parity.js --save http://127.0.0.1:5117 baseline 1440     # chụp mốc nền
node parity.js --against http://127.0.0.1:5117 baseline 1440  # so lại sau khi sửa
python compare.py baseline after                              # lệch bao nhiêu
```

> **Đã ký duyệt:** port từ bản clone tĩnh vào app .NET · dời cả cây lên một cấp · mọi lần đổi
> nội dung kể từ đó.

**Một trang lệch đơn lẻ thì chụp lại trước khi coi là hồi quy.** Ảnh chụp thỉnh thoảng hỏng —
font về muộn, ảnh chưa giải mã xong. Đã gặp thật: một trang báo lệch 175 pixel ở lần chụp đầu,
chụp lại thì giống hệt, và trang đó không hề bị đụng tới trong đợt sửa. Cách phân biệt: chụp
cùng một trang hai lần từ **cùng một máy chủ** rồi so hai ảnh đó với nhau. Khác nhau nghĩa là
phép chụp không ổn định; giống nhau mà vẫn lệch với mốc nền thì mới là hồi quy thật.

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

## `publish-static.js` — sinh `site/` từ đầu ra máy chủ

Gọi 15 trang trên máy chủ đang chạy, ghi HTML đã ghép ra `site/`. Giữ GitHub Pages sống trong
lúc chuyển sang dựng phía máy chủ, và cho một bản sao tĩnh dùng làm sao lưu.
