# aluminum-boss — demo site

Static mirror of a surfaces manufacturer's site, used as the shell for two custom sections
built for this project. Serve `site/` with any static file server and open `/usa/`.

## Layout

| Path | Viewport it was captured at | Pages |
|---|---|---|
| `/usa/` | desktop 1440 | 102 |
| `/t834/usa/` | tablet 834 | 21 |
| `/m390/usa/` | mobile 390 | 21 |

The desktop tree is now responsive on its own: `/usa/` reflows from 1440 down to 390 with no
horizontal overflow on any of its 102 pages. The tablet and mobile trees predate that fix and
are kept only as a reference capture; there is no longer a reason to send anyone to them.

They were originally separate because each is a serialization of the same URLs at a different
width, with computed pixel sizes baked into `style` attributes where inline styles outrank
media queries. That is now handled by overriding those frozen values below the width they were
captured at - see `frozen-width-fix` in each page's head.

## The two custom sections

Both are injected into the three homepages, between "Architectural Surfaces" and "New":

1. **Export globe** (`.vgx`) — orthographic globe carrying two kinds of route: sea lanes to
   the EU, North America and Australia, and overland runs to Laos, Cambodia and Thailand,
   grouped as ASEAN. Selecting an entry turns the globe to it and isolates that route.

   The sea lanes are waypoint polylines, not great circles. A great circle from Vietnam to
   Rotterdam runs straight across Asia, which is the one path a ship cannot take; these
   follow Malacca, the Indian Ocean, Bab el-Mandeb, Suez and Gibraltar. Both kinds hug the
   surface rather than arcing above it, because an arc reads as a flight path.
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

## Published site

Deployed to GitHub Pages by `.github/workflows/pages.yml`, which publishes `site/`.

Three things had to change before Pages could serve this tree, and each is worth knowing
before editing it:

**Paths are relative, not absolute.** A project Pages site is served from a subpath
(`/aluminum-boss/`), so `/_assets/x.css` would resolve against the domain root and 404.
Relative paths were chosen over hardcoding the repo name as a prefix because they work
unchanged both on Pages and on a local server rooted at `site/`.

**Files carry real extensions.** Assets fetched from extensionless URLs were saved as `.bin`.
A local server can sniff content and serve them correctly; Pages goes by extension alone, so
a `.bin` stylesheet arrives as `application/octet-stream` and the browser refuses it — which
silently drops the page to system fonts. 403 files were sniffed and renamed, references
followed. Six `.bin` files remain: XML feeds and oembed endpoints that are never rendered.

**Photographs are downscaled.** The originals were print resolution, up to 11215x8412, for
images displayed a few hundred pixels wide; 987 MB against Pages' 1 GB ceiling. The long edge
is capped at 2400px, which is invisible at display size and takes the site to 656 MB. The
originals remain in history at commit `a180975` and can be recovered with
`git show a180975:<path>`.

## Known gaps

Roughly 355 image URLs point at hosts that were never mirrored (`assetsstatic.cosentino.com`,
`img.youtube.com`), so about 23 pages show broken images. `DEMO.md` lists which ones. The
homepage and the two custom sections are unaffected.
