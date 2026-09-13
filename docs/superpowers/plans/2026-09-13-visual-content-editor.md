# Visual Content Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi nội dung của site trở thành tham số sửa được qua giao diện hai cột có xem trước
trực tiếp, và máy chủ dựng nội dung thành HTML đầy chữ để bot tìm kiếm và máy trả lời đọc được.

**Architecture:** File JSON dưới `wwwroot/_data/` là nguồn duy nhất. `PageComposer` phía máy chủ
đọc khuôn HTML, điền tham số theo địa chỉ `data-ab-t`, giữ bản đã ghép trong bộ nhớ đệm và xoá
đệm khi JSON đổi. JavaScript phía trình duyệt không dựng DOM nữa, chỉ gắn hành vi. Khu quản trị
là một `<iframe>` mở chính trang thật, nhận bản nháp qua `postMessage`.

**Tech Stack:** ASP.NET Core 8 · SQLite (chỉ lịch sử) · `System.Text.Json.Nodes` · AngleSharp
(phân tích khuôn HTML) · JS thuần phía trình duyệt · Playwright + Node cho bộ đo.

**Spec:** `docs/superpowers/specs/2026-09-12-visual-content-editor-design.md`

## Global Constraints

- **Nguyên mẫu PDF là nguồn chốt cho tên gọi và cấu trúc.** Menu là `About us · Products ·
  Colors · Documents · Projects · News · Contact`. Câu hero là `Vietnam's Leading Aluminum
  Exporter` kèm `PROFILE / FACADE / FURNITURE / DOOR'S ACCESSORY / CAR'S ACCESSORY / HONEYCOMB`.
  Không tự đặt tên khác.
- **Giao diện phần mềm bằng tiếng Anh.** Nhãn nút, tiêu đề màn hình, thông báo — tất cả tiếng
  Anh, khớp với khu quản trị hiện có (`Shown` / `Hidden` / `Save changes` / `History`).
  Chú thích trong mã bằng tiếng Anh. Thông điệp commit bằng tiếng Việt.
- **Không bao giờ để lệch giữa `site/` và `wwwroot/`.** Sau mỗi đợt, `tools/publish-static.js`
  sinh lại `site/` từ đầu ra của bộ ghép; kiểm bằng `cmp`.
- **Mọi đường dẫn cũ phải sống.** Không được để bất kỳ URL nào từng công bố trả 404.
- **Không tự sửa toạ độ.** `lat`, `lon`, waypoint tuyến, tỉ lệ % của tuyến là trường khoá.
- **Placeholder ảnh ghi rõ tỉ lệ** và không bao giờ lặp lại chữ đã hiện trên thẻ.
- **Mỗi đợt kết thúc bằng phép đo, không phải bằng câu "xong".** Lệnh đo nằm ở mục Verify của
  từng đợt; dán số thật vào thông điệp commit.

## Ràng buộc đo lường (mốc nền)

Chụp một lần ở Task 2 rồi so lại sau mỗi đợt:

| chỉ số | mốc phải giữ |
|---|---|
| Pixel 15 trang, 1440 và 390 | Không trang nào lệch quá nhiễu khử răng cưa (0 pixel > 32/255) |
| Liên kết chết | 0 / 127 |
| Request hỏng | 0 |
| Lỗi script | 0 |
| Tràn ngang | `scrollWidth == innerWidth` ở 1440, 834, 390 |
| Cuộn trang chủ | p50 không xấu hơn mốc nền đo **cùng phiên** quá 15% |
| Chữ trong HTML thô | chỉ được **tăng** (đợt 2 đưa từ 672 lên ≳ 2.000 trên trang bài) |

---

## File Structure

### Tạo mới — bộ đo dùng lại được

| file | trách nhiệm |
|---|---|
| `tools/README.md` | Cách chạy từng công cụ, và công cụ nào bắt được lỗi gì |
| `tools/package.json` | Khai báo `playwright-core`; không phụ thuộc gì khác |
| `tools/lib/browser.js` | Mở Chrome thật; dò đường dẫn Chrome/Edge trên Windows |
| `tools/lib/pages.js` | Danh sách 15 trang, dùng chung cho mọi công cụ |
| `tools/lib/report.js` | In bảng thẳng cột; **không dùng `%-10s` của printf — Node không hỗ trợ** |
| `tools/crawl.js` | Tải mọi trang, bắt request hỏng, liên kết chết, lỗi script |
| `tools/parity.js` | Chụp hai nguồn rồi trừ pixel |
| `tools/textmass.js` | Đếm chữ trong HTML thô so với sau khi JS chạy |
| `tools/scroll.js` | Thời gian khung hình theo vị trí cuộn, quy về từng vùng |
| `tools/idle.js` | Chi phí khi trang đứng yên tại từng vùng |
| `tools/overlap.js` | Dò chữ đè lên chữ |
| `tools/publish-static.js` | Ghi đầu ra bộ ghép ra `site/` để GitHub Pages còn chạy |

### Tạo mới — phía máy chủ

| file | trách nhiệm |
|---|---|
| `Content/ContentStore.cs` | Đọc/ghi JSON, ghi nguyên tử, phát sự kiện đổi |
| `Content/ContentPath.cs` | Phân giải `site.nav.1.label` trên cây JSON |
| `Content/PageComposer.cs` | Khuôn + tham số → HTML; bộ nhớ đệm |
| `Content/PageCompositionMiddleware.cs` | Chặn yêu cầu trang, trả bản đã ghép |
| `Content/SectionRenderer.cs` | Dựng các khối danh sách phía máy chủ (đợt 2) |
| `Content/SlugRouter.cs` | `/news/<slug>/` → tài liệu; bảng 301 (đợt 3) |
| `Content/StructuredData.cs` | JSON-LD (đợt 6) |
| `Content/SiteFiles.cs` | `sitemap.xml`, `robots.txt`, `llms.txt` (đợt 6) |

### Sửa

| file | đổi gì |
|---|---|
| `Program.cs` | Đăng ký `ContentStore`, `PageComposer`, middleware; bỏ `ContentFileMiddleware` |
| `Helpers/ContentFileMiddleware.cs` | **Xoá** — CSDL không còn phục vụ nội dung |
| `Data/AppDbContext.cs` | Bỏ `ContentDocuments`; giữ `ContentRevisions`, `AdminUser`; thêm `Redirects` |
| `wwwroot/index.html` + 14 trang | Thành khuôn: chữ thay bằng `data-ab-t` |
| `wwwroot/_app/*.js` | Bỏ phần dựng DOM, giữ phần gắn hành vi |

---

## Task 1: Bộ đo dùng lại được

Mọi đợt sau đều verify bằng bộ này, nên nó phải có trước. Các script hiện nằm rải rác trong thư
mục tạm của phiên làm việc và sẽ mất khi phiên kết thúc.

**Files:**
- Create: `tools/package.json`, `tools/README.md`
- Create: `tools/lib/browser.js`, `tools/lib/pages.js`, `tools/lib/report.js`
- Create: `tools/crawl.js`, `tools/parity.js`, `tools/textmass.js`, `tools/scroll.js`,
  `tools/idle.js`, `tools/overlap.js`

**Interfaces:**
- Produces: `launch()` → Chrome thật; `PAGES` → mảng 15 đường dẫn;
  `table(rows, cols)` → in bảng thẳng cột.
- Mọi công cụ nhận gốc site làm tham số đầu tiên, mặc định `http://127.0.0.1:5117`.
- Mọi công cụ thoát với mã 1 khi phép đo không đạt, để dùng được trong CI.

- [ ] **Step 1: Dựng `tools/lib/browser.js`**

Dò Chrome bằng dấu gạch chéo xuôi — trong chuỗi nháy đơn của JS, `'\P'` co lại thành `'P'` và
biến đường dẫn thành vô nghĩa.

- [ ] **Step 2: Dựng `tools/lib/pages.js` và `tools/lib/report.js`**

`report.js` phải tự đệm chuỗi bằng `padEnd`. `console.log('%-10s', x)` **không có tác dụng trong
Node** — đã mắc lỗi này nhiều lần trong phiên trước.

- [ ] **Step 3: Chuyển 6 công cụ đo từ thư mục tạm sang `tools/`**

Mỗi công cụ: `bringToFront()` trước khi đo, và khẳng định `document.visibilityState === 'visible'`.
`requestAnimationFrame` bị điều tiết về 1Hz khi trang không hiển thị — lỗi này từng cho ra con số
"1007ms mỗi khung" trên một trang hoàn toàn bình thường.

- [ ] **Step 4: Viết `tools/README.md`**

Mỗi công cụ một đoạn: chạy thế nào, đọc kết quả ra sao, và **nó đã bắt được lỗi thật nào**.

- [ ] **Step 5: Chạy cả 6 công cụ, khẳng định chúng chạy được**

```
cd tools && npm install
node crawl.js http://127.0.0.1:5117
node textmass.js http://127.0.0.1:5117
```

- [ ] **Step 6: Commit**

---

## Task 2: Chụp mốc nền

Không có mốc thì không chứng minh được "không đổi gì".

**Files:**
- Create: `tools/baseline/` (gitignore ảnh, commit file JSON số liệu)

- [ ] **Step 1: Chạy `parity.js` lưu ảnh 15 trang ở 1440 và 390 vào `tools/baseline/`**
- [ ] **Step 2: Chạy `crawl.js`, `textmass.js`, `scroll.js`, `idle.js`, ghi kết quả ra `tools/baseline/metrics.json`**
- [ ] **Step 3: Thêm `tools/baseline/*.png` vào `.gitignore`; commit `metrics.json`**

---

## Task 3: `ContentStore` — đọc và ghi JSON

**Files:**
- Create: `Content/ContentStore.cs`
- Modify: `Program.cs` (đăng ký dịch vụ)

**Interfaces:**
- Produces:
  - `JsonNode? Get(string name)` — cây đã phân tích, null nếu không có
  - `string? RawJson(string name)`
  - `void Save(string name, string json, string by)` — kiểm tra JSON, ghi nguyên tử, ghi lịch sử
  - `IReadOnlyList<string> Names`
  - `event Action<string>? Changed`

- [ ] **Step 1: Viết test cho ghi nguyên tử** — ghi hỏng giữa chừng không được để lại file cụt
- [ ] **Step 2: Chạy test, khẳng định fail**
- [ ] **Step 3: Cài đặt: đọc từ `wwwroot/_data/*.json`, ghi qua file tạm rồi `File.Move(overwrite: true)`**
- [ ] **Step 4: Từ chối JSON không hợp lệ trước khi ghi** — trả lỗi rõ, không ghi gì
- [ ] **Step 5: Chạy test, khẳng định pass**
- [ ] **Step 6: Commit**

---

## Task 4: `ContentPath` — phân giải địa chỉ tham số

`site.nav.1.label` phải trỏ đúng một chỗ trên cây JSON.

**Files:**
- Create: `Content/ContentPath.cs`

**Interfaces:**
- Produces: `static string? Resolve(JsonNode root, string path)` và
  `static bool TrySet(JsonNode root, string path, string value)`
- Quy ước: đoạn toàn chữ số là chỉ số mảng; các đoạn khác là khoá đối tượng.

- [ ] **Step 1: Test — `site.nav.1.label`, `home.products.heading`, đường dẫn không tồn tại trả null**
- [ ] **Step 2: Chạy test, khẳng định fail**
- [ ] **Step 3: Cài đặt**
- [ ] **Step 4: Chạy test, khẳng định pass**
- [ ] **Step 5: Commit**

---

## Task 5: Bóc header và footer ra `site.json`

Đã đo: sau khi chuẩn hoá độ sâu và mục nav đang mở, **header và footer của cả 15 trang là một**.
Nên đây là một partial dùng chung, không phải 15 bản.

**Files:**
- Create: `wwwroot/_data/site.json`
- Create: `tools/extract-chrome.js` (chạy một lần, giữ lại để tái lập)
- Modify: 15 file `index.html`

- [ ] **Step 1: Viết `tools/extract-chrome.js`** — đọc header/footer của `news/index.html`, sinh
  `site.json` gồm `wordmark`, `nav[7]`, `footer.columns[]`, `address`, `phone`, `email`, `copyright`
- [ ] **Step 2: Chạy, kiểm `site.json` bằng mắt**
- [ ] **Step 3: Thay chữ trong 15 trang bằng `data-ab-t`**, giữ nguyên chữ cũ làm giá trị dự phòng
- [ ] **Step 4: Kiểm mọi `data-ab-t` đều phân giải được** — `tools/check-addresses.js`
- [ ] **Step 5: Commit** (trang chưa đổi hình thức vì chữ dự phòng vẫn còn)

---

## Task 6: `PageComposer` và middleware

**Files:**
- Create: `Content/PageComposer.cs`, `Content/PageCompositionMiddleware.cs`
- Modify: `Program.cs`
- Delete: `Helpers/ContentFileMiddleware.cs`

**Interfaces:**
- Consumes: `ContentStore`, `ContentPath`
- Produces: `string? Compose(string urlPath)`; `void Invalidate(string? name = null)`

- [ ] **Step 1: Test — ghép `news/index.html` ra HTML chứa chữ thật, không còn phần tử rỗng**
- [ ] **Step 2: Chạy test, khẳng định fail**
- [ ] **Step 3: Cài đặt bằng AngleSharp**; tiền tố `{{ROOT}}` suy từ độ sâu đường dẫn; mục nav
  đang mở suy từ đoạn đầu đường dẫn
- [ ] **Step 4: Bộ nhớ đệm** — khoá theo đường dẫn, xoá khi `ContentStore.Changed`
- [ ] **Step 5: Middleware đặt TRÊN `UseStaticFiles`**, chỉ nhận yêu cầu trang (thư mục hoặc `.html`)
- [ ] **Step 6: Đối chiếu sau khi ghép** — mọi `data-ab-t` khớp JSON, lệch thì trả bản trước và ghi log
- [ ] **Step 7: Chạy test, khẳng định pass**
- [ ] **Step 8: Verify** — `parity.js` so với mốc nền phải **0 pixel lệch quá 32**; `crawl.js` sạch
- [ ] **Step 9: Commit kèm số đo**

---

## Task 7: Bóc tiêu đề khối trang chủ và hai bộ dữ liệu canvas

**Files:**
- Modify: `wwwroot/_data/site.json` (thêm nhánh `home`)
- Create: `wwwroot/_data/globe.json`, `wwwroot/_data/factories.json`
- Modify: `wwwroot/index.html`
- Create: `tools/extract-canvas.js`

- [ ] **Step 1: Bóc `const ROUTES` và `const SITES` ra JSON bằng `tools/extract-canvas.js`**
- [ ] **Step 2: Script nội tuyến đọc từ `AB.load('globe')` / `AB.load('factories')`** thay cho hằng
- [ ] **Step 3: Bóc 8 tiêu đề khối vào `site.json` nhánh `home`**, gắn `data-ab-t`
- [ ] **Step 4: Bỏ số đếm viết cứng** — "Six product families", "four markets", "Five factories",
  số `5` trong thẻ tally → suy ra từ độ dài mảng
- [ ] **Step 5: Verify** — pixel giống mốc nền; quả địa cầu vẫn quay; `idle.js` không xấu hơn
- [ ] **Step 6: Commit**

---

## Task 8: Sinh `site/` từ đầu ra bộ ghép

Giữ GitHub Pages sống trong lúc chuyển đổi, và cho một bản sao tĩnh để sao lưu.

**Files:**
- Create: `tools/publish-static.js`

- [ ] **Step 1: Viết công cụ** — gọi 15 đường dẫn trên máy chủ đang chạy, ghi HTML ra `site/`
- [ ] **Step 2: Chạy, `cmp` từng file `site/` với HTML máy chủ trả về**
- [ ] **Step 3: Verify** — `parity.js` giữa `site/` phục vụ tĩnh và máy chủ: phải giống hệt
- [ ] **Step 4: Commit**

---

## Task 9: Dựng danh sách phía máy chủ (đợt 2 — phần lớn nhất)

Đây là phần khiến bot đọc được nội dung. Làm từng loại một, verify sau mỗi loại.

**Files:**
- Create: `Content/SectionRenderer.cs`
- Modify: `wwwroot/_app/*.js` (bỏ phần dựng, giữ phần gắn hành vi)
- Modify: 14 trang (bỏ script nội tuyến dựng DOM)

**Interfaces:**
- Produces: `string RenderSection(string sectionKey, JsonNode data, string rootPrefix)`

Thứ tự làm, mỗi loại là một vòng test–cài đặt–verify–commit:

**Danh sách trước, chi tiết sau.** Bảy trang danh sách dùng chung một khuôn — một `data-ab-section`
trên khung rỗng — nên làm liền mạch được. Còn mọi trang chi tiết đều cần bộ ghép biết `?id=`, tức
là một việc chung làm một lần (9i) rồi áp cho cả bảy loại. Tách ra để không phải viết đi viết lại
cùng một thứ dưới bảy cái tên.

- [x] **9a: products** — danh sách xong (685 → 3.185 ký tự, bot đọc 101%)
- [x] **9b: colors** — danh sách + ba hàng lọc + dòng đếm xong (685 → 2.208, bot đọc 101%)
- [x] **9c: news** — danh sách xong (677 → 2.511, bot đọc 100%)
- [x] **9d: projects** — danh sách xong (685 → 1.850, bot đọc 101%)
- [ ] **9e: documents** — trang tệ nhất site: 691 ký tự thô trên 5.890 sau khi JS chạy, bot đọc 12%
- [ ] **9f: about, contact**
- [ ] **9g: khối trang chủ** — products, colors, projects, highlights, applications, gallery, feature
- [ ] **9h: danh sách chữ cạnh hai canvas** — 4 tuyến, 5 nhà máy. Hình vẽ ở lại phía trình duyệt.
- [ ] **9i: mọi trang chi tiết** — `PageComposer` nhận `?id=`, rồi bảy loại dùng chung

Sau mỗi mục: `textmass.js` phải cho thấy chữ trong HTML thô **tăng**, `parity.js` phải cho thấy
hình thức **không đổi**, `nojs.js` phải cho thấy trang **đọc được khi tắt JavaScript** (mở ảnh ra
nhìn, không chỉ đọc con số), `crawl.js` sạch.

**Mốc "trước" là bản đang chạy trên GitHub Pages**, vốn còn dựng mọi danh sách bằng JS — chính xác
hơn một mốc chụp theo thời gian, vì nó là đúng bản trước đợt sửa này. Đã chụp lại vào
`tools/baseline/pages-js/` (1440 và 390) trước khi `site/` được sinh lại, vì lúc đẩy bản mới lên
là mốc đó biến mất.

- [ ] **Step cuối: Verify toàn bộ** — trang bài tin từ 672 lên ≳ 2.000 ký tự HTML thô
- [ ] **Commit kèm bảng số trước/sau**

---

## Task 10: Đường dẫn mới và chuyển hướng 301

**Files:**
- Create: `Content/SlugRouter.cs`
- Modify: `Data/AppDbContext.cs` (bảng `Redirects`)
- Modify: 14 trang (link nội bộ)

- [ ] **Step 1: Test — `/news/press-line-2500/` trả đúng bài; `/news/detail/?id=press-line-2500` trả 301**
- [ ] **Step 2: Chạy test, khẳng định fail**
- [ ] **Step 3: Thêm `slug` cho mọi mục có trang riêng**, sinh từ `id` hiện có để không đổi URL
- [ ] **Step 4: Cài đặt định tuyến và bảng 301**
- [ ] **Step 5: Cập nhật mọi link nội bộ sang dạng mới**
- [ ] **Step 6: Verify** — `crawl.js` 0 liên kết chết; mọi URL dạng cũ trả 301, không 404
- [ ] **Step 7: Commit**

---

## Task 11: Khung soạn hai cột

**Files:**
- Create: `Areas/Admin/Views/Edit/Index.cshtml`, `wwwroot/admin/editor.js`, `wwwroot/admin/editor.css`
- Create: `wwwroot/_app/edit-bridge.js` (chỉ nạp khi `?edit=1`)

**Interfaces:**
- Cầu nối nhận `{type:'ab:text', path, value}` → vá `[data-ab-t="path"]`
- Cầu nối gửi `{type:'ab:pick', path}` khi bấm vào phần tử

- [ ] **Step 1: Khung hai cột, iframe mở `/?edit=1`**
- [ ] **Step 2: Cầu nối vá chữ tại chỗ qua `postMessage`**
- [ ] **Step 3: Chiều ngược lại — bấm phần tử nhảy tới ô nhập**
- [ ] **Step 4: Thanh chọn bề ngang 1440 / 834 / 390**
- [ ] **Step 5: Verify trực quan** — chụp ảnh cả ba bề ngang và **xem bằng mắt**, không chỉ đọc DOM
- [ ] **Step 6: Commit**

---

## Task 12: Màn hình danh sách và màn hình đăng

**Files:**
- Create: `Areas/Admin/Controllers/CollectionController.cs`
- Create: `Areas/Admin/Views/Collection/{Index,Edit}.cshtml`
- Modify: `Helpers/JsonForm.cs` → sinh ô nhập trực quan

Mười loại, nhãn tiếng Anh: Products · Colors · News · Projects · Documents · Gallery ·
Highlights · Applications · Export routes · Factories.

- [ ] **Step 1: Màn hình danh sách** — ảnh thu nhỏ, tìm, lọc, kéo đổi thứ tự, `Shown`/`Hidden`
- [ ] **Step 2: Màn hình đăng** — ô nhập theo loại; ảnh là thẻ ảnh có nút `Choose image` kèm tỉ lệ
- [ ] **Step 3: Sinh slug từ tiêu đề; khoá sau lần lưu đầu**
- [ ] **Step 4: Dò tham chiếu trước khi xoá** — báo "3 chỗ đang trỏ tới mục này"
- [ ] **Step 5: Xem trước đi theo mục đang sửa**
- [ ] **Step 6: Verify** — đăng thật một mục mỗi loại, khẳng định trang thật đổi theo
- [ ] **Step 7: Commit**

---

## Task 13: SEO và máy trả lời

**Files:**
- Create: `Content/StructuredData.cs`, `Content/SiteFiles.cs`
- Modify: `Areas/Admin/Views/Collection/Edit.cshtml` (ô SEO)

- [ ] **Step 1: Ô SEO từng mục** — title, description, ảnh chia sẻ, canonical, chặn lập chỉ mục
- [ ] **Step 2: Danh sách kiểm** — câu trả lời trong 2 câu đầu; số liệu kèm đơn vị; tiêu đề nêu
  thực thể; ảnh có alt; mô tả 120–160 ký tự
- [ ] **Step 3: JSON-LD** — Organization, 5 LocalBusiness, Product, NewsArticle, BreadcrumbList
- [ ] **Step 4: `sitemap.xml`, `robots.txt` (công tắc từng bot), `llms.txt`**
- [ ] **Step 5: Verify** — kiểm JSON-LD bằng bộ kiểm schema.org; `sitemap.xml` liệt kê đủ trang
- [ ] **Step 6: Commit**

---

## Task 14: Lịch sử, khôi phục, bàn giao

**Files:**
- Modify: `Areas/Admin/Controllers/ContentController.cs`
- Create: `docs/HANDOVER.md`

- [ ] **Step 1: Mỗi lần lưu ghi một bản lịch sử; màn hình xem và khôi phục**
- [ ] **Step 2: Gỡ câu "Demonstration site — photography and documents are specimens." khỏi footer**
- [ ] **Step 3: Sửa "raw stone" trong dòng dẫn bản đồ nhà máy** — site này là nhôm
- [ ] **Step 4: Viết `docs/HANDOVER.md`** — đăng nhập, sao lưu, khôi phục, nơi để ảnh
- [ ] **Step 5: Verify toàn bộ** — chạy cả 6 công cụ, dán bảng số vào commit
- [ ] **Step 6: Commit**

---

## Self-Review

**Spec coverage:** Mục 4 (kiến trúc) → Task 6, 9. Mục 5 (mô hình dữ liệu) → Task 5, 7. Mục 6
(lưu trữ) → Task 3. Mục 7 (giao diện) → Task 11, 12. Mục 8 (đường dẫn) → Task 10. Mục 9 (SEO) →
Task 13. Mục 10 (chỗ hỏng) → rải trong Task 6 step 6, Task 12 step 4, Task 7 step 4. Mục 11
(kiểm chứng) → Task 1, 2 và mục Verify của từng task. Mục 12 (thứ tự) → thứ tự task.

**Việc còn treo trong spec không thuộc kế hoạch này:** deploy lên máy chủ công khai (chủ dự án
tự làm), thu nhỏ ảnh phía máy chủ, đa ngôn ngữ, sửa toạ độ canvas.

**Rủi ro lớn nhất:** Task 9 là phần chiếm phần lớn công sức và là chỗ dễ làm đổi hình thức nhất.
Nó được chia thành 8 mục nhỏ, mỗi mục verify bằng `parity.js` trước khi sang mục tiếp theo.
