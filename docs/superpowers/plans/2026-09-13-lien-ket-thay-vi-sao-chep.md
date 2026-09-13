# Trỏ vào cái đã có, thay vì chép lại nó

> **Cho người thực thi:** các ô `- [ ]` là đơn vị làm việc. Verify sau mỗi task trước khi sang
> task sau.

**Mục tiêu:** ở những chỗ một giá trị *bắt buộc* phải là một thứ đã tồn tại ở nơi khác, màn hình
phải cho **chọn**, chứ không cho gõ.

**Bối cảnh:** yêu cầu của chủ dự án — *"Vd phần news, sẽ chọn từ các tin đã có chứ không phải
nhập ảnh. Làm tương tự với các phần dynamic khác."*

---

## Đã đo được gì trước khi thiết kế

Ba con số quyết định phạm vi, và cả ba đều đọc từ dữ liệu thật chứ không đoán:

**1. Sáu thẻ "New" trên trang chủ đang là bản sao của sáu bài viết.**

| `highlights.items[].id` | tiêu đề trên thẻ | tiêu đề bài thật |
|---|---|---|
| `press-line-2500` | Second 2,500-tonne press now running | Second 2,500-tonne press commissioned at Binh Duong |
| `qualicoat-class-2` | Powder line certified to QUALICOAT Class 2 | Coating line certified to QUALICOAT Class 2 |
| `ev-battery-tray` | 6082 battery tray cleared for production | First EV battery tray programme reaches PPAP |
| `honeycomb-line` | Bonded panels now go to four metres | Honeycomb panel press expands to 4 metre panels |
| `eclos-sable-range` | Five sablé textures added to stock | Sablé textured finishes added to the standard range |
| `solar-rail-supply` | 6061-T6 solar rail on a three-year agreement | Three-year supply agreement for solar mounting rail |

**Cả sáu đều lệch, và lệch theo một hướng: tiêu đề thẻ ngắn hơn.** Đó là biên tập có chủ ý, không
phải dữ liệu mục nát. Nên tiêu đề thẻ **giữ lại** làm ghi đè tuỳ chọn.

Nhưng `image` và `href` thì khác: mỗi thẻ mang một ô ảnh RIÊNG trong khi bài viết đã có ô ảnh của
nó, và `href` chép lại đường dẫn mà máy chủ tự suy ra được từ `id`. Hai trường ấy không mang thông
tin nào mà bài không có. Đó đúng là chỗ chủ dự án chỉ ra.

**2. Mọi ô ảnh trên site hiện đều rỗng** — cả `news.items[].image` lẫn `highlights.items[].image`.
Nên việc "lấy ảnh của bài" **hôm nay không đổi một pixel nào**. Cái nó đổi là: từ nay mỗi bài có
MỘT ô ảnh, không phải hai ô ở hai chỗ mà người dùng phải nhớ điền cả hai.

**3. Không còn khối trang chủ nào là bản sao nữa.** Đã đối chiếu:

| Khối | Là bản sao của? |
|---|---|
| `products.categories`, `colors.items`, `projects.albums` | không — trang chủ dựng thẳng từ tệp thật, đã dùng chung sẵn |
| `gallery.items` | không — 0 caption nào trùng caption ảnh dự án |
| `applications.tabs[].items` | không — 0 tiêu đề nào trùng tên sản phẩm |
| `highlights.items` | **có** — sáu bản sao của sáu bài viết |

Nên "làm tương tự với các phần dynamic khác" **không** có thêm khối nào để áp dụng. Cái áp dụng
được là *cùng nguyên tắc* ở một lớp khác: những trường phải khớp một danh sách có sẵn — Task 19.

---

## Task 18: Thẻ trang chủ trỏ vào bài, không chép lại bài — XONG

**Tệp:**
- Sửa: `Content/SectionRenderer.cs` (`HomeHighlights`, dispatch ở `Section`)
- Sửa: `wwwroot/_data/highlights.json` và `site/_data/highlights.json`
- Sửa: `Areas/Admin/Controllers/CollectionController.cs`, `Areas/Admin/Views/Collection/Items.cshtml`
- Sửa: `tools/collection.js`, `docs/HANDOVER.md`

### Dữ liệu

```jsonc
// trước
{ "id": "press-line-2500", "label": "Binh Duong",
  "title": "Second 2,500-tonne press now running",
  "href": "news/press-line-2500/", "image": "" }

// sau
{ "id": "press-line-2500", "label": "Binh Duong",
  "title": "Second 2,500-tonne press now running" }
```

`href` suy ra từ `id` bằng đúng `Href()` mà mọi danh sách khác đang dùng — cùng một hàm, nên không
thể lệch. `image` lấy từ bài.

`label` và `title` ở lại làm **ghi đè tuỳ chọn**: rỗng thì thẻ lấy của bài. Dữ liệu hiện có sáu
ghi đè, và bảng trên là lý do.

### Render

`HomeHighlights` nối `highlights.items` với `Arr(news, "items")` theo `id`.

- **Bài không tồn tại hoặc đã ẩn → thẻ biến mất.** `Arr()` đã lọc `visible:false` sẵn, nên việc
  này có được miễn phí và nhất quán với mọi chỗ khác: ẩn một bài là ẩn nó ở mọi nơi nó xuất hiện.
- Ảnh mang địa chỉ **tuyệt đối** `news.items.<j>.image` — trỏ thẳng sang tệp news. Bấm vào ảnh
  thẻ trên trang chủ là sửa ảnh của BÀI. Không cần dấu `data-ab-doc` lồng nhau: dấu chấm mở đầu
  là thứ phân biệt địa chỉ tương đối với tuyệt đối, và cầu nối đã xử lý cả hai từ Task 15.
- Tiêu đề và nhãn vẫn mang địa chỉ của `highlights` — sửa ở đó là sửa cái thẻ, không sửa bài. Đó
  là điều đúng: thẻ là một tiêu đề ngắn hơn cho cùng một bài.

### Chọn bài

Ô `<select>` trên từng dòng của `Admin/Collection/Items/highlights`. Đó là màn hình của **tập
hợp** — có những mục nào, theo thứ tự nào — và "thẻ này là bài nào" thuộc về đúng câu hỏi ấy.
`id` của bài không phải chữ trên trang nên không thể có địa chỉ, đúng như toạ độ nhà máy.

- `Kind` thêm `PickFrom`: tên tệp nguồn + mảng + trường làm nhãn.
- `CollectionController` thêm một action `Link(id, index, to)`, có `[ValidateAntiForgeryToken]`,
  từ chối một `to` không nằm trong danh sách.

### Các bước

- [x] **Step 1: Bỏ `image` và `href` khỏi `highlights.json`, cả hai cây.**
- [x] **Step 2: `HomeHighlights` nối sang news.** Ảnh, đường dẫn và tiêu đề dự phòng lấy từ bài.
- [x] **Step 3: Ô chọn bài trên màn hình danh sách.**
- [x] **Step 4: Verify.** `parity --against baseline/task15` trên `/` phải **giống hệt** — sáu
      ghi đè tiêu đề còn nguyên và mọi ảnh đều rỗng, nên không có gì được phép đổi. Thêm một phép
      thử vào `collection.js`: đổi bài của thẻ → `id` đổi, thẻ trên trang chủ đổi theo.
- [x] **Step 5: Quay lại phim hướng dẫn.** Cảnh 6–8 của bản hiện tại là "Choose picture trên một
      thẻ Highlights", và sau task này **cái ô ấy không còn tồn tại**. Đoạn phim thành sai ngay
      hôm ship.
- [x] **Step 6: Commit.**

### Kết quả đo

`parity --against baseline/task15` ở 1440: **15/15 giống hệt.** Mô hình dữ liệu đổi, đường dẫn
của cả sáu thẻ giữ nguyên từng ký tự (`Href()` sinh ra đúng chuỗi mà `href` từng chép tay), sáu
ghi đè tiêu đề còn nguyên, và mọi ảnh vẫn rỗng — nên không một pixel nào được phép đổi, và không
một pixel nào đổi.

`collection.js` 14/14, thêm một phép thử **đổi con trỏ rồi đọc trang chủ**: một phép thử chỉ đọc
JSON sẽ qua được ngay cả khi trang chủ còn vẽ bằng dữ liệu cũ.

Chỉ số của ảnh lấy từ **nút**, không từ vòng lặp: sáu thẻ sinh ra `news.items.0/1/2/3/5/6.image`
— nhảy qua số 4, vì `vietbuild-2026` không nằm trong sáu thẻ. Đó đúng là điều phải xảy ra, và nó
chứng minh địa chỉ trỏ vào vị trí thật trong tệp news chứ không phải vị trí trên thẻ.

---

## Task 19: Những trường phải khớp một danh sách, nhưng đang cho gõ tự do — XONG

Cùng nguyên tắc, một lớp khác. Ba trường của một màu:

| Trường | Phải là một trong | Hiện nay |
|---|---|---|
| `colors.items.N.gloss` | `colors.filters[2].options` — Matt / Satin / Gloss / Textured | ô chữ tự do **sửa được** |
| `colors.items.N.use` | `colors.filters[1].options` — Interior / Exterior / Marine | ô chữ tự do **sửa được** |
| `colors.items.N.family` | khoá của `colors.familySpecs` | cố tình KHÔNG gắn địa chỉ, nên không sửa được |

Gõ `satin` thay vì `Satin` thì màu ấy **biến mất khỏi bộ lọc Gloss** và không có gì báo. Hai
trường đầu đang mở cho gõ tự do từ Task 15, nên đây là một lỗi im lặng đã có sẵn, không phải lỗi
sắp có.

**Cách làm:** một loại ô mới — `pick`.

- `SectionRenderer` gắn `data-ab-pick=".items.0.gloss"` kèm `data-ab-opts="Matt|Satin|Gloss|Textured"`,
  danh sách lấy từ chính tệp ấy nên không thể lệch khỏi bộ lọc.
- `edit-bridge.js` báo `{ kind: 'pick', value, options }`.
- `editor.js` vẽ một `<select>`; chọn xong vẫn gửi `ab:text`, nên đường vá sống không đổi.
- `ContentEditor` kiểm phía máy chủ: ghi vào một địa chỉ loại `pick` mà giá trị không nằm trong
  danh sách thì từ chối. Màn hình không phải đường duy nhất vào.

`family` được mở ra sửa lần đầu tiên, và chỉ an toàn được vì nó là một ô chọn.

### Các bước

- [x] **Step 1: `data-ab-pick` + `data-ab-opts` trong bộ ghép và `Verify`.**
- [x] **Step 2: Cầu nối báo `kind: 'pick'`.**
- [x] **Step 3: Trình soạn vẽ `<select>`.**
- [x] **Step 4: Máy chủ từ chối giá trị ngoài danh sách** + phép thử đơn vị.
- [x] **Step 5: Verify** — `parity` (một `<select>` ở khu soạn không chạm vào trang công khai),
      `editor-shot`, `labels`, và một phép thử ghi giá trị bậy qua `curl`.
- [x] **Step 6: Commit.**

---

## Cố tình KHÔNG làm

| Chỗ | Vì sao |
|---|---|
| `projects.albums.N.products` | Đọc như một danh sách sản phẩm, nhưng dữ liệu thật trộn tên sản phẩm (`Bonded Panel`, `Casement 55 TB`) với **tên màu** (`Anodic Black`, `Burma Teak`). Không phải một tập hợp nào cả, nên không có danh sách nào để chọn từ đó. Giữ nguyên phần đã ghi ở Task 15. |
| `gallery.items.N.cat` | Phải là một `id` trong `gallery.tags`, nhưng nó không phải chữ trên trang — nó là thuộc tính để lọc. Cùng lớp với `highlights.items.N.id`, nên nó thuộc về màn hình danh sách; để lại cho tới khi có người thật cần đổi. |
| Tiêu đề thẻ luôn lấy của bài | Cả sáu thẻ đang cố tình ngắn hơn. Bỏ ghi đè là vứt đi một quyết định biên tập. Nếu chủ dự án muốn thẻ luôn bằng bài, xoá sáu trường `title` là xong — không cần sửa mã. |

### Kết quả đo

`dotnet test` 79/79 — mười phép thử mới, và chúng hỏi **máy chủ có từ chối không**, chứ không hỏi
màn hình có vẽ đúng không: `satin` viết thường, `Eggshell`, `Marine` (có thật ở site khác, không
có trong tệp này), `Wood grain` khi `familySpecs` không có dòng ấy, và chuỗi rỗng. Thêm hai phép
thử cho hai kiểu hỏng ngược chiều: **một giá trị bị từ chối không được kéo cả lô xuống theo** (mất
cái ghi chú bên cạnh chỉ vì gõ sai độ bóng là biến một giá trị sai thành một màn hình hỏng), và
**mọi trường khác vẫn nói được bất cứ điều gì** — kiểm ba trường có tên của một tệp, không phải
một tâm trạng.

`editor-shot` 12/12 · `labels` 33/33 · `collection` 14/14 ·
`parity --against baseline/task15` 15/15 — một `<select>` trong khu soạn không chạm vào trang
công khai, và con số chứng minh điều đó.

Nhãn của hai ô lấy tên mà **trang** gọi chúng, không phải tên tệp gọi: `use` → *exposure* (bảng
thông số trên trang ghi "Exposure"), `family` → *finish family*.

### Một giá trị sai đã có sẵn thì sao

Ô chọn giữ nguyên nó, ở đầu danh sách, kèm chữ *"— not on the list"*. Bỏ nó ra khỏi danh sách thì
`<select>` sẽ tự nhảy sang lựa chọn đầu tiên, và lần sau người dùng chạm vào bất cứ thứ gì trên
trang ấy, một giá trị họ chưa từng chọn sẽ được lưu đè lên. Sửa dữ liệu của người khác trong lúc
họ không nhìn là đúng thứ mà cả hai task này tồn tại để chặn.
