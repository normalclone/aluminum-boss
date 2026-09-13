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

### Sửa chữ

1. Vào **Edit pages**, chọn trang ở ô **Page** góc trên bên trái.
2. **Bấm thẳng vào đoạn chữ trong khung xem thử bên phải** — ô nhập của nó sẽ được cuộn tới và
   sáng lên ở cột trái. (Cách kia: cuộn cột trái tìm ô có tên tương ứng.)
3. Gõ. Chữ trong khung bên phải đổi ngay theo từng phím.
4. Bấm **Save changes**. Trang thật đổi ngay lập tức — không phải chờ build, không phải deploy.

> Chưa bấm Save thì chưa có gì được ghi. Đóng tab lúc đang sửa dở, trình duyệt sẽ hỏi lại.

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

**Nên cắt ảnh trước khi tải lên.** Máy chủ không thu nhỏ ảnh; một tấm 6 MB từ máy ảnh sẽ làm trang
tải chậm cho mọi khách. Cỡ hợp lý: cạnh dài khoảng 2000 px.

### Thêm, ẩn, đổi thứ tự

Vào **Content**, chọn loại, rồi:

- **Add an item** — mục mới xuất hiện ở đầu danh sách, các ô đều trống. Bấm **Edit** để điền.
- **↑ ↓** — đổi thứ tự. Thứ tự trong bảng này chính là thứ tự trang hiển thị.
- **Shown / Hidden** — bấm để tạm ẩn. Mục bị ẩn biến khỏi mọi danh sách, khỏi mọi con số đếm, và
  trang riêng của nó trả về "không tìm thấy". **Nó vẫn còn nguyên** — bấm lại là hiện lại.
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

**Đổi mật khẩu ngay lần đăng nhập đầu tiên** — bấm vào tên người dùng ở góc trên bên phải. Mật
khẩu hiện tại là công khai: nó nằm trong mã nguồn.

Quên mật khẩu thì cần người có quyền vào máy chủ: xoá tệp `App_Data/qlweb2.db` rồi khởi động lại,
tài khoản `admin` / `changeme` sẽ được tạo lại. Làm vậy cũng **xoá luôn toàn bộ History** (nội
dung thì không sao — nội dung nằm trong các tệp JSON, không nằm trong cơ sở dữ liệu).

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
highlights.json   thẻ tin trang chủ
applications.json khối ứng dụng trang chủ
feature.json      khối đặt mẫu trang chủ
globe.json        bốn tuyến xuất khẩu trên quả địa cầu
factories.json    năm nhà máy trên bản đồ
redirects.json    các đường dẫn cũ đã chuyển đi đâu
```

Sửa thẳng bằng trình soạn văn bản cũng được — máy chủ nhận ra tệp đổi và cập nhật ngay, không cần
khởi động lại. Nhưng sửa qua giao diện an toàn hơn: nó kiểm tra trước khi ghi và giữ lại bản cũ.

**Một quy tắc quan trọng:** thư mục `site/` là bản sao tĩnh và phải luôn khớp với `wwwroot/`. Giao
diện tự ghi cả hai. Nếu sửa tay thì phải sửa cả hai, rồi chạy `python tools/trees.py` để kiểm.

---

## 5. Địa chỉ trang

Mỗi mục có đường dẫn riêng: `/news/press-line-2500/`, `/colors/an-dark-bronze/`.

Đường dẫn sinh từ `id` của mục. Đổi `slug` là đổi địa chỉ công khai — hệ thống sẽ tự ghi một dòng
vào `redirects.json` để link cũ còn sống, nhưng **hãy hạn chế đổi**: mỗi lần đổi là một lần các
liên kết người khác đã chia sẻ phải đi vòng.

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

## 7. Kiểm tra sau khi sửa nhiều

Có sẵn một bộ công cụ đo trong `tools/` (xem `tools/README.md`). Đáng chạy sau một đợt sửa lớn:

```bash
node tools/crawl.js http://localhost:5199     # có liên kết chết không
node tools/seo.js http://localhost:5199       # mỗi trang có tự mô tả được không
python tools/trees.py                          # hai cây có khớp không
python tools/slugs.py                          # id có dùng được làm đường dẫn không
```

Mỗi công cụ in một bảng và kết thúc bằng ĐẠT hoặc KHÔNG ĐẠT.
