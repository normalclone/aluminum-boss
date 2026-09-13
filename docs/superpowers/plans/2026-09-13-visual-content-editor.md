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
- **Không bao giờ để lệch giữa `site/` và `wwwroot/`.** Kiểm bằng `python tools/trees.py` — file
  dữ liệu và script phải giống từng byte, HTML phải giống sau khi giải mã thực thể. Ràng buộc này
  có vì đã vi phạm một lần và lên thẳng bản đang chạy: thêm `familySpecs` vào
  `wwwroot/_data/colors.json` mà quên chép sang `site/`, nên trang chi tiết màu trên Pages hiện
  "—" ở ba dòng thông số, và không phép đo nào bắt được vì tất cả đều chỉ chạm vào máy chủ.

  **`site/` giữ vai trò khuôn, không phải đầu ra đã ghép.** Ghi bản đã ghép ra
  `site/news/detail/index.html` là đóng cứng một bài vào đó: guard "chỉ dựng khi khung còn rỗng"
  sẽ thấy khung có sẵn và không dựng lại, nên mọi mục trên Pages đều ra cùng một bài. Task 10 cho
  mỗi mục một đường dẫn riêng, và bản tĩnh theo kịp bằng `python tools/fanout.py` — trải **khuôn**
  ra 94 thư mục, mỗi thư mục một bản sao từng byte; `AB.itemId()` đọc đoạn cuối đường dẫn nên
  cùng một file dựng ra 94 trang khác nhau. `publish-static.js` vẫn hoãn, tới Task 14, khi cần một
  bản xuất tĩnh đầy đủ để bàn giao và `site/` thôi làm nguồn song song.
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

## Task 1: Bộ đo dùng lại được — XONG

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

- [x] **Step 1: Dựng `tools/lib/browser.js`**

Dò Chrome bằng dấu gạch chéo xuôi — trong chuỗi nháy đơn của JS, `'\P'` co lại thành `'P'` và
biến đường dẫn thành vô nghĩa.

- [x] **Step 2: Dựng `tools/lib/pages.js` và `tools/lib/report.js`**

`report.js` phải tự đệm chuỗi bằng `padEnd`. `console.log('%-10s', x)` **không có tác dụng trong
Node** — đã mắc lỗi này nhiều lần trong phiên trước.

- [x] **Step 3: Chuyển 6 công cụ đo từ thư mục tạm sang `tools/`**

Mỗi công cụ: `bringToFront()` trước khi đo, và khẳng định `document.visibilityState === 'visible'`.
`requestAnimationFrame` bị điều tiết về 1Hz khi trang không hiển thị — lỗi này từng cho ra con số
"1007ms mỗi khung" trên một trang hoàn toàn bình thường.

- [x] **Step 4: Viết `tools/README.md`**

Mỗi công cụ một đoạn: chạy thế nào, đọc kết quả ra sao, và **nó đã bắt được lỗi thật nào**.

- [x] **Step 5: Chạy cả 6 công cụ, khẳng định chúng chạy được**

```
cd tools && npm install
node crawl.js http://127.0.0.1:5117
node textmass.js http://127.0.0.1:5117
```

- [x] **Step 6: Commit**

---

## Task 2: Chụp mốc nền — XONG

Không có mốc thì không chứng minh được "không đổi gì".

**Files:**
- Create: `tools/baseline/` (gitignore ảnh, commit file JSON số liệu)

- [x] **Step 1: Chạy `parity.js` lưu ảnh 15 trang ở 1440 và 390 vào `tools/baseline/`**
- [x] **Step 2: Chạy `crawl.js`, `textmass.js`, `scroll.js`, `idle.js`, ghi kết quả ra `tools/baseline/metrics.json`**
- [x] **Step 3: Thêm `tools/baseline/*.png` vào `.gitignore`; commit `metrics.json`**

---

## Task 3: `ContentStore` — đọc và ghi JSON — XONG

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

- [x] **Step 1: Viết test cho ghi nguyên tử** — ghi hỏng giữa chừng không được để lại file cụt
- [x] **Step 2: Chạy test, khẳng định fail**
- [x] **Step 3: Cài đặt: đọc từ `wwwroot/_data/*.json`, ghi qua file tạm rồi `File.Move(overwrite: true)`**
- [x] **Step 4: Từ chối JSON không hợp lệ trước khi ghi** — trả lỗi rõ, không ghi gì
- [x] **Step 5: Chạy test, khẳng định pass**
- [x] **Step 6: Commit**

---

## Task 4: `ContentPath` — phân giải địa chỉ tham số — XONG

`site.nav.1.label` phải trỏ đúng một chỗ trên cây JSON.

**Files:**
- Create: `Content/ContentPath.cs`

**Interfaces:**
- Produces: `static string? Resolve(JsonNode root, string path)` và
  `static bool TrySet(JsonNode root, string path, string value)`
- Quy ước: đoạn toàn chữ số là chỉ số mảng; các đoạn khác là khoá đối tượng.

- [x] **Step 1: Test — `site.nav.1.label`, `home.products.heading`, đường dẫn không tồn tại trả null**
- [x] **Step 2: Chạy test, khẳng định fail**
- [x] **Step 3: Cài đặt**
- [x] **Step 4: Chạy test, khẳng định pass**
- [x] **Step 5: Commit**

---

## Task 5: Bóc header và footer ra `site.json` — XONG

Đã đo: sau khi chuẩn hoá độ sâu và mục nav đang mở, **header và footer của cả 15 trang là một**.
Nên đây là một partial dùng chung, không phải 15 bản.

**Files:**
- Create: `wwwroot/_data/site.json`
- Create: `tools/extract-chrome.js` (chạy một lần, giữ lại để tái lập)
- Modify: 15 file `index.html`

- [x] **Step 1: Viết `tools/extract-chrome.js`** — đọc header/footer của `news/index.html`, sinh
  `site.json` gồm `wordmark`, `nav[7]`, `footer.columns[]`, `address`, `phone`, `email`, `copyright`
- [x] **Step 2: Chạy, kiểm `site.json` bằng mắt**
- [x] **Step 3: Thay chữ trong 15 trang bằng `data-ab-t`**, giữ nguyên chữ cũ làm giá trị dự phòng
- [x] **Step 4: Kiểm mọi `data-ab-t` đều phân giải được** — `tools/check-addresses.js`
- [x] **Step 5: Commit** (trang chưa đổi hình thức vì chữ dự phòng vẫn còn)

---

## Task 6: `PageComposer` và middleware — XONG

**Files:**
- Create: `Content/PageComposer.cs`, `Content/PageCompositionMiddleware.cs`
- Modify: `Program.cs`
- Delete: `Helpers/ContentFileMiddleware.cs`

**Interfaces:**
- Consumes: `ContentStore`, `ContentPath`
- Produces: `string? Compose(string urlPath)`; `void Invalidate(string? name = null)`

- [x] **Step 1: Test — ghép `news/index.html` ra HTML chứa chữ thật, không còn phần tử rỗng**
- [x] **Step 2: Chạy test, khẳng định fail**
- [x] **Step 3: Cài đặt bằng AngleSharp**; tiền tố `{{ROOT}}` suy từ độ sâu đường dẫn; mục nav
  đang mở suy từ đoạn đầu đường dẫn
- [x] **Step 4: Bộ nhớ đệm** — khoá theo đường dẫn, xoá khi `ContentStore.Changed`
- [x] **Step 5: Middleware đặt TRÊN `UseStaticFiles`**, chỉ nhận yêu cầu trang (thư mục hoặc `.html`)
- [x] **Step 6: Đối chiếu sau khi ghép** — mọi `data-ab-t` khớp JSON, lệch thì trả bản trước và ghi log
- [x] **Step 7: Chạy test, khẳng định pass**
- [x] **Step 8: Verify** — `parity.js` so với mốc nền phải **0 pixel lệch quá 32**; `crawl.js` sạch
- [x] **Step 9: Commit kèm số đo**

---

## Task 7: Bóc tiêu đề khối trang chủ và hai bộ dữ liệu canvas — XONG

**Files:**
- Modify: `wwwroot/_data/site.json` (thêm nhánh `home`)
- Create: `wwwroot/_data/globe.json`, `wwwroot/_data/factories.json`
- Modify: `wwwroot/index.html`
- Create: `tools/extract-canvas.js`

- [x] **Step 1: Bóc `const ROUTES` và `const SITES` ra JSON bằng `tools/extract-canvas.js`**
- [x] **Step 2: Script nội tuyến đọc từ `AB.load('globe')` / `AB.load('factories')`** thay cho hằng
- [x] **Step 3: Bóc 8 tiêu đề khối vào `site.json` nhánh `home`**, gắn `data-ab-t`
- [x] **Step 4: Bỏ số đếm viết cứng** — "Six product families", "four markets", "Five factories",
  số `5` trong thẻ tally → suy ra từ độ dài mảng
- [x] **Step 5: Verify** — pixel giống mốc nền; quả địa cầu vẫn quay; `idle.js` không xấu hơn
- [x] **Step 6: Commit**

---

## Task 8: Sinh một bản tĩnh từ đầu ra bộ ghép — XONG (ghi ra `export/`, không ghi vào `site/`)

Giữ GitHub Pages sống trong lúc chuyển đổi, và cho một bản sao tĩnh để sao lưu.

**Files:**
- Create: `tools/publish-static.js`

**Đích đến đổi chỗ, và đó là chỗ duy nhất kế hoạch nói sai.** Kế hoạch viết "ghi ra `site/`",
đúng vào lúc viết: khi ấy `site/` là bản in ra của máy chủ. Từ Task 9 thì ngược lại — `site/` là
**khuôn song song**, chính những tệp mang `data-ab-section` mà bộ ghép đọc vào, và ghi HTML đã
ghép lên đó là phá luôn nguồn. Công cụ ghi ra `export/`; `trees.py` vẫn là thứ giữ `wwwroot/` và
`site/` khớp nhau.

- [x] **Step 1: Viết công cụ** — lấy danh sách trang từ chính `/sitemap.xml` của máy chủ, không
      viết lại một danh sách thứ hai để hai bên lệch nhau mà không ai thấy
- [x] **Step 2: Chạy, `cmp` từng file với HTML máy chủ trả về** — 105 trang (102 URL + ba tệp
      máy chủ tự sinh) và 369 tệp tài nguyên chép sang; mỗi trang đọc lại và đối chiếu
- [x] **Step 3: Verify** — `parity.js` giữa bản tĩnh phục vụ ở cổng 5210 và máy chủ: **15/15
      giống hệt ở 1440, 15/15 ở 390**
- [x] **Step 4: Commit**

Công cụ mang luôn một máy chủ tĩnh nhỏ (`--serve`) vì nếu không thì không chứng minh được gì:
một thư mục không so ảnh với một máy chủ được. `export/` không vào git — 369 tệp sinh lại được
trong một phút, và không cái nào là nguồn.

---

## Task 9: Dựng danh sách phía máy chủ (đợt 2 — phần lớn nhất) — XONG

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
- [x] **9e: documents** — xong (691 → 5.917, bot đọc 100%; trước đó là trang tệ nhất site, 12%)
- [x] **9f: about, contact** — xong (682 → 1.984 và 689 → 1.724, cả hai bot đọc 101%)
- [x] **9g: khối trang chủ** — xong (1.864 → 5.272, bot đọc 92%). Dọc đường phát hiện trang chủ
  chưa bao giờ được ghép: địa chỉ ghi `home.title` trong khi dữ liệu ở `site.home.title`, nên bộ
  ghép vẫn trả về khuôn suốt. `tools/compose.js` giờ bắt được chuyện đó.
- [x] **9h: danh sách chữ cạnh hai canvas** — xong. Dữ liệu ra `_data/globe.json` và
  `_data/factories.json`; địa chỉ mới `data-ab-json` đặt nguyên văn tài liệu vào một thẻ
  `<script type="application/json">` để script đọc đồng bộ, hình vẽ ở lại phía trình duyệt.
- [x] **9i: mọi trang chi tiết** — xong. `PageComposer` nhận `?id=`, đệm khoá theo id đã quy
  chuẩn; cả bảy loại dùng chung. Script chỉ dựng khi khung còn rỗng, nên phép so pixel giờ
  kiểm THẬT bộ dựng phía máy chủ chứ không kiểm lại script.

Sau mỗi mục: `textmass.js` phải cho thấy chữ trong HTML thô **tăng**, `parity.js` phải cho thấy
hình thức **không đổi**, `nojs.js` phải cho thấy trang **đọc được khi tắt JavaScript** (mở ảnh ra
nhìn, không chỉ đọc con số), `crawl.js` sạch.

**Mốc "trước" là bản đang chạy trên GitHub Pages**, vốn còn dựng mọi danh sách bằng JS — chính xác
hơn một mốc chụp theo thời gian, vì nó là đúng bản trước đợt sửa này. Đã chụp lại vào
`tools/baseline/pages-js/` (1440 và 390) trước khi `site/` được sinh lại, vì lúc đẩy bản mới lên
là mốc đó biến mất.

- [x] **Step cuối: Verify toàn bộ** — trang bài tin 676 → 2.117 ký tự HTML thô; trang chủ
  1.864 → 6.516; 15/15 trang có nội dung thật.
- [x] **Commit kèm bảng số trước/sau**

---

## Task 10: Đường dẫn mới và chuyển hướng 301 — XONG

**Files:**
- Create: `Content/SlugRouter.cs`, `wwwroot/_data/redirects.json`, `tools/slugs.py`,
  `tools/redirects.js`, `tools/fanout.py`
- Modify: `Content/SectionRenderer.cs` (22 chỗ dựng liên kết), `Content/PageComposer.cs`
  (`HasTemplate`, `DetailSectionFor`, hàm dựng nhận thư mục để test được),
  `Content/PageCompositionMiddleware.cs`, `Program.cs`, 15 trang × 2 cây, `_app/app.js`,
  `_app/home.js`, `_app/home-blocks.js`, `site.json`, `highlights.json`, `feature.json`,
  `tools/crawl.js`, `tools/trees.py`, `tools/lib/pages.js`

- [x] **Step 1: Test — `/news/press-line-2500/` trả đúng bài; `/news/detail/?id=press-line-2500` trả 301**
      → `QlWeb2.Tests/SlugRouterTests.cs`, 12 phép thử
- [x] **Step 2: Chạy test, khẳng định fail** — `error CS0246: SlugRouter could not be found`
- [x] **Step 3: `slug` cho mọi mục có trang riêng**, sinh từ `id` hiện có
- [x] **Step 4: Cài đặt định tuyến và bảng 301**
- [x] **Step 5: Cập nhật mọi link nội bộ sang dạng mới** (bốn lớp, xem dưới)
- [x] **Step 6: Verify** — số thật trong thông điệp commit
- [x] **Step 7: Commit**

### Ba chỗ làm khác kế hoạch, và vì sao

**`slug` suy ra thay vì ghi ra.** Kế hoạch viết "thêm `slug` cho mọi mục". Thực tế
`Slug(item) = item.slug ?? item.id`, và không mục nào có `slug` cho tới khi ai đó đổi. Ghi ra là
94 dòng lặp lại đúng cái giá trị đã nằm ngay bên cạnh, trong khi tới Task 12 mới có người sửa
được nó. Ngày khách đổi tên một đường dẫn, trình sửa ghi `slug` cho đúng mục đó và thêm một dòng
vào `redirects.json`. `tools/slugs.py` kiểm mọi `id` viết được thành đoạn đường dẫn và không trùng
nhau trong cùng một mục — chạy trước khi viết bộ định tuyến, 94/94 đạt.

**`wwwroot/_data/redirects.json` thay vì bảng `Redirects` trong cơ sở dữ liệu.** Với
`Admin:Enabled=false`, `EnsureCreated` không chạy và file SQLite không có bảng nào — một bảng ở
đó sẽ không tồn tại trên đĩa, không có ai ghi vào, và không đọc được. Đường chuyển hướng cũng là
nội dung như mọi thứ khác trong dự án này, nên nó nằm cùng chỗ với nội dung. Bảng nhận cả đường
dẫn đầy đủ lẫn **tiền tố thư mục**, và hôm nay đã có một dòng thật: cả site từng nằm dưới `/usa/`
trong 44 commit, và mọi URL đó đang 404 từ hồi dời lên gốc — vi phạm chính ràng buộc "mọi đường
dẫn cũ phải sống" mà không ai để ý. Một dòng chữa cả 45 trang.

**`tools/fanout.py` thay vì chạy `publish-static.js`.** Ràng buộc chung nói hoãn `publish-static`
tới sau Task 10. Nhưng bản tĩnh không cần đầu ra đã ghép — nó cần **một thư mục cho mỗi mục**, và
mỗi thư mục chứa đúng bản sao từng byte của khuôn chi tiết: khuôn dựng trang bằng JS, còn
`AB.itemId()` đọc đoạn cuối đường dẫn, nên một file giống hệt nhau dựng ra 94 trang khác nhau.
Đổi lại: `trees.py` giữ nguyên phép so HTML hai cây (chỉ thêm một ngoại lệ, và ngoại lệ đó tự kiểm
bằng cách so byte với khuôn), git lưu một blob cho 94 file, và Pages không gãy giữa chừng.
`publish-static.js` để dành cho Task 14 — bản xuất tĩnh đầy đủ lúc bàn giao, khi `site/` thôi làm
nguồn song song.

### Liên kết nằm ở bốn lớp

Bỏ quên một lớp **không** gây 404 — nó gây 301, trang vẫn hiện ra, không ai thấy. Nên `crawl.js`
từ nay đếm riêng liên kết nội bộ trả 301, và đó là cách duy nhất biết đã sửa đủ chưa:

1. `SectionRenderer` — 22 chỗ dựng `href`
2. bản dự phòng JS trong 14 trang và `_app/*.js`, cả hai cây
3. `href` viết cứng trong chân trang 15 trang × 2 cây — nhãn là tham số, địa chỉ thì không
4. `href` nằm trong chính dữ liệu: `site.json`, `highlights.json`, `feature.json`

---

## Task 11: Khung soạn hai cột — XONG

**Files:**
- Create: `Areas/Admin/Controllers/EditController.cs`, `Areas/Admin/Views/Edit/Index.cshtml`,
  `wwwroot/admin/editor.js`, `wwwroot/admin/editor.css`, `wwwroot/admin/edit-bridge.js`,
  `tools/editor-shot.js`
- Modify: `Content/PageComposer.cs` (cờ `edit`), `Content/PageCompositionMiddleware.cs`,
  `Program.cs`, `appsettings.json`, `Areas/Admin/Views/Shared/_AdminLayout.cshtml`,
  `tools/compose.js`

**Interfaces (hợp đồng đầy đủ nằm ở đầu `wwwroot/admin/edit-bridge.js`):**
- soạn → trang: `{type:'ab:text', address, value}`, `{type:'ab:list'}`
- trang → soạn: `{type:'ab:ready', url, fields:[{address, kind, value}]}`, `{type:'ab:pick', address}`

- [x] **Step 1: Khung hai cột, iframe mở `/?edit=1`**
- [x] **Step 2: Cầu nối vá chữ tại chỗ qua `postMessage`**
- [x] **Step 3: Chiều ngược lại — bấm phần tử nhảy tới ô nhập**
- [x] **Step 4: Thanh chọn bề ngang 1440 / 834 / 390**
- [x] **Step 5: Verify trực quan** — `tools/editor-shot.js`, 6 phép thử + 5 ảnh, đã xem bằng mắt
- [x] **Step 6: Commit**

### Khu quản trị cũ ghi vào một cơ sở dữ liệu không ai đọc

Phát hiện khi mở Task 11. Bốn màn hình cũ — Overview, Content, Page order, Search listing — đọc
và ghi `ContentDocuments`, `PageRegions`, `PageSeos`. Từ Task 3, chữ trên site đến từ
`wwwroot/_data/*.json` qua `ContentStore`, và middleware từng phục vụ tài liệu từ SQLite đã bị bỏ.
Nên bật khu quản trị lên nguyên trạng là đưa cho khách một biểu mẫu bấm `Save changes` xong không
có gì đổi — tệ hơn hẳn việc chưa có màn hình nào.

Đã gỡ link tới bốn màn hình đó khỏi thanh điều hướng và để lại một chú thích ngay đó nói cái nào
quay lại ở đợt nào (12 bộ sưu tập, 13 SEO, 14 lịch sử). Controller vẫn còn, vẫn biên dịch được —
xoá là việc của chính các đợt ấy. Chú thích trong `Program.cs` cũng viết lại: nó vẫn đang nói
rằng bật khu quản trị thì `_data` đến từ cơ sở dữ liệu, điều đã hết đúng từ Task 3.

### Ba chỗ làm khác kế hoạch

**`wwwroot/admin/edit-bridge.js`, không phải `wwwroot/_app/`.** Cầu nối là thứ của trình soạn, và
bản tĩnh không bao giờ được mang nó — `trees.py` bỏ qua thư mục `admin/`, còn một cầu nối nằm
trong cây đã publish là một script ngồi chờ tin nhắn không bao giờ tới.

**Bộ ghép chèn thẻ script, không phải khuôn.** `?edit=1` là một khoá cache riêng, nên trang khách
nhận và trang trình soạn xem là cùng một chuỗi byte cộng đúng một thẻ `<script>`. Đó mới là lý do
xem thử đáng tin. Đã đo: `curl /` không có `edit-bridge`, `curl /?edit=1` có đúng một.

**Chưa lưu.** Kế hoạch không có bước lưu ở đợt này, và đúng thế: ghi nội dung là Task 12, cùng với
`ContentRevisions` cho lịch sử ở Task 14. Màn hình nói thẳng điều đó — *"Changes show immediately
on the right; saving arrives with the next update"* — vì một dòng chữ nói "chưa có" tốt hơn một
nút Save im lặng không làm gì.

### Một khoản nợ của Task 10 lộ ra ở đây

`tools/compose.js` dò khuôn theo đúng đường dẫn, nên từ khi `lib/pages.js` đổi sang đường dẫn
riêng, bảy trang chi tiết báo "không tìm thấy khuôn". Task 10 chạy `compose.js` **trước** khi đổi
`pages.js` nên không thấy. Đã dạy nó cùng quy tắc `SlugRouter` dùng: không có khuôn ở đúng đường
dẫn thì tìm `detail/index.html` cùng cấp.

---

## Task 11b: Đổi ảnh — XONG

Không nằm trong kế hoạch gốc như một đợt riêng; làm ngay sau Task 11 vì trình soạn sửa được chữ
mà không sửa được ảnh thì chưa dùng được, và ảnh là thứ khách hỏi đầu tiên.

**Files:**
- Create: `Content/ContentEditor.cs`, `Content/MediaLibrary.cs`, `tools/image-edit.js`,
  `QlWeb2.Tests/ContentEditorTests.cs`
- Modify: `Content/SectionRenderer.cs` (18 tấm ảnh có địa chỉ), `Content/PageComposer.cs`
  (`data-ab-doc`), `Areas/Admin/Controllers/EditController.cs` (Save / Pictures / Upload),
  `Areas/Admin/Controllers/MediaController.cs` (dùng chung `MediaLibrary`),
  `wwwroot/admin/{edit-bridge,editor}.js`, `editor.css`, `_data/{products,about}.json`

- [x] **Địa chỉ cho ảnh** — `data-ab-img="items.3.image"` trên chính thẻ `<img>`, suy từ
      `JsonNode.GetPath()` chứ không từ vòng lặp: mọi danh sách đều được sắp xếp, gộp nhóm hoặc
      lọc trước khi vẽ, nên thẻ thứ ba trên trang hiếm khi là mục thứ ba trong file.
- [x] **Tên tài liệu đóng một lần** — bộ ghép thêm `data-ab-doc="news"` vào thẻ mang
      `data-ab-section`. Chỉ địa chỉ ảnh mới cần ghép thêm; địa chỉ chữ viết trong khuôn đã đủ.
- [x] **Ghi xuống file** — `ContentEditor` là chỗ duy nhất ghi nội dung: đọc lại từ đĩa (không
      sửa bản trong bộ nhớ mà mọi trang đang dựng từ đó), từ chối tạo trường không có sẵn, ghi cả
      hai cây, và trả lại nội dung cũ để ghi một bản lịch sử.
- [x] **Thư viện ảnh + tải lên** — `MediaLibrary` giữ luật (JPG/PNG/WebP/GIF, kiểm cả chữ ký file,
      **không nhận SVG** vì SVG là tài liệu mang script được), dùng chung cho cả màn hình Pictures
      lẫn bộ chọn ảnh trong trình soạn.
- [x] **Verify** — `tools/image-edit.js` đi hết đường và đặt lại như cũ; 48 phép thử đơn vị

### Ba thứ bắt được nhờ đo, không nhờ nhìn mã

**CRLF.** Bộ ghi JSON thụt lề kết thúc dòng bằng `Environment.NewLine` — sửa một trường ghi lại
cả 141 dòng. Chỉ phép thử "đặt lại như cũ" thấy được.

**Địa chỉ sai cũng làm file bị ghi lại.** Tài liệu được nạp không có nghĩa là đã đổi; một lô chỉ
chứa một địa chỉ gõ sai vẫn khiến file được tuần tự hoá lại. Phép thử đơn vị bắt.

**Bảng chọn ảnh luôn mở.** `.ed-shelf { display: flex }` thắng `[hidden] { display: none }`, nên
tấm nền trắng phủ kín khung xem thử và nuốt mọi cú bấm. Không có gì trông sai; khung xem thử chỉ
ngừng trả lời. Phép thử "bấm chữ → chọn ô nhập" là thứ duy nhất đổi màu.

### Lấy trước của Task 12

Ba bước của Task 12 coi như đã xong: ghi thật xuống `ContentStore`, bộ chọn ảnh kèm tải lên, và
ghi bản lịch sử mỗi lần lưu. Còn lại của Task 12: màn hình danh sách cho mười loại nội dung,
thêm/xoá một mục, `visible`, đổi thứ tự, và dò tham chiếu trước khi xoá.

---

## Task 12: Màn hình danh sách và màn hình đăng — XONG

**Files:**
- Create: `Areas/Admin/Controllers/CollectionController.cs`
- Create: `Areas/Admin/Views/Collection/{Index,Edit}.cshtml`
- Modify: `Helpers/JsonForm.cs` → sinh ô nhập trực quan

Mười loại, nhãn tiếng Anh: Products · Colors · News · Projects · Documents · Gallery ·
Highlights · Applications · Export routes · Factories.

- [x] **Step 1: Màn hình danh sách** — ảnh thu nhỏ, tìm, lọc, kéo đổi thứ tự, `Shown`/`Hidden`
- [x] **Step 2: Màn hình đăng** — là trang của chính mục đó trong khung soạn hai cột; — ô nhập theo loại; ảnh là thẻ ảnh có nút `Choose image` kèm tỉ lệ
- [x] **Step 3: Sinh slug từ tiêu đề; khoá sau lần lưu đầu.** Kiểm ngay lúc lưu, phía C#:
      đúng dạng `^[a-z0-9]+(-[a-z0-9]+)*$`, không được là từ `detail`, và không trùng một slug
      khác **trong cùng mục** (`documents` gộp các danh mục thành danh sách phẳng nên hai tài liệu
      khác danh mục vẫn trùng được). Hôm nay `tools/slugs.py` là thứ duy nhất kiểm việc này và nó
      chạy bằng tay; ngày trình sửa ghi được `slug` thì một slug sai đi thẳng vào URL. Đổi slug thì
      ghi luôn một dòng vào `redirects.json` — đó là lý do bảng ấy tồn tại.
- [x] **Step 4: Dò tham chiếu trước khi xoá** — báo "3 chỗ đang trỏ tới mục này"
- [x] **Step 5: Xem trước đi theo mục đang sửa** — nút Edit mở đúng trang của mục
- [x] **Step 6: Verify** — `tools/collection.js`, 12/12; đăng thật một mục mỗi loại, khẳng định trang thật đổi theo
- [x] **Step 7: Commit**

### Bốn chỗ rà soát lại sau khi tích hết ô

Bước 3 từng được tích mà chưa có gì đứng sau. Không tệp JSON nào mang trường `slug`, và
`ContentPath` từ chối tạo trường mới, nên `SlugIsFree`, `RecordMove` và nhánh `.slug` trong
`Apply` đều là mã chết — đường đổi địa chỉ chưa bao giờ tồn tại. Giờ **tên sinh ra địa chỉ**:
đặt tiêu đề lần đầu cho một mục còn mang id `new-3f9a2c` thì id thành slug của tiêu đề ấy, bỏ
dấu tiếng Việt, trùng thì thêm hậu tố, và đổi đúng một lần.

Bước 1 nói "mười loại" nhưng hai trong số đó **không thêm mục mới được**: cái làm nên một tuyến
xuất khẩu là bốn mươi cặp toạ độ, và toạ độ không phải chữ trên trang nên không có địa chỉ để
điền vào. `CanAdd: false` — nút biến mất, màn hình nói vì sao, máy chủ cũng chặn.

Bước 2 nói màn hình đăng "là trang của chính mục đó trong khung soạn hai cột, ô nhập theo loại;
ảnh là thẻ ảnh có nút Choose image kèm tỉ lệ". Lúc tích thì mới đúng một nửa: khung có, ô nhập
thì không — `SectionRenderer` sinh `data-ab-img` cho ảnh nhưng không sinh `data-ab-t` cho chữ.
**Task 15 làm nốt nửa kia**, và thẻ ảnh giờ có tỉ lệ thật: chính trang báo lên kích thước ô nó
dành cho tấm ảnh (`400 × 300 · 4:3`), vì bố cục là thứ duy nhất biết điều đó và nó khác nhau
giữa bài dẫn và các thẻ bên dưới.

Và `Trim(50)` chỉ chạy lúc Restore, nên "giữ 50 bản mỗi tệp" chưa đúng cho tới lần khôi phục đầu
tiên. Chuyển sang `Content/RevisionLog.cs`, cạnh chỗ ghi.

---

## Task 13: SEO và máy trả lời — XONG

**Files:**
- Create: `Content/StructuredData.cs`, `Content/SiteFiles.cs`
- Modify: `Areas/Admin/Views/Collection/Edit.cshtml` (ô SEO)

- [x] **Step 1: SEO từng mục** — title, description, og:image, canonical, og:type — **suy ra từ
      chính các trường của mục**, và `seoTitle`/`seoDescription` ghi đè nếu ai đó viết. 94 ô nhập
      SEO rỗng thì tệ hơn là suy ra.
- [x] **Step 2: Danh sách kiểm** — câu trả lời trong 2 câu đầu; số liệu kèm đơn vị; tiêu đề nêu
  thực thể; ảnh có alt; mô tả 120–160 ký tự
- [x] **Step 3: JSON-LD** — Organization, 5 LocalBusiness, Product, NewsArticle, BreadcrumbList
- [x] **Step 4: `sitemap.xml` (102 URL), `robots.txt` (8 bot, công tắc trong `site.json`), `llms.txt`** — sinh ra chứ không lưu sẵn
- [x] **Step 5: Verify** — `tools/seo.js`, 8/8
- [x] **Step 6: Commit**

---

## Task 14: Lịch sử, khôi phục, bàn giao — XONG

**Files:**
- Modify: `Areas/Admin/Controllers/ContentController.cs`
- Create: `docs/HANDOVER.md`

- [x] **Step 1: Mỗi lần lưu ghi một bản lịch sử; màn hình xem và khôi phục** — giữ 50 bản mỗi
      tệp; khôi phục cũng là một lần lưu nên bản đang chạy được giữ lại: undo có undo
- [x] **Step 2: Gỡ cả BA câu chỉ dành cho bản demo** — dòng chân trang (124 trang), nút EN/VI,
      và câu "This demo has no server attached" — câu cuối sửa bằng cách cho biểu mẫu gửi thật
- [x] **Step 3: Sửa "raw stone"** — đã làm ở commit 6a5a8be
- [x] **Step 4: Viết `docs/HANDOVER.md`** — đăng nhập, sao lưu, khôi phục, nơi để ảnh
- [x] **Step 5: Verify toàn bộ** — 14 công cụ, số thật trong thông điệp commit
- [x] **Step 6: Commit**

---

## Task 15: Chữ của từng MỤC, không chỉ chữ của khung trang — XONG

Không có trong kế hoạch gốc, vì kế hoạch gốc tưởng Task 12 đã làm. Đo ra thì chưa:
`SectionRenderer` sinh `data-ab-img` cho mọi ảnh nhưng **không sinh `data-ab-t` cho một chữ nào**.
Trên một trang bài viết, trình soạn liệt kê đúng 38 ô — wordmark, bảy mục nav, chân trang — và
không ô nào thuộc về bài viết. Sửa được logo, không sửa được tiêu đề.

Đó là yêu cầu gốc của cả dự án, nên nó là một đợt riêng chứ không phải một dòng ghi chú.

**Files:**
- Modify: `Content/SectionRenderer.cs` (khoảng 40 chỗ chữ trong 22 hàm dựng)
- Modify: `wwwroot/admin/edit-bridge.js` (`full()`), `wwwroot/admin/editor.js` (gộp trùng)
- Modify: `Content/PageComposer.cs` (`Verify` hiểu địa chỉ tương đối)
- Modify: `tools/editor-shot.js` (phép thu thứ 9)

- [x] **Step 1: Dấu chấm mở đầu là dấu hiệu "tương đối".** `.items.3.title` là của mục, thuộc
      tệp mà bộ ghép đã đóng dấu `data-ab-doc` lên khối bao quanh; `site.nav.1.label` tự nói tên
      tệp của nó. Không dùng "có nằm trong khối không" làm phép thử: trang chủ đặt chữ của khuôn
      **bên trong** khối đã dựng, nên phép thử ấy biến `gallery.heading` thành
      `gallery.gallery.heading`.
- [x] **Step 2: `TextAddress(item, field)` cạnh `ImgAddress`** — và **không sinh gì** cho trường
      không phải chuỗi. Vĩ độ nhà máy, số ngày của một tuyến là số vì có lý do; trình soạn ghi
      thứ người ta gõ, dạng chữ, nên gõ "22" là biến `22` thành `"22"` và quả địa cầu vẽ bằng
      một chuỗi.
- [x] **Step 3: Gắn địa chỉ.** Hai trường trên cùng một dòng chữ thì mỗi trường một `<span>`
      trần. Bỏ qua: `alt`, `data-v`, `hex`, `id`, ngày đã định dạng lại, số đếm, và chữ đã bị
      đổi hoa — trình soạn đọc ngược lại phần tử, nên một chữ đã viết hoa sẽ được lưu lại dưới
      dạng viết hoa.
- [x] **Step 4: `Verify` kiểm cả hai loại địa chỉ.** Một địa chỉ treo là một ô khách bấm vào mà
      không lưu được, bất kể nửa nào của hệ thống viết ra nó. Chính nó bắt được lỗi đầu tiên:
      `GetPath()` bọc khoá có dấu cách trong nháy đơn, nên `familySpecs['Wood grain'].layer`
      thành một địa chỉ không có thật — bốn họ màu bị trả về khuôn thay vì phục vụ sai.
- [x] **Step 5: Gộp địa chỉ trùng trong danh sách ô.** Một trường hiện ở nhiều chỗ trên cùng
      một trang (wordmark ở đầu và cuối; tên dòng sản phẩm ở hero, ở thẻ, ở tiêu đề dải). Trang
      vẫn vá mọi chỗ khi gõ; hai ô cùng nội dung chỉ là hai chỗ để phân vân cái nào thật.
- [x] **Step 6: Verify** — `editor-shot` 10/10, `collection` 13/13, `parity` xem dưới.

### Một phép đo hoá ra đang đo nhầm trang, từ ngày nó được viết

Thêm phép thu thứ chín vào `editor-shot.js` thì lộ ra phép thứ bảy sai từ đầu. Bước 2 gõ một chữ
vào ô nhập, nên trang mang trạng thái "có thay đổi chưa lưu"; bước 5 đổi trang bằng ô **Page**,
việc đó bật một hộp thoại hỏi lại, Playwright tự bấm Huỷ, và khung xem thử **ở nguyên chỗ cũ**.
"43 ô ảnh trên `/products/`" là 43 ô ảnh trên trang chủ. Phép thu vẫn ĐẠT, vì trang chủ cũng có
ô ảnh.

Mở thẳng bằng địa chỉ thay vì qua ô chọn: 30 ô, và đó mới là `/products/`. Cùng một lớp lỗi với
bảng chọn ảnh phủ lên khung xem thử ở Task 11b — phép đo đạt vì lý do khác với lý do nó được
viết ra.

Và phép thu thứ mười, thêm sau: gõ thẳng vào ô của một MỤC rồi đọc `<h1>` trong khung xem thử
trước khi lưu. Bước 2 gõ vào một địa chỉ của khuôn nên nó đi đường cũ; địa chỉ của mục đi đường
mới — dấu chấm mở đầu, rồi ghép với tên tệp đóng trên khối bao quanh — và `collection.js` lưu
rồi tải lại trang, nên một đường vá-sống bị hỏng vẫn qua được nó.
- [x] **Step 7: Commit**

### Ba trường cố tình không gắn địa chỉ

| Chỗ | Vì sao |
|---|---|
| `products.categories.N.blurb` | Một trường in thành hai cột. Đọc ngược một cột là lấy nửa bài làm cả bài, rồi lưu đè. |
| `colors.items.N.family` | Là KHOÁ tra vào `colors.familySpecs`. Sửa ở đây không đổi tên họ màu — nó bỏ màu này ra khỏi họ, và ba dòng thông số của chính nó thành dấu gạch ngang. |
| `projects.albums.N.products` | Một mảng nối bằng dấu phẩy. Một ô chứa "A, B, C" lưu ngược lại thành một chuỗi ở chỗ tệp muốn ba. |

### Mốc nền mới, và vì sao nó lệch

`baseline/task15` thay `task14`. Năm trang lệch, 15–257 pixel, ở cả 1440 lẫn 390:

```
/                      19 px   vùng 6×9      thẻ dự án: "2026 · Rayong, Thailand"
/colors/               34 px   vệt mảnh      "AN-210 · Anodised"
/documents/           257 px   cột 142 px    "Rev 7 · 24 pages"
/documents/td-thermal/ 23 px   dải 392×10    cùng dòng ấy
/news/                 58 px   vệt mảnh      "Written by: <tên>"
```

Mọi chỗ lệch đều nằm đúng ranh giới nơi một dòng chữ bị tách thành hai `<span>`. Trình duyệt
ngắt chữ thành từng đoạn theo hộp inline và làm tròn bề rộng mỗi đoạn riêng, nên nét chữ được vẽ
lại hơi khác — **không có gì xê dịch**: ảnh hai bên cùng kích thước (parity dừng ngay nếu khác),
vùng lệch mỏng, và số pixel lệch ở hai bề ngang khác nhau vẫn cùng cỡ. Một dòng bị ngắt khác đi
sẽ làm trang cao lên và số pixel nhảy lên hàng vạn, như năm trang đầu tiên khi so với mốc nền
trước kiến trúc.

Đổi lấy: 102 trang, mỗi trang chữ của chính nó sửa được.

---

## Task 16: Bốn chỗ hứa nhiều hơn làm được — XONG

Bộ chụp của Task 15 trả lời "màn hình ấy TRÔNG ra sao". Đọc lại bảng ấy cùng mã lộ ra bốn chỗ
nữa, và cả bốn cùng một dạng: **thứ hiện ra nói một đằng, thứ chạy bên dưới làm một nẻo.**

- [x] **Step 1: Xoá bốn màn hình của bản mẫu.** `Dashboard`, `Content`, `Layout`, `Seo` — cùng
      `ContentDocument`, `PageSeo`, `PageRegion`, ba khối seed của chúng, và bốn tệp helper chỉ
      còn chúng gọi (`JsonForm`, `SeoWriter`, `RegionMarkup`, `prepare-regions.py`).
      Task 11 đã tháo chúng khỏi menu, và ghi vào nhật ký rằng để lại một màn hình còn vẽ được
      thì tử tế hơn một trang 404. **Điều đó sai.** Chúng vẫn ghi vào ba bảng mà bộ ghép không
      đọc, nút Save vẫn báo "Saved", và ai còn bookmark thì vẫn vào được — một cái bẫy im lặng.
      404 nói thật ngay lập tức.
      `ContentSeeder` còn lại đúng một việc nên thành `AdminSeeder`; `AppDbContext` còn hai bảng:
      lịch sử sửa và một tài khoản. `EnsureCreated` không sửa cơ sở dữ liệu đã có, nên trên máy
      đang chạy ba bảng cũ nằm lại, rỗng nghĩa, và không ai mở.
- [x] **Step 2: `Proxy:TrustedIps` và `UseForwardedHeaders`.** Biểu mẫu liên hệ cho mỗi địa chỉ
      tám lần một giờ. Sau nginx thì mọi yêu cầu đến từ `127.0.0.1`, nên tám người là hết hạn
      mức của cả Internet, và người thứ chín bị từ chối vì người thứ tám. Chỉ tin
      `X-Forwarded-For` khi cấu hình gọi tên proxy; danh sách rỗng thì middleware không được đăng
      ký — tin một dòng tiêu đề ai cũng gõ được, trên một máy chủ nối thẳng, là để khách tự chọn
      ô đếm của mình.
      Đo bằng `tools/forwarded.js`, cả hai chiều: rỗng → 8 nhận / 1 từ chối; có `127.0.0.1` →
      9 nhận / 0 từ chối.
- [x] **Step 3: Cổng đổi mật khẩu.** `admin` / `changeme` nằm trong mã nguồn của một kho công
      khai. HANDOVER *xin* người vận hành đổi nó; lời xin không phải một biện pháp. Một
      `IActionFilter` đẩy mọi màn hình về Change password trong lúc mật khẩu gốc còn hiệu lực,
      trừ `Account` — chỗ sửa nó và nút Sign out đều ở đó, và một vòng lặp chuyển hướng khoá
      người vận hành ra ngoài site của chính họ còn chặt hơn một mật khẩu yếu.
      Sự thật là **bản băm đã lưu**, không phải một cột cờ: cờ có thể nói "đã đổi" trong khi mật
      khẩu nói ngược lại — chép cơ sở dữ liệu giữa hai máy là ra ngay. Băm thì tốn 210.000 vòng
      PBKDF2, giá đúng cho một lần lúc khởi động và giá sai cho mỗi yêu cầu, nên câu trả lời được
      giữ trong một singleton và cập nhật đúng hai lúc nó đổi được: lúc đăng nhập (lúc mật khẩu
      còn ở dạng chữ) và lúc đổi.
      Bốn công cụ đều đăng nhập bằng `admin`/`changeme` nên cả bốn sẽ gãy. Chúng dùng chung
      `tools/lib/admin.js`: thử mật khẩu làm việc, không được thì thử mật khẩu gốc, gặp cổng thì
      **đi qua đúng đường người thật đi** — đổi mật khẩu rồi làm tiếp.
- [x] **Step 4: Bảng chữ cho nhãn ô nhập.** "Categories #1 name" bắt khách tự đoán rằng
      *category* ở đây nghĩa là một dòng sản phẩm; "Items #3 title" xuất hiện trên năm màn hình
      với năm nghĩa khác nhau. 33 danh sách trên site, mỗi cái một tên: `products.categories` là
      **Product family**, và `products.categories.N.items` bên trong nó là **Product**.
      Khoá là *hình dạng* địa chỉ (mọi số thứ tự viết thành `N`), nên danh sách lồng trong danh
      sách có tên riêng chứ không mượn tên của cái bọc ngoài.
      Mười danh sách đầu lấy đúng tên màn hình **Content** gọi chúng, ở dạng số ít — vì nếu không
      thì lại thành hai thứ tiếng trên cùng một màn hình, chỉ dời chỗ: tiêu đề nhóm ghi "Colors"
      mà mọi ô bên dưới ghi "Finish #1". Bốn cái lệch khỏi quy tắc ấy đều có lý do viết ngay
      cạnh: `Products` → **Product family** vì "Product" dành cho danh sách bên trong nó,
      `Documents` → **Document group** cùng lẽ ấy, `Gallery` → **Picture** vì một gallery chứa
      ảnh, `News` → **Article** vì "News" không có số ít.
- [x] **Step 5: Verify** — `dotnet test` 69/69, `admin-shots` 30/30 (bốn màn hình cũ: 404),
      `editor-shot` 10/10, `collection` 13/13, `image-edit` 7/7, `labels` 33/33,
      `forwarded` hai chiều, `parity --against baseline/task15` 15/15 ở cả 1440 và 390.
- [x] **Step 6: Commit** — bốn commit, mỗi cái một chỗ sai.

### Một bảng chữ cần một công cụ, không cần một lời hứa

Bảng chữ của Step 4 sẽ lạc hậu dần: thêm một danh sách vào dữ liệu là thêm một từ chưa ai đặt
tên, và cái nhãn lặng lẽ quay về giống một cơ sở dữ liệu. Không có gì kêu lên.

`tools/labels.js` mở cả 15 trang, gom 118 dạng ô nhập, và hỏi hai câu: danh sách nào không có
trong bảng chữ, và nhãn nào còn mang nguyên một từ của tệp. Nó cũng **in ra số danh sách tìm
được** — vì lần viết đầu tiên nó báo "không còn cái nào" trên một site còn năm chỗ chưa đặt tên:
hàm tách khúc danh sách tìm số thứ tự bằng `/^\d+$/` trong khi thứ được truyền vào đã thay hết
số bằng `N`, nên nó không tìm thấy danh sách nào cả. Một bảng rỗng bên dưới số 0 trông giống hệt
một bảng rỗng bên dưới số 33.

Cùng lớp lỗi với phép thu thứ bảy của `editor-shot` ở Task 15, và với bảng chọn ảnh ở Task 11b:
**phép đo đạt vì lý do khác với lý do nó được viết ra.** Lần này nó được chứng minh ngược lại —
bỏ một dòng khỏi bảng chữ, công cụ báo KHÔNG ĐẠT và chỉ đúng tám cái nhãn.

### Một nút Save bấm nhầm suốt ba phiên bản

`tools/lib/admin.js` viết xong thì báo "đã đổi mật khẩu", mà mật khẩu không hề đổi. Nó bấm
`button[type=submit]` — và thanh tiêu đề mang một biểu mẫu **Sign out** nằm trước `<main>` trong
DOM. Trên trang đổi mật khẩu, nút đầu tiên có `type=submit` là Sign out. Đăng xuất xong thì trang
về Login, mà Login **không phải** trang đổi mật khẩu, nên phép kiểm "còn ở đây không" trả lời
"không" và công cụ tưởng là xong.

Bốn công cụ cũ đều bấm bằng bộ chọn ấy suốt từ Task 11 — trên trang Login nó vô hại, vì lúc chưa
đăng nhập thanh tiêu đề không có nút nào. Đúng một lần một trang có hai biểu mẫu là nó sai.

---

## Task 17: Nói cỡ ảnh, và quay lại một lần sửa thật — XONG

- [x] **Step 1: Cỡ ảnh nên tải lên, ngay tại chỗ tải lên.** Dưới nút Choose picture chỉ có cái
      ô — "340 × 300 · 17:15" — mà cái ô không phải câu trả lời. Nay hai dòng: ô thật, rồi
      **gấp đôi ô**, chặn ở 2000 px cạnh dài. Gấp đôi vì màn hình đời mới vẽ hai điểm ảnh cho
      mỗi một điểm bố cục đếm; chặn vì máy chủ không thu nhỏ ảnh, nó trả đúng tệp được gửi.
      Bảng chọn ảnh nhắc lại cả hai, trong phần tử **riêng**: `#ed-shelf-note` là dòng trạng
      thái và "Uploading photo.jpg…" sẽ xoá mất con số đúng lúc người ta đi tìm nó.
      Cầu nối khai luôn nguồn của con số: bố cục ghi sẵn `width`/`height` thì nói "Fills"; ô nền
      không ghi gì và phải đo, mà đo thì chỉ đúng với bề ngang khung xem thử đang mở — nói
      "About". Hai chữ, và đó là khác nhau giữa một sự thật và một ảnh chụp.
- [x] **Step 2: Phim hướng dẫn.** `tools/guide-video.js`, 53 giây, phụ đề tiếng Việt cháy vào
      hình, không lồng tiếng. Cuộn tới đâu thao tác tới đó; con trỏ là một chấm tự vẽ vì Chrome
      khi quay không vẽ con trỏ thật vào khung hình.
- [x] **Step 3: Verify** — `editor-shot` 12/12 (hai phép đo mới đọc **số** chứ không đọc chữ:
      khuyến nghị không được nhỏ hơn ô, không được vượt 2000), `guide-video` 6/6, và xem lại
      chín khung hình lấy ra từ chính tệp mp4.
- [x] **Step 4: Commit.**

### Một đoạn phim hỏng mà không có lỗi nào

`recordVideo.size` mặc định của Playwright ép khung hình lọt vào 800×800. Một cửa sổ 1440×900 ghi
ra thành 800×500: chữ nhoè thành vệt, không thông báo, không mã lỗi — chỉ có một tệp mp4 mở ra
được và không đọc được. Cùng lớp với `--hide-scrollbars` mặc định của `launch()`: đúng cho mọi
phép đo pixel, sai cho một đoạn phim mà thanh cuộn chính là thứ cho người xem biết họ đang ở đâu.

Và máy quay chạy ngay từ lúc ngữ cảnh được tạo, nên đăng nhập trong đó là quay luôn biểu mẫu đăng
nhập. Đăng nhập ở ngữ cảnh khác rồi mang cookie sang.

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
