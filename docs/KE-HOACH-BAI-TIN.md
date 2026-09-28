# Cho đăng được một bài tin hoàn chỉnh từ giao diện

28/09/2026. Rà soát hướng dẫn sử dụng (QUYET-DINH mục 14) lộ ra: bài tin **mới** chỉ có 6 ô —
không có ô cho **thân bài**, **ngày đăng**, **thẻ**; bài **có sẵn** sửa được các đoạn đang có
nhưng không thêm/bớt được, và **ngày đăng không sửa được ở đâu cả**. Anh duyệt làm, rồi cập nhật
hướng dẫn kèm ảnh chụp và mô tả.

## Vì sao đang thiếu

Trình soạn dựng cột trái từ những gì trang **đang vẽ**: mỗi chữ trên trang mang một địa chỉ
`data-ab-*`, trang báo danh sách địa chỉ đó lên, trình soạn vẽ một ô cho mỗi cái. Hệ quả:

- **Danh sách rỗng không vẽ gì**, nên không có ô. Bài mới có `body: []`, `tags: []`.
- **Có ô nhưng không thêm/bớt được**: mỗi đoạn là một ô, nhưng không có nút nào đổi độ dài danh
  sách. Màn hình Content chỉ lo các danh sách cấp trên cùng (các bài), không lo danh sách **bên
  trong** một bài.
- **Ngày cố ý không có địa chỉ** (`SectionRenderer.NewsDetail`): trang hiện "19 August 2026",
  tệp giữ "2026-08-19". Gắn `data-ab-t` thì ô nhập sẽ đọc chữ hiển thị chứ không đọc giá trị thật.
  Lý do đó đúng — nên ngày cần một **loại ô riêng**, không phải một địa chỉ chữ.

## Thiết kế

### 1. Ngày đăng — loại ô `date`

- Trang chi tiết bọc ngày trong `<span data-ab-date=".items.N.date" data-ab-value="2026-08-19">`.
  **Luôn vẽ**, kể cả khi ngày rỗng, để bài mới cũng có ô.
- Cầu nối (`edit-bridge.js`) thêm loại `date`: **đọc** từ `data-ab-value`, **ghi** thì cập nhật
  `data-ab-value` và đổi chữ hiển thị theo đúng cách máy chủ viết (`LongDate`: "19 August 2026").
- Trình soạn vẽ `<input type="date">`.
- Máy chủ **tự kiểm** giá trị: `YYYY-MM-DD` là một ngày có thật, hoặc rỗng. Danh sách tin sắp
  theo chuỗi ngày — một giá trị sai định dạng không báo lỗi gì, nó chỉ lặng lẽ xếp sai thứ tự.

### 2. Thân bài và thẻ — thêm, bớt, đổi thứ tự trong một bài

- **Máy chủ ghép trang (chỉ khi `?edit=1`)** chèn một dấu ẩn cho mỗi danh sách sửa được của mục
  đang mở, cùng đường với khối SEO: `<span hidden data-ab-list="news.items.0.body"
  data-ab-each="Paragraph" data-ab-multiline>`. Bản công khai không mang dấu này.
- Cầu nối báo thêm `lists: [{ address, each, multiline }]` trong `ab:ready`.
- Trình soạn: dưới mỗi ô của danh sách có **↑ ↓ Remove**; sau ô cuối (hoặc ở cuối nhóm nếu danh
  sách rỗng) có nút **Add a paragraph** / **Add a tag**. Ô đoạn văn luôn là ô nhiều dòng.
- Bấm một nút như vậy là **ghi ngay** (giống màn hình Content). Đang có thay đổi chưa lưu thì hỏi
  "lưu trước rồi làm tiếp?" — không thì các ô sẽ đọc lại trang và hiện giá trị cũ trong khi thay
  đổi đang chờ vẫn nằm đó.
- Thêm xong: khung tải lại, **ô mới được cuộn tới và đặt con trỏ vào**.
- **Điểm cuối mới** `POST /Admin/Edit/List { address, op, index }`, `op` ∈ append / remove /
  up / down. **Chỉ nhận danh sách có tên trong một bảng** (`news.items.N.body`,
  `news.items.N.tags`) — một địa chỉ khác bị từ chối ngay ở cửa, vì màn hình không phải là cửa.
  Mỗi thao tác **ghi một bản lịch sử** như mọi lần lưu khác.
- `ContentEditor` thêm `Op.Append`: thêm `""` vào **cuối** một danh sách **toàn chuỗi**. Không
  dùng lại `Op.Add`: cái đó chèn lên **đầu**, và dựng phần tử mới từ phần tử thứ nhất — với một
  danh sách chuỗi rỗng nó sẽ chèn một **đối tượng** `{ id }` vào giữa các đoạn văn.

## Kiểm

- **Test C#**: `Op.Append` thêm đúng cuối, chỉ trên danh sách chuỗi, từ chối danh sách đối tượng;
  kiểm ngày (đúng / sai định dạng / ngày không có thật như 2026-02-30 / rỗng).
- **`tools/article-edit.js`** (mới, dùng lại được): trên máy làm việc, tạo một bài, đặt ngày, thêm
  hai đoạn, gõ chữ, thêm thẻ, đổi thứ tự, xoá một đoạn, lưu — rồi tải **trang công khai** và kiểm
  ngày, các đoạn, thẻ, và vị trí của bài trong danh sách tin. Xoá bài; tệp dữ liệu phải **y hệt**
  trước khi chạy. Một lần gửi địa chỉ lạ tới điểm cuối mới phải bị từ chối.
- Bộ cũ phải còn đạt: `editor-clicks.js`, `seo-fields.js`, test C#.

## Hướng dẫn sử dụng

- Viết lại mục "Đăng một bài tin mới" theo quy trình thật, bỏ hộp "chưa làm được".
- **`tools/guide-shots.js`** (mới): chụp từng bước vào `docs/huong-dan/*.png`, **khoanh đúng nút
  cần bấm** bằng một khung màu trước khi chụp, và cắt gọn quanh vùng đó. Chạy lại khi giao diện
  đổi là ảnh đổi theo.
- Mỗi ảnh có một dòng mô tả bên dưới nói ảnh đang chỉ cái gì.
- Trang web hướng dẫn thành trang nhiều tệp (HTML + ảnh); `guide-check.js` kiểm lại toàn bộ tên nút.

## Đưa lên máy chủ

`push.sh` **không** kèm nội dung — chỉ đổi mã, nội dung khách đã sửa trên máy chủ không bị đụng.
