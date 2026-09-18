# Viết lại: những chỗ tôi tự quyết, và những chỗ còn thiếu

Ghi ngày 18/09/2026, cùng lúc với 47 tệp trong `import/en/`. Đây là các quyết định **của tôi**
trong lúc viết lại — để anh Phúc lật lại được, chứ không phải để thông báo.

`import/en/` **chưa phải trang thật.** Chỉ `node tools/merge-bossdoor.js --apply` mới đổ vào
`_data`, và tôi chưa chạy lệnh đó.

---

## 1. Bốn nguyên tắc tôi áp dụng cho 34 dòng trong `xac-nhan.md`

Tôi không thể vừa chờ anh duyệt vừa viết, nên tôi viết theo bốn nguyên tắc dưới đây. Anh đổi
nguyên tắc nào thì tôi sửa lại phần tương ứng — mỗi mục một tệp nên sửa từng mục được.

| Loại | Tôi làm gì | Vì sao |
|---|---|---|
| **Tên công ty** | Viết **Böss Group** (công ty) và **BössDoor** (dòng cửa cuốn) | Site đang viết "Böss Group"; và chính bossdoor.vn cũng viết "BössDoor", "BössMatic" có dấu ö. Hai bên trùng nhau, nên đây là lựa chọn ít rủi ro nhất. Bỏ hẳn "Tân Trường Sơn Group" khỏi bản tiếng Anh |
| **Nhãn hiệu mô tơ** (Robust, Kasankie, BossRM, YH) | **Giữ trong tên sản phẩm**, bỏ ký hiệu ® | Tên là thứ nhận dạng sản phẩm — bỏ đi thì cái thẻ vô nghĩa. Bỏ ® vì mình không kiểm chứng được tình trạng đăng ký. Không viết câu nào khẳng định quan hệ phân phối |
| **Tên khách hàng** (Aeon Mall, Cát Bi, Coteccons…) | **Giữ**, vì tên chính là tiêu đề của dự án | Không có tên thì không còn dự án nào cả. Đây là dòng **rủi ro nhất** trong cả lần nhập — nếu hợp đồng cấm nêu tên thì phải bỏ ba tệp trong `import/en/projects/` |
| **Con số kiểm chứng được** (Guinness, 250 sáng chế, ISO 9001:2008, bảo hành 10/20 năm, "đầu tiên và duy nhất", "Thương hiệu Quốc gia", "Top") | **Bỏ hết** | Không viết câu nào cần chúng. Một con số cũ đặt trên trang tiếng Anh là cam kết với khách nước ngoài, và năm 2026 chưa chắc còn đúng. Thêm lại sau thì dễ, gỡ xuống thì không |

**Thông số kỹ thuật thì giữ nguyên** — mác nhôm 6063-T5/T6, độ dày, kích thước lắp đặt, sức
nâng, dung lượng pin, kích thước vỏ. Đó là số đo, không phải lời hứa.

**Bỏ thời hạn bảo hành và nước sản xuất khỏi dòng `spec` của mô tơ.** Cả hai là điều khoản
thương mại, đổi theo nhà cung cấp. Giữ lại: sức nâng, diện tích cửa, và những gì có trong hộp.

---

## 2. Ba sản phẩm không viết, vì là trang trùng

Bộ lọc giữ chúng (có chữ, đúng họ), nhưng đọc ra thì cùng một thứ:

| Nguồn | Vì sao bỏ |
|---|---|
| `bao-gia-bo-toi-kasankie-eco-nhat-ban-p263` | Trang **báo giá** của dòng Kasankie Eco, không phải một SKU. Hai SKU thật (300 kg, 500 kg) đã có tệp riêng |
| `khoa-cua-cuon-tu-dong-p138` | Trang **thư viện ảnh** của bộ khóa. Nội dung kỹ thuật nằm ở `khoa-chot-tu-dong…-p245`, đã viết thành `da-latch-auto-g3` |
| `bo-toi-cua-cuon-robust-1000-kg-1-p45` | Trùng hẳn với `bo-toi-cua-cuon-robust®-1000-kg-p63` — cùng Robust 1000 kg |

→ 38 sản phẩm được chọn, viết ra **35 tệp**.

## 3. Hai dự án chưa viết, vì thiếu đúng một dữ kiện

`projects.albums` bắt buộc có `year`, và trang danh sách sắp xếp theo năm. Nguồn không ghi năm
hoàn thành cho hai dự án này, và tôi không đoán:

- **Masteri Nam An Khánh** — có chi tiết cung cấp tốt nhất trong cả 5 dự án (mác nhôm 6063.T6 từ
  nhà máy Công ty CP TP Hoàng Kim). Chỉ thiếu năm.
- **Delta River Tower** — có tên nhà thầu (Coteccons) và mô tả toà nhà. Chỉ thiếu năm.

Anh cho hai con số là tôi viết trong mười phút.

Ba dự án đã viết: FHome Đà Nẵng (bàn giao 2016), AEON Mall Long Biên (khai trương 10/2015),
sân bay Cát Bi (nhà ga khai thác 12/5/2016) — cả ba đều có năm **nằm trong chính trang nguồn**.

**Một điều đáng nói về nhóm dự án:** phần lớn các trang dự án của bossdoor.vn là **mô tả toà
nhà chép lại**, không phải hồ sơ cung cấp. Trang sân bay Cát Bi không nói một chữ nào về việc
BossGroup cung cấp gì cho công trình đó. Tôi để `scope` là "System aluminium" — mức thấp nhất
mà việc họ tự xếp nó vào mục dự án của mình hàm ý. Anh biết thật sự cung cấp gì thì sửa một dòng.

## 4. Còn thiếu ảnh

Cả 47 mục đều có `image: ""` / `photos: []`. Đợt 3 (tải ảnh) chưa chạy — nguồn có 813 ảnh tin,
60 ảnh sản phẩm, 9 ảnh dự án, và nhiều tấm có **chữ tiếng Việt in thẳng lên ảnh** nên phải vẽ
lại chứ không dùng được. Trang vẫn chạy bình thường khi thiếu ảnh: `AB.ph()` vẽ ô giữ chỗ.

## 5. Bốn trang tĩnh vẫn chờ anh quyết

Xem `import/selected.json` mục `static` — giới thiệu công ty, chính sách bảo hành, quy chuẩn lắp
đặt. Chưa viết chữ nào, vì chưa biết chúng vào đâu (chi tiết trong `docs/QUYET-DINH.md` và bảng
"chờ quyết định" của `tools/select-bossdoor.js`).
