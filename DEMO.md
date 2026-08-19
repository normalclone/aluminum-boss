# Cây demo — port 8999

Tất cả nằm trên một port. 144 trang, toàn bộ trả 200.

| Biến thể | Mở tại | Số trang |
|---|---|---|
| Desktop | http://127.0.0.1:8999/usa/ | 102 |
| Tablet 834 | http://127.0.0.1:8999/t834/usa/ | 21 |
| Mobile 390 | http://127.0.0.1:8999/m390/usa/ | 21 |

Cả ba trang chủ đều có quả địa cầu xuất khẩu và bản đồ 5 nhà máy.
Thứ tự: Hero -> Architectural Surfaces -> Quả địa cầu -> Bản đồ nhà máy -> New -> ...

Ba biến thể là ba lần serialize ở ba khổ màn khác nhau (kích thước bị nướng cứng vào
thuộc tính style), nên không dùng chung đường dẫn được. Link nội bộ của bản mobile và
tablet đã được viết lại để ở nguyên trong biến thể của nó.

## Bản đồ nhà máy theo khổ màn

- Desktop: 5 thẻ nhà máy hai bên, có đường dẫn nối tới pin.
- Tablet/mobile: ẩn thẻ (hai cột thẻ cần 532px mới đủ chỗ), bù lại bản đồ chiếm trọn
  khung và thông tin hiện qua tooltip khi chạm.

## Trang sạch hoàn toàn — 65 (đo ở bản desktop)

- /usa/404-error/
- /usa/architectural-solutions/
- /usa/bathroom-visualizer/
- /usa/black-kitchen-countertops/
- /usa/black-shower-trays/
- /usa/blog/
- /usa/blog/10-kitchen-organisation-ideas/
- /usa/c-magazine/
- /usa/classic-style/
- /usa/color-details/
- /usa/colors/
- /usa/contact-2/
- /usa/contact-for-professionals/
- /usa/contact/
- /usa/cookie-policy/
- /usa/cosentino-group/
- /usa/dekton-stonika/
- /usa/download-c-bath/
- /usa/eternal-collection/
- /usa/ethereal/
- /usa/ethereal/ethereal-dusk/
- /usa/ethics-compliance/
- /usa/eventdetail-2/
- /usa/eventdetail/
- /usa/facades/
- /usa/facades/4-types-facade-waterproofing/
- /usa/fix-claim-form/
- /usa/gallery/
- /usa/impulsa/
- /usa/ingenia/
- /usa/innovation/
- /usa/inspiration-old/
- /usa/inspiration-project/
- /usa/inspiration/
- /usa/inspiration/architecture/
- /usa/inspirations/
- /usa/kitchen-visualizer/
- /usa/kitchens/contemporary-veining/
- /usa/living-room/boho-chic-classic-renovated/
- /usa/milan-design-week-2022/
- /usa/new-silestone/
- /usa/news/
- /usa/news/celebrating-the-best-kitchen-of-the-year-2025-winners-north-america/
- /usa/outdoor/continuity-versatility-durability-outdoor/
- /usa/page-center/
- /usa/page-city/
- /usa/people/
- /usa/professional/architects-old/
- /usa/project/
- /usa/quartz-countertop-mineral-surface/
- /usa/recycled-display/
- /usa/safety-at-cosentino/
- /usa/safety-at-cosentino/silicosis/
- /usa/scalea/
- /usa/sensa/
- /usa/sitemap/
- /usa/store/
- /usa/styles-and-trends/
- /usa/suede/
- /usa/sustainability/
- /usa/warranty-registration/
- /usa/webinar/
- /usa/where-to-buy-professional-contact/
- /usa/where-to-buy-results/
- /usa/where-to-buy/

## Nên tránh khi demo — còn ảnh vỡ (23)

Ảnh nằm trên host ngoài (assetsstatic.cosentino.com, img.youtube.com) chưa clone,
hoặc file gốc thiếu từ lần clone đầu. Không liên quan tới merge.

- /usa/rockmasters-results/ — 101 ảnh vỡ
- /usa/the-collection/ — 18 ảnh vỡ
- /usa/downloads/ — 16 ảnh vỡ
- /usa/chromica/ — 8 ảnh vỡ
- /usa/liquid/ — 7 ảnh vỡ
- /usa/avant-garde/ — 7 ảnh vỡ
- /usa/portfolio-20/ — 7 ảnh vỡ
- /usa/rock-masters/ — 4 ảnh vỡ
- /usa/coming-soon/ — 2 ảnh vỡ
- /usa/eclos/ — 2 ảnh vỡ
- /usa/ukiyo/ — 1 ảnh vỡ
- /usa/qr-silestone/ — 1 ảnh vỡ
- /usa/living-room/ — 1 ảnh vỡ
- /usa/sensa/cladding/ — 1 ảnh vỡ
- /usa/silestone/ — 1 ảnh vỡ
- /usa/about-us/ — 1 ảnh vỡ
- /usa/culture/ — 1 ảnh vỡ
- /usa/dekton/amazonik/ — 1 ảnh vỡ
- /usa/hdis/ — 1 ảnh vỡ
- /usa/hdis/dekton/ — 1 ảnh vỡ
- /usa/history/ — 1 ảnh vỡ
- /usa/professional/cosentino-city/alicante/ — 1 ảnh vỡ
- /usa/silestone-xm/earthic/ — 1 ảnh vỡ
