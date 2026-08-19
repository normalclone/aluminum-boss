# aluminum-boss — demo site

Static mirror of a surfaces manufacturer's site, used as the shell for two custom sections
built for this project. Serve `site/` with any static file server and open `/usa/`.

## Layout

| Path | Viewport it was captured at | Pages |
|---|---|---|
| `/usa/` | desktop 1440 | 102 |
| `/t834/usa/` | tablet 834 | 21 |
| `/m390/usa/` | mobile 390 | 21 |

The three variants cannot share paths: each is a separate serialization of the same URLs at a
different width, with computed pixel sizes baked into `style` attributes, so inline styles win
over media queries. Internal links inside the tablet and mobile trees are rewritten to stay
within their own prefix.

## The two custom sections

Both are injected into the three homepages, between "Architectural Surfaces" and "New":

1. **Export globe** (`.vgx`) — orthographic globe, shipping routes from Vietnam to four
   markets. Selecting a market turns the globe to it and isolates that route.
2. **Factory map** (`.vfx`) — perspective map of Vietnam with five factories. Desktop shows
   callout cards joined to their pins by leader lines; tablet drops the cards so the map gets
   the full canvas; mobile drops the map entirely and lists the factories instead.

Every class in both sections is prefixed (`vgx-`, `vfx-`). Prefixing rather than nesting is
deliberate: nesting would stop these rules leaking out, but not stop the host stylesheet —
which defines its own `.card`, `.stage`, `.legend` — from leaking in.

Both sections render into a canvas with no external assets: the plant elevations and stone
swatches are drawn at runtime, and the country outline is Natural Earth 1:10m (public domain).

## Serving

A plain static server works, with one requirement: some assets were saved without a file
extension (`.bin`), so the server must sniff content type rather than trust the extension.
Without that, stylesheets saved as `.bin` are refused by the browser and the page falls back
to system fonts.
