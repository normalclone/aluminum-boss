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

**Bỏ thời hạn bảo hành và nước sản xuất khỏi dòng `spec` của từng mô tơ.** Trên một thẻ sản
phẩm, "Bảo hành 1 năm · Đài Loan" đọc như một cam kết đứng mãi, mà cả hai đều đổi theo nhà cung
cấp. Giữ lại: sức nâng, diện tích cửa, và những gì có trong hộp.

Riêng bài *Choosing a shutter operator* **có** nêu nước sản xuất của bốn dòng mô tơ — vì đó
chính là nội dung bài: nguồn không đưa ra điểm khác biệt nào khác giữa chúng. Một bài báo ghi
"hiện nhập từ Nhật" khác với một thẻ sản phẩm ghi thế: bài có ngày tháng trên đầu.

---

## 1b. Bốn câu tôi đã viết rồi xoá đi

Ghi lại vì chúng là cùng một loại lỗi với việc bịa thông số, chỉ khác là nằm trong câu văn nên
khó thấy hơn — và cả bốn đều nói về **công trình thật hoặc sự kiện thật**:

| Đã viết | Vì sao sai |
|---|---|
| "shipping **from Binh Duong** to Europe" | Nguồn không nói nơi nào. Bình Dương là dữ liệu của bản demo hiện tại, còn chính bài kia nói nhà máy cửa cuốn ở **miền Bắc** |
| "partners **visit the plant** … spent time on the plant floor" | Nguồn viết "buổi làm việc và trao đổi". Tôi biến một cuộc họp thành một chuyến tham nhà xưởng |
| Aeon Mall: "delivered to the main contractor rather than to a fabricator, so the sections arrived **cut to the site schedule**" | Nguồn không nói một chữ nào về cách giao hàng |
| Cát Bi: "leaves the facade **carrying its own weight only**" | Suy luận kết cấu của tôi, phát biểu như dữ kiện, về một nhà ga có thật |

---

## 1c. Đợt rà thứ hai — chín chỗ nữa trong 28 bài viết sau

Bốn câu ở mục 1b là đợt rà đầu, làm trên 8 bài đầu tiên. Sau khi viết thêm 28 bài, tôi chạy lại
đúng bộ lọc đó trên cả 36 bài. Ra thêm chín chỗ — **cùng một loại lỗi**, chỉ khác là lần này
phần lớn không nói về công trình mà nói về *thế giới nói chung*:

**Bốn câu về sự kiện và công ty có thật:**

| Bài | Đã viết | Nguồn thật nói gì |
|---|---|---|
| `rebrand-to-bossgroup` | "The legal entity and the plants are **unchanged**" | Nguồn nói đổi "tên gọi và nhận diện thương hiệu". Không một chữ nào về pháp nhân hay nhà máy. Tôi tự thêm một lời bảo đảm pháp lý |
| `customer-conference-2025` | cải tiến "**mostly in the hardware and the control side rather than the sections**" | Nguồn nói "cải tiến về công nghệ, tính năng và thiết kế" — không chỉ ra ở đâu. Tôi bịa ra độ chính xác. Câu mới dùng đúng phạm vi nguồn, và thêm nhà máy Thanh Hoá **vì nhà máy đó có trong nguồn** |
| `wide-span-openings` | `date: 2021-08-02` | Trang nguồn `n146` ghi **2021-07-30**. Sai ngày là sai dữ kiện, dù không ai để ý |
| `fire-shutters` | "which is where **most of them** fail an inspection" | Một con số thống kê không có nguồn. Đổi thành "where an installation fails inspection" — cùng ý, không giả vờ đếm được |

**Năm câu thống kê trong bài hướng dẫn:** `operator-role` ("Most of the failures come from the
operator"), `ups-operation` (hai chỗ "most of them… replaced early"), `rolling-code-and-latch`
("how most of them are actually opened" — về cách kẻ trộm mở cửa), `grille-shutters` ("the
**only** curtain type that does both").

Các bài hướng dẫn được phép khái quát — "usually", "often" là giọng đúng của thể loại. Nhưng
**"most" và "only" đứng trần thì đọc như một con số đã đếm**, mà không ai đếm cả. Tôi giữ nguyên
ý, đổi cách nói: từ một thống kê giả thành một lý do kỹ thuật.

**Một chỗ tôi kiểm rồi để nguyên:** "The first vented shutter came off the line in 1998" —
nguồn `n375` viết "kể từ năm 1998 khi chiếc cửa cuốn lỗ thoáng đầu tiên ra đời". Khớp, kể cả
chữ "lỗ thoáng".

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
