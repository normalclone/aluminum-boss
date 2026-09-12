# Trình soạn nội dung trực quan cho aluminum-boss

Ngày: 2026-09-12 · Trạng thái: đã chốt thiết kế, chưa lập kế hoạch thực thi

## 1. Mục tiêu

Cho phép người quản trị thay mọi nội dung của site mà không đụng vào mã, và **nhìn thấy
kết quả ngay trong lúc sửa**. Đồng thời làm cho nội dung đó đọc được bởi công cụ tìm kiếm
và bởi các máy trả lời (ChatGPT, Perplexity, Google AI Overviews, Claude).

## 2. Bốn quyết định đã chốt

| Quyết định | Chọn |
|---|---|
| Mức độ trực quan | Hai cột: sửa bên trái, xem trước trực tiếp bên phải |
| Phạm vi | Tất cả: 11 file JSON + 75 đoạn chữ trong HTML + 2 bộ dữ liệu canvas |
| Nơi phục vụ | Máy chủ .NET phục vụ luôn site thật (bỏ GitHub Pages) |
| Nguồn nội dung | Tất cả là tham số; không hardcode trong HTML |

## 3. Hiện trạng, đo được

Nội dung hiện chia ba nơi:

1. `wwwroot/_data/*.json` — 11 file, do các renderer trong `_app/` và 14 script nội tuyến đọc
2. 75 đoạn chữ nằm cứng trong `index.html` và 14 trang khác
3. `const ROUTES` (4 tuyến) và `const SITES` (5 nhà máy) trong script nội tuyến của `index.html`

**Toàn bộ nội dung được dựng bằng JavaScript phía trình duyệt.** Đo ngày 2026-09-12:

| trang | chữ trong HTML thô | chữ sau khi JS chạy |
|---|---|---|
| `/news/detail/?id=press-line-2500` | 672 | 2.095 |
| `/products/` | 685 | 3.165 |
| `/colors/` | 681 | 2.186 |
| `/projects/` | 685 | 1.826 |
| `/` | 1.861 | 5.707 |

Con số ~680 giống nhau ở cả bốn trang vì đó chính là nav và footer dùng chung. Toàn bộ chữ
một bot không chạy JS đọc được trên trang bài viết là menu và footer — **không một chữ nào
của bài viết**.

Đây là lý do bắt buộc phải chuyển sang dựng phía máy chủ: GPTBot, ClaudeBot, PerplexityBot,
CCBot tải HTML rồi đọc thẳng, không chạy JavaScript.

Khối lượng mã dựng nội tuyến cần chuyển: 14 trang × 1–5 KB (~36 KB) cộng các renderer trong
`_app/`. Riêng `index.html` có 85 KB mã nội tuyến nhưng 78 KB trong đó là hai khối canvas —
xem mục 5.3.

## 4. Kiến trúc dựng trang

### 4.1 Máy chủ dựng nội dung, JavaScript chỉ thêm hành vi

File HTML trở thành **khuôn**, không chứa nội dung. Máy chủ đọc khuôn, điền tham số từ JSON,
trả về HTML đầy đủ chữ.

JavaScript **không còn dựng DOM**. Nó gắn hành vi vào markup đã có sẵn:

| Vẫn do JS đảm nhiệm | Lý do |
|---|---|
| Lọc finish, chuyển tab, trượt slider, lightbox | Hành vi, không phải nội dung |
| Hai khối canvas (địa cầu, bản đồ nhà máy) | Canvas không dựng phía máy chủ được |
| Chữ hero mờ dần khi cuộn | Hiệu ứng |

Lưu ý: **danh sách chữ bên cạnh hai khối canvas** (4 tuyến xuất khẩu, 5 nhà máy) là nội dung
thật và phải do máy chủ dựng. Chỉ hình vẽ trên canvas mới ở lại phía trình duyệt.

### 4.2 Địa chỉ tham số

Mỗi chỗ sửa được mang một địa chỉ ổn định:

```html
<h2 data-ab-t="home.products.heading"></h2>
<a data-ab-t="site.nav.2.label" data-ab-href="site.nav.2.href"></a>
```

Địa chỉ này phục vụ ba việc cùng lúc: bộ ghép biết điền gì vào đâu; ô xem trước biết vá chỗ
nào khi gõ; và bấm vào phần tử trong ô xem trước thì biết nhảy tới ô nhập nào.

### 4.3 Bộ nhớ đệm

Ghép lại mỗi yêu cầu là lãng phí. Giữ bản đã ghép trong bộ nhớ, khoá theo đường dẫn, **xoá
khoá khi JSON tương ứng đổi**. Sau lần đầu, chi phí gần bằng không.

## 5. Mô hình dữ liệu

### 5.1 File hiện có (giữ nguyên vị trí, bổ sung trường)

`products` `colors` `news` `projects` `documents` `gallery` `highlights` `applications`
`about` `contact` `feature`

### 5.2 File mới

| file | chứa gì |
|---|---|
| `site.json` | wordmark, 7 mục nav, câu hero, tiêu đề từng khối trang chủ, 4 cột footer, địa chỉ, điện thoại, email, dòng bản quyền |
| `globe.json` | điểm gốc, 4 tuyến (tên, tỉ lệ %, số ngày, mô tả, chặng, toạ độ waypoint), bảng màu |
| `factories.json` | 5 nhà máy (tên, tỉnh, toạ độ, mô tả, năm, công suất, tông màu), 2 nhãn quần đảo |

### 5.3 Quy ước áp dụng đồng nhất

- Mọi mục trong danh sách có `visible` (mặc định `true`). Bộ dựng luôn lọc.
- Mọi danh sách có thứ tự có `order`. Bộ dựng luôn sắp.
- Mọi mục ảnh có `image` (rỗng = vẽ placeholder có ghi tỉ lệ).
- Mọi mục có trang riêng có `slug`.

### 5.4 Số đếm viết cứng phải bỏ

"Six product families", "four markets", "Five factories" và số `5` trong thẻ tally hiện viết
cứng. Khi khách thêm/bớt mục, các câu này **nói dối**. Chuyển sang suy ra từ độ dài mảng.

## 6. Lưu trữ và lịch sử

**File JSON trên đĩa là nguồn duy nhất.** SQLite chỉ giữ lịch sử sửa và tài khoản admin.

**Gỡ bỏ `ContentFileMiddleware`.** Nó đang phục vụ `/_data/*.json` từ CSDL và đã gây đúng một
lần nhầm lẫn thật: sửa file JSON mà trang không đổi, vì CSDL mới là nơi trả lời. Giữ hai
nguồn cho một nội dung là mời cái nhầm đó quay lại.

- Lưu = ghi file nguyên tử (ghi file tạm rồi đổi tên) + ghi một bản lịch sử chứa nội dung cũ
- Khôi phục = ghi bản cũ ngược lại
- Sao lưu = chép một thư mục

## 7. Giao diện soạn thảo

### 7.1 Bố cục

Cột trái ~420px, cột phải chiếm phần còn lại. Cột phải là `<iframe>` mở chính trang thật,
kèm thanh chọn bề ngang (1440 / 834 / 390) và trạng thái lưu.

### 7.2 Cột trái chia hai khu

**Trang** — khung và bố cục:
`Trang chủ` (11 vùng, đổi thứ tự, ẩn/hiện) · `Đầu trang` · `Chân trang` · 7 trang mục

**Nội dung** — mỗi loại một mục, có nút đăng riêng:

| mục | số mục hiện có | nút |
|---|---|---|
| Sản phẩm | 6 | Đăng sản phẩm |
| Finish | 35 | Đăng finish |
| Tin | 8 | Đăng bài |
| Dự án | 10 | Đăng dự án |
| Tài liệu | 5 nhóm | Thêm tài liệu |
| Công trình (gallery) | 12 | Đăng ảnh |
| Khối New | 6 | Đăng mục |
| Ứng dụng | 5 tab | Thêm tab |
| Tuyến xuất khẩu | 4 | Thêm tuyến |
| Nhà máy | 5 | Thêm nhà máy |

### 7.3 Màn hình danh sách

Mỗi mục một dòng: ảnh thu nhỏ, tiêu đề, thông tin nhận dạng (ngày với tin, mã với finish,
năm với dự án), trạng thái Hiện/Ẩn.

Có ô tìm và bộ lọc — **35 finish thì không thể cuộn tay mà tìm**. Kéo đổi thứ tự ở nơi thứ
tự có nghĩa; riêng tin sắp theo ngày.

### 7.4 Màn hình đăng

Các ô sinh theo loại nội dung:

- **Tin**: tiêu đề, slug, ngày, tác giả, thẻ, tóm tắt, thân bài (nhiều đoạn), ảnh
- **Sản phẩm**: tên, slug, dòng dẫn, mô tả, ảnh, thông số
- **Finish**: tên, mã, họ, màu hex, ảnh bề mặt
- **Dự án**: tên, slug, năm, địa điểm, chủ đầu tư, phạm vi, sản phẩm dùng, bộ ảnh

Kiểu ô theo dữ liệu:

| kiểu | hiển thị |
|---|---|
| chữ ngắn | một dòng |
| chữ dài | ô nhiều dòng |
| mảng chuỗi | một ô, cách nhau bằng dòng trống |
| ảnh | **ảnh thu nhỏ + nút Chọn ảnh**, kèm tỉ lệ cần cắt |
| màu | ô màu + bộ chọn |
| mảng đối tượng | **thẻ kéo thả**, thêm / nhân bản / xoá / ẩn |
| toạ độ, tỉ lệ tuyến | xám, xem được không sửa được (xem 10.3) |

### 7.5 Ô xem trước đi theo thứ đang sửa

- Đang sửa bài tin → cột phải mở **trang chi tiết của chính bài đó**
- Đang sửa vùng trang chủ → cột phải cuộn tới vùng đó và viền sáng
- Bấm phần tử trong ô xem trước → cột trái nhảy tới ô nhập tương ứng

Gõ chữ thì vá tại chỗ qua `postMessage`, tức thì, không đợi mạng — tìm đúng phần tử bằng
chính `data-ab-t` mà bộ ghép đã đặt. Thêm/xoá/đổi thứ tự thì lấy lại đoạn markup đã dựng từ
máy chủ, không nạp lại cả trang.

### 7.6 Trạng thái mục

Chỉ **Hiện / Ẩn**. Không làm Nháp / Hẹn giờ: thêm trạng thái nháp nghĩa là mỗi mục có hai
phiên bản, mà phần lớn nội dung ở đây (sản phẩm, finish, nhà máy) không phải thứ soạn dần.

## 8. Đường dẫn

### 8.1 Dạng mới

`/news/detail/?id=press-line-2500` → **`/news/press-line-2500/`**

Áp dụng cho: news, products, colors, projects, documents, about, contact.

### 8.2 Quy tắc slug

- Tạo mới: sinh từ tiêu đề, sửa được khi chưa lưu lần đầu
- Sau lần lưu đầu: **khoá**; muốn đổi phải mở khoá và đọc cảnh báo
- Đổi slug ghi thêm một bản ghi chuyển hướng

### 8.3 Chuyển hướng

Bảng chuyển hướng trong SQLite. Mọi dạng cũ **301 vĩnh viễn** sang dạng mới:

- `/news/detail/?id=X` → `/news/<slug>/`
- slug cũ → slug mới

Link đã chia sẻ không được chết. Đây là ràng buộc cứng, không phải tuỳ chọn.

## 9. SEO và tối ưu cho máy trả lời

### 9.1 Trường SEO từng mục

slug · tiêu đề · mô tả · ảnh chia sẻ (mặc định lấy ảnh chính) · canonical (tự sinh, sửa
được) · công tắc chặn lập chỉ mục.

### 9.2 Danh sách kiểm thay cho điểm số

Không làm "điểm SEO 72/100" — con số đó không đo gì thật. Thay bằng danh sách kiểm cụ thể,
mỗi mục đúng/sai rõ ràng:

- Có câu trả lời thẳng trong hai câu đầu?
- Có số liệu kèm đơn vị?
- Tiêu đề nêu rõ thực thể (tên sản phẩm, tên nhà máy, tên dự án)?
- Mọi ảnh có mô tả alt?
- Mô tả dài 120–160 ký tự?

Đây chính là những thứ máy trả lời dựa vào để trích dẫn.

### 9.3 Dữ liệu có cấu trúc (JSON-LD)

Sinh từ **cùng nguồn JSON** với nội dung hiển thị, nên không thể lệch nhau — dữ liệu có cấu
trúc mâu thuẫn với nội dung nhìn thấy thì bị bỏ qua hoặc bị phạt.

| loại | phát ở đâu |
|---|---|
| `Organization` | mọi trang |
| `LocalBusiness` × 5 | trang giới thiệu, trang liên hệ |
| `Product` | mỗi trang sản phẩm |
| `NewsArticle` | mỗi bài tin |
| `CreativeWork` | mỗi dự án |
| `BreadcrumbList` | mọi trang chi tiết |

### 9.4 File cho máy đọc

- `sitemap.xml` — sinh từ dữ liệu, `lastmod` lấy từ lịch sử sửa
- `robots.txt` — **mỗi bot AI một công tắc trong admin**. Cho GPTBot, ClaudeBot,
  PerplexityBot, CCBot, Google-Extended vào hay không là quyết định kinh doanh, không phải
  mặc định kỹ thuật.
- `llms.txt` — chỉ mục dạng văn bản thuần cho mô hình ngôn ngữ

## 10. Chỗ sẽ hỏng và cách chặn

### 10.1 Xoá mục đang được tham chiếu

Khối New đang trỏ tới 6 bài tin bằng mã. Xoá bài là hỏng thẻ. Trước khi xoá, dò toàn bộ dữ
liệu tìm nơi tham chiếu và nói rõ *"3 chỗ đang trỏ tới mục này"* kèm danh sách.

### 10.2 Lưu ra JSON hỏng hoặc thiếu trường bắt buộc

Kiểm tra trước khi ghi, từ chối kèm thông báo rõ. Mỗi loại có danh sách trường bắt buộc.

### 10.3 Sửa toạ độ làm hỏng hình vẽ

Toạ độ waypoint, `lat`/`lon`, tỉ lệ tuyến hiện ra **màu xám, xem được không sửa được**, kèm
ghi chú lý do. Một chỉnh sửa trông hợp lý vào toạ độ làm hỏng hình vẽ một cách âm thầm.

Nếu về sau cần sửa, phải có ràng buộc (`lat` −90..90, tổng tỉ lệ = 100%) và ô xem thử vẽ ngay.

### 10.4 Bộ ghép làm mất chữ

Sau khi ghép, đối chiếu mọi `data-ab-t` với JSON. Lệch thì trả về bản trước và báo lỗi, thay
vì phục vụ trang thiếu chữ.

### 10.5 Hai người sửa cùng lúc

Admin một tài khoản. Ghi rõ trong lịch sử ai lưu lúc nào; người lưu sau đè lên.

## 11. Kiểm chứng

| kiểm | cách |
|---|---|
| Chuyển sang dựng máy chủ không đổi giao diện | So pixel 15 trang trước/sau, ở 1440 và 390. Đây là ràng buộc cứng: **không được lệch quá nhiễu khử răng cưa**. |
| Nội dung đọc được không cần JS | Chữ trong HTML thô của trang bài viết tăng từ 672 lên ≳ 2.000 |
| Không chết link | Crawl 15 trang, 0 liên kết chết; mọi dạng URL cũ trả 301 |
| Không lỗi script | 0 lỗi trên mọi trang |
| Sửa được thật | Sửa từng loại nội dung qua giao diện, khẳng định trang thật đổi theo |
| Dữ liệu có cấu trúc hợp lệ | Kiểm bằng bộ kiểm schema.org |
| Cuộn không giật | p50 khung hình không xấu đi so với mức nền đo cùng phiên |

## 12. Thứ tự làm

| đợt | nội dung | dùng được gì sau đợt đó |
|---|---|---|
| 1 | Bóc 75 đoạn chữ + 2 bộ canvas ra JSON; bộ ghép máy chủ cho phần khung | Trang giống hệt, nhưng mọi chữ đã là tham số |
| 2 | Chuyển toàn bộ mã dựng (7 file `_app/` + 14 script nội tuyến) sang máy chủ; JS chỉ còn gắn hành vi | Nội dung đọc được không cần JS — bot AI thấy được |
| 3 | Đường dẫn mới + bảng chuyển hướng 301 | URL chuẩn SEO, link cũ vẫn sống |
| 4 | Khung soạn hai cột + ô xem trước trực tiếp | **Sửa được bằng giao diện** |
| 5 | Màn hình danh sách + màn hình đăng cho từng loại | Đăng bài, đăng sản phẩm |
| 6 | SEO từng mục, JSON-LD, sitemap, robots, llms.txt | Đủ yêu cầu |
| 7 | Lịch sử và khôi phục, tài liệu bàn giao | Giao được cho khách |

Đợt 1 và 2 phải xong trước đợt 4: không thể làm ô xem trước trung thực khi còn hai bộ dựng
song song.

## 13. Điều kiện tiên quyết và việc còn treo

- **Chưa có máy chủ công khai.** App đang ở `127.0.0.1:5117`, bản IIS chỉ mạng nội bộ. Thiết
  kế này giả định có nơi chạy được .NET, truy cập từ internet, có HTTPS và sao lưu. Chủ dự
  án sẽ deploy sau; localhost trước.
- **Bỏ GitHub Pages** nghĩa là mất ba thứ Pages đang cho: hạ tầng gần như không sập, HTTPS
  sẵn, và lịch sử nội dung theo git. Bù bằng lịch sử trong SQLite và sao lưu thư mục.
- **Footer còn câu "Demonstration site — photography and documents are specimens."** Phải gỡ
  trước khi site đi thật; nó nằm trong mọi trang mà bot đọc được.
- **Dòng dẫn bản đồ nhà máy còn chữ "raw stone"** — sót từ site gốc về đá. Site là nhôm.

## 14. Không làm trong phạm vi này

- Nháp / hẹn giờ đăng (mục 7.6)
- Nhiều tài khoản, phân quyền
- Đa ngôn ngữ (nút VI hiện báo "chưa có")
- Thu nhỏ ảnh phía máy chủ — ảnh 20 MB tải lên vẫn 20 MB
- Sửa toạ độ hai khối canvas (mục 10.3)
