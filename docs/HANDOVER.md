# Bàn giao

Tài liệu này dành cho người sẽ **vận hành** site, không phải cho lập trình viên. Nó trả lời bốn
câu: sửa nội dung ở đâu, đăng nhập thế nào, sao lưu cái gì, và khi nào thì cần gọi người viết mã.

---

## 1. Sửa nội dung

Mở `http://<địa-chỉ-máy-chủ>/Admin` và đăng nhập.

Năm màn hình, mỗi cái làm một việc:

| Màn hình | Dùng khi |
|---|---|
| **Edit pages** | Sửa chữ và ảnh — nhìn thấy trang thật ngay bên phải trong lúc sửa |
| **Content** | Thêm / xoá một mục, đổi thứ tự, tạm ẩn một mục |
| **Pictures** | Xem và xoá ảnh trong thư viện (tải ảnh lên làm ngay trong Edit pages) |
| **Enquiries** | Đọc những gì khách gửi qua biểu mẫu liên hệ |
| **History** | Xem lại và khôi phục một bản nội dung cũ |

> **Có một đoạn phim hướng dẫn dài 53 giây** đi hết một lần sửa thật — đổi chữ và đổi ảnh của
> một thẻ trên trang chủ, rồi xem kết quả trên trang công khai. Phụ đề tiếng Việt, không lồng
> tiếng. Người bàn giao quay lại bất cứ lúc nào bằng `node tools/guide-video.js <địa-chỉ>`.

### Sửa chữ

1. Vào **Edit pages**, chọn trang ở ô **Page** góc trên bên trái.
2. **Bấm thẳng vào đoạn chữ trong khung xem thử bên phải** — ô nhập của nó sẽ được cuộn tới và
   sáng lên ở cột trái. (Cách kia: cuộn cột trái tìm ô có tên tương ứng.)
3. Gõ. Chữ trong khung bên phải đổi ngay theo từng phím.
4. Bấm **Save changes**. Trang trên **máy chủ** đổi ngay lập tức — không phải chờ build.

> Chưa bấm Save thì chưa có gì được ghi. Đóng tab lúc đang sửa dở, trình duyệt sẽ hỏi lại.

> **Chừng nào trang công khai còn là bản GitHub Pages** (hiện tại là vậy: khu quản trị chưa được
> dựng lên máy chủ nào), thì Save **chưa** đưa thay đổi ra internet. Nó ghi vào cả hai cây trên
> máy đang chạy; ra tới khách thì cần một lần `git push`, và GitHub Pages tự dựng lại trong
> khoảng một phút. Khi bản .NET đã lên VPS thì câu này hết đúng và Save là xong.

**Lần đặt tên đầu tiên cũng đặt luôn địa chỉ.** Một mục vừa thêm mang một cái tên máy sinh
(`new-3f9a2c`). Ngay khi bạn gõ tiêu đề cho nó và bấm Save, địa chỉ của nó thành tiêu đề ấy:
"Phụ kiện nhôm định hình" → `/news/phu-kien-nhom-dinh-hinh/`. Chỉ một lần duy nhất — sau đó sửa
tiêu đề bao nhiêu lần cũng không làm trang đổi địa chỉ, vì lúc ấy đã có người giữ đường link.

### Ô chọn, thay vì ô gõ

Vài ô trong trình soạn là **danh sách để chọn**, không phải ô để gõ — vì giá trị của chúng bắt
buộc phải khớp một thứ đã có ở nơi khác:

| Ô | Phải khớp |
|---|---|
| **Finish family** của một màu | một dòng trong bảng thông số theo họ — sai là ba dòng Coating / Standard / Colour warranty của màu ấy thành dấu gạch ngang |
| **Gloss**, **Exposure** của một màu | đúng chữ mà bộ lọc ở trang Colors đang dùng — gõ `satin` thay vì `Satin` là màu ấy **biến mất khỏi bộ lọc** mà không báo gì |

Nếu một ô đang mang giá trị không có trong danh sách, nó vẫn nằm đó, ở đầu danh sách, kèm chữ
*"— not on the list"*. Chọn một giá trị đúng là xong.

### Đổi ảnh

Ảnh nào cũng bấm được, kể cả những chỗ đang là **hình vẽ thay thế** — chính chỗ trống đó mới là
chỗ cần điền.

1. Bấm vào tấm ảnh trong khung xem thử (hoặc bấm **Choose picture** ở ô tương ứng bên trái).
2. Chọn một ảnh có sẵn, hoặc bấm **Add a picture** để tải lên từ máy.
3. Bấm **Save changes**.

Nhận JPG, PNG, WebP, GIF, tối đa 20 MB. **Không nhận SVG** — một file SVG có thể mang mã chạy
được, nhận nó qua một ô ghi "ảnh" là mở một lỗ bảo mật trên site công khai.

Ảnh tải lên được đặt tên kèm một đoạn mã băm nội dung, nên tải cùng một tấm hai lần là vô hại, và
thay một tấm thì nó có tên mới — không trình duyệt nào còn hiện tấm cũ trong bộ nhớ đệm.

**Màn hình tự nói cỡ ảnh nên tải lên.** Dưới mỗi nút **Choose picture** có hai dòng, và bảng
chọn ảnh nhắc lại cả hai khi nó mở ra:

```
Fills 340 × 300 here · 17:15      ô ảnh trên trang này rộng 340 cao 300, tỉ lệ 17:15
Best upload 680 × 600 px          cỡ nên tải lên
```

- **Dòng trên** là cái ô. Cắt ảnh theo đúng tỉ lệ ấy thì không mất phần nào bạn muốn giữ; sai tỉ
  lệ thì ảnh bị cắt bớt hai bên hoặc trên dưới. Chữ "here" có nghĩa: cùng một tấm ảnh có thể lấp
  vào ô to hơn ở một trang khác, và lúc đó con số sẽ khác.
- **Dòng dưới** là gấp đôi ô, vì màn hình điện thoại và laptop đời mới vẽ hai điểm ảnh cho mỗi
  một điểm mà bố cục đếm — gửi đúng bằng cỡ ô thì ảnh trông mờ.
- Dòng trên ghi **"About"** thay vì "Fills" nghĩa là con số ấy do bản xem thử đo được chứ không
  phải bố cục quy định, nên nó chỉ đúng ở bề ngang đang xem. Cứ lấy làm mốc, không cần khớp từng
  pixel.

**Đừng tải ảnh to hơn dòng dưới.** Máy chủ **không** thu nhỏ ảnh: nó giữ nguyên tệp bạn gửi và
trả đúng tệp ấy cho khách. Một tấm 6 MB thẳng từ máy ảnh là 6 MB trên lưng mọi người vào trang.
Trần là 2000 px cạnh dài — con số ấy đã nằm sẵn trong dòng gợi ý.

**Gửi cả một lô ảnh thì đừng làm tay.** Đưa đường dẫn thư mục cho người làm kỹ thuật và bảo chạy
`python tools/ingest-images.py` — nó nén, chép sang cả hai cây, và trỏ dữ liệu vào, trong một
lệnh, kèm ghi chú ảnh lấy từ đâu. Làm tay ba việc ấy cho sáu tấm là sáu lần có thể quên một bước.

### Trang chủ là một cái giá: bạn chọn, không nhập lại

Bốn khối trên trang chủ — **New**, **Products**, **Colors**, **Recent projects** — không có nội
dung riêng nào cả. Mỗi thẻ trên đó là **một mục trong kho**: tiêu đề, ảnh, đường dẫn đều là của
mục ấy, viết một lần, ở một chỗ.

Cách làm việc vì thế là hai bước: **đăng bài vào kho trước, rồi ra trang chủ chọn**.

| Khối trên trang chủ | Chọn ở | Lấy từ kho |
|---|---|---|
| New | **Content → Home: New** | News |
| Products | **Content → Home: Products** | Products |
| Colors | **Content → Home: Colors** | Colors |
| Recent projects | **Content → Home: Projects** | Projects |

- **Đổi một thẻ sang mục khác:** vào màn hình **Home: …**, cột bên phải tên, chọn rồi bấm
  **Set**. Đó là toàn bộ những gì một thẻ có thể đổi.
- **Thêm / bớt / đổi thứ tự thẻ** bằng **Add an item**, **Delete** và **↑ ↓** như mọi danh sách
  khác. Thứ tự trong bảng chính là thứ tự trên trang chủ.
- **Sửa chữ trên thẻ là sửa mục trong kho.** Bấm vào tiêu đề thẻ ngay trên trang chủ cũng được —
  ô nhập hiện ra sẽ ghi *"Article #1 title"*, và sửa nó là đổi tiêu đề ở **mọi nơi** mục ấy xuất
  hiện: trang chủ, trang danh sách, và trang riêng của nó.
- **Ảnh chỉ phải chọn một lần**, trên mục trong kho.
- **Ẩn một mục là thẻ của nó cũng biến mất.** Xoá cũng vậy. Màn hình **Home: …** nói thẳng ra
  điều đó ngay dưới ô chọn, nên không có thẻ trắng nào ở lại mà bạn không biết.
- **Để trống cả cái giá** thì khối tự chọn lấy như trước khi có tính năng này: đủ sáu dòng sản
  phẩm, mười màu mỗi họ một cái, ba công trình mới nhất, sáu bài mới nhất.
- **Xoá một cái thẻ chỉ xoá cái thẻ.** Mục trong kho vẫn còn nguyên, ở mọi nơi nó xuất hiện.

> Trước đây mỗi thẻ mang một tiêu đề và một ô ảnh **riêng**, tách khỏi bài. Kết quả là sáu bài có
> hai tiêu đề khác nhau ở hai chỗ, và không có gì giữ cho chúng khớp nhau. Ba khối còn lại thì
> ngược lại: chúng tự chọn bằng một quy tắc viết trong mã, và khách không đổi được gì.

### Nút EN / VI đã ẩn

Bản tiếng Việt chưa có, nên nút chuyển ngữ ở đầu trang đã được ẩn (18/09/2026) — trước đó bấm vào
chỉ hiện một dòng "chưa sẵn sàng". Mã vẫn còn nguyên. Muốn bật lại: mở `wwwroot/_app/app.css`,
tìm `.abh-locale { display: none; }` và xoá đúng dòng ấy, rồi chép sang `site/_app/app.css`.

### Thêm, ẩn, đổi thứ tự

Vào **Content**, chọn loại, rồi:

- **Add an item** — mục mới xuất hiện ở đầu danh sách, các ô đều trống. Bấm **Edit** để điền.
  **Nó lên trang công khai ngay lập tức**, dưới dạng một thẻ trống. Điền luôn, hoặc bấm
  **Shown** cho nó ẩn đi trong lúc bạn viết.
  Riêng **Export routes** và **Factories** không có nút này — xem mục 6.
- **↑ ↓** — đổi thứ tự. Thứ tự trong bảng này chính là thứ tự trang hiển thị.
- **Shown / Hidden** — bấm để tạm ẩn. Mục bị ẩn biến khỏi mọi danh sách, khỏi mọi con số đếm, và
  trang riêng của nó trả về "không tìm thấy". **Nó vẫn còn nguyên** — bấm lại là hiện lại.
  Đúng như vậy trên **cả hai** bản kể từ 18/09/2026; trước đó bản GitHub Pages không lọc gì cả,
  nên một mục đã ẩn vẫn công khai ở đó. Kiểm lại bất cứ lúc nào: `node tools/hidden.js`.
- **Delete** — bấm lần một sẽ báo còn chỗ nào đang trỏ tới mục đó; bấm lần hai mới xoá thật.

> Muốn giấu tạm thì **ẩn**, đừng xoá. Xoá thì chỉ lấy lại được qua History.

### Khôi phục

Vào **History**. Mỗi lần Save đều giữ lại bản trước đó. Bấm **Look at it** để xem, **Restore this
version** để đưa về. Khôi phục cũng là một lần lưu, nên bản đang chạy cũng được giữ lại — luôn có
đường quay ngược.

Giữ 50 bản gần nhất cho mỗi tệp nội dung.

---

## 2. Đăng nhập

Tài khoản đầu tiên là `admin`, mật khẩu `changeme`.

**Lần đăng nhập đầu tiên, khu quản trị chỉ mở đúng một màn hình: Change password.** Mọi màn hình
khác đều quay về đó, và menu trên cùng biến mất cho tới khi bạn đổi xong. Không phải phiền hà vô
cớ: mật khẩu `changeme` nằm trong mã nguồn của một kho công khai, nên trong lúc nó còn hiệu lực
thì khu quản trị coi như chưa có khoá. Đổi xong là menu trở lại ngay, không cần đăng nhập lại.

Mật khẩu mới phải dài ít nhất mười ký tự — quy tắc ấy đã loại sẵn `changeme`.

Quên mật khẩu thì cần người có quyền vào máy chủ: xoá tệp `App_Data/qlweb2.db` rồi khởi động lại,
tài khoản `admin` / `changeme` sẽ được tạo lại (và cổng đổi mật khẩu dựng lên lại). Làm vậy cũng
**xoá luôn toàn bộ History** (nội dung thì không sao — nội dung nằm trong các tệp JSON, không nằm
trong cơ sở dữ liệu).

---

## 3. Sao lưu

Ba thứ, sao lưu bằng cách chép:

| Chép cái gì | Trong đó có gì | Mất thì sao |
|---|---|---|
| `wwwroot/_data/` | **Toàn bộ chữ trên site** | Mất hết nội dung |
| `wwwroot/_media/` | Toàn bộ ảnh | Mất hết ảnh |
| `App_Data/` | Lịch sử sửa, tài khoản, yêu cầu liên hệ | Mất lịch sử và các yêu cầu chưa đọc |

Ba thư mục đó là toàn bộ những gì thay đổi khi vận hành. Mọi thứ còn lại đều nằm trong git và dựng
lại được.

Chép cả ba mỗi ngày là đủ; chúng là tệp văn bản nên rất nhẹ.

Nội dung cũng nằm trong git: mỗi lần commit là một mốc có thể quay về, xa hơn 50 bản của History.

---

## 4. Nội dung nằm ở đâu

Mỗi mục trên site là một tệp JSON trong `wwwroot/_data/`:

```
site.json         wordmark, menu, chân trang, địa chỉ, bảng robots
products.json     sáu dòng sản phẩm và các mặt hàng trong đó
colors.json       35 màu / bề mặt
news.json         bài viết
projects.json     công trình
documents.json    catalogue và tài liệu kỹ thuật
about.json        các chương trang giới thiệu
contact.json      văn phòng và các biểu mẫu liên hệ
gallery.json      ảnh khối thư viện trang chủ
applications.json khối ứng dụng trang chủ
feature.json      khối đặt mẫu trang chủ
globe.json        bốn tuyến xuất khẩu trên quả địa cầu
factories.json    năm nhà máy trên bản đồ
redirects.json    các đường dẫn cũ đã chuyển đi đâu

home-news.json     ─┐  bốn "cái giá" của trang chủ: mỗi tệp chỉ là một danh sách id
home-products.json  │  trỏ vào kho ở trên. Nội dung nằm trong kho, viết một lần;
home-colors.json    │  cái giá chỉ nói trang chủ lấy những cái nào và theo thứ tự nào.
home-projects.json ─┘  Giá rỗng thì khối tự chọn như trước khi có giá.
```

Sửa thẳng bằng trình soạn văn bản cũng được — máy chủ nhận ra tệp đổi và cập nhật ngay, không cần
khởi động lại. Nhưng sửa qua giao diện an toàn hơn: nó kiểm tra trước khi ghi và giữ lại bản cũ.

**Một quy tắc quan trọng:** thư mục `site/` là bản sao tĩnh và phải luôn khớp với `wwwroot/`. Giao
diện tự ghi cả hai. Nếu sửa tay thì phải sửa cả hai, rồi chạy `python tools/trees.py` để kiểm.

---

## 5. Địa chỉ trang

Mỗi mục có đường dẫn riêng: `/news/press-line-2500/`, `/colors/an-dark-bronze/`.

Đường dẫn sinh từ `id` của mục, và `id` sinh từ **tiêu đề bạn đặt lần đầu** (xem mục 1). Sau
lần ấy nó được khoá: sửa tiêu đề không làm trang đổi chỗ. Đó là chủ ý — một địa chỉ đã công bố
là thứ người khác đã chia sẻ, và dời nó phải là một quyết định chứ không phải hệ quả của việc
sửa một lỗi chính tả. Cần đổi địa chỉ một trang đã có thì gọi người viết mã: họ đổi `id` trong
tệp JSON và thêm một dòng vào `redirects.json` để link cũ còn sống.

Mọi địa chỉ từng công bố đều vẫn trả lời, kể cả dạng cũ `/news/detail/?id=...` và cả những trang
từng nằm dưới `/usa/`.

---

## 6. Khi nào cần gọi lập trình viên

Những việc **không** làm được qua giao diện:

- Thêm một **loại** nội dung mới (không phải một mục mới — một loại mới, ví dụ "Tuyển dụng")
- Đổi bố cục, màu sắc, phông chữ
- Thêm một trường mới vào một loại (ví dụ thêm "Giá" cho sản phẩm)
- Dịch site sang tiếng Việt (nút EN/VI hiện báo "chưa sẵn sàng")
- Đặt tên miền thật: sửa `origin` trong `site.json` — ảnh hưởng tới `sitemap.xml`, `robots.txt`,
  `llms.txt` và các thẻ `canonical`
- Nối biểu mẫu liên hệ vào email hoặc CRM (hiện ghi vào `App_Data/enquiries.jsonl` và hiện trong
  màn hình Enquiries)
- **Thêm một nhà máy hoặc một tuyến xuất khẩu.** Cái làm nên một tuyến là bốn mươi cặp toạ độ
  trên quả địa cầu, và toạ độ không phải chữ trên trang nên không có ô nào để gõ vào. Ẩn, đổi
  thứ tự, xoá và sửa chữ của chúng thì làm được bình thường.
- **Đổi con số trong hai tiêu đề ở trang chủ.** "One origin, four markets" và "Five factories,
  one coastline" là chữ bạn sửa được, nhưng chúng không tự đếm. Ẩn một tuyến thì nhớ sửa chữ
  "four" theo. (Con số trong ô **Factories** bên phải thì tự đếm.)
- **Ba trường không sửa được qua giao diện**, vì sửa chúng ở đó sẽ làm hỏng thứ khác: đoạn mô tả
  dài của một dòng sản phẩm (in thành hai cột), tên **họ màu** trên một màu (nó là khoá tra
  bảng thông số), và danh sách sản phẩm trên một công trình (nhiều mục viết trên một dòng).
- **Đưa site ra internet sau một proxy** (nginx): mở `appsettings.json` và điền địa
  chỉ của proxy vào `Proxy.TrustedIps`, ví dụ `[ "127.0.0.1" ]` khi nginx chạy cùng máy. Bỏ
  trống thì máy chủ thấy mọi khách đều là `127.0.0.1`, và giới hạn 8 lần gửi biểu mẫu mỗi giờ sẽ
  khoá biểu mẫu cho TOÀN BỘ khách chứ không phải cho một người. Chỉ điền đúng địa chỉ proxy:
  danh sách này là lời khai "ai được phép nói hộ địa chỉ của khách", và điền bừa vào đó thì
  khách tự chọn được ô đếm của mình.
  Máy chủ chỉ tin **một chặng**: địa chỉ nó đọc là địa chỉ nginx gửi sang. Có thêm CDN phía trước
  (Cloudflare chẳng hạn) thì nginx phải được cấu hình `real_ip_header CF-Connecting-IP`, không thì
  cái nó gửi sang là địa chỉ của CDN chứ không phải của khách.
- **Bản xuất tĩnh đầy đủ** (bỏ máy chủ, quay lại hosting tĩnh): công cụ đã viết nhưng chưa chạy
  bao giờ, và thư mục `site/` hiện là khuôn của máy chủ chứ không phải bản in ra của nó.

## 7. Kiểm tra sau khi sửa nhiều

Có sẵn một bộ công cụ đo trong `tools/` (xem `tools/README.md`). Đáng chạy sau một đợt sửa lớn:

```bash
node tools/crawl.js http://localhost:5199     # có liên kết chết không
node tools/seo.js http://localhost:5199       # mỗi trang có tự mô tả được không
python tools/trees.py                          # hai cây có khớp không
python tools/slugs.py                          # id có dùng được làm đường dẫn không
```

Mỗi công cụ in một bảng và kết thúc bằng ĐẠT hoặc KHÔNG ĐẠT.
