# Images

Drop image files in **this folder** and they replace the grey placeholder blocks
automatically. No code change, no rebuild, no restart — just refresh the page.

- Supported extensions (tried in this order): `.jpg` `.jpeg` `.png` `.webp` `.avif`
- Name the file exactly as the key below, e.g. `home-hero.jpg`
- Any key with no matching file stays a labelled grey placeholder, so you can add
  images gradually — a half-filled folder renders fine.
- Images are rendered with `object-fit: cover` into a fixed aspect ratio per slot,
  so they get cropped, not stretched. Use reasonably large source files
  (~1600px wide for full-width slots, ~800px for cards).

## Home page (`/`)

| Key | Where it appears | Suggested ratio |
|---|---|---|
| `home-hero` | Full-bleed hero background behind the big headline | 16:9, wide |
| `category-countertops` | "Countertops" card | 4:5 portrait |
| `category-cladding` | "Cladding and coverings" card | 4:5 portrait |
| `category-sinks` | "Sinks" card | 4:5 portrait |
| `promo-featured` | Photo half of the terracotta promo banner | 4:3 |
| `gallery-01` … `gallery-10` | Inspiration gallery grid (10 tiles) | 1:1 square |
| `material-closeup` | "Material Name…" split section | 16:10 |
| `renovation` | "Planning A Renovation?" split section | 16:10 |
| `solution-flooring` | Solutions card 1 | 4:3 |
| `solution-cladding` | Solutions card 2 | 4:3 |
| `solution-furniture` | Solutions card 3 | 4:3 |

## Colors list (`/colors`)

| Key | Where it appears | Suggested ratio |
|---|---|---|
| `colors-hero` | Hero photo next to the page headline | 16:9 |
| `product-<slug>` | Each swatch tile — see product list below | 1:1 square |

## Product detail (`/colors/<brand>/<slug>`)

Replace `<slug>` with the product's slug (`color-01` … `color-24` in the seeded data).

| Key | Where it appears | Suggested ratio |
|---|---|---|
| `product-<slug>` | Swatch used on home / list / "similar colors" | 1:1 square |
| `product-<slug>-lifestyle` | Large main photo at the top of the detail page | 4:3 |
| `product-<slug>-thumb-1` … `-thumb-4` | Thumbnail strip beside the main photo | 1:1 square |
| `product-<slug>-slab` | Full-width "detailed view of the full slab" | 21:9 very wide |
| `project-01` … `project-05` | "Projects using this material" mosaic (shared by all products) | mixed |
| `showroom` | Dark "find where to buy" banner | 4:3 |
| `refurbishment` | "Do you have a refurbishment?" banner | 4:3 |
| `benefit-01` … `benefit-05` | Material benefits row | 1:1 square |
| `moodboard` | "Combine this material like a pro" | 4:3 |

Seeded product slugs: `color-01` through `color-24`.
So the swatch for the first product is `product-color-01.jpg`, and so on.

## About (`/about`)

| Key | Where it appears | Suggested ratio |
|---|---|---|
| `about-hero` | Full-bleed hero background | 16:9, wide |
| `about-company` | "Who We Are" section | 16:10 |
| `about-culture` | "How We Work" section | 16:10 |
| `about-sustainability` | "Sustainability & Impact" section | 16:10 |
| `about-people` | "Meet The People" section | 16:10 |
| `press-01` `press-02` `press-03` | Press mention cards | 4:3 |

## News (`/news` and `/news/<slug>`)

| Key | Where it appears | Suggested ratio |
|---|---|---|
| `news-<slug>` | Article's card in the list, and its hero on the detail page | 3:2 (21:9 when featured) |
| `newsletter` | Photo in the newsletter block at the bottom of an article | 16:10 |

Seeded article slugs:

- `product-launch-announcement`
- `brand-collaboration-event`
- `trade-show-spring-edit`
- `design-partnership-unveiled`
- `company-milestone-announcement`
- `annual-financial-results`
- `showcase-project-feature`

So the hero for the first article is `news-product-launch-announcement.jpg`.

## Adding your own products / articles

Keys are derived from the database slug, so adding a row to `Products` or
`NewsArticles` automatically creates a new expected filename — `product-<new-slug>`
or `news-<new-slug>`. Nothing in the views needs to change.

## Licensing note

Only put images here that you have the right to use and publish. The template
ships with no photography of its own; every slot is an empty placeholder until
you fill it.
