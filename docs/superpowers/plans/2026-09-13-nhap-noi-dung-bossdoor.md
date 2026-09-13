# Nhập nội dung từ bossdoor.vn sang site hiện tại

> **Trạng thái: BẢN KẾ HOẠCH — chưa thực thi.** Có ba quyết định phải chốt trước (mục 4).

**Yêu cầu:** *"Cho 1 agent khác cào nội dung của trang bossdoor.vn, convert sang tiếng anh, và
fill vào trang hiện tại theo các danh mục của trang hiện tại."*

---

## 1. Đã khảo sát được gì

Một agent đã đọc bossdoor.vn ngày 13/09/2026 (chỉ đọc trang công khai, không đăng nhập, không
cào hàng loạt, không ghi gì vào dự án).

| | Số lượng thật (đếm live) |
|---|---|
| Sản phẩm (VI) | **64** — cửa cuốn và phụ kiện, 4 trang danh mục |
| Tin tức (VI) | **247** — 25 trang, từ 03/10/2020 đến 22/07/2026 |
| Dự án (VI) | **9** |
| Đại lý | **124 điểm**, có tên, địa chỉ, toạ độ GPS, trong một trang 465 KB |
| Trang tĩnh | ~10 (giới thiệu, bảo hành, quy định, video) |
| Ảnh | ~1.500 lượt tham chiếu |
| **Tổng chữ tiếng Việt** | **≈ 260.000 – 285.000 từ** |

**Kỹ thuật:**
- CMS PHP tự viết. **Không có API/JSON nào** (`/wp-json` 404, `/rss.xml` rỗng) → bắt buộc cào HTML.
- `sitemap.xml` có 442 URL nhưng **toàn bộ `lastmod` là 2023-02-08** và thiếu hết nội dung
  2025–2026 → **không dùng làm bản kiểm kê**. Phải đi theo phân trang (`<a class='last-page'>`).
- HTML thô ước tính **66 MB** (template rất nặng, 180–350 KB/trang).
- Ảnh PNG **rất nặng**: một tấm 600×600 = 1,44 MB → phải chuyển WebP khi nhập.

**Bản tiếng Anh đã có sẵn nhưng phủ rất lệch** — và đây là thông tin đắt nhất của đợt khảo sát:

| Nhóm | VI | EN đã có | Chất lượng |
|---|---|---|---|
| Sản phẩm | 64 | **16** | Dịch thật, tốt — dựng 11/2025 |
| Tin | 247 | **2** | Danh sách `/news.html` rỗng hoàn toàn |
| Dự án | 9 | 10 trang | **Nội dung vẫn là tiếng Việt** |
| Giới thiệu | 1 | 1 | Đã dịch |

→ **16 sản phẩm đã có bản EN dùng lại được ngay.** Phần còn lại mới phải làm.

**Vấn đề chất lượng của bản EN hiện tại, đừng chép theo:** khung giao diện vẫn tiếng Việt ngay
trên trang EN ("Thông tin sản phẩm", "Mã sản phẩm"); `<title>` của `/en` là tiếng Việt; lỗi
"High-Víibility" (dấu sắc lọt vào); "imported Germany and Switzerland" (thiếu *from*). Và **hai
bản mâu thuẫn nhau về số liệu**: VI ghi "hơn 250 bằng độc quyền", EN ghi "over 48 patents".

---

## 2. Vấn đề lớn nhất: hai site nói về hai thứ khác nhau

| | Site hiện tại (AluminumBoss) | bossdoor.vn |
|---|---|---|
| Bán gì | Nhôm định hình: profile, facade, nội thất, phụ kiện cửa, phụ kiện ô tô, tấm tổ ong | **Cửa cuốn** hoàn chỉnh và phụ kiện cửa cuốn |
| Khách | B2B xuất khẩu, 43 thị trường | B2C/B2B trong nước, 124 đại lý |
| Giọng văn | Ngắn, kỹ thuật, Anh-Anh | SEO dày đặc, lặp từ khoá, chốt bằng hotline |

Chúng là **hai dòng sản phẩm của cùng một tập đoàn**, không phải hai bản của một site. Site hiện
tại đã có sẵn một dòng tên là **"Door's Accessory"** — đó là chỗ nối duy nhất có sẵn.

### Ánh xạ đề xuất

| bossdoor.vn | → danh mục site hiện tại | Ghi chú |
|---|---|---|
| 64 sản phẩm cửa cuốn | `products.categories` — **thêm 1 dòng mới "Roller shutters"**, và các phụ kiện dồn vào `Door's Accessory` đã có | 49 trong số 64 là phụ kiện |
| 247 tin | `news.items` — **chọn lọc, không lấy hết** (mục 4.2) | |
| 9 dự án | `projects.albums` | Khớp trường gần như 1-1 |
| Giới thiệu (1.175 từ) | `about.chapters` | Có sẵn chương |
| Bảo hành + quy chuẩn lắp đặt | `documents.categories` | |
| Màu/bề mặt | **không có nguồn** — bossdoor.vn chỉ có "màu tiêu chuẩn: ghi sáng" | `colors` giữ nguyên 35 mục hiện có |
| 124 đại lý | **KHÔNG nhập** — site hiện không có màn hình nào cho nó, và đó là dữ liệu đối tác | |
| `/thiet-ke.html` (dự toán) | **KHÔNG cào được** — là một công cụ cấu hình bằng JS, phải viết lại nếu cần | |

---

## 3. Ba việc phải làm rõ trước khi chạm vào dữ liệu

Đây là site đang vận hành của một doanh nghiệp có thật. Site hiện tại mang thương hiệu **Böss
Group**, bossdoor.vn mang **BossGroup / Tân Trường Sơn** — cùng một nhà, nên phần lớn nội dung là
của chính anh. Nhưng có ba nhóm **không phải của anh**, và chúng nằm rải trong nội dung:

1. **Nhãn hiệu bên thứ ba trong tên sản phẩm:** Somfy®, Kasankie®, Robust®, Xingfa, HOPO. Somfy
   là tập đoàn Pháp bảo vệ thương hiệu rất chặt.
2. **Tên khách hàng và logo đối tác:** Aeon Mall, Vincom Central Park, sân bay Cát Bi, FLC,
   Vingroup, Novaland, Coteccons, Jotun. Dùng tên công trình để chứng minh năng lực là bình
   thường **nếu có thoả thuận**; logo đối tác thì cần cho phép.
3. **Khẳng định có thể kiểm chứng:** "Kỷ lục Guinness 2012", "hơn 250 bằng độc quyền" (bản EN
   ghi 48), "Bằng độc quyền KDCN số 9926", "ISO 9001:2008", "bảo hành bề mặt sơn 10 năm". Con số
   mâu thuẫn giữa hai bản là dấu hiệu phải hỏi lại người trong nhà, không phải chép bên nào.

**Đề xuất:** nhập nội dung kỹ thuật và mô tả sản phẩm; **để riêng** ba nhóm trên thành một danh
sách để anh xác nhận từng dòng trước khi lên trang công khai. Không tự ý bỏ, không tự ý giữ.

**Ảnh:** ít nhất một phần là **infographic có chữ tiếng Việt in thẳng vào ảnh** (ví dụ sơ đồ
"liên kết 3 lớp bịt đầu nan"). Dịch chữ trong bài không làm ảnh hết tiếng Việt — **phải vẽ lại**.
Agent chỉ mở 2 ảnh nên chưa biết tỷ lệ; phải đếm trong đợt cào.

---

## 4. Ba quyết định của anh

### 4.1 Dịch nguyên văn, hay viết lại?

| | Dịch nguyên văn 260k từ | **Chọn lọc rồi viết lại (đề xuất)** |
|---|---|---|
| Khối lượng | ~260k từ | ~60–80k từ |
| Giọng văn | SEO tiếng Việt bê nguyên sang tiếng Anh | Khớp giọng site hiện tại |
| Kết quả | Trùng lặp, lặp từ khoá, người đọc quốc tế không dùng được | Dùng được ngay |

Bản VI **lặp từ khoá dày đặc** ("cửa cuốn" hàng chục lần mỗi bài), xưng "chúng tôi", chốt bài
bằng hotline. Bê nguyên sang tiếng Anh sẽ phá giọng văn của site hiện tại — thứ đã được giữ nhất
quán qua 15 trang.

### 4.2 247 bài tin — lấy bao nhiêu?

Trong 247 bài có **khoảng 60–80 bài SEO địa phương gần như trùng nội dung** ("cửa cuốn Quận 4",
"cửa cuốn Quận 5", "cửa cuốn Hải Dương"...). Chúng có nghĩa với Google tiếng Việt và **không có
nghĩa gì** với người đọc tiếng Anh.

Đề xuất: **giữ ~30–40 bài** — tin nhà máy, chứng nhận, sản phẩm mới, sự kiện — và bỏ toàn bộ
nhóm địa phương. Site hiện có 8 bài, nên 30–40 đã là gấp bốn lần.

### 4.3 Đổ thẳng vào `wwwroot/_data`, hay vào một cây nháp?

Đề xuất: **cây nháp**. Nhập 300+ mục vào dữ liệu đang chạy là một thay đổi không hoàn tác được
bằng History (History giữ 50 bản cho mỗi tệp, một lần nhập hàng loạt sẽ ăn hết). Nhập vào
`import/` trước, xem bằng `--serve`, duyệt xong mới trộn vào.

---

## 5. Các đợt

| Đợt | Việc | Xong thì có gì |
|---|---|---|
| **0** | Chốt ba quyết định ở mục 4 | Biết phải làm bao nhiêu |
| **1** | `tools/crawl-bossdoor.js` — đi theo phân trang, lưu HTML thô + ảnh vào `import/raw/` (gitignore). Có `--resume`, có giới hạn tốc độ. | 331 trang trên đĩa, cào một lần |
| **2** | `tools/extract-bossdoor.js` — bóc HTML thành JSON thô: tiêu đề, ngày, bảng thông số, thân bài, danh sách ảnh. Báo cáo số mục và số từ. | Dữ liệu có cấu trúc, kiểm đếm được |
| **3** | Ảnh: chuyển WebP, cạnh dài ≤ 2000 px (đúng quy tắc đã ghi trên màn hình Choose picture), **đánh dấu ảnh có chữ tiếng Việt** để vẽ lại | `wwwroot/_media/` nhẹ, có danh sách ảnh phải làm lại |
| **4** | Dịch/viết lại theo lô, mỗi lô một agent, **dùng lại 16 bản EN đã có** | Nội dung tiếng Anh |
| **5** | Trộn vào `products.json`, `news.json`, `projects.json`, `about.json`, `documents.json` theo đúng khuôn hiện tại; sinh `id` bằng `ContentEditor.Slugify` | Nội dung vào site |
| **6** | Verify: `slugs.py`, `trees.py`, `crawl.js`, `seo.js`, `labels.js`, `parity` trên 15 trang cũ | Không có liên kết chết, hai cây khớp, trang cũ không đổi |

**Đợt 1–2 là phần máy làm được và cào một lần là xong. Đợt 4 là phần tốn nhất và là phần cần
người đọc lại.**

---

## 6. Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Cào 331 trang × 350 KB làm phiền máy chủ của họ | Giới hạn 1 request/giây, có `--resume`, cào một lần rồi làm offline |
| Sitemap cũ làm bỏ sót nội dung mới | Không dùng sitemap; đi theo phân trang và đối chiếu số đếm (đã kiểm: 247 = hợp của ba chuyên mục) |
| 5 link menu hỏng, 4 sản phẩm mồ côi | Ghi vào báo cáo cào, không im lặng bỏ qua |
| Nhập hàng loạt làm trôi History | Đợt 5 là **một** lần lưu cho mỗi tệp, không phải 300 lần |
| Trang cũ đổi hình thức | `parity --against baseline/task15` sau đợt 5 |

---

## 7. Những chỗ khảo sát chưa chắc

1. Chỉ kiểm 4/10 trang dự án EN — cả 4 đều còn tiếng Việt; 6 trang còn lại là suy ra.
2. Chỉ mở 2 ảnh — chưa biết bao nhiêu trong ~1.500 ảnh có chữ tiếng Việt in vào.
3. 247 là số bài *đi được qua danh mục*; có thể còn bài mồ côi, chỉ crawl toàn site mới biết.
4. Không có bảng giá nào lộ qua HTML — giá luôn là "Liên hệ".
5. Số từ là ước tính từ mẫu 22 sản phẩm / 18 bài tin, không phải đếm toàn bộ.
