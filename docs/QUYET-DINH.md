# Quyết định đã chốt — 18/09/2026

Ghi lại để không phải hỏi lại, và để người sau biết những việc dưới đây là **lựa chọn**, không
phải chuyện chưa ai nghĩ tới. Mỗi dòng: chốt cái gì, và hệ quả kèm theo.

---

## 1. Máy chủ và xuất bản

**Chốt: sẽ dựng bản .NET lên VPS, anh Phúc tự dựng, làm sau.**

Nên bản .NET là đích chứ không phải bản tĩnh. Hai hệ quả đi kèm:

- Cho tới lúc VPS lên, **trang thật vẫn là GitHub Pages** (`site/`, bản JavaScript), và khu quản
  trị chưa ở đâu cả — mọi thay đổi nội dung vẫn phải qua lập trình viên rồi `git push`.
- Tài liệu bàn giao đang nói *"Trang thật đổi ngay lập tức — không phải chờ build, không phải
  deploy"*. Câu đó chỉ đúng với máy chủ; phải sửa cho đúng chừng nào Pages còn là trang thật.

## 2. Biểu mẫu liên hệ

**Chốt: dùng màn tiếp nhận trong khu quản trị. Không báo ra ngoài. Không làm gì tạm trên bản
tĩnh.**

- Màn `/Admin/Enquiry` đã có sẵn và đã đọc được `App_Data/enquiries.jsonl`.
- **Không gửi email, không Telegram, không Zalo.** Hệ quả phải nói rõ: yêu cầu báo giá chỉ được
  biết đến khi có người đăng nhập vào xem. Không ai vào xem thì nó nằm đó.
- Trên bản tĩnh hiện tại form vẫn báo *"The request did not go through. Please email us
  instead."* — để nguyên, vì VPS sắp lên.

## 3. Ẩn một mục phải có tác dụng trên trang thật

**Không hỏi — đây là lỗi, không phải lựa chọn.**

Các trang danh sách của bản tĩnh không lọc `visible`. Khách ẩn một sản phẩm trong Content, nó vẫn
hiện công khai trên Pages. Máy chủ thì lọc đúng, nên hai bản đang nói hai chuyện khác nhau.

## 4. Nút VI

**Chốt: ẩn đi.**

Bật lại bất cứ lúc nào khi có bản dịch. Không xoá mã, chỉ thôi vẽ nút.

## 5. Giao diện chép từ theme Cosentino

~~**Chốt: thay hết. Viết lại toàn bộ bằng CSS của mình, giữ nguyên hình thức.**~~

**ĐỔI QUYẾT ĐỊNH 18/09/2026: không viết lại nữa. Chỉ rà soát và bỏ phần CSS không dùng.**

Lý do đổi thì anh Phúc không nói, nhưng đánh đổi thì rõ và đáng ghi: viết lại 2 MB CSS là
nhiều tuần, còn bỏ phần không dùng là một công cụ chạy một lệnh. Cái mất là site vẫn mang cấu
trúc lớp của theme WordPress cũ — tên lớp vẫn là `vc_row`, `wpb_column`; ai sửa giao diện sau
này vẫn phải đọc theme đó. Cái được là phần lớn khối lượng biến mất mà hình thức không đổi
một pixel.

Công cụ: `tools/css-unused.js`. Nó **hỏi trình duyệt thật**, không dò chữ trong HTML — DOM của
site này do JavaScript dựng lúc chạy nên một lớp chỉ xuất hiện sau khi `app.js` vẽ xong sẽ
không có trong tệp HTML nào. Chạy trên 15 trang × 3 khung màn hình, cắt bỏ giả lớp trạng thái
(`:hover`, `:focus`) trước khi hỏi, và **không chắc thì giữ**.

**Đã chạy 18/09/2026: 11.692 / 14.699 quy tắc bị bỏ, 1.900 KB → 721 KB (giảm 62%).** 15/15
trang không lệch một pixel nào, ở cả 1440 và 390; `crawl.js` 0 liên kết chết, 0 lỗi script;
`states.js` 5/5 trạng thái tương tác còn định dạng.

**Con số đầu tiên là 88%, và tôi đã kéo nó xuống 62% — đây là chỗ đáng đọc nhất của mục này.**
88% đạt được bằng cách cắt cả những quy tắc mà phép đo, về bản chất, **không thể** nhìn thấy:
lớp do JavaScript bật lên trong một phần nghìn giây rồi tắt. Lần chạy ấy đã bỏ mất
`.abhero.is-dark` (chữ trắng khi ảnh hero tối — đúng cái lớp phủ ở mục 6) và `.ab-fail` (khối
báo lỗi khi tải hỏng). Không phép chụp ảnh nào bắt được, vì không ảnh nào chụp đúng khoảnh khắc đó.

Hai cái rào mới, và 500 KB chênh lệch là giá của chúng:

1. **Không đụng vào `_app/`** — CSS mình tự viết, 40 KB, nơi ở của mọi lớp trạng thái. Cắt nó
   lợi 2% và hại đúng loại lỗi khó thấy nhất.
2. **JS biết tên lớp thì CSS ở lại** — đọc mã nguồn JavaScript, gom tên lớp từ `classList.add`,
   `addClass`, `className =`, `class="..."`. Sau khi thêm, số quy tắc "chỉ lộ ra sau khi bấm"
   tụt từ 4 xuống **0**: phép quét mã đã bắt hết chúng trước khi bước tự bấm kịp chạy.

Nói gọn: **62% là con số bỏ đi được mà chứng minh được; 88% là con số bỏ đi được mà không.**

Chỗ vẫn không nhìn thấy: hộp thoại và trạng thái sau một chuỗi thao tác dài. Sau `--apply` vẫn
**bắt buộc** chạy `parity.js` **và** `states.js`.

## 6. Hình thức

| | Chốt |
|---|---|
| Lớp phủ cho chữ trên hero | **Làm** — để ảnh nền tối (Facade, và ảnh sau này) vẫn đọc được |
| Cắt băng đầu trang chi tiết về 1280×520 | Không làm — để ảnh giữ tỉ lệ thật, chấp nhận nhảy ~95px lúc tải |
| Sửa "Six product families" | Không làm — khách tự sửa được trong trình soạn khi cần |
| Xin bên thiết kế bộ ảnh 2x | Không làm |

## 7. Nhập nội dung bossdoor.vn

| | Chốt |
|---|---|
| Dịch | **Chọn lọc rồi viết lại**, ~60–80k từ, khớp giọng văn site hiện tại |
| Tin tức | **Giữ ~30–40 bài** — nhà máy, chứng nhận, sản phẩm mới, sự kiện. Bỏ 60–80 bài SEO địa phương |
| Nơi nhập | **Đổ thẳng** vào `wwwroot/_data`, không qua cây nháp |

"Đổ thẳng" đi ngược đề xuất trong kế hoạch, và lý do đề xuất vẫn đúng: History giữ 50 bản mỗi
tệp, một lần nhập 300+ mục sẽ ăn hết, nên **không lùi được từ giao diện**. Cách bù rẻ nhất, làm
luôn: commit sạch ngay trước khi nhập, để `git` là đường lùi. Một dòng trong kế hoạch, không tốn
thêm đợt nào.

---

## 8. Nhập bossdoor — vòng quyết định thứ hai, 18/09/2026

Sau khi cào và đo thật, mười một câu hỏi nữa. Ghi cả câu trả lời lẫn thứ tôi đã cảnh báo, để
sau này biết cái gì là lựa chọn có cân nhắc.

| | Chốt | Ghi chú |
|---|---|---|
| Số bài tin | **Đủ 30–40 như đã chốt** | Tôi đã nêu: chỉ 8 bài đạt ngưỡng B2B, muốn 30–40 phải hạ ngưỡng gần 0, tức đưa bài bán lẻ cho khách Việt lên site xuất khẩu. Anh giữ quyết định → làm đủ |
| Tên khách hàng (Aeon Mall, Cát Bi, Coteccons, FHome) | **Giữ cả ba dự án** | Đây là dòng rủi ro nhất trong cả lần nhập |
| Nhãn mô tơ bên thứ ba | **Giữ tên, bỏ ký hiệu ®** | Không viết câu nào khẳng định quan hệ phân phối |
| Con số kiểm chứng được | **Bỏ hết** | Guinness, 250 sáng chế, ISO 9001:2008, bảo hành 10/20 năm, "đầu tiên và duy nhất" |
| Tên công ty | **Giữ cả Tân Trường Sơn** | Ghi "Böss Group (Tân Trường Sơn Group)" ở những chỗ nguồn có nói |
| Barie / cổng điện / cửa kính tự động | **Chưa nhập, để sau** | Nội dung đã cào về, không mất |
| Trang giới thiệu tập đoàn | **Sửa lại 6 chương About đang có** | Là ghi đè chứ không phải thêm → đề xuất từng câu để anh duyệt trước |
| Bảo hành + quy chuẩn lắp đặt PC66 | **Sinh PDF thật rồi đưa vào Documents** | Vì mỗi mục tài liệu vẽ một nút Download PDF trỏ vào tệp thật |
| Dòng sản phẩm thứ 7 | **KHÔNG thêm. Chốt 6 dòng** | Câu "Six product families" nhờ đó vẫn đúng, không phải sửa |
| 9 mẫu cửa cuốn | **Cho vào Door's Accessory** | Tôi đã nêu: thân cửa nằm trong mục "phụ kiện cửa" là sai phân loại và khách đi tìm sẽ không thấy. Anh chọn vậy → Door's Accessory thành 5 → 40 mục |
| Ảnh | **Tải ảnh xong mới nhập** | Đợt 3 chạy trước đợt 5 |
| Cách xuất bản | **Nhập xong báo, CHƯA push** | Gửi ảnh chụp để xem trước; anh gật thì mới push, lúc ấy mới lên web |
| Năm hoàn thành 2 dự án | **Anh sẽ cho hai con số** | Masteri Nam An Khánh, Delta River Tower — chưa viết, chờ số |

## 9. Đợt ảnh, và một sự thật về nguồn — 18/09/2026

Anh chốt "tải ảnh xong mới nhập". Đã chạy đúng thứ tự đó. Nhưng đợt ảnh lộ ra một điều đáng nói
hơn cả kết quả:

**Thư viện ảnh của bossdoor.vn phần lớn là tranh quảng cáo tiếng Việt, không phải ảnh chụp sản
phẩm.** Qua ba vòng nhìn tận mắt, **23 trong 74 mục không có lấy một tấm dùng được** trên bản
tiếng Anh. Những mục ấy để `image` rỗng và `AB.ph()` vẽ ô giữ chỗ.

Vì sao chọn ô giữ chỗ chứ không phải "tấm nào cũng được":

1. Một dòng chữ tiếng Việt trên trang tiếng Anh nói với khách nước ngoài rằng trang này là bản
   dịch vội của một trang khác.
2. Phép lui "tấm này có chữ thì lấy tấm kế tiếp" đập **tám bài** xuống cùng một tấm ảnh nhà
   400×224. Tám thẻ tin cùng một tấm thì trang nhìn như hỏng — tệ hơn hẳn tám ô giữ chỗ.

**Đây là chỗ anh giúp được nhiều nhất.** Nếu có ảnh chụp nhà máy, sản phẩm, công trình thì bỏ
vào một manifest cho `tools/ingest-images.py` là xong — danh sách 23 mục đang thiếu nằm ở
`import/media/co-chu.json`, mục `bo-han`.

**Một tấm cần anh quyết riêng:** `choosing-a-shutter-operator.jpg` có dòng "Thương hiệu thuộc
Tân Trường Sơn Group" ở góc — dùng **tên thương hiệu cũ** mà bản tiếng Anh đã chủ định bỏ (mục 8).
Chưa bỏ tấm ấy, chờ anh. Tám tấm khác chỉ có dấu chìm "BossDoor" — không phải câu tiếng Việt,
nhưng là nhãn cửa cuốn trong nước đặt trên trang xuất khẩu nhôm; cũng chờ anh.

### Ba lỗi cũ lộ ra nhờ đợt này

| Lỗi | Vì sao không ai thấy trước đó |
|---|---|
| Bản ghi đè **xoá** dữ liệu đang có (`image:""` xoá mất `hero-door-accessory.jpg`) | Không báo lỗi. Chỉ là trang họ sản phẩm mất ảnh đầu trang, và phải nhìn ảnh chụp mới thấy. Đã sửa ở gốc: `merge-bossdoor.js` không để một ô rỗng đè lên ô có giá trị, và in ra đã giữ lại những gì |
| `ingest-images.py` không tìm được sản phẩm | `products.json` giữ sản phẩm sâu hơn một tầng. Thông báo lỗi **đúng** về mảng được hỏi, **sai** về cái đang thực sự đi tìm |
| Trang sản phẩm **không bao giờ** đọc trường `image` | Lỗi có trước đợt nhập. Nó không lộ ra vì trước đây chưa có tấm ảnh sản phẩm nào để mà thiếu |

---

## 10. Vòng 3 ảnh, và About us theo cách B — 18/09/2026

### Ba quyết định về ảnh có chữ tiếng Việt

| Nhóm | Quyết định | Vì sao |
|---|---|---|
| `choosing-a-shutter-operator` | **Cắt 12% trên** | Bỏ dòng "Thương hiệu thuộc Tân Trường Sơn Group" — tên thương hiệu cũ mà bản tiếng Anh đã chủ định bỏ. Phần còn lại là bản dựng ngôi nhà, nguyên vẹn |
| 8 tấm "dấu chìm" | **Giữ** | Mở từng tấm ra nhìn: đó là logo BössDoor **in trên cánh cửa** trong chính bức ảnh, không phải lớp chữ dán lên. Bỏ đi thì phải xoá vào thân ảnh |
| `ups-battery-replacement` | **Thay** | Ghi chú vòng trước xếp nó vào nhóm "chữ nhỏ" là **sai** — dòng "Tem với bình lưu điện" chạy chéo gần hết chiều ngang. Đã thay bằng ảnh chụp hai bàn tay đang thay bình |

### 27 mục trống → 16

Vòng trước kết luận "mọi tấm nguồn đều là tranh quảng cáo" sau khi thử tối đa 6 phương án mỗi mục.
Đếm lại thì 21/23 mục vẫn còn ảnh chưa ai mở ra. Vòng 3 tải hết, nhìn hết, và 11 mục có ảnh thật.

16 mục còn trống, và lần này là kết luận **sau khi xem hết**: sáu mục có toàn bộ ảnh hotlink từ
Google Docs (404 hết), bốn mục mọi tấm đều là tranh quảng cáo chiếm gần hết khung, hai mô tơ
Kasankie Eco **có** ứng viên nhưng là bản dựng nền xanh lá — thẻ sản phẩm của trang đều là ảnh cắt
nền trắng, đặt một tấm nền xanh vào giữa hàng thì lệch hẳn. Thiếu ảnh dễ sửa hơn lệch.

### About us — cách B

Giữ danh tính nhà đùn ép nhôm, và chỉ để lại trên trang những gì chỉ được ra chỗ nó đến: **2013**
nhà máy Nhôm Hoàng Kim, **2025** đổi tên thành Böss Group, **ISO 9001**. Bảng "Key figures 2026"
với 8 con số không con nào có nguồn đổi thành "At a glance" còn 3 dòng.

Mọi con số khác trong sáu chương bị gỡ và câu văn viết lại để **không cần** con số. Trang mỏng đi.
Đổi lại là mỗi câu trên đó đều chỉ được ra chỗ nó đến.

**Hai chỗ hở — xử lý 19/09/2026, và không giống nhau.**

*Chứng chỉ: để nguyên.* Kiểm kỹ hơn thì chỗ này nhỏ hơn tôi báo lần đầu. Footer đã ghi sẵn
"Demonstration site — photography and documents are specimens"; About viết "That is the
certification listed on this page", đúng nguyên văn và không phủ nhận gì; còn `colors.json` phần
lớn là **tên tiêu chuẩn mà một lớp sơn được làm theo**, không phải lời khẳng định đang giữ giấy
phép. Gỡ đi là sửa quá tay.

*Con số: đã gỡ ở bốn chỗ nói bằng giọng công ty* — footer trên cả 167 trang, `products.json`
intro, hai dòng `documents.json`, và thẻ mô tả SEO trong `reskin.py`. Giữ "Six product families"
vì nó **đếm được ngay trên trang**; một con số người đọc tự kiểm trong ba giây không cùng loại với
"1.840 người".

*`factories.json` không đụng.* Cách B giữ danh tính nhà đùn ép nhôm theo chủ ý, và bản đồ canvas
năm nhà máy chính là danh tính ấy. Ranh giới: **bản đồ và quả địa cầu là phần demo đã dán nhãn;
About là phần dựng từ nguồn thật.**

Chi tiết ở `import/en/about-de-xuat.md` mục cuối.

### Một dòng sai trong chính bản đề xuất

Bảng "bảy chỗ va nhau" ghi *"nhà máy được nêu tên là Thanh Hoá và Hoàng Kim"*. Đọc lại nguồn thì
**"Thanh Hoa" là tên một công ty thành viên**, không phải nhà máy ở tỉnh Thanh Hoá. Suýt viết
"the group manufactures at Thanh Hoá" lên trang tiếng Anh dựa vào chính dòng ghi sai của mình.

Cùng loại với lần suýt báo "bản đồ nhà máy vẫn nói về đá" ở mục 9: **chép lại một câu đúng vào lúc
viết nó ra, và không còn đúng — hoặc chưa bao giờ đúng — vào lúc đọc lại.**

---

## 11. "Không rõ năm" là một giá trị hợp lệ — 19/09/2026

Hai dự án cuối của bossdoor.vn — **Masteri Nam An Khánh** và **Delta River Tower** — có nội dung
thật nhưng **trang nguồn không ghi năm nào**. Không phải tôi bỏ sót: quét cả hai trang không có
một chuỗi bốn chữ số nào.

Trang Dự án **nhóm theo năm hoàn thành**, và năm là cách trang đó tổ chức, nên không viết vòng
được như bên About. Ba đường: đoán một năm, bỏ hai dự án, hoặc để trang biết cách nói "không rõ".
Anh Phúc chọn đường thứ ba.

**Quy ước:** `projects[].year = ""` nghĩa là **không biết năm hoàn thành**. Đây là trường duy nhất
trong cả bộ dữ liệu mà chuỗi rỗng là một câu trả lời chứ không phải một chỗ bỏ quên — mọi trường
khác để rỗng vẫn là thiếu, và `merge-bossdoor.js` vẫn chặn.

Bốn chỗ phải sửa cho quy ước này chạy đúng, và **cái thứ ba là chỗ sẽ hỏng âm thầm nếu quên**:

| Chỗ | Trước | Sau |
|---|---|---|
| Nhóm trên trang danh sách | `Object.keys(years).sort((a,b) => b-a)` — khoá `''` làm `'' - 2016` ra `NaN`, thứ tự thành không xác định | Nhóm rỗng luôn xuống cuối, tiêu đề **"Year not recorded"** |
| Ô thông số trên trang chi tiết | `['Year', a.year]` → `<dd>` rỗng, nhìn như trang lỗi | Ô rỗng **bất kỳ** in ra "Not recorded" |
| Sắp xếp "Other albums" | `y.year - x.year` → `NaN`, ba thẻ liên quan xếp lung tung | `(+y.year \|\| 0) - (+x.year \|\| 0)` |
| Vụn đường dẫn | `Projects / ` rồi bỏ lửng | Bỏ hẳn đoạn năm khi không có |

Chỗ thứ ba không hiện ra ở trang nào tôi mở đầu tiên — nó chỉ hỏng trên trang chi tiết của dự án
**khác**, nơi hai dự án không năm lọt vào danh sách "Other albums". Cùng loại với những lỗi khác
trong tài liệu này: **một giá trị mới đi qua một phép tính không ai nghĩ nó sẽ đi qua.**

Hai bài viết theo đúng luật cũ: giữ thông số kỹ thuật (mác nhôm 6063-T6), giữ tên nhà thầu
(Coteccons), **bỏ hai con số bảo hành** mà nguồn có — "bảo hành bề mặt sơn 10 năm" và "độ bền bề
mặt nhôm 20 năm" — theo quyết định bỏ hết thời hạn bảo hành khỏi bản tiếng Anh.

## 12. Ô sửa SEO, và một luật áp cho cả hai loại trang — 25/09/2026

Anh hỏi "có phần để người dùng edit SEO chưa?" — chưa. `PageHead` đã đọc `seoTitle` /
`seoDescription` trên từng mục từ trước, nhưng không có ô nào để ghi vào, và không mục nào trong
dữ liệu có sẵn hai khoá đó — mà `ContentEditor` có luật "một trường không tồn tại thì không được
tạo ra". Còn tám trang danh sách thì tiêu đề và mô tả nằm trong `build/reskin.py`, tức là trong
mã nguồn Python.

**Quyết định 1 — ngoại lệ có tên.** `seoTitle` và `seoDescription` được phép tạo ra, và chỉ hai
tên đó, và chỉ khi đối tượng chứa chúng đã có sẵn. Ghi `""` vào ~300 mục để trình soạn có chỗ
địa chỉ là 300 dòng không nói gì. Luật gốc vẫn đứng cho mọi thứ nó **không** gọi tên.

**Quyết định 2 — bỏ trống nghĩa là xoá khoá, không phải ghi `""`.** Cùng lý lẽ với `visible`: một
ô chưa ai ghi và một ô vừa bị xoá trắng phải để lại cùng một trạng thái trong tệp.

**Quyết định 3, và đây là cái đáng ghi nhất — cái người ta GÕ VÀO là cả câu.** Không ghép gì vào
sau, không cắt gì đi. Trước đó `ForItem` luôn ghép `" | <tên site>"` vào tiêu đề; giờ chỉ giá trị
**tự sinh** mới được ghép, còn giá trị gõ tay thì giữ nguyên văn. Mô tả cũng vậy: `Trim(…, 160)`
chỉ cắt cái tự sinh (nguồn của nó là cả một đoạn văn, phải cắt mới vừa), còn mô tả gõ tay thì
không đụng đến — mô tả trang chủ hiện dài 165 ký tự, cắt nó đi là tự ý sửa nội dung.

Lý do phải thống nhất: trang danh sách giữ **cả tiêu đề** trong `site.json` (trang chủ có dạng
riêng "Boss Group - Vietnam's Leading Aluminum Exporter", không theo khuôn `X | AluminumBoss`
được). Nếu trang mục lại ghép đuôi còn trang danh sách thì không, thì hai loại trang có hai luật
cho cùng một ô, và đó là chỗ người dùng sẽ vấp.

Hệ quả: **ô đếm ký tự không phải là ngưỡng phần mềm này áp.** Nó ghi "khoảng 60" / "khoảng 160"
và nói rõ đó là chỗ Google cắt. Một ô ghi "160 / 160" là hứa một sự cưỡng chế không có thật.

**Một phép đo sai đã bị bỏ.** Kế hoạch ban đầu định chứng minh việc chép `TITLE`/`BLURB` sang
`site.json` là trung thành bằng cách chạy lại `reskin.py` và đòi `git diff site/` rỗng. Đo xong
mới biết phép đo đó **luôn thất bại**: `reskin.py` là bước giữa, sau nó còn `add-addresses.js`
mới đóng các `data-ab-*` lên trang. Chạy một mình `reskin.py` trên cây sạch — trước khi tôi động
vào gì — đã làm đổi 152 trang. Phép đo đúng là chạy **bản cũ** và **bản mới** trên cùng một cây
sạch rồi so hai kết quả: **giống hệt trên cả 152 trang.**

Và giá trị chép sang `site.json` lấy **từ trang đã dựng**, không lấy từ `TITLE`/`BLURB`: một số
tiêu đề hiện nay đến từ thẻ `<title>` có sẵn chứ không từ bảng đó (`about-us` không hề có mục
trong `TITLE`), nên chép từ mã nguồn Python sẽ đổi tiêu đề bảy trang mà không ai yêu cầu.

**Vẫn chưa đóng:** trang tĩnh trên GitHub Pages mang đầu trang của khuôn mẫu cho mọi mục. Việc
này cần một quyết định riêng (deploy `export/` hay thêm bước nướng lại trước khi push).

## 13. Máy chủ dùng MySQL thay cho SQLite — 28/09/2026

Anh yêu cầu cài MySQL trên VPS và dùng nó thay cho SQLite. Đã làm; máy làm việc vẫn là SQLite.

**Cái gì thật sự đổi.** Cơ sở dữ liệu chỉ có hai bảng: tài khoản đăng nhập và lịch sử sửa. Nội dung
trang **không** nằm trong đó — nó ở các tệp JSON. Nên việc chuyển là một thay đổi cấu hình, không
phải một lần viết lại: `Database__Provider=mysql` trên máy chủ, không đặt gì ở máy làm việc.

**Tên sai thì không khởi động.** Giá trị lạ của `Database:Provider` ném lỗi chứ không lặng lẽ rơi
về SQLite. Rơi về lặng lẽ trên máy chủ nghĩa là một tệp SQLite mới tinh, và bộ khởi tạo ghi ngay
`admin` / `changeme` — mật khẩu có trong mã nguồn công khai, trên một địa chỉ công khai.

**Hai cột phải có độ dài.** `Name` và `Username` nằm trong chỉ mục; chuỗi không giới hạn thành
`longtext` trên MySQL, và MySQL từ chối đánh chỉ mục `longtext` — `EnsureCreated` sẽ vỡ ngay câu
`CREATE INDEX` đầu tiên. Trên SQLite thêm độ dài không đổi gì.

**Hai điều được đo chứ không tin:**
- Lời khuyên nói có 639 bản lịch sử cần chuyển. Con số đó là của **máy làm việc**; trên VPS đếm ra
  1 tài khoản, 0 lịch sử.
- Lời khuyên lo `datetime` bị làm tròn về giây. Đo sau khi tạo bảng: cột là `datetime(6)`,
  micro-giây.

**Thứ tự chuyển có lý do.** Schema được tạo bằng một bản ứng dụng chạy ở `127.0.0.1:5001`, không
qua nginx: `EnsureCreated` xong là bộ khởi tạo ghi `admin` / `changeme`, và chạy ở cổng thật thì
trong vài giây đó ai trên internet cũng vào được. Sau đó tài khoản thật thay cho tài khoản vừa
khởi tạo, đối chiếu **từng trường, từng byte** (không chỉ đếm dòng — chuỗi tiếng Việt hỏng mã
vẫn là một dòng), rồi mới nối vào bằng drop-in systemd.

**Bằng chứng ứng dụng thật sự đọc MySQL**, vì biến môi trường đúng chưa chứng minh điều đó:
tiến trình giữ một kết nối TCP tới 3306, MySQL thấy `qlweb2@localhost → qlweb2`, và tiến trình
**không mở tệp SQLite nào**.

**Cái mất đi khi bỏ SQLite, nói ra để khỏi quên:** sao lưu không còn là chép một tệp. Đã thêm
`mysqldump` mỗi đêm, giữ 14 bản — và đã **khôi phục thử** một bản vào CSDL tạm, so mã băm, khớp.
Một bản sao lưu chưa từng khôi phục thì chưa phải là sao lưu. Thêm nữa: một tiến trình ~150 MB
thường trực trên máy 1,9 GB (đã chỉnh từ mặc định), và một mật khẩu dịch vụ phải giữ — nó nằm
duy nhất trong `/etc/qlweb2/db.env`, quyền 0600, sinh ngay trên máy.

**Sửa kèm:** cách cứu mật khẩu trong `HANDOVER.md` bảo "xoá tệp `qlweb2.db`" — giờ không còn tác
dụng, và kể cả trước đó cũng thừa vì nó vứt luôn toàn bộ lịch sử trong khi chỉ cần xoá một dòng.
Đã thay bằng `DELETE FROM AdminUsers` và chạy thử quy trình trên một bản sao.

## 14. Rà soát hướng dẫn sử dụng — 28/09/2026

Anh yêu cầu rà soát, kiểm tra và viết lại `docs/HUONG-DAN.md`. Kiểm tra làm bằng cách **đi qua
từng màn hình thật** và **chạy thử từng việc** trên máy chủ ở máy làm việc (cùng mã với máy chủ),
không chỉ đọc mã. Công cụ để lại: `tools/guide-check.js`.

**Tên nút gần như đúng hết** — bản cũ đã đối chiếu với mã nguồn. Cái sai nằm ở chỗ khác, và đó là
bài học của lần này: một hướng dẫn có thể đúng từng chữ mà vẫn dẫn người đọc vào ngõ cụt.

Sáu chỗ chặn người mới ngay tại bước làm:

1. **Form liên hệ không nằm ở `/contact/`.** Bản cũ bảo "mở /contact/ rồi điền thử" — trang đó
   chỉ có bốn ô dẫn tới form (**START**, **REQUEST SAMPLES**…), không có form nào.
2. **Không nói cách chọn trang cần sửa.** Vào `/Admin` là vào trang chủ; muốn sửa một bài tin thì
   phải dùng ô **PAGE**, bấm thường trong khung, hoặc nút **Edit** ở màn hình Content. Bản cũ
   không nhắc cái nào.
3. **`Restore this version` đưa CẢ loại nội dung về bản cũ.** Khôi phục `news` để sửa một chữ là
   mọi bài tin sửa từ đó tới nay cũng quay về. Bản cũ ghi "sửa nhầm — vào đây lấy lại".
4. **Mục vừa `Add an item` hiện ngay trên trang công khai, dù còn trống** — đã thử thật: một thẻ
   `new-…` trống lên `/news/` ngay lập tức.
5. **"Sáu mục" và "Site content — trang chính"**: `Site content` là tên khu quản trị ở góc trái,
   không phải một mục. Menu có năm mục.
6. **Quên mật khẩu: "cần người kỹ thuật"** mà không nói làm gì. Giờ có lệnh, và đã chạy thử trên
   một bản sao CSDL.

**Một lỗ hổng tính năng, không phải lỗi tài liệu — đã báo anh, CHƯA làm:** không đăng được một
bài tin hoàn chỉnh từ giao diện. Bài **mới** chỉ có 6 ô (tiêu đề, tác giả, ảnh, tóm tắt, hai ô
SEO) — **không có ô cho thân bài, ngày đăng, thẻ**, vì trình soạn chỉ hiện ô cho những gì trang
đang vẽ và một danh sách rỗng thì không vẽ gì. Bài **đã có** sửa được các đoạn và thẻ đang có
nhưng không thêm/bớt được, và **ngày đăng không sửa được ở đâu cả**. Bài mới không ngày thì nằm
cuối danh sách tin. Hướng dẫn mới nói thẳng điều này thay vì dạy một quy trình không đi tới đích.

**Một lỗ hổng sao lưu, đã sửa:** bản sao lưu dựng lúc chuyển MySQL (mục 13) chỉ có `mysqldump` —
tức là sao lưu phần ít giá trị nhất (một tài khoản, lịch sử sửa) và bỏ qua chính cái site: chữ
của trang, ảnh, đơn liên hệ đều nằm trong tệp, ngoài MySQL. Lộ ra khi hướng dẫn phải ghi rõ "cái
gì được sao lưu". Đã thêm `noi-dung-*.tar.gz`, và **giải nén thử** — mã băm khớp với bản đang chạy.

**Hai lỗi hiển thị trong trang hướng dẫn cũ**, cả hai có từ bản đầu: danh sách các bước dùng lưới
trên từng `<li>` nên mỗi tên nút giữa câu thành một ô riêng và chồng lên chữ; và các câu thông báo
dài in thành chip không xuống dòng, đẩy trang ra 185 px ở bề ngang điện thoại.


## 15. Bài tin hoàn chỉnh từ giao diện, và ảnh chụp trong hướng dẫn — 28/09/2026

Anh yêu cầu làm nốt lỗ hổng ghi ở mục 14 rồi cập nhật hướng dẫn, kèm ảnh chụp và mô tả. Kế
hoạch: `docs/KE-HOACH-BAI-TIN.md`.

**Ngày đăng** là một loại ô mới (`data-ab-date`), hiện thành bộ chọn ngày. Máy chủ chỉ nhận
`yyyy-MM-dd` là một ngày có thật, hoặc để trống — `2026-02-30` bị từ chối ngay ở `Save`, không
phải ở màn hình. Dòng ngày trên bài luôn được vẽ, kể cả khi trống: một ô không được vẽ thì trình
soạn không biết có nó, và đó chính là lý do bài mới trước đây không có ô ngày.

**Đoạn văn và thẻ** thêm/xoá/đổi thứ tự qua một điểm cuối riêng, `POST /Admin/Edit/List`, và
**chỉ** cho các danh sách ghi trong `Content/ItemLists.cs` (hiện là `body` và `tags` của bài tin).
Địa chỉ gửi lên nguyên vẹn chứ không phải "danh sách + số thứ tự đếm trên màn hình". Ghi ngay,
không chờ Save, vì nó đổi số ô trên trang; nên màn hình hỏi lưu phần đang gõ dở trước. Mỗi lần
ghi đều để lại một bản trong History, giống Save.

Để trình soạn biết một danh sách rỗng có tồn tại, trang ở chế độ sửa mang thêm một dấu ẩn
`data-ab-list` cho mỗi danh sách. Trang công khai không mang dấu này (đã kiểm: 0 lần xuất hiện).

**Hai lỗi lộ ra khi kiểm, đã sửa:** con trỏ không vào được đoạn vừa thêm, vì khung xem báo "đã
tải xong" hai lần và lần thứ hai dựng lại cả cột trái. Và một biến mới trùng tên với biến của
dòng "Add, reorder or remove", làm dòng đó thôi đi theo khi khung xem đổi trang. `editor-clicks.js`
bắt được lỗi thứ hai.

**Ảnh trong hướng dẫn** (18 hình, `docs/huong-dan/`) do `tools/guide-shots.js` chụp từ máy làm
việc. Vòng khoanh được vẽ lên trang lúc chụp, ở toạ độ lấy từ chính trang, chứ không vẽ đè lên
ảnh về sau: giao diện đổi thì chạy lại là vòng khoanh đổi theo. Để chụp được một bài tin mới, công
cụ thêm một bài thật rồi xoá nó đi và so mã băm tệp dữ liệu, giống `article-edit.js`.

## 16. Thêm nhà máy / kho, và ghim bản đồ đi theo tỉnh — 29/09/2026

Khách hỏi: đã điền 5 nhà máy, giờ thêm một **kho ở TP.HCM** vào đâu? Không có chỗ nào —
**Factories** không có nút thêm, vì mỗi điểm cần vĩ độ/kinh độ. Kế hoạch: `docs/KE-HOACH-NHA-MAY.md`.

Xem dữ liệu thật trên máy chủ lộ ra lỗi lớn hơn câu hỏi: **cả 5 ghim vẫn ở chỗ của bản demo**.
Khách đổi tên và ô tỉnh (`region`) thành "Ha Noi", nhưng `region` chỉ là chữ; ghim vẫn ở Yên
Bái, Thanh Hoá, Nghệ An, Quy Nhơn, Bình Dương. Trang đang báo sai vị trí nhà máy của khách.

**Cách làm:** mỗi điểm có thêm ô **place**, chọn trong 63 tỉnh (`Content/Places.cs`), và máy chủ
tự ghi `lat`/`lon` của tỉnh lỵ — không ai gõ toạ độ. Thêm ô **kind** (`Factory` / `Warehouse`):
kho vẽ ghim vuông, có dòng chú giải riêng, và không được đếm vào con số cạnh tiêu đề
(`data-ab-count-kind`). Hai ô này được phép **tạo mới** trên điểm cũ chưa có (ngoại lệ thứ hai
sau hai ô SEO), vì 5 điểm trên máy chủ viết trước khi có chúng và sửa tay tệp của khách thì không
nên. Điểm cũ chưa có `place` thì trình soạn hiện tỉnh **ghim đang đứng** — để khách thấy ngay
"Ha Noi" của mình đang được vẽ ở Yên Bái.

**63 tỉnh cũ, không phải 34 tỉnh mới:** ghim chỉ cần đúng vùng, và tên cũ là thứ khách đang
viết ("Binh Phuoc"). Tên mới vẫn gõ được ở ô chữ `region`.

**Ba lỗi của bản đồ, lộ ra khi có điểm thứ sáu, đã sửa:**
- Thẻ ảnh hai bên xếp theo **mã cố định** `L:['yb','th','na'], R:['bd','bg']` (`bg` không phải mã
  nào). Điểm mới có thẻ không được xếp. Giờ chia theo vĩ độ: nửa bắc trái, nửa nam phải.
- Đường chấm nối các điểm đi theo **thứ tự danh sách**; điểm mới lên đầu danh sách nên đường vạch
  từ TP.HCM thẳng lên Yên Bái. Giờ nối theo vĩ độ.
- Điểm vừa thêm có toạ độ 0,0 và màu rỗng — sẽ được vẽ ở vịnh Guinea và kéo cả bản đồ ra theo.
  Giờ điểm chưa chọn tỉnh không lên bản đồ; chữ của khách vào HTML qua `esc()`.

**Một lỗ hổng cũ ở chính cửa lưu, đã sửa** (`ContentPath.TrySet`): lưu thay **mọi thứ** ở địa chỉ
bằng một chuỗi. Trình soạn chỉ gửi địa chỉ chữ nên không ai thấy, nhưng: ô nhiều dòng (địa chỉ ở
chân trang, câu lớn ở trang chủ) lưu dạng danh sách dòng, và lưu nó sẽ biến danh sách thành một
chuỗi — trang in ra trên một dòng; còn một yêu cầu tự tạo thì ghi đè được một con số, một mục,
cả một danh sách bằng một chữ. Giờ giữ nguyên hình: chữ thay chữ, danh sách dòng nhận lại từng
dòng, còn lại từ chối. Kiểm thử bắt được lỗ này khi thử gửi thẳng `factories.sites.0.lat`. Dữ liệu
trên máy chủ chưa dính (đã kiểm ba ô nhiều dòng: vẫn là danh sách).
