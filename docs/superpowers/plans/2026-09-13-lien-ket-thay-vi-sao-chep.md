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

---

## Task 20: Thẻ là bài, hết — XONG

Task 18 giữ `label` và `title` trên thẻ làm ghi đè tuỳ chọn, với lý do "cả sáu đều ngắn hơn một
cách có chủ ý". Chủ dự án nói lại: *"Ý tôi là chọn từ những tin tức có sẵn chứ không chỉ ảnh."*

Đọc lại dữ liệu thì lý do ấy không đứng được. Sáu cặp tiêu đề **đã lệch nhau**, và sáu cái nhãn
trên thẻ — "Binh Duong", "Honeycomb", "Profile" — **không khớp thẻ tag nào của bài, cũng không
khớp tác giả**. Đó không phải một quyết định biên tập được giữ gìn; đó là một bản sao thứ hai mà
không có gì giữ cho khớp. Một bản sao không ai đồng bộ không phải là chủ ý, nó là phiên bản thứ
hai của sự thật.

**Sau Task 20, `highlights.items[]` chỉ còn `{ "id": ... }`.** Tiêu đề, thẻ tag, ảnh và đường dẫn
đều là của bài, và đều mang địa chỉ **trên bài**:

| Trên thẻ | Địa chỉ | Nghĩa là |
|---|---|---|
| dòng tag nhỏ | `news.items.N.tags.0` | sửa là sửa thẻ tag của bài |
| tiêu đề | `news.items.N.title` | sửa là sửa tiêu đề bài, ở mọi nơi nó xuất hiện |
| ảnh | `news.items.N.image` | một ô ảnh cho một bài |

Màn hình **Content → Highlights** giờ là đúng một câu hỏi: *những bài nào, theo thứ tự nào, bài
nào đang ẩn.* Cột Article là chỗ chọn; tiêu đề và ảnh trên dòng đều đọc từ bài.

### Cái gì đổi trên trang, và đổi bao nhiêu

| Thẻ | Trước | Sau |
|---|---|---|
| 1 | Binh Duong · Second 2,500-tonne press now running | **Plant** · Second 2,500-tonne press commissioned at Binh Duong |
| 2 | Finishing · Powder line certified to QUALICOAT Class 2 | **Certification** · Coating line certified to QUALICOAT Class 2 |
| 3 | Car's Accessory · 6082 battery tray cleared for production | **Automotive** · First EV battery tray programme reaches PPAP |
| 4 | Honeycomb · Bonded panels now go to four metres | **Plant** · Honeycomb panel press expands to 4 metre panels |
| 5 | Finishes · Five sablé textures added to stock | **Product** · Sablé textured finishes added to the standard range |
| 6 | Profile · 6061-T6 solar rail on a three-year agreement | **Market** · Three-year supply agreement for solar mounting rail |

`parity --against baseline/task15`: **đúng một trang lệch** — trang chủ, 6.979 pixel, toàn bộ nằm
trong khối "New". Mười bốn trang còn lại giống hệt. Con số ấy là bằng chứng thay đổi nằm gọn
trong chỗ nó phải nằm.

Tiêu đề dài nhất (51 ký tự) xuống ba dòng và vẫn nằm trong thẻ 444×370 — đã chụp và nhìn, không
chỉ đo. Mốc nền mới: `baseline/task19`.

### Một công cụ thoát với mã 1 và không nói gì

`guide-video.js` tìm tiêu đề thẻ bằng `[data-ab-t=".items.0.title"]`. Sau Task 20 địa chỉ ấy
thành `news.items.0.title` (tuyệt đối, trỏ sang tệp khác), nên bộ chọn không khớp gì cả — và cái
chốt bảo vệ ở đó gọi `process.exit(1)` trần: **không một dòng nào in ra**. Người chạy chỉ biết
"hỏng", không biết hỏng ở đâu, trong khi thứ nó đang tìm chính là thứ vừa bị đổi tên.

Nay hai chốt ấy in bảng và nói rõ nó không tìm thấy cái gì. Và bộ chọn đổi sang **lớp CSS của
thẻ** thay vì địa chỉ: lớp ấy là hình thức của trang, địa chỉ là nơi dữ liệu nằm, và phép thử này
hỏi về hình thức.

---

## Task 21: Trang chủ là một giá sách, không phải một kho thứ hai

**Yêu cầu:** *"Tôi muốn là đăng bài news, đăng tin tức, đăng color riêng. Sau đó ở trang chủ sẽ
cho người dùng pick từ kho bài đó và fill các nội dung ấy."*

Mô hình: **kho** là nơi viết nội dung; **trang chủ** là nơi chọn ra từ kho. Task 18–20 đã dựng
đúng cơ chế ấy cho một khối. Task 21 áp dụng cho những khối còn lại.

### Hôm nay khối nào chọn được, khối nào không

| Khối trang chủ | Hiện lấy gì | Ai quyết |
|---|---|---|
| New (tin) | 6 bài do người dùng chọn | **người dùng** ✓ |
| Product families | **tất cả** 6 dòng | không ai |
| Colors | 10 màu: một cho mỗi họ, rồi lấp đầy theo thứ tự tệp | một thuật toán viết cứng |
| Recent projects | 3 dự án mới nhất theo năm | một thuật toán viết cứng |
| Gallery, Applications, Feature | nội dung riêng, không phải kho nào | — |

"Một cho mỗi họ rồi lấp đầy theo thứ tự tệp" là quy tắc không ai đoán được và không ai đổi được
mà không sửa mã. Đó chính là chỗ yêu cầu này chỉ vào.

### Cờ hay danh sách chọn?

Một cờ `home: true` trên từng mục trong kho thì rẻ hơn, nhưng **không diễn đạt được thứ tự**: thứ
tự khối New là biên tập, khác thứ tự `/news/` (theo ngày). Khối Colors chọn 10 trên 35 — đó là
một lựa chọn thật, không phải một bộ lọc. Nên: **danh sách chọn**, đúng hình dạng đã có.

### Bốn cái giá, cùng một hình dạng

`highlights.json` đổi tên thành **`home-news.json`**, và ba tệp mới cùng hình dạng:

```jsonc
// home-news.json, home-products.json, home-colors.json, home-projects.json
{ "items": [ { "id": "press-line-2500" }, … ] }
```

Đổi tên vì bốn tệp cùng một ý tưởng thì phải cùng một lối đặt tên; `highlights` không nói lên nó
là cái giá của trang chủ. Giá phải trả: một địa chỉ trong khuôn trang chủ (`highlights.heading`),
một dòng trong `DocumentFor`, một dòng `Kind`, vài danh sách trong `tools/`. Rẻ bây giờ, đắt sau.

### Ba cái bẫy

1. **Giá rỗng phải rơi về đúng quy tắc hôm nay.** Cài đặt đang chạy chưa có `home-colors.json`;
   không có bước rơi về thì lần deploy đầu tiên trang chủ mất ba khối. Quy tắc cũ ở lại làm bước
   rơi về, và **một script gieo hạt** viết ra đúng những gì quy tắc ấy sinh ra hôm nay — nên
   `parity` trên `/` phải 15/15 ngay sau khi gieo. Chạy parity NGAY sau bước gieo, một mình.
2. **`PickFrom` đang giả định mảng nguồn tên là `items`.** Kho products là `categories`, projects
   là `albums`. Không sửa thì màn hình danh sách của hai giá ấy hiện "Not linked yet" trên mọi
   dòng mà không báo gì.
3. **Tiêu đề khối "Six product families" là chữ viết cứng.** Giá chọn năm dòng thì nó nói dối.
   Cùng loại với "four markets" ở Task 7 — đổi sang `data-ab-count` hoặc ghi rõ là chưa đổi.

### Các bước

- [x] **Step 1: Đổi tên `highlights` → `home-news`**, cả hai cây, khuôn, `DocumentFor`, `Kind`, `tools/`.
- [x] **Step 2: `PickFrom` trỏ sang một KIND khác**, không phải một tệp. Kho products giữ mục
      dưới `categories`, projects dưới `albums` — trỏ sang kind thì mảng và **danh từ số ít** đi
      kèm luôn, nên đầu cột tự đổi theo ("Product family", "Color", "Article", "Project").
- [x] **Step 3: `tools/seed-shelves.js`** — viết ra ba giá đúng bằng những gì quy tắc hôm nay
      sinh ra, ở cả hai cây, chỉ đụng vào giá đang rỗng trừ khi `--force`.
- [x] **Step 4: Bốn khối đọc giá, rơi về quy tắc cũ khi giá rỗng.** `SectionRenderer.Shelf`.
      Địa chỉ đặt trên mục của KHO (`products.categories.N.name`), tuyệt đối chứ không phải
      tương đối, vì thẻ `data-ab-doc` quanh khối giờ mang tên cái giá.
- [x] **Step 5: Màn hình Content chia ba nhóm** — Libraries · The home page · The two maps.
      Danh sách phẳng mười ba ô giấu mất chuyện có hai bước, và "Home: Products" nằm cạnh
      "Products" trông như một danh sách sản phẩm thứ hai đang tranh nhau.
- [x] **Step 6: Verify** — `dotnet test` 87/87 · `parity --against baseline/task19` 15/15 ·
      `collection` 21/21 (phép thử đổi con trỏ chạy vòng qua cả bốn giá) · `admin-shots` 33/33 ·
      `editor-shot` 13/13 · `labels` 32/32 · `guide-video` 8/8 · `trees` đạt.
- [x] **Step 7: Commit.**

### Ba thứ lộ ra khi làm, không nằm trong kế hoạch

1. **`_app/highlights.js` gọi `highlights.json` và báo lỗi ngay trong khối "New".** Bốn khối
   trang chủ vẫn do JavaScript vẽ khi phục vụ tĩnh (`site/` trên GitHub Pages), nên đổi tên tệp
   ở phía máy chủ là chưa đủ. Nặng hơn: script ấy **đã hỏng từ Task 18** cho bản tĩnh — nó vẽ
   thẻ từ `it.image`/`it.title`/`it.href`, những trường mà cái giá không còn mang. Giờ cả ba
   script (`app.js` thêm `AB.shelf`, `highlights.js`, `home-blocks.js`) đọc giá và rơi về đúng
   quy tắc cũ, giống hệt phía máy chủ.
2. **`parity.js` nói "khong chay duoc python" khi hai ảnh khác chiều cao.** Đó là một câu trả
   lời thật bị dán nhãn thành phép đo hỏng — đúng loại lỗi cả dự án này đang đi sửa. Giờ nó nói
   `CAO KHÁC: -159px so voi moc`, và chính con số ấy chỉ thẳng ra khối "New".
3. **Màn hình Content ghi "Ten kinds of thing" trong khi bên dưới có mười ba ô.** Con số viết
   cứng nói dối, ngay trên màn hình của chính mình. Giờ lấy từ model.
4. **Câu hỏi trước khi xoá một cái thẻ hỏi nhầm chuyện.** `Mentions(id)` đi tìm mọi tệp có nhắc
   tới id ấy — mà với một cái thẻ thì mọi kết quả đều là chính cái kho nó trỏ tới, thứ mà việc
   xoá thẻ không đụng đến. Nó in ra *"Other content points at it: products.json (3), site.json
   (1)"* trước một thao tác chỉ đổi một dòng của một tệp: đúng, và doạ người dùng về đúng cái
   sai. Giờ với thẻ nó nói thẳng: xoá thẻ thôi, mục trong kho vẫn còn nguyên.
5. **Đường "giá rỗng → Add → Set" được hứa ngay trên màn hình mà chưa ai đi thử.** `Add` chép
   hình dạng của mục đầu danh sách; danh sách rỗng thì không có gì để chép, và nhánh ấy chưa ai
   bước vào. Một mục không có `id` sẽ làm bước ngay sau đó thất bại. Đã thêm phép thử đi trọn
   đường: `Structure(Add)` → `Apply(.id)` → khối vẽ ra đúng một thẻ.

### Một lỗ hổng cũ, ghi ra để không quên

Các script `_app/*.js` **không lọc `visible`** ở bất cứ đâu ngoài bốn khối vừa sửa. Nghĩa là trên
bản tĩnh `site/` (GitHub Pages), một mục đã ẩn vẫn hiện ở các danh sách do JavaScript vẽ —
`/products/`, `/colors/`, `/news/`, `/documents/`, `/projects/`. Máy chủ thì lọc đúng (`Arr`).
Hiện chưa có mục nào bị ẩn nên chưa ai thấy. Có trước Task 21, không thuộc phạm vi Task 21, và
cách sửa là đưa `AB.keep()` — vừa thêm vào `app.js` — vào từng danh sách ấy.

### Còn lại, cố ý không đụng

Tiêu đề khối vẫn là chữ viết cứng: **"Six product families"** (`site.home.products.heading`).
Giá chọn năm dòng thì nó nói sai. Không đổi vì đó là đổi **nội dung**, không phải cơ chế — và
khách sửa được nó ngay trong trình soạn, một cú bấm. Ghi ra đây để không ai tưởng là đã quên.
