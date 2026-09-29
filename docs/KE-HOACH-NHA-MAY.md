# Kế hoạch: thêm nhà máy / kho, và chấm bản đồ đi theo tỉnh — 29/09/2026

## Vì sao

Khách đã điền 5 nhà máy và muốn thêm một **kho ở TP.HCM**. Hiện không làm được: **Factories**
không có nút thêm (`CanAdd: false`), vì mỗi nhà máy cần vĩ độ/kinh độ mà giao diện không có chỗ nhập.

Khi xem dữ liệu thật trên máy chủ còn lộ ra hai lỗi:

1. **Chấm trên bản đồ vẫn ở 5 chỗ của bản demo.** Khách đã sửa tên và ô tỉnh (`region`), nhưng
   `region` chỉ là chữ. Ví dụ TAN TRUONG SON FACTORY ghi "Ha Noi" mà chấm vẫn ở Yên Bái.
2. **Thẻ ảnh cạnh bản đồ xếp theo mã cố định** `L:['yb','th','na'], R:['bd','bg']` — `bg` còn
   không phải mã nào. Điểm thứ sáu (mã mới) sẽ có thẻ không được xếp, nằm chồng ở góc.

## Làm gì

| # | Việc | Tệp |
|---|---|---|
| 1 | Bảng 63 tỉnh/thành (tên + toạ độ tỉnh lỵ), `Nearest(lat, lon)` | `Content/Places.cs` (mới) |
| 2 | Ô **place** (chọn trong bảng) và **kind** (`Factory` / `Warehouse`) cho mỗi điểm. Chọn tỉnh thì máy chủ tự ghi `lat`/`lon`. Hai ô được phép tạo mới trên điểm cũ chưa có (giống SEO), và chỉ nhận giá trị trong danh sách | `Content/ContentEditor.cs` |
| 3 | Vẽ hai ô đó cho trình soạn. Điểm cũ chưa có `place` thì hiện tỉnh gần chấm nhất — tức là cho khách thấy chấm **đang** ở đâu | `Content/SectionRenderer.cs` |
| 4 | Bản đồ: bỏ qua điểm chưa chọn tỉnh; kho vẽ ghim vuông và có dòng chú giải *Warehouse*; thẻ xếp theo vĩ độ (nửa bắc trái, nửa nam phải); màu mặc định khi `tone`/`vein` rỗng | `wwwroot/index.html`, `site/index.html` |
| 5 | Con số đếm cạnh tiêu đề chỉ đếm nhà máy (`data-ab-count-kind`) | `Content/PageComposer.cs` |
| 6 | Bật `CanAdd` cho Factories; nhãn ô *location on the map*, *type*; ô chọn trống hiện *Not chosen yet* | `CollectionController.cs`, `editor.js` |
| 7 | Kiểm thử đơn vị + công cụ đầu-cuối `tools/factory-edit.js` | `QlWeb2.Tests/FactoryPlaceTests.cs` |
| 8 | Sổ tay mục 5 (bỏ "Factories không thêm được"), thêm cách thêm nhà máy/kho; chụp ảnh; zip lại | `docs/…` |

## Kiểm

- `dotnet test`, `tools/editor-clicks.js`, `tools/article-edit.js`, `tools/factory-edit.js`
- Ảnh trang chủ trước/sau: 5 chấm cũ không đổi chỗ khi chưa ai chọn tỉnh (không làm hỏng trang đang chạy)
- Triển khai `push.sh` (chỉ mã). Dữ liệu khách trên máy chủ **không đụng tới** — khách tự chọn tỉnh.
