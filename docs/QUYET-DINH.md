# Quyết định đã chốt — 18/09/2026

Ghi lại để không phải hỏi lại, và để người sau biết những việc dưới đây là **lựa chọn**, không
phải chuyện chưa ai nghĩ tới. Mỗi dòng: chốt cái gì, và hệ quả kèm theo.

---

## 1. Máy chủ và xuất bản

**Chốt: sẽ dựng bản .NET lên VPS, anh Phúc tự dựng, làm sau.**

Nên bản .NET là đích chứ không phải bản tĩnh. Hai hệ quả đi kèm:

- Cho tới lúc VPS lên, **trang thật vẫn là GitHub Pages** (`site/`, bản JavaScript), và khu quản
  trị chưa ở đâu cả — mọi thay đổi nội dung vẫn phải qua lập trình viên rồi `git push`.
- Tài liệu bàn giao đang nói *"Trang thật đổi ngay lập tức — không phải chờ build, không phải
  deploy"*. Câu đó chỉ đúng với máy chủ; phải sửa cho đúng chừng nào Pages còn là trang thật.

## 2. Biểu mẫu liên hệ

**Chốt: dùng màn tiếp nhận trong khu quản trị. Không báo ra ngoài. Không làm gì tạm trên bản
tĩnh.**

- Màn `/Admin/Enquiry` đã có sẵn và đã đọc được `App_Data/enquiries.jsonl`.
- **Không gửi email, không Telegram, không Zalo.** Hệ quả phải nói rõ: yêu cầu báo giá chỉ được
  biết đến khi có người đăng nhập vào xem. Không ai vào xem thì nó nằm đó.
- Trên bản tĩnh hiện tại form vẫn báo *"The request did not go through. Please email us
  instead."* — để nguyên, vì VPS sắp lên.

## 3. Ẩn một mục phải có tác dụng trên trang thật

**Không hỏi — đây là lỗi, không phải lựa chọn.**

Các trang danh sách của bản tĩnh không lọc `visible`. Khách ẩn một sản phẩm trong Content, nó vẫn
hiện công khai trên Pages. Máy chủ thì lọc đúng, nên hai bản đang nói hai chuyện khác nhau.

## 4. Nút VI

**Chốt: ẩn đi.**

Bật lại bất cứ lúc nào khi có bản dịch. Không xoá mã, chỉ thôi vẽ nút.

## 5. Giao diện chép từ theme Cosentino

**Chốt: thay hết. Viết lại toàn bộ bằng CSS của mình, giữ nguyên hình thức.**

208 tệp CSS/JS trong `_assets/theme/.../b2c-child/`. Việc lớn, cần kế hoạch riêng và đo pixel
từng trang — `parity.js` với mốc `baseline/task22` là thứ chứng minh "giữ nguyên hình thức".

## 6. Hình thức

| | Chốt |
|---|---|
| Lớp phủ cho chữ trên hero | **Làm** — để ảnh nền tối (Facade, và ảnh sau này) vẫn đọc được |
| Cắt băng đầu trang chi tiết về 1280×520 | Không làm — để ảnh giữ tỉ lệ thật, chấp nhận nhảy ~95px lúc tải |
| Sửa "Six product families" | Không làm — khách tự sửa được trong trình soạn khi cần |
| Xin bên thiết kế bộ ảnh 2x | Không làm |

## 7. Nhập nội dung bossdoor.vn

| | Chốt |
|---|---|
| Dịch | **Chọn lọc rồi viết lại**, ~60–80k từ, khớp giọng văn site hiện tại |
| Tin tức | **Giữ ~30–40 bài** — nhà máy, chứng nhận, sản phẩm mới, sự kiện. Bỏ 60–80 bài SEO địa phương |
| Nơi nhập | **Đổ thẳng** vào `wwwroot/_data`, không qua cây nháp |

"Đổ thẳng" đi ngược đề xuất trong kế hoạch, và lý do đề xuất vẫn đúng: History giữ 50 bản mỗi
tệp, một lần nhập 300+ mục sẽ ăn hết, nên **không lùi được từ giao diện**. Cách bù rẻ nhất, làm
luôn: commit sạch ngay trước khi nhập, để `git` là đường lùi. Một dòng trong kế hoạch, không tốn
thêm đợt nào.
