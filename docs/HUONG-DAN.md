# Hướng dẫn sử dụng trang web Böss Group

Trang web: **https://aluminumboss.com**
Khu quản trị: **https://aluminumboss.com/Admin**

Tài liệu này viết cho người dùng, không cần biết lập trình. Phần kỹ thuật sâu hơn nằm ở
`docs/HANDOVER.md`, phần máy chủ ở `tools/deploy/README.md`.

---

## 1. Đăng nhập

Mở **https://aluminumboss.com/Admin**

**Lần đầu tiên:**

| | |
|---|---|
| Tên đăng nhập | `admin` |
| Mật khẩu | `changeme` |

Ngay sau khi vào, máy chủ sẽ **bắt bạn đổi mật khẩu** trước khi cho vào bất cứ màn hình nào.
Đây là cố ý: mật khẩu `changeme` nằm trong mã nguồn nên ai cũng đoán được. Đặt một mật khẩu
mới, dài ít nhất 10 ký tự, rồi ghi lại chỗ nào an toàn — **không ai lấy lại hộ được**.

Sau đó mỗi lần vào chỉ cần tên đăng nhập và mật khẩu mới.

Đăng xuất: bấm **Sign out** ở góc trên bên phải.

---

## 2. Màn hình quản trị có những gì

Thanh trên cùng có sáu mục:

| Mục | Dùng để làm gì |
|---|---|
| **Site content** | Trang chính, dẫn vào các mục còn lại |
| **Edit pages** | **Sửa chữ và ảnh ngay trên trang** — dùng nhiều nhất |
| **Content** | Thêm, bớt, đổi thứ tự, ẩn/hiện các mục (bài viết, màu, dự án…) |
| **Pictures** | Kho ảnh: xem có những ảnh gì, tải ảnh mới lên |
| **Enquiries** | Đơn khách gửi từ form liên hệ |
| **History** | Lịch sử sửa, và lấy lại bản cũ khi lỡ tay |

---

## 3. Sửa chữ và ảnh trên trang — **Edit pages**

Màn hình chia hai cột: **bên trái là các ô nhập**, **bên phải là trang web thật**.

### Cách chọn thứ muốn sửa

> **Giữ phím `Ctrl` rồi bấm** vào chữ hoặc ảnh trong khung bên phải.
> (Máy Mac thì giữ `Cmd`.)

Ô nhập tương ứng ở cột trái sẽ sáng lên và cuộn tới.

**Bấm thường (không giữ Ctrl) thì trang chạy y như thật** — bấm menu là chuyển trang, bấm tab là
đổi tab. Nhờ vậy bạn xem được nội dung mình vừa sửa trông thế nào ở các trạng thái khác nhau của
trang.

### Sửa và lưu

1. Gõ vào ô ở cột trái → khung bên phải đổi theo **ngay lập tức**
2. Bấm nút **Save changes** ở đáy cột trái
3. Xong. Khách vào trang là thấy luôn — không cần chờ gì cả

> **Chưa bấm Save thì chưa có gì được ghi.** Đóng tab lúc đang sửa dở, trình duyệt sẽ hỏi lại.

### Đổi ảnh

Ô ảnh có nút **Choose picture**. Bấm vào sẽ mở kho ảnh:

- Chọn một ảnh có sẵn, hoặc bấm **Add a picture** để tải ảnh mới lên
- Chọn **No picture** nếu muốn bỏ ảnh đi
- Dưới mỗi ô ảnh có ghi kích cỡ nên tải lên (ví dụ *Best upload 680 × 600 px*)
- Nhận JPG, PNG, WebP, GIF — tối đa 20 MB

### Ô "Search result" — phần hiện trên Google

Cuối cột trái, trước phần *Site — header and footer*, có nhóm **Search result**:

| Ô | Là gì |
|---|---|
| **Search title** | Tiêu đề hiện trên kết quả tìm kiếm và trên tab trình duyệt |
| **Search description** | Dòng mô tả dưới tiêu đề trong kết quả tìm kiếm |
| **Share picture** | Ảnh hiện khi ai đó chia sẻ trang này lên Facebook, Zalo… |

**Để trống cũng không sao.** Chữ xám mờ trong ô là thứ trang đang tự dùng — với một bài viết thì
đó là tiêu đề bài, mô tả là đoạn mở đầu. Chỉ gõ vào khi muốn nói khác đi.

Dưới ô có đếm ký tự. Con số "khoảng 60" và "khoảng 160" là **chỗ Google cắt bớt**, không phải
giới hạn của trang web — gõ dài hơn vẫn lưu đủ, chỉ là kết quả tìm kiếm không hiện hết.

### Ba chỗ không sửa được ở đây

Sửa ở đây sẽ làm hỏng chỗ khác, nên cố ý khoá:

- Đoạn mô tả dài của một dòng sản phẩm (nó được in thành hai cột)
- Tên **họ màu** trên một màu (nó là khoá tra bảng thông số)
- Danh sách sản phẩm trên một công trình (nhiều mục viết trên một dòng)

---

## 4. Thêm, bớt, đổi thứ tự — **Content**

Màn hình **Content** liệt kê mọi loại nội dung và số lượng đang có:

Products · Colors · News · Projects · Documents · Gallery · Applications ·
Home: New / Products / Colors / Projects · Export routes · Factories

Bấm vào một loại để:

- **Thêm** một mục mới — nút **Add an item**
- **Ẩn / hiện** một mục — mục ẩn vẫn còn đó, chỉ không hiện trên trang
- **Đổi thứ tự** bằng hai nút mũi tên — **Move up** / **Move down**
- **Xoá** một mục — nút **Delete**, có hỏi lại trước khi xoá

> **Lần đặt tên đầu tiên cũng đặt luôn địa chỉ.** Mục mới thêm mang một cái tên máy sinh
> (`new-3f9a2c`). Ngay khi bạn gõ tiêu đề và bấm Save, địa chỉ của nó thành tiêu đề ấy — và
> **sau đó không đổi nữa**, vì đổi là làm chết mọi đường dẫn người khác đã lưu.

> **Bốn mục "Home:" là kệ trưng bày, không phải kho.** Chúng chỉ chọn xem trang chủ hiện bài
> nào, theo thứ tự nào. Nội dung thật nằm ở News / Products / Colors / Projects — sửa chữ thì
> sửa ở đó, sửa một lần là mọi nơi đổi theo.

> **Hai con số trong tiêu đề trang chủ không tự đếm.** "One origin, four markets" và
> "Five factories, one coastline" là chữ, không phải phép đếm. Ẩn một tuyến xuất khẩu thì nhớ
> sửa chữ "four" theo.

---

## 5. Đơn khách gửi — **Enquiries**

Form liên hệ trên trang (`/contact/`) gửi thẳng vào đây. Mở **Enquiries** để xem:
ai gửi, gửi lúc nào, loại yêu cầu gì, và toàn bộ nội dung họ điền.

Chưa có đơn nào thì màn hình ghi **"Nothing yet."**

**Cách tự kiểm tra form còn chạy không:**

1. Mở https://aluminumboss.com/contact/ ở một tab khác (hoặc trên điện thoại)
2. Điền thử một đơn — ghi rõ trong phần nội dung là *"thử"* để sau khỏi nhầm
3. Quay lại **Enquiries** trong khu quản trị, bấm tải lại trang
4. Đơn vừa gửi phải hiện ở trên cùng

Nếu không thấy, xem mục 7 bên dưới.

> **Một địa chỉ chỉ gửi được 8 đơn mỗi giờ.** Đây là chặn spam. Thử form nhiều lần liên tiếp sẽ
> bị chặn — đợi sang giờ sau, hoặc thử từ mạng khác (ví dụ tắt Wi-Fi, dùng 4G).

> Đơn **không** tự gửi vào email. Phải vào màn hình này xem. Muốn có email báo thì cần làm thêm.

---

## 6. Lỡ tay thì lấy lại — **History**

Mỗi lần bấm Save đều được ghi lại. Màn hình **History** liệt kê các lần sửa: lúc nào, sửa gì,
ai sửa, dung lượng.

Bấm **Restore this version** để quay về bản đó.

Sửa nhầm, xoá nhầm, dán nhầm — vào đây lấy lại, không cần gọi ai.

---

## 7. Khi có trục trặc

| Hiện tượng | Xử lý |
|---|---|
| Bấm Save mà báo lỗi | Tải lại trang (F5), đăng nhập lại rồi sửa lại. Token bảo mật có hạn dùng. |
| Sửa xong mà trang ngoài chưa đổi | Bấm `Ctrl + F5` để trình duyệt tải lại thật, đừng lấy bản đã lưu tạm. |
| Trình duyệt báo "không bảo mật" | Kiểm tra địa chỉ có đúng **https://**aluminumboss.com không. Nếu vào bằng `http://` thì trang tự chuyển sang `https://`. |
| Quên mật khẩu | Không lấy lại được qua giao diện. Cần người kỹ thuật can thiệp vào máy chủ. |
| Cả trang không vào được | Gọi người kỹ thuật — xem `tools/deploy/README.md`, mục *Khi hong*. |

---

## 8. Phần dành cho người kỹ thuật

**Sửa nội dung** thì không cần phần này — bấm Save là xong, trang chạy trực tiếp trên máy chủ.

**Đưa bản mã nguồn mới lên** (sau khi lập trình viên sửa code):

```bash
bash tools/deploy/push.sh
```

Lệnh này **không** đụng vào nội dung khách đã sửa trên máy chủ. Đó là chủ ý: `_data` trên máy chủ
mới là bản thật. Chỉ khi thật sự muốn đẩy nội dung từ máy làm việc lên thì mới thêm
`--kem-noi-dung`, và lúc đó nó ghi đè thật.

Chi tiết máy chủ, chứng chỉ HTTPS, cách quay về bản cũ: `tools/deploy/README.md`.
