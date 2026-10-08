# Kế hoạch: Projects, Documents và Capability khai báo được — 08/10/2026

## Yêu cầu

1. **Projects**: nội dung dự án khai báo được và hiển thị thành bài riêng. Giữ bố cục trang dự án hiện tại.
2. **Documents**: khai báo động (thêm, bớt tài liệu; tải PDF lên).
3. **Capability**: trình bày nội dung file `BossGroup Company Profile (1).pdf` (29 trang, 264 MB) thành nội dung web trên trang Capability.

## Hiện trạng

- Mỗi dự án đã có trang riêng (`/projects/<id>/`). Trang có: tiêu đề, ghi chú, năm, địa điểm, khách hàng, phạm vi, sản phẩm, ảnh kèm chú thích.
- Một dự án mới (Content → Projects → Add an item) có 0 ảnh, 0 sản phẩm, và không có cách thêm. Không có thân bài.
- Tài liệu nằm trong `documents.json` → `categories[].items[]`. Màn hình Content chỉ thêm được **nhóm** tài liệu, không thêm được tài liệu. Tệp PDF là `_docs/<id>.pdf`, nằm trong thư mục mã trên máy chủ, nên mỗi lần deploy bị thay.
- Trang Capability là một chương trong `about.json` (`title`, `lede`, `body` là các đoạn văn).

## Phần chung: danh sách có nhiều ô

Trình soạn hiện chỉ thêm, bớt, đổi thứ tự **danh sách chuỗi** (đoạn văn, thẻ). Mở rộng cho **danh sách mục có nhiều ô**:

- `ItemLists.Entry` có thêm `Template`: mẫu cho một mục mới. Mục mới có mã `id` tạm thì nhận `new-xxxxxx`.
- `ContentEditor.Structure(Append)` tạo danh sách khi mục cũ chưa có danh sách đó (ví dụ `body` trên dự án cũ).
- Dấu `data-ab-list` có thêm `data-ab-first` (ô đầu của một mục). Trình soạn nhóm các ô theo mục và đặt nút ↑ ↓ Remove dưới ô cuối của mục.
- Dấu danh sách được gắn cả trên trang danh sách (Documents), cho mọi nhóm.

## 1. Projects

| Danh sách | Mẫu mục mới | Trên trang |
|---|---|---|
| `albums.N.body` | chuỗi | Thân bài, sau phần thông số |
| `albums.N.photos` | `{ "c": "", "image": "" }` | Lưới ảnh hiện tại |
| `albums.N.products` | chuỗi | Mỗi sản phẩm một ô trong dòng Products |

## 2. Documents

- Danh sách `categories.N.items`, mẫu `{ id, title, blurb, edition, lang, pages, file }`. Nút "Add a document" trên trang `/documents/`.
- Ô mới **file** (`data-ab-file`): nút tải PDF lên. Máy chủ kiểm byte đầu `%PDF`, tối đa 40 MB, lưu vào `_docs`.
- Tài liệu có `file` thì dùng `_docs/<file>`; không có thì dùng `_docs/<id>.pdf` như cũ.
- Máy chủ: chuyển `_docs` sang `noi-dung/_docs` và tạo liên kết. Deploy chép PDF mới bằng `cp -an`, không ghi đè PDF khách đã tải lên. nginx tăng `client_max_body_size` lên 40m.

## 3. Capability

- Chương Capability có thêm `sections`: `{ heading, text, photos[] }`. Trang vẽ mỗi mục: tiêu đề, đoạn chữ, lưới ảnh.
- Nội dung lấy từ PDF: năng lực kỹ thuật (trang 3), 8 dây chuyền máy móc (trang 4–10), chứng chỉ (trang 15–18).
- Ảnh tách từ PDF, thu nhỏ còn cạnh dài 1600 px, JPEG chất lượng 82, đưa vào kho ảnh.
- PDF nén còn khoảng 10–20 MB, có nút "Download company profile".
- Danh sách `sections` và `sections.N.photos` khai báo được bằng phần chung ở trên.

## Kiểm

- Kiểm thử đơn vị cho `Append` có mẫu, tạo danh sách thiếu, `data-ab-file`, kiểm PDF.
- Công cụ đầu-cuối: `tools/project-edit.js`, `tools/document-edit.js`, `tools/capability-edit.js`. Mỗi công cụ tự dọn dữ liệu thử và so mã băm tệp.
- Chạy lại: `editor-clicks`, `article-edit`, `factory-edit`, `collection`, `crawl`, `hero-auto`.
- Deploy, rồi kiểm trên aluminumboss.com.
