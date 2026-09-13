using System.Text;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// Builds the list and card markup the browser used to build.
///
/// This is what puts real words in the HTML a crawler receives. Measured before this existed: the
/// whole of what a bot could read on an article page was the nav and the footer - 672 characters
/// of chrome and not one word of the article - because every list and every card was assembled by
/// JavaScript after load. GPTBot, ClaudeBot, PerplexityBot and CCBot fetch HTML and read it.
///
/// A template asks for a section with <c>data-ab-section="news-list"</c>. Markup produced here is
/// the same markup the scripts produced, so the stylesheet, the behaviour scripts and the pixel
/// comparison all carry over unchanged.
/// </summary>
public sealed class SectionRenderer
{
    private readonly ContentStore _store;

    public SectionRenderer(ContentStore store) => _store = store;

    /// <summary>
    /// Which JSON document a section reads from, by name.
    ///
    /// The name is worth having on its own, not only the parsed document: an address starts with
    /// it - <c>news.items.3.image</c> - and the composer stamps it onto the section element so the
    /// editor can work out the full address of anything inside.
    /// </summary>
    public string? DocumentFor(string section) => section switch
    {
        "news-list" or "news-detail" => "news",
        "products-list" or "products-detail" or "home-hero-words" or "home-hero-caption"
            or "home-products" => "products",
        "projects-list" or "projects-detail" or "home-projects" => "projects",
        "colors-filters" or "colors-count" or "colors-list" or "colors-detail" or "home-colors"
            => "colors",
        "documents-filters" or "documents-count" or "documents-list" or "documents-detail"
            => "documents",
        "about-nav" or "about-figures" or "about-chapters" or "about-detail" or "about-chapbar"
            => "about",
        "contact-offices" or "contact-routes" or "contact-detail" => "contact",
        "home-feature" => "feature",
        "home-highlights" => "highlights",
        "home-gallery" or "home-gallery-tags" => "gallery",
        "home-app-tabs" or "home-app-slides" => "applications",
        "globe-routes" => "globe",
        "factories-list" => "factories",
        _ => null,
    };

    /// <summary>The JSON document a section reads from, or null when the name is not one we know.</summary>
    private JsonNode? DocFor(string section)
        => DocumentFor(section) is { } name ? _store.Get(name) : null;

    /// <summary>
    /// The items a detail page can show, in the order the listing shows them. The first is what an
    /// unrecognised id falls back to, which is what the scripts have always done.
    /// </summary>
    private static List<JsonNode> DetailItems(string section, JsonNode doc) => section switch
    {
        "news-detail" or "colors-detail" => Arr(doc, "items"),
        "products-detail" => Arr(doc, "categories"),
        "projects-detail" => Arr(doc, "albums"),
        // One document page per document, not per category, so the list is flattened.
        "documents-detail" => Arr(doc, "categories").SelectMany(c => Arr(c, "items")).ToList(),
        "about-detail" => Arr(doc, "chapters"),
        "contact-detail" => Arr(doc, "routes"),
        _ => [],
    };

    private static List<JsonNode> Arr(JsonNode? node, string key)
        => (node?[key] as JsonArray)?.OfType<JsonNode>().Where(Shown).ToList() ?? [];

    /// <summary>
    /// Whether an item is published. Absent means yes.
    ///
    /// Hiding is not deleting, and the difference matters to somebody running a site: a product
    /// that is out of stock this quarter, an article held until Monday. A hidden item keeps its
    /// place in the file - so every address around it stays where it was - and disappears from
    /// every list, every count, and its own page, which then answers 404 like any other address
    /// nobody has.
    ///
    /// The test is written the long way round because these lists also hold plain strings - tags,
    /// paragraphs, lines of an address - and asking a string whether it is visible throws.
    /// </summary>
    private static bool Shown(JsonNode? node)
        => node is not JsonObject o
           || o["visible"] is not JsonValue v
           || !v.TryGetValue<bool>(out var yes)
           || yes;

    /// <summary>
    /// The id this page will actually render, given whatever arrived in the query string.
    ///
    /// The composer needs this before it composes, because the composed page is cached and the
    /// cache key has to be an id we recognise. Keying on the raw query instead would hand a
    /// stranger an unbounded dictionary: every ?id=&lt;random&gt; would be one more entry.
    /// </summary>
    public string? CanonicalId(string section, string? wanted)
    {
        var doc = DocFor(section);
        if (doc is null) return null;

        var items = DetailItems(section, doc);
        if (items.Count == 0) return null;

        var hit = items.FirstOrDefault(i => Str(i, "id") == wanted);
        return Str(hit ?? items[0], "id");
    }

    /// <summary>
    /// The path segment an item lives under: <c>/news/press-line-2500/</c>.
    ///
    /// A written <c>slug</c> wins; otherwise the id is the slug. The ids were already
    /// url-shaped - lower case, digits and hyphens - so deriving the slug from them is what kept
    /// every address the same on the day the paths changed, and it leaves the data free of
    /// ninety-four fields repeating a value that is already there. The day a client renames one,
    /// the editor writes a <c>slug</c> on that one item and a line in <c>redirects.json</c>.
    /// </summary>
    private static string Slug(JsonNode? item)
    {
        var written = Str(item, "slug");
        return written.Length > 0 ? written : Str(item, "id");
    }

    /// <summary>
    /// The id behind a slug, or null when no item claims it.
    ///
    /// Strict, unlike <see cref="CanonicalId"/>: a slug nobody has must become a 404 rather than
    /// quietly serve the first item, or the same article answers at every URL a crawler invents.
    /// </summary>
    public string? IdForSlug(string section, string slug)
    {
        var doc = DocFor(section);
        if (doc is null || slug.Length == 0) return null;

        var hit = DetailItems(section, doc).FirstOrDefault(i => Slug(i) == slug);
        return hit is null ? null : Str(hit, "id");
    }

    /// <summary>
    /// The slug of the item an old <c>?id=</c> URL was showing, so it can be redirected there.
    /// Falls back the way the old page did - to the first item - rather than to a 404.
    /// </summary>
    public string? SlugForId(string section, string? wantedId)
    {
        var doc = DocFor(section);
        if (doc is null) return null;

        var items = DetailItems(section, doc);
        if (items.Count == 0) return null;

        var hit = items.FirstOrDefault(i => Str(i, "id") == wantedId);
        return Slug(hit ?? items[0]);
    }

    /// <summary>
    /// Where a field sits inside its document: <c>items.3.image</c>.
    ///
    /// Worked out from the node itself rather than from the loop it arrived in. Every one of these
    /// lists is sorted, grouped or filtered before it is drawn - the third card on the page is
    /// rarely the third item in the file - and an address has to name the file, not the page.
    ///
    /// The document's own name is not here. The composer stamps that onto the section element as
    /// data-ab-doc, once per section, and the editor joins the two: a renderer that had to know
    /// its document's name would need it threaded through a dozen signatures for one attribute.
    ///
    /// The callers write a leading dot in front of what comes back. That dot is the whole of how
    /// the editor tells the two kinds of address apart: ".items.3.title" is relative to the
    /// section it sits in, "site.nav.1.label" names its document already. The home page puts
    /// template text inside rendered sections, so "is it inside a section" is not the test - and
    /// guessing from the first segment would be a rule that holds until somebody names a
    /// document after a field.
    /// </summary>
    private static string Where(JsonNode? node, string field)
    {
        if (node is null) return string.Empty;
        var path = PathOf(node);
        return path.Length == 0 ? field : path + "." + field;
    }

    /// <summary>
    /// One node's own path, taken from the node rather than from the loop that reached it.
    ///
    /// Every list here is sorted, grouped or filtered before it is drawn - news by date, albums
    /// by year - so the index a loop counts is not the index the file holds, and an address built
    /// from it would save the third article's headline onto the fifth.
    /// </summary>
    private static string PathOf(JsonNode node)
    {
        // GetPath gives JSON Path - "$.categories[0].items[2]". Ours is the same walk written the
        // way the rest of this project writes it, which is the way ContentPath reads it.
        //
        // A key with a space in it comes back quoted - $.familySpecs['Wood grain'].layer - and
        // the quotes have to come off or the address names a family nobody has. Found by the
        // composer's own check, which refused to serve four colour families rather than serve
        // them with an address that could not be saved.
        var path = node.GetPath()
            .Replace("['", ".").Replace("']", "")
            .Replace("[", ".").Replace("]", "");
        return path.StartsWith("$.", StringComparison.Ordinal) ? path[2..]
             : path == "$" ? string.Empty
             : path;
    }

    /// <summary>
    /// The attribute that lets the editor point at a picture.
    ///
    /// It goes on whether or not there is a file behind the field, because on this site most of
    /// them are empty - what you see in their place is a drawing, not a photograph - and an empty
    /// field is precisely the one somebody wants to fill. It has to be clickable before it has a
    /// picture in it.
    /// </summary>
    private static string ImgAddress(JsonNode? item, string field = "image")
        => " data-ab-img=\"." + Esc(Where(item, field)) + "\"";

    /// <summary>
    /// An address into a DIFFERENT document from the one this section is drawing.
    ///
    /// Every other address here is relative - a leading dot, resolved against the data-ab-doc
    /// stamp the composer puts around the section. A card on the home page that points at a news
    /// article needs to reach past that stamp, so it names its document outright. The editor has
    /// understood both forms since Task 15; the dot is the whole difference between them.
    /// </summary>
    private static string Elsewhere(string document, JsonNode? item, string field, string kind)
        => item is null ? string.Empty
         : " data-ab-" + kind + "=\"" + Esc(document + "." + Where(item, field)) + "\"";

    /// <summary>The first of two that has anything in it. An empty override means "use theirs".</summary>
    private static string Or(string mine, string theirs) => mine.Length > 0 ? mine : theirs;

    /// <summary>
    /// The attribute that lets the editor point at a word.
    ///
    /// The same idea as <see cref="ImgAddress"/> and, until now, the one this renderer did not
    /// write - which meant a client could change the picture on an article and not its headline.
    /// Every list and every detail page on this site is drawn here, so this is where the words in
    /// them become editable at all.
    ///
    /// Nothing is written for a field that is not a string. A number in the data is a number for
    /// a reason - a factory's latitude, a route's share of the tonnage - and the editor writes
    /// what was typed, as text; a typed "22" would turn 22 into "22" and the canvas would be
    /// drawing with a string. Those fields stay for a screen that knows they are numbers.
    /// </summary>
    private static string TextAddress(JsonNode? item, string field)
        => TextAt(item is JsonObject o && o.TryGetPropertyValue(field, out var n) ? n : null);

    /// <summary>The same for a value reached directly - one line of an array of strings.</summary>
    private static string TextAt(JsonNode? node)
        => node is JsonValue v && v.TryGetValue<string>(out _)
           ? " data-ab-t=\"." + Esc(PathOf(node)) + "\""
           : string.Empty;

    /// <summary>
    /// One swatch: the photograph if the finish has one, the flat colour if it does not.
    ///
    /// A finish is a surface, not a flat colour, so beside photographed surfaces a plain chip
    /// reads as an empty box - the home page has worked this way from the start. Written once
    /// here because it is now drawn in three places, and three copies drift.
    /// </summary>
    private static string Chip(JsonNode? c, string root, string cls = "ab-chip")
    {
        var image = Str(c, "image");
        return image.Length > 0
            ? "<span class=\"" + cls + "\"><img src=\"" + root + "_media/" + Esc(image)
              + "\"" + ImgAddress(c) + " alt=\"\" loading=\"lazy\"></span>"
            : "<span class=\"" + cls + "\"" + ImgAddress(c) + " style=\"background:"
              + Esc(Str(c, "hex")) + "\"></span>";
    }

    /// <summary>The file behind an image field, or the drawing that stands in for it.</summary>
    private static string Src(JsonNode? item, string root, string fallback, string field = "image")
    {
        var image = Str(item, field);
        return image.Length > 0 ? root + "_media/" + Esc(image) : fallback;
    }

    /// <summary>Where an item's page sits, seen from a listing page: <c>press-line-2500/</c>.</summary>
    private static string Href(JsonNode? item) => Uri.EscapeDataString(Slug(item)) + "/";

    /// <summary>The same, seen from another item's page one directory along.</summary>
    private static string SiblingHref(JsonNode? item) => "../" + Href(item);

    /// <summary>
    /// Every slug a section has a page for, in the order the file holds them.
    ///
    /// Hidden items are not here: Arr filters them, so an item taken down stops appearing in the
    /// sitemap on the same request that it stops appearing on the page. A sitemap listing a URL
    /// that answers 404 is worse than a short sitemap.
    /// </summary>
    public List<string> SlugsFor(string section)
    {
        var doc = DocFor(section);
        return doc is null ? [] : DetailItems(section, doc).Select(Slug).ToList();
    }

    /// <summary>
    /// The item a detail section is showing, or null.
    ///
    /// The head of the page needs the same item the body got - the title, the description and the
    /// structured data all describe it - and asking twice is how the two end up describing
    /// different things.
    /// </summary>
    public JsonNode? ItemFor(string section, string? itemId)
    {
        var doc = DocFor(section);
        return doc is null ? null : Pick(section, doc, itemId);
    }

    /// <summary>The markup for a named section, or null when the name is not one we render.</summary>
    public string? Render(string section, string rootPrefix, string? itemId = null)
    {
        var doc = DocFor(section);
        if (doc is null) return null;

        return section switch
        {
            "news-list" => NewsList(doc, rootPrefix),
            "products-list" => ProductsList(doc, rootPrefix),
            "projects-list" => ProjectsList(doc, rootPrefix),
            "colors-filters" => ColorFilters(doc),
            "colors-count" => ColorCount(doc),
            "colors-list" => ColorList(doc, rootPrefix),
            "documents-filters" => DocumentFilters(doc),
            "documents-count" => DocumentCount(doc),
            "documents-list" => DocumentList(doc, rootPrefix),
            "about-nav" => AboutNav(doc),
            "about-figures" => AboutFigures(doc),
            "about-chapters" => AboutChapters(doc, rootPrefix),
            "contact-offices" => ContactOffices(doc),
            "contact-routes" => ContactRoutes(doc),
            "news-detail" => NewsDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "products-detail" => ProductDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "colors-detail" => ColorDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "projects-detail" => ProjectDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "documents-detail" => DocumentDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "about-detail" => AboutDetail(doc, itemId, rootPrefix),
            "about-chapbar" => AboutNav(doc, Str(Pick("about-detail", doc, itemId), "id")),
            "contact-detail" => ContactDetail(doc, Pick(section, doc, itemId)),
            "home-hero-words" => HeroWords(doc, rootPrefix),
            "home-hero-caption" => HeroCaption(doc),
            "home-products" => HomeProducts(doc, rootPrefix),
            "home-colors" => HomeColors(doc, rootPrefix),
            "home-projects" => HomeProjects(doc, rootPrefix),
            "home-feature" => HomeFeature(doc, rootPrefix),
            "home-highlights" => HomeHighlights(doc, rootPrefix),
            "home-gallery" => HomeGallery(doc, rootPrefix),
            "home-gallery-tags" => HomeGalleryTags(doc),
            "home-app-tabs" => AppTabs(doc),
            "home-app-slides" => AppSlides(doc, rootPrefix),
            "globe-routes" => GlobeRoutes(doc),
            "factories-list" => FactoriesList(doc),
            _ => null,
        };
    }

    // -------------------------------------------------------------------------------------------

    private static string NewsList(JsonNode doc, string root)
    {
        // Newest first, the order the listing has always shown.
        var sorted = Arr(doc, "items")
            .OrderByDescending(n => Str(n, "date"), StringComparer.Ordinal)
            .ToList();

        var sb = new StringBuilder();
        for (var i = 0; i < sorted.Count; i++)
        {
            var a = sorted[i];
            var lead = i == 0;
            var w = lead ? 1240 : 600;
            var h = lead ? 560 : 380;

            var image = Str(a, "image");
            var src = string.IsNullOrEmpty(image)
                ? Placeholder.Uri(w, h, Str(a, "title"))
                : root + "_media/" + image;

            // Each tag is a line of its own in the file, so each gets its own address. The
            // span carries no style; it is there to be somewhere for the address to live.
            var tags = (a["tags"] as JsonArray)?.OfType<JsonNode>()
                .Select(t => "<span" + TextAt(t) + ">" + Esc(t.ToString()) + "</span>") ?? [];

            sb.Append($"<a class=\"ab-post{(lead ? " is-lead" : "")}\" href=\"")
              .Append(Href(a)).Append("\">")
              .Append("<span class=\"ab-post-img\"><img src=\"").Append(src).Append('"')
              .Append(ImgAddress(a))
              .Append($" width=\"{w}\" height=\"{h}\" alt=\"").Append(Esc(Str(a, "title")))
              .Append("\" loading=\"lazy\"></span>")
              .Append("<span class=\"ab-post-tags\">").Append(string.Join(" &middot; ", tags))
              .Append("</span>")
              .Append("<h2").Append(TextAddress(a, "title")).Append('>')
              .Append(Esc(Str(a, "title"))).Append("</h2>")
              .Append("<p class=\"ab-post-excerpt\"").Append(TextAddress(a, "excerpt")).Append('>')
              .Append(Esc(Str(a, "excerpt"))).Append("</p>")
              .Append("<p class=\"ab-post-meta\">").Append(Ago(Str(a, "date")))
              .Append(" &nbsp;|&nbsp; Written by: ")
              .Append("<span").Append(TextAddress(a, "author")).Append('>')
              .Append(Esc(Str(a, "author"))).Append("</span>")
              .Append("</p></a>");
        }
        return sb.ToString();
    }


    /// <summary>
    /// Product families, each a band of tiles. The count beside the heading is taken from the
    /// list rather than written into the prose, so adding a family cannot make the page lie.
    /// </summary>
    private static string ProductsList(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var c in Arr(doc, "categories"))
        {
            var href = Href(c);
            var items = Arr(c, "items");

            var tiles = new StringBuilder();
            foreach (var it in items)
            {
                var image = Str(it, "image");
                var src = string.IsNullOrEmpty(image)
                    ? Placeholder.Uri(340, 300, Str(it, "name"))
                    : root + "_media/" + image;

                tiles.Append("<a class=\"ab-tile\" href=\"").Append(href)
                     .Append('#').Append(Uri.EscapeDataString(Str(it, "id"))).Append("\">")
                     .Append("<span class=\"ab-thumb\"><img src=\"").Append(src).Append('"')
                     .Append(ImgAddress(it))
                     .Append(" width=\"340\" height=\"300\" alt=\"").Append(Esc(Str(it, "name")))
                     .Append("\" loading=\"lazy\"></span>")
                     .Append("<h3").Append(TextAddress(it, "name")).Append('>')
                     .Append(Esc(Str(it, "name"))).Append("</h3>")
                     .Append("<p").Append(TextAddress(it, "spec")).Append('>')
                     .Append(Esc(Str(it, "spec"))).Append("</p></a>");
            }

            sb.Append("<section class=\"ab-band\"><div class=\"ab-band-head\">")
              .Append("<h2").Append(TextAddress(c, "name")).Append('>')
              .Append(Esc(Str(c, "name"))).Append("</h2>")
              .Append("<a class=\"ab-more\" href=\"").Append(href).Append("\">")
              .Append(items.Count).Append(" products</a></div>")
              .Append("<p class=\"ab-band-sub\"").Append(TextAddress(c, "tagline")).Append('>')
              .Append(Esc(Str(c, "tagline"))).Append("</p>")
              .Append("<div class=\"ab-row\">").Append(tiles).Append("</div></section>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// Albums grouped by year of completion, newest first. The year is the organising idea the
    /// client asked for, so it is a heading in the page rather than a filter to discover.
    /// </summary>
    private static string ProjectsList(JsonNode doc, string root)
    {
        var byYear = Arr(doc, "albums")
            .GroupBy(a => Str(a, "year"))
            .OrderByDescending(g => g.Key, StringComparer.Ordinal);

        var sb = new StringBuilder();
        foreach (var year in byYear)
        {
            var list = year.ToList();
            var cards = new StringBuilder();
            foreach (var a in list)
            {
                var image = Str(a, "image");
                var src = string.IsNullOrEmpty(image)
                    ? Placeholder.Uri(760, 520, Str(a, "title"))
                    : root + "_media/" + image;
                var photos = (a["photos"] as JsonArray)?.Count ?? 0;

                cards.Append("<a class=\"ab-album\" href=\"")
                     .Append(Href(a)).Append("\">")
                     .Append("<span class=\"ab-album-cover\"><img src=\"").Append(src).Append('"')
                     .Append(ImgAddress(a))
                     .Append(" width=\"760\" height=\"520\" alt=\"").Append(Esc(Str(a, "title")))
                     .Append("\" loading=\"lazy\">")
                     .Append("<span class=\"ab-album-count\">").Append(photos)
                     .Append(" photographs</span></span>")
                     .Append("<h3").Append(TextAddress(a, "title")).Append('>')
                     .Append(Esc(Str(a, "title"))).Append("</h3>")
                     .Append("<p class=\"ab-album-where\"").Append(TextAddress(a, "location")).Append('>')
                     .Append(Esc(Str(a, "location"))).Append("</p>")
                     .Append("<p class=\"ab-album-scope\"").Append(TextAddress(a, "scope")).Append('>')
                     .Append(Esc(Str(a, "scope"))).Append("</p></a>");
            }

            sb.Append("<section class=\"ab-year\"><div class=\"ab-year-head\">")
              .Append("<h2>").Append(Esc(year.Key)).Append("</h2>")
              .Append("<span>").Append(list.Count).Append(list.Count == 1 ? " album" : " albums")
              .Append("</span></div>")
              .Append("<div class=\"ab-albums\">").Append(cards).Append("</div></section>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The three filter rows. Rendered with "All" already selected, which is the state the page
    /// settles into anyway - so the first paint matches the last one instead of flashing through
    /// a row of unselected buttons. Filtering itself stays in the browser: it is instant there,
    /// and a crawler wants the whole list rather than a filtered view of it.
    /// </summary>
    private static string ColorFilters(JsonNode doc)
    {
        var filters = doc["filters"] as JsonArray;
        if (filters is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var f in filters.OfType<JsonNode>())
        {
            var key = Esc(Str(f, "id"));
            var opts = new StringBuilder();
            opts.Append("<button type=\"button\" data-k=\"").Append(key)
                .Append("\" data-v=\"\" class=\"is-on\">All</button>");

            foreach (var o in (f["options"] as JsonArray)?.OfType<JsonNode>() ?? [])
            {
                var v = Esc(o.ToString());
                // data-v is what the filter matches on and has to keep matching the swatches;
                // the address is on the button's words, which are the same string written twice.
                opts.Append("<button type=\"button\" data-k=\"").Append(key)
                    .Append("\" data-v=\"").Append(v).Append('"').Append(TextAt(o))
                    .Append('>').Append(v).Append("</button>");
            }

            sb.Append("<div class=\"ab-filter\"><span class=\"ab-filter-label\"")
              .Append(TextAddress(f, "label")).Append('>')
              .Append(Esc(Str(f, "label"))).Append("</span><div class=\"ab-filter-opts\">")
              .Append(opts).Append("</div></div>");
        }
        return sb.ToString();
    }

    /// <summary>The unfiltered tally. Counted, never written into the prose.</summary>
    private static string ColorCount(JsonNode doc)
        => Arr(doc, "items").Count + " colors";

    /// <summary>
    /// The swatch grid. This is the one listing that shows a real colour instead of the grey
    /// stand-in used everywhere else - the colour IS the product, and a page of grey rectangles
    /// would tell a client nothing.
    /// </summary>
    private static string ColorList(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var c in Arr(doc, "items"))
        {
            sb.Append("<a class=\"ab-swatch\" href=\"")
              .Append(Href(c)).Append("\">").Append(Chip(c, root))
              .Append("<span class=\"ab-swatch-name\"").Append(TextAddress(c, "name")).Append('>')
              .Append(Esc(Str(c, "name"))).Append("</span>")
              // The code is a label and is edited here; the family is a key into familySpecs
              // and is left alone, so it stays plain text with no span around it.
              .Append("<span class=\"ab-swatch-meta\">")
              .Append("<span").Append(TextAddress(c, "code")).Append('>')
              .Append(Esc(Str(c, "code"))).Append("</span>")
              .Append(" · ").Append(Esc(Str(c, "family"))).Append("</span></a>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// Type and Language. The type list is the categories; the language list is collected from the
    /// documents themselves in order of first appearance, so adding a Vietnamese edition to any
    /// category makes a Vietnamese button appear without anyone maintaining a second list.
    /// </summary>
    private static string DocumentFilters(JsonNode doc)
    {
        var cats = Arr(doc, "categories");

        var types = new List<(string V, string T)> { (string.Empty, "All") };
        types.AddRange(cats.Select(c => (Str(c, "id"), Str(c, "name"))));

        var langs = new List<(string V, string T)> { (string.Empty, "All") };
        foreach (var d in cats.SelectMany(c => Arr(c, "items")))
        {
            var l = Str(d, "lang");
            if (l.Length > 0 && !langs.Any(x => x.V == l)) langs.Add((l, l));
        }

        return Group("Type", "cat", types) + Group("Language", "lang", langs);
    }

    /// <summary>One filter row. The empty value is the one already on, matching the settled page.</summary>
    private static string Group(string label, string key, List<(string V, string T)> opts)
    {
        var sb = new StringBuilder();
        sb.Append("<div class=\"ab-filter\"><span class=\"ab-filter-label\">").Append(Esc(label))
          .Append("</span><div class=\"ab-filter-opts\">");
        foreach (var (v, t) in opts)
        {
            sb.Append("<button type=\"button\" data-k=\"").Append(Esc(key))
              .Append("\" data-v=\"").Append(Esc(v)).Append('"');
            if (v.Length == 0) sb.Append(" class=\"is-on\"");
            sb.Append('>').Append(Esc(t)).Append("</button>");
        }
        return sb.Append("</div></div>").ToString();
    }

    /// <summary>Every document in every category, counted rather than written down.</summary>
    private static string DocumentCount(JsonNode doc)
    {
        var total = Arr(doc, "categories").Sum(c => Arr(c, "items").Count);
        return total + " documents";
    }

    /// <summary>
    /// The document list, grouped by category. Each row links twice: to the document's own page,
    /// and straight to the PDF. The second link is what most people came for, so it is a real
    /// link with a real filename rather than something a script attaches later.
    /// </summary>
    private static string DocumentList(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var c in Arr(doc, "categories"))
        {
            var items = Arr(c, "items");
            if (items.Count == 0) continue;

            var rows = new StringBuilder();
            foreach (var d in items)
            {
                var id = Str(d, "id");
                rows.Append("<div class=\"ab-doc\">")
                    .Append("<a class=\"ab-doc-main\" href=\"")
                    .Append(Href(d)).Append("\">")
                    .Append("<span class=\"ab-doc-icon\" aria-hidden=\"true\">PDF</span>")
                    .Append("<span class=\"ab-doc-text\">")
                    .Append("<span class=\"ab-doc-title\"").Append(TextAddress(d, "title")).Append('>')
                    .Append(Esc(Str(d, "title"))).Append("</span>")
                    .Append("<span class=\"ab-doc-blurb\"").Append(TextAddress(d, "blurb")).Append('>')
                    .Append(Esc(Str(d, "blurb"))).Append("</span>")
                    // Four fields on one line, so four spans. The category's name is edited at
                    // the head of its own section - once, not once per row.
                    .Append("<span class=\"ab-doc-meta\">").Append(Esc(Str(c, "name")))
                    .Append(" &middot; ")
                    .Append("<span").Append(TextAddress(d, "edition")).Append('>')
                    .Append(Esc(Str(d, "edition"))).Append("</span>")
                    .Append(" &middot; ")
                    .Append("<span").Append(TextAddress(d, "lang")).Append('>')
                    .Append(Esc(Str(d, "lang"))).Append("</span>")
                    .Append(" &middot; ")
                    .Append("<span").Append(TextAddress(d, "pages")).Append('>')
                    .Append(Esc(Str(d, "pages"))).Append("</span>").Append(" pages</span>")
                    .Append("</span></a>")
                    .Append("<a class=\"ab-doc-dl\" href=\"").Append(root).Append("_docs/")
                    .Append(Esc(id)).Append(".pdf\" download>Download</a></div>");
            }

            sb.Append("<section class=\"ab-doccat\"><div class=\"ab-doccat-head\"><h2")
              .Append(TextAddress(c, "name")).Append('>')
              .Append(Esc(Str(c, "name"))).Append("</h2><p")
              .Append(TextAddress(c, "blurb")).Append('>').Append(Esc(Str(c, "blurb")))
              .Append("</p></div><div class=\"ab-docs\">").Append(rows).Append("</div></section>");
        }
        return sb.ToString();
    }

    /// <summary>The item named by the id, or the first one. Null only when there are none.</summary>
    private static JsonNode? Pick(string section, JsonNode doc, string? id)
    {
        var items = DetailItems(section, doc);
        if (items.Count == 0) return null;
        return items.FirstOrDefault(i => Str(i, "id") == id) ?? items[0];
    }

    /// <summary>
    /// One article: crumb, headline, byline, hero, standfirst, body, and three more to read.
    ///
    /// This is the page the whole server-rendering effort was started for. Measured before it
    /// existed, an article page carried 676 characters of HTML text - the nav and the footer, and
    /// not one word of the article - because every paragraph was written in by a script after load.
    /// </summary>
    private static string? NewsDetail(JsonNode doc, JsonNode? a, string root)
    {
        if (a is null) return null;

        var id = Str(a, "id");
        var title = Str(a, "title");
        var tags = (a["tags"] as JsonArray)?.OfType<JsonNode>()
            .Select(t => "<span" + TextAt(t) + ">" + Esc(t.ToString()) + "</span>") ?? [];

        var more = Arr(doc, "items")
            .Where(x => Str(x, "id") != id)
            .OrderByDescending(x => Str(x, "date"), StringComparer.Ordinal)
            .Take(3) ?? [];

        var cards = new StringBuilder();
        foreach (var x in more)
        {
            var xTitle = Str(x, "title");
            cards.Append("<a class=\"ab-card\" href=\"").Append(SiblingHref(x))
                 .Append("\"><img src=\"")
                 .Append(Src(x, root, Placeholder.Uri(400, 260, xTitle))).Append('"')
                 .Append(ImgAddress(x))
                 .Append(" width=\"400\" height=\"260\" alt=\"").Append(Esc(xTitle))
                 .Append("\" loading=\"lazy\"><h3").Append(TextAddress(x, "title")).Append('>')
                 .Append(Esc(xTitle))
                 // The date is shown as "12 March 2026" and held as "2026-03-12"; an address here
                 // would offer the client an input whose text is not what the field says.
                 .Append("</h3><p class=\"ab-card-spec\">").Append(LongDate(Str(x, "date")))
                 .Append("</p></a>");
        }

        var sb = new StringBuilder("<div class=\"ab-wrap\">");
        sb.Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
          .Append("</a> &nbsp;/&nbsp; ").Append(string.Join(" &middot; ", tags)).Append("</p>")
          .Append("<h1 class=\"ab-title ab-article-title\"").Append(TextAddress(a, "title"))
          .Append('>').Append(Esc(title)).Append("</h1>")
          .Append("<p class=\"ab-post-meta\">").Append(LongDate(Str(a, "date")))
          .Append(" &nbsp;|&nbsp; Written by: ")
          .Append("<span").Append(TextAddress(a, "author")).Append('>')
          .Append(Esc(Str(a, "author"))).Append("</span></p>")
          .Append("<div class=\"ab-hero\"><img src=\"")
          .Append(Src(a, root, Placeholder.Uri(1240, 560, title))).Append('"')
          .Append(ImgAddress(a))
          .Append(" width=\"1240\" height=\"560\" alt=\"").Append(Esc(title)).Append("\"></div>")
          .Append("<div class=\"ab-article\"><p class=\"ab-standfirst\"")
          .Append(TextAddress(a, "excerpt")).Append('>')
          .Append(Esc(Str(a, "excerpt"))).Append("</p>");

        // One address per paragraph rather than one for the body: a paragraph is the unit
        // somebody rewrites, and an array joined into one box comes back joined.
        foreach (var p in (a["body"] as JsonArray)?.OfType<JsonNode>() ?? [])
            sb.Append("<p").Append(TextAt(p)).Append('>').Append(Esc(p.ToString())).Append("</p>");

        return sb.Append("</div><div class=\"ab-items\"><h2>More news</h2><div class=\"ab-grid\">")
                 .Append(cards).Append("</div></div></div>").ToString();
    }

    /// <summary>
    /// The six words across the hero. They are the six product families read from the catalogue
    /// rather than written into the page, so adding a family adds it to the hero.
    ///
    /// The first is marked on, which is the state the script settles into. A crawler reads this
    /// before any script runs, and these six words are the shortest true answer to "what does
    /// this company make".
    /// </summary>
    private static string HeroWords(JsonNode doc, string root)
    {
        // No address on these. The word shown is the family's name upper-cased, so an editor
        // reading the element back would offer PROFILE SYSTEMS as the value and save it that
        // way. The same field is editable, in its own case, everywhere else it appears.
        var cats = Arr(doc, "categories");
        var sb = new StringBuilder();
        for (var i = 0; i < cats.Count; i++)
        {
            sb.Append("<a href=\"").Append(root).Append("products/").Append(Href(cats[i]))
              .Append("\" data-i=\"").Append(i).Append("\" class=\"").Append(i == 0 ? "is-on" : "")
              .Append("\">").Append(Esc(Str(cats[i], "name").ToUpperInvariant())).Append("</a>");
        }
        return sb.ToString();
    }

    /// <summary>The line under the hero, naming whichever family is selected. First one to start.</summary>
    private static string HeroCaption(JsonNode doc)
    {
        var first = Arr(doc, "categories").FirstOrDefault();
        if (first is null) return string.Empty;
        return "<strong" + TextAddress(first, "name") + ">" + Esc(Str(first, "name")) + "</strong> "
             + "<span" + TextAddress(first, "tagline") + ">" + Esc(Str(first, "tagline")) + "</span>";
    }

    /// <summary>Every product family as a tile. Same data as the Products page, so they cannot drift.</summary>
    private static string HomeProducts(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var c in Arr(doc, "categories"))
        {
            var name = Str(c, "name");
            sb.Append("<a class=\"ab-tile\" href=\"products/").Append(Href(c)).Append("\">")
              .Append("<span class=\"ab-thumb\"><img src=\"")
              .Append(Src(c, root, Placeholder.Uri(340, 300, name))).Append('"')
              .Append(ImgAddress(c))
              .Append(" width=\"340\" height=\"300\" alt=\"").Append(Esc(name))
              .Append("\" loading=\"lazy\"></span><h3").Append(TextAddress(c, "name")).Append('>')
              .Append(Esc(name)).Append("</h3><p").Append(TextAddress(c, "tagline")).Append('>')
              .Append(Esc(Str(c, "tagline"))).Append("</p></a>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// Ten finishes, one from each family first so the strip reads as a range rather than as a
    /// shade card of one colour.
    /// </summary>
    private static string HomeColors(JsonNode doc, string root)
    {
        var items = Arr(doc, "items");
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var pick = new List<JsonNode>();
        foreach (var c in items) if (seen.Add(Str(c, "family"))) pick.Add(c);
        foreach (var c in items) { if (pick.Count >= 10) break; if (!pick.Contains(c)) pick.Add(c); }

        var sb = new StringBuilder();
        foreach (var c in pick.Take(10))
        {
            sb.Append("<a class=\"ab-swatch\" href=\"colors/").Append(Href(c))
              .Append("\">").Append(Chip(c, root))
              .Append("<span class=\"ab-swatch-name\"").Append(TextAddress(c, "name")).Append('>')
              .Append(Esc(Str(c, "name")))
              .Append("</span><span class=\"ab-swatch-meta\"").Append(TextAddress(c, "code")).Append('>')
              .Append(Esc(Str(c, "code")))
              .Append("</span></a>");
        }
        return sb.ToString();
    }

    /// <summary>The three most recent albums.</summary>
    private static string HomeProjects(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var a in Arr(doc, "albums")
                     .OrderByDescending(a => int.TryParse(Str(a, "year"), out var y) ? y : 0).Take(3))
        {
            var title = Str(a, "title");
            sb.Append("<a class=\"ab-card\" href=\"projects/").Append(Href(a))
              .Append("\"><img src=\"")
              .Append(Src(a, root, Placeholder.Uri(420, 300, title))).Append('"')
              .Append(ImgAddress(a))
              .Append(" width=\"420\" height=\"300\" alt=\"").Append(Esc(title))
              .Append("\" loading=\"lazy\"><h3").Append(TextAddress(a, "title")).Append('>')
              .Append(Esc(title))
              // Year and place are one line of type made of two fields, so each gets a span.
              .Append("</h3><p class=\"ab-card-spec\">")
              .Append("<span").Append(TextAddress(a, "year")).Append('>')
              .Append(Esc(Str(a, "year"))).Append("</span> · ")
              .Append("<span").Append(TextAddress(a, "location")).Append('>')
              .Append(Esc(Str(a, "location"))).Append("</span></p><p")
              .Append(TextAddress(a, "scope")).Append('>')
              .Append(Esc(Str(a, "scope"))).Append("</p></a>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The sample-request panel. Its photograph carries no label: the headline and body sit over
    /// the middle of it, and a labelled placeholder would draw its own words straight through them.
    /// </summary>
    private static string HomeFeature(JsonNode doc, string root)
    {
        var image = Str(doc, "image");
        var src = image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(2400, 1000, "");

        return new StringBuilder("<div class=\"core-cta-customizable__text-col\">")
            .Append("<div class=\"core-cta-customizable__text-col__top\">")
            .Append("<p class=\"core-cta-customizable__text-col__bottom__text font-16 mb-32\"")
            .Append(TextAddress(doc, "eyebrow")).Append('>')
            .Append(Esc(Str(doc, "eyebrow"))).Append("</p>")
            .Append("<h2 class=\"font-light font-40\" id=\"abfc-title\"")
            .Append(TextAddress(doc, "heading")).Append('>').Append(Esc(Str(doc, "heading")))
            .Append("</h2><p class=\"abfc-text\"").Append(TextAddress(doc, "text")).Append('>')
            .Append(Esc(Str(doc, "text"))).Append("</p></div>")
            .Append("<div class=\"core-cta-customizable__text-col__bottom\">")
            .Append(FeatureLink(doc["cta"], "btn btn-blanco-negro font-14", true, root))
            .Append(FeatureLink(doc["more"], "abfc-alt", false, root))
            .Append("</div></div><div class=\"core-cta-customizable__image-col\">")
            .Append("<img class=\"core-cta-customizable__image-col__image\" src=\"").Append(src)
            .Append('"').Append(ImgAddress(doc))
            .Append(" width=\"2400\" height=\"1000\" alt=\"").Append(Esc(Str(doc, "alt")))
            .Append("\" loading=\"lazy\"></div>").ToString();
    }

    /// <summary>A link only where both halves are there; a button with no destination is worse than none.</summary>
    private static string FeatureLink(JsonNode? o, string cls, bool arrow, string root)
    {
        var href = Str(o, "href");
        var label = Str(o, "label");
        if (href.Length == 0 || label.Length == 0) return string.Empty;
        // The arrow is a child element, so the label is the lead rather than the whole text.
        return "<a class=\"" + cls + "\" href=\"" + Esc(root + href) + "\""
               + (arrow ? " data-ab-lead=\"." + Esc(Where(o, "label")) + "\"" : TextAddress(o, "label"))
               + ">" + Esc(label)
               + (arrow ? "<span class=\"arrow-link\"></span>" : string.Empty) + "</a>";
    }

    private const string PlusIcon =
        "<svg width=\"44\" height=\"44\" viewBox=\"0 0 44 44\" fill=\"none\" " +
        "xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\">" +
        "<rect width=\"44\" height=\"44\" rx=\"22\" fill=\"white\" fill-opacity=\"0.4\"></rect>" +
        "<path d=\"M22 15L22 29\" stroke=\"white\" stroke-miterlimit=\"10\"></path>" +
        "<path d=\"M29 22L15 22\" stroke=\"white\" stroke-miterlimit=\"10\"></path>" +
        "</svg>";

    /// <summary>
    /// Six news cards in a row that scrolls. Placeholders go in unlabelled here too: the card
    /// already prints the place and the headline in white over the image.
    ///
    /// A card is a POINTER at an article, not a copy of one. It used to carry its own picture and
    /// its own copy of the article's path, which meant an article had two picture slots in two
    /// places and somebody had to remember to fill both. Now the picture comes from the article
    /// and the path is derived by the same <see cref="Href"/> every other list uses, so the two
    /// cannot drift.
    ///
    /// What stays on the card is the short headline and the place: all six differ from their
    /// article's headline, consistently shorter, which is an editorial decision rather than rot.
    /// Empty means "use the article's".
    ///
    /// An article that is hidden or gone takes its card with it. <see cref="Arr"/> filters
    /// visible:false, so hiding one article hides it everywhere it appears - which is the promise
    /// the Content screen's Hidden button already makes.
    /// </summary>
    private string HomeHighlights(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        var articles = Arr(_store.Get("news"), "items");
        var items = Arr(doc, "items")
            .Select(it => (Card: it, Article: articles.FirstOrDefault(a => Str(a, "id") == Str(it, "id"))))
            .Where(x => x.Article is not null)
            .Take(6).ToList();

        for (var i = 0; i < items.Count; i++)
        {
            var (it, article) = items[i];
            var image = Str(article, "image");
            var src = image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(444, 370, "");
            var title = Or(Str(it, "title"), Str(article, "title"));
            var label = Or(Str(it, "label"), Str(article, "author"));

            sb.Append("<div class=\"core-slider-novedades__slide keen-slider__slide number-slide-")
              .Append(i).Append("\"><a class=\"core-slider-novedades__slide__container\" href=\"")
              .Append(Esc(root + "news/" + Href(article))).Append("\"><div class=\"shadow\"></div>")
              // The picture's address names the NEWS file, not this one - an absolute address
              // rather than the leading-dot kind, so it resolves past the data-ab-doc="highlights"
              // stamp around this band. Clicking the card's picture on the home page therefore
              // edits the article's picture, which is the only picture there now is.
              .Append("<img class=\"core-slider-novedades__slide__image\" src=\"").Append(Esc(src))
              .Append('"').Append(Elsewhere("news", article, "image", "img"))
              .Append(" width=\"444\" height=\"370\" alt=\"").Append(Esc(title))
              .Append("\" loading=\"lazy\">")
              .Append("<div class=\"core-slider-novedades__slide__filter\"></div>")
              .Append("<div class=\"core-slider-novedades__slide__card-body\">")
              .Append("<div class=\"core-slider-novedades__slide__card-body_top\">")
              .Append("<div class=\"core-slider-novedades__slide__card-body__logo\">")
              .Append("<p class=\"core-slider-novedades__logo\"").Append(TextAddress(it, "label"))
              .Append('>').Append(Esc(label))
              .Append("</p></div><div class=\"cos-novedades__enlace\">")
              .Append("<h3 class=\"core-slider-novedades__slide__card-body__name font-display-sm uppercase\"")
              .Append(TextAddress(it, "title")).Append('>')
              .Append(Esc(title)).Append("</h3></div></div>")
              .Append("<div class=\"extra\">").Append(PlusIcon).Append("</div>")
              .Append("</div></a></div>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The photograph wall. Every tile is in the HTML, unfiltered - a crawler wants the whole
    /// wall, and the category buttons are a convenience for a person who is already looking.
    /// </summary>
    private static string HomeGallery(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var item in Arr(doc, "items"))
        {
            var caption = Str(item, "caption");
            // lightGallery reads data-sub-html as markup, so the text is escaped once for the
            // markup and the whole thing again for the attribute.
            var sub = "<h4>" + Esc(caption) + "</h4><p>" + Esc(Str(item, "description")) + "</p>";

            sb.Append("<div class=\"core-gallery__content__item__image\" data-src=\"")
              .Append(GallerySrc(doc, item, root, 1800, 1200)).Append("\" data-thumb=\"")
              .Append(GallerySrc(doc, item, root, 640, 640)).Append("\" data-sub-html=\"")
              .Append(Esc(sub)).Append("\">")
              .Append("<div class=\"core-gallery__content__item__filter\">")
              .Append("<div class=\"core-gallery__content__item__filter__cruz\"></div>")
              .Append("<span class=\"abgal-cap\"").Append(TextAddress(item, "caption")).Append('>')
              .Append(Esc(caption)).Append("</span></div>")
              .Append("<img class=\"core-gallery__thumb skip-lazy\" src=\"")
              .Append(GallerySrc(doc, item, root, 640, 640)).Append('"')
              .Append(ImgAddress(item))
              .Append(" width=\"640\" height=\"640\" alt=\"").Append(Esc(caption))
              .Append("\" draggable=\"false\" loading=\"lazy\"></div>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// Labelled with the category, not the caption: the tile already carries the caption in white
    /// along its bottom edge, and a placeholder repeating it says everything twice.
    /// </summary>
    private static string GallerySrc(JsonNode doc, JsonNode item, string root, int w, int h)
    {
        var image = Str(item, "image");
        if (image.Length > 0) return root + "_media/" + image;

        var cat = Str(item, "cat");
        var tag = Arr(doc, "tags").FirstOrDefault(t => Str(t, "id") == cat);
        return Placeholder.Uri(w, h, tag is null ? string.Empty : Str(tag, "label"));
    }

    /// <summary>
    /// The five application areas as tabs, the first already selected - the state the script
    /// settles into, so the first paint matches the last one.
    /// </summary>
    private static string AppTabs(JsonNode doc)
    {
        var tabs = Arr(doc, "tabs");
        var sb = new StringBuilder();
        for (var i = 0; i < tabs.Count; i++)
        {
            var on = i == 0;
            sb.Append("<li class=\"core-tabs__nav__tags-item font-15 font-light")
              .Append(on ? " active" : "").Append("\" role=\"tab\" id=\"abap-tab-")
              .Append(Esc(Str(tabs[i], "id"))).Append("\" data-index=\"").Append(i)
              .Append("\" aria-controls=\"abap-slider\" aria-selected=\"").Append(on ? "true" : "false")
              .Append("\" tabindex=\"").Append(on ? "0" : "-1").Append('"')
              .Append(TextAddress(tabs[i], "label")).Append('>')
              .Append(Esc(Str(tabs[i], "label"))).Append("</li>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The cards of the first tab. Only one tab's worth is in the page, exactly as the script
    /// has it - the other twenty cards arrive when someone asks for them, and a crawler that
    /// reads five real applications has read the shape of the section.
    /// </summary>
    private static string AppSlides(JsonNode doc, string root)
    {
        var tab = Arr(doc, "tabs").FirstOrDefault();
        if (tab is null) return string.Empty;

        var label = Str(tab, "label");
        var items = Arr(tab, "items");
        var sb = new StringBuilder();
        for (var i = 0; i < items.Count; i++)
        {
            var image = Str(items[i], "image");
            var src = image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(480, 640, label);

            sb.Append("<div class=\"core-slider__slide keen-slider__slide number-slide-").Append(i)
              .Append("\"><img class=\"core-slider__slide__image\" src=\"").Append(Esc(src))
              .Append('"').Append(ImgAddress(items[i]))
              .Append(" alt=\"\" loading=\"lazy\"><div class=\"core-slider__slide__filter\"></div>")
              .Append("<div class=\"core-slider__slide__card-body\">")
              .Append("<div class=\"core-slider__slide__card-body__block\">")
              .Append("<h3 class=\"core-slider__slide__card-body__name font-16\"")
              .Append(TextAddress(items[i], "title")).Append('>')
              .Append(Esc(Str(items[i], "title"))).Append("</h3></div>")
              .Append("<div class=\"core-slider__slide__card-body__block\">")
              .Append("<p class=\"core-slider__slide__card-body__description\"")
              .Append(TextAddress(items[i], "text")).Append('>')
              .Append(Esc(Str(items[i], "text"))).Append("</p></div></div></div>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The four export routes beside the globe. Names, shares and transit times are the sort of
    /// thing an answer engine is asked for by name - "who exports aluminium from Vietnam, and
    /// where to" - and until now every word of it was drawn by a script.
    ///
    /// The whitespace is the script's own, kept character for character: these are inline spans
    /// and a space between them is a space on the page.
    /// </summary>
    private static string GlobeRoutes(JsonNode doc)
    {
        var sb = new StringBuilder();
        foreach (var r in Arr(doc, "routes"))
        {
            sb.Append("<li><button type=\"button\" class=\"vgx-item\" aria-pressed=\"false\">")
              .Append("<span class=\"vgx-dot\"></span>\n      <span><span class=\"vgx-name\"")
              .Append(TextAddress(r, "name")).Append('>')
              .Append(Esc(Str(r, "name"))).Append("</span>\n        <span class=\"vgx-desc\"")
              .Append(TextAddress(r, "desc")).Append('>')
              .Append(Esc(Str(r, "desc"))).Append("</span>\n        <span class=\"vgx-meta\">")
              // days is a number in the file, and the canvas counts with it, so it keeps no
              // address: the editor writes what was typed, as text, and 22 would become "22".
              .Append("<span").Append(TextAddress(r, "meta")).Append('>')
              .Append(Esc(Str(r, "meta"))).Append("</span> · ").Append(Esc(Str(r, "days")))
              .Append(" days</span></span>\n      <span class=\"vgx-share\"")
              .Append(TextAddress(r, "share")).Append('>')
              .Append(Esc(Str(r, "share"))).Append("</span></button></li>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// The five plants. Each card's photograph is drawn on a canvas at run time, so the script
    /// still puts that in; everything a reader or a crawler needs is here.
    /// </summary>
    private static string FactoriesList(JsonNode doc)
    {
        var sb = new StringBuilder();
        foreach (var s in Arr(doc, "sites"))
        {
            sb.Append("<article class=\"vfx-fitem\">")
              .Append("<p class=\"vfx-fname\"").Append(TextAddress(s, "name")).Append('>')
              .Append(Esc(Str(s, "name"))).Append("</p>")
              .Append("<p class=\"vfx-floc\"").Append(TextAddress(s, "region")).Append('>')
              .Append(Esc(Str(s, "region"))).Append("</p>")
              .Append("<p class=\"vfx-fdesc\"").Append(TextAddress(s, "desc")).Append('>')
              .Append(Esc(Str(s, "desc"))).Append("</p>")
              .Append("<div class=\"vfx-fstats\"><div>In operation since<b")
              .Append(TextAddress(s, "since")).Append('>')
              .Append(Esc(Str(s, "since"))).Append("</b></div><div>Annual capacity<b")
              .Append(TextAddress(s, "output")).Append('>')
              .Append(Esc(Str(s, "output"))).Append("</b></div></div></article>");
        }
        return sb.ToString();
    }

    /// <summary>The category list, with the first - "All work" - already chosen.</summary>
    private static string HomeGalleryTags(JsonNode doc)
    {
        var sb = new StringBuilder();
        var tags = Arr(doc, "tags");
        for (var i = 0; i < tags.Count; i++)
        {
            var id = Str(tags[i], "id");
            var label = Str(tags[i], "label");
            sb.Append("<li class=\"core-gallery__nav__tags-item font-body-base font-normal")
              .Append(id == "all" ? " active" : "").Append("\" data-index=\"").Append(i)
              .Append("\" data-value=\"").Append(Esc(id)).Append("\" data-label=\"").Append(Esc(label))
              .Append('"').Append(TextAddress(tags[i], "label")).Append('>')
              .Append(Esc(label)).Append("</li>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// One product family: headline, hero, a two-column blurb, and every product in it.
    /// </summary>
    private static string? ProductDetail(JsonNode doc, JsonNode? c, string root)
    {
        if (c is null) return null;

        var id = Str(c, "id");
        var name = Str(c, "name");
        var items = Arr(c, "items");

        var others = Arr(doc, "categories").Where(x => Str(x, "id") != id)
            .Select(x => "<a href=\"" + SiblingHref(x) + "\"" + TextAddress(x, "name") + ">"
                         + Esc(Str(x, "name")) + "</a>");

        var cards = new StringBuilder();
        foreach (var it in items)
        {
            var n = Str(it, "name");
            cards.Append("<article class=\"ab-card\" id=\"").Append(Esc(Str(it, "id"))).Append("\">")
                 .Append("<img src=\"").Append(Src(it, root, Placeholder.Uri(400, 300, n)))
                 .Append('"').Append(ImgAddress(it))
                 .Append(" width=\"400\" height=\"300\" alt=\"").Append(Esc(n))
                 .Append("\" loading=\"lazy\"><h3").Append(TextAddress(it, "name")).Append('>')
                 .Append(Esc(n)).Append("</h3>")
                 .Append("<p class=\"ab-card-spec\"").Append(TextAddress(it, "spec")).Append('>')
                 .Append(Esc(Str(it, "spec"))).Append("</p>")
                 .Append("<p").Append(TextAddress(it, "text")).Append('>')
                 .Append(Esc(Str(it, "text"))).Append("</p></article>");
        }

        var para = SplitInTwo(Str(c, "blurb"));

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(name)).Append("</p>")
            .Append("<h1 class=\"ab-title\"").Append(TextAddress(c, "name")).Append('>')
            .Append(Esc(name)).Append("</h1>")
            .Append("<p class=\"ab-tagline\"").Append(TextAddress(c, "tagline")).Append('>')
            .Append(Esc(Str(c, "tagline"))).Append("</p></div>")
            .Append("<div class=\"ab-wrap\"><div class=\"ab-hero\"><img src=\"")
            .Append(Src(c, root, Placeholder.Uri(1280, 520, name))).Append('"')
            .Append(ImgAddress(c))
            .Append(" width=\"1280\" height=\"520\" alt=\"").Append(Esc(name))
            .Append("\"></div></div>")
            // No address on either column. They are one field shown as two, so an editor
            // reading a column back would offer half the blurb as the whole of it, and save that.
            .Append("<div class=\"ab-wrap\"><div class=\"ab-body\"><div><p>").Append(Esc(para[0]))
            .Append("</p></div><div><p>").Append(Esc(para[1])).Append("</p></div></div></div>")
            .Append("<div class=\"ab-wrap\"><div class=\"ab-items\"><h2>").Append(items.Count)
            .Append(" products in this family</h2><div class=\"ab-grid\">").Append(cards)
            .Append("</div><p class=\"ab-band-sub\" style=\"margin-top:44px\">Other families: ")
            .Append(string.Join("<span aria-hidden=\"true\"> · </span>", others))
            .Append("</p></div></div>").ToString();
    }

    /// <summary>
    /// Splits a blurb into two columns on a sentence boundary.
    ///
    /// Halving by character count reads as a fault: the left column ends mid-clause and the right
    /// one opens with a lower-case word. Same rule as the script it replaces, so the break lands
    /// in the same place.
    /// </summary>
    private static string[] SplitInTwo(string blurb)
    {
        var sentences = System.Text.RegularExpressions.Regex
            .Matches(blurb, @"[^.!?]+[.!?]+(\s|$)")
            .Select(m => m.Value).ToList();
        if (sentences.Count == 0) sentences.Add(blurb);

        var half = blurb.Length / 2.0;
        var run = 0;
        var at = sentences.Count;
        for (var s = 0; s < sentences.Count; s++)
        {
            run += sentences[s].Length;
            if (run >= half) { at = s + 1; break; }
        }
        if (at >= sentences.Count && sentences.Count > 1) at = sentences.Count - 1;

        return
        [
            string.Concat(sentences.Take(at)).Trim(),
            string.Concat(sentences.Skip(at)).Trim(),
        ];
    }

    /// <summary>
    /// One finish: the colour itself at size, the specification table, and its siblings.
    ///
    /// Coating thickness, standard and warranty follow from the family rather than being repeated
    /// on all 35 entries. That table lives in colors.json, which the browser script reads too -
    /// one table rather than two that drift apart.
    /// </summary>
    private static string? ColorDetail(JsonNode doc, JsonNode? c, string root)
    {
        if (c is null) return null;

        var id = Str(c, "id");
        var family = Str(c, "family");
        var spec = doc["familySpecs"]?[family];

        // Each row carries the address of the field it is showing. Three of them come from the
        // family's table rather than from this finish - editing one there changes it for every
        // colour in the family, which is why that table exists.
        (string K, string V, string A)[] rows =
        [
            ("Code", Str(c, "code"), TextAddress(c, "code")),
            // No address: "family" is the key this colour's coating, standard and warranty are
            // looked up under. Editing it here would not rename the family - it would take this
            // one colour out of it, and three rows of its own table would turn into em dashes.
            ("Finish", family, string.Empty),
            ("Gloss", Str(c, "gloss"), TextAddress(c, "gloss")),
            ("Exposure", Str(c, "use"), TextAddress(c, "use")),
            ("Coating", Spec(spec, "layer"), TextAddress(spec, "layer")),
            ("Standard", Spec(spec, "std"), TextAddress(spec, "std")),
            ("Colour warranty", Spec(spec, "warranty"), TextAddress(spec, "warranty")),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v, a) in rows)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd")
              .Append(a).Append('>').Append(Esc(v)).Append("</dd></div>");

        var siblings = new StringBuilder();
        foreach (var x in Arr(doc, "items").Where(x => Str(x, "family") == family && Str(x, "id") != id).Take(8))
        {
            siblings.Append("<a class=\"ab-swatch\" href=\"").Append(SiblingHref(x))
                    .Append("\">").Append(Chip(x, root))
                    .Append("<span class=\"ab-swatch-name\"").Append(TextAddress(x, "name")).Append('>')
                    .Append(Esc(Str(x, "name")))
                    .Append("</span><span class=\"ab-swatch-meta\"").Append(TextAddress(x, "code")).Append('>')
                    .Append(Esc(Str(x, "code")))
                    .Append("</span></a>");
        }

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(family)).Append("</p>")
            .Append("<div class=\"ab-colour-head\"><div class=\"ab-colour-block\"")
            .Append(ImgAddress(c)).Append(" style=\"background:").Append(Esc(Str(c, "hex")))
            .Append(Str(c, "image").Length > 0
                ? ";background-image:url(" + root + "_media/" + Esc(Str(c, "image"))
                  + ");background-size:cover;background-position:center"
                : "")
            .Append("\"></div><div>")
            .Append("<h1 class=\"ab-title\"").Append(TextAddress(c, "name")).Append('>')
            .Append(Esc(Str(c, "name"))).Append("</h1>")
            .Append("<p class=\"ab-tagline\">")
            .Append("<span").Append(TextAddress(c, "code")).Append('>')
            .Append(Esc(Str(c, "code"))).Append("</span>").Append(" &middot; ")
            .Append(Esc(family)).Append("</p>")
            .Append("<p class=\"ab-note\"").Append(TextAddress(c, "note")).Append('>')
            .Append(Esc(Str(c, "note"))).Append("</p></div></div>")
            .Append("<dl class=\"ab-specs\">").Append(dl).Append("</dl>")
            .Append("<div class=\"ab-items\"><h2>Other ").Append(Esc(family.ToLowerInvariant()))
            .Append(" colors</h2><div class=\"ab-swatches\">").Append(siblings)
            .Append("</div></div></div>").ToString();
    }

    /// <summary>An em dash where the family has no entry, matching the script's fallback.</summary>
    private static string Spec(JsonNode? spec, string key) => spec?[key]?.ToString() ?? "—";

    /// <summary>
    /// One album: the facts, the contact sheet, and three other albums.
    /// </summary>
    private static string? ProjectDetail(JsonNode doc, JsonNode? a, string root)
    {
        if (a is null) return null;

        var id = Str(a, "id");
        var photos = Arr(a, "photos");
        var products = Arr(a, "products").Select(p => p.ToString());

        // Products is a list joined with commas, so it has no address: one box holding
        // "A, B, C" saves back as one string where the file wants three.
        (string K, string V, string A)[] facts =
        [
            ("Year", Str(a, "year"), TextAddress(a, "year")),
            ("Location", Str(a, "location"), TextAddress(a, "location")),
            ("Client", Str(a, "client"), TextAddress(a, "client")),
            ("Scope", Str(a, "scope"), TextAddress(a, "scope")),
            ("Products", string.Join(", ", products), string.Empty),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v, addr) in facts)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd")
              .Append(addr).Append('>').Append(Esc(v)).Append("</dd></div>");

        // The opening frame runs the full width and the rest sit in an even three-column sheet.
        var tiles = new StringBuilder();
        for (var i = 0; i < photos.Count; i++)
        {
            var cap = Str(photos[i], "c");
            var w = i == 0 ? 1260 : 620;
            var h = i == 0 ? 540 : 414;

            tiles.Append("<button type=\"button\" class=\"ab-shot\" data-i=\"").Append(i)
                 .Append("\"><img src=\"")
                 .Append(Src(photos[i], root, Placeholder.Uri(w, h, cap))).Append('"')
                 .Append(ImgAddress(photos[i]))
                 .Append(" width=\"").Append(w).Append("\" height=\"").Append(h)
                 .Append("\" alt=\"").Append(Esc(cap)).Append("\" loading=\"lazy\">")
                 .Append("<span class=\"ab-shot-cap\"").Append(TextAddress(photos[i], "c")).Append('>')
                 .Append(Esc(cap)).Append("</span></button>");
        }

        var others = new StringBuilder();
        foreach (var x in Arr(doc, "albums").Where(x => Str(x, "id") != id)
                     .OrderByDescending(x => int.TryParse(Str(x, "year"), out var y) ? y : 0).Take(3))
        {
            var t = Str(x, "title");
            others.Append("<a class=\"ab-card\" href=\"").Append(SiblingHref(x))
                  .Append("\"><img src=\"")
                  .Append(Src(x, root, Placeholder.Uri(400, 280, t))).Append('"')
                  .Append(ImgAddress(x))
                  .Append(" width=\"400\" height=\"280\" alt=\"").Append(Esc(t))
                  .Append("\" loading=\"lazy\"><h3").Append(TextAddress(x, "title")).Append('>')
                  .Append(Esc(t))
                  .Append("</h3><p class=\"ab-card-spec\">")
                  .Append("<span").Append(TextAddress(x, "year")).Append('>')
                  .Append(Esc(Str(x, "year"))).Append("</span> · ")
                  .Append("<span").Append(TextAddress(x, "location")).Append('>')
                  .Append(Esc(Str(x, "location"))).Append("</span></p></a>");
        }

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(Str(a, "year"))).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\"").Append(TextAddress(a, "title")).Append('>')
            .Append(Esc(Str(a, "title")))
            .Append("</h1><p class=\"ab-tagline\"").Append(TextAddress(a, "note")).Append('>')
            .Append(Esc(Str(a, "note"))).Append("</p>")
            .Append("<dl class=\"ab-specs\">").Append(dl).Append("</dl>")
            .Append("<p class=\"ab-count\">").Append(photos.Count)
            .Append(" photographs — select one to open the viewer</p>")
            .Append("<div class=\"ab-sheet\">").Append(tiles).Append("</div>")
            .Append("<div class=\"ab-items\"><h2>Other albums</h2><div class=\"ab-grid\">")
            .Append(others).Append("</div></div></div>").ToString();
    }

    /// <summary>
    /// One document: what it is, how to get it, and an inline preview of the PDF itself.
    /// </summary>
    private static string? DocumentDetail(JsonNode doc, JsonNode? d, string root)
    {
        if (d is null) return null;

        var id = Str(d, "id");
        var cat = Arr(doc, "categories").FirstOrDefault(c => Arr(c, "items").Any(x => Str(x, "id") == id));
        if (cat is null) return null;

        var catName = Str(cat, "name");
        var file = root + "_docs/" + Esc(id) + ".pdf";

        // Reference is the id upper-cased and Type belongs to the category, so neither is
        // edited here; Format is not in the file at all.
        (string K, string V, string A)[] rows =
        [
            ("Reference", id.ToUpperInvariant(), string.Empty),
            ("Type", catName, string.Empty),
            ("Edition", Str(d, "edition"), TextAddress(d, "edition")),
            ("Language", Str(d, "lang"), TextAddress(d, "lang")),
            ("Pages", Str(d, "pages"), TextAddress(d, "pages")),
            ("Format", "PDF", string.Empty),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v, a) in rows)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd")
              .Append(a).Append('>').Append(Esc(v)).Append("</dd></div>");

        var siblings = new StringBuilder();
        foreach (var x in Arr(cat, "items").Where(x => Str(x, "id") != id))
        {
            siblings.Append("<a class=\"ab-doc-mini\" href=\"").Append(SiblingHref(x))
                    .Append("\">")
                    .Append("<span class=\"ab-doc-icon\" aria-hidden=\"true\">PDF</span>")
                    .Append("<span><span class=\"ab-doc-title\"").Append(TextAddress(x, "title")).Append('>')
                    .Append(Esc(Str(x, "title")))
                    .Append("</span><span class=\"ab-doc-meta\">")
                    .Append("<span").Append(TextAddress(x, "edition")).Append('>')
                    .Append(Esc(Str(x, "edition"))).Append("</span>")
                    .Append(" &middot; ")
                    .Append("<span").Append(TextAddress(x, "pages")).Append('>')
                    .Append(Esc(Str(x, "pages"))).Append("</span>")
                    .Append(" pages</span></span></a>");
        }

        var sb = new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(catName)).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\"").Append(TextAddress(d, "title")).Append('>')
            .Append(Esc(Str(d, "title")))
            .Append("</h1><p class=\"ab-tagline\"").Append(TextAddress(d, "blurb")).Append('>')
            .Append(Esc(Str(d, "blurb"))).Append("</p>")
            .Append("<div class=\"ab-docactions\"><a class=\"ab-submit\" href=\"").Append(file)
            .Append("\" download>Download PDF</a><a class=\"ab-plain\" href=\"").Append(file)
            .Append("\" target=\"_blank\" rel=\"noopener\">Open in a new tab</a></div>")
            .Append("<dl class=\"ab-specs\">").Append(dl).Append("</dl>")
            .Append("<div class=\"ab-preview\"><object data=\"").Append(file)
            .Append("\" type=\"application/pdf\">")
            .Append("<p class=\"ab-preview-fallback\">Your browser will not display a PDF inline. ")
            .Append("<a href=\"").Append(file).Append("\" download>Download the file</a> instead.")
            .Append("</p></object></div>");

        if (siblings.Length > 0)
            sb.Append("<div class=\"ab-items\"><h2>Also in ").Append(Esc(catName.ToLowerInvariant()))
              .Append("</h2><div class=\"ab-docminis\">").Append(siblings).Append("</div></div>");

        return sb.Append("</div>").ToString();
    }

    /// <summary>
    /// One chapter of the About section, with the previous and next chapter at the foot. The pair
    /// of steps is how someone reads the section through rather than bouncing back to the index.
    /// </summary>
    private static string? AboutDetail(JsonNode doc, string? itemId, string root)
    {
        var chapters = Arr(doc, "chapters");
        if (chapters.Count == 0) return null;

        var at = chapters.FindIndex(x => Str(x, "id") == itemId);
        if (at < 0) at = 0;
        var c = chapters[at];
        var name = Str(c, "name");

        var body = new StringBuilder();
        foreach (var p in Arr(c, "body"))
            body.Append("<p").Append(TextAt(p)).Append('>').Append(Esc(p.ToString())).Append("</p>");

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(name)).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\"").Append(TextAddress(c, "title")).Append('>')
            .Append(Esc(Str(c, "title")))
            .Append("</h1><p class=\"ab-tagline\"").Append(TextAddress(c, "lede")).Append('>')
            .Append(Esc(Str(c, "lede"))).Append("</p>")
            .Append("<div class=\"ab-hero\"><img src=\"")
            .Append(Src(c, root, Placeholder.Uri(1240, 520, name))).Append('"').Append(ImgAddress(c))
            .Append(" width=\"1240\" height=\"520\" alt=\"").Append(Esc(name)).Append("\"></div>")
            .Append("<div class=\"ab-article\">").Append(body).Append("</div>")
            .Append("<nav class=\"ab-steps\">")
            .Append(Step(at > 0 ? chapters[at - 1] : null, "Previous", "is-prev"))
            .Append(Step(at < chapters.Count - 1 ? chapters[at + 1] : null, "Next", "is-next"))
            .Append("</nav></div>").ToString();
    }

    /// <summary>An empty span where there is no neighbour, so the pair keeps its grid columns.</summary>
    private static string Step(JsonNode? x, string label, string cls)
        => x is null
            ? "<span></span>"
            // The chapter's title sits after a span, so it is neither the element's whole text
            // nor its lead. It is edited on the chapter's own page, one click away.
            : "<a class=\"ab-step " + cls + "\" href=\"" + SiblingHref(x)
              + "\"><span>" + label + "</span>" + Esc(Str(x, "title")) + "</a>";

    /// <summary>
    /// One enquiry form. The fields are data, so a new question is a content edit rather than a
    /// code change - and the labels reach the crawler, which is how an answer engine learns what
    /// this company can be asked for.
    /// </summary>
    private static string? ContactDetail(JsonNode doc, JsonNode? r)
    {
        if (r is null) return null;

        var id = Str(r, "id");
        var fields = new StringBuilder();
        foreach (var f in Arr(r, "fields")) fields.Append(Field(f));

        var consent = new StringBuilder();
        var consents = Arr(doc, "consent");
        for (var i = 0; i < consents.Count; i++)
            consent.Append("<label><input type=\"checkbox\" name=\"consent").Append(i)
                   .Append("\"> <span").Append(TextAt(consents[i])).Append('>')
                   .Append(Esc(consents[i].ToString())).Append("</span></label>");

        var others = Arr(doc, "routes").Where(x => Str(x, "id") != id)
            .Select(x => "<a href=\"" + SiblingHref(x) + "\"" + TextAddress(x, "name") + ">"
                         + Esc(Str(x, "name")) + "</a>");

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(Str(r, "name"))).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\"").Append(TextAddress(r, "name")).Append('>')
            .Append(Esc(Str(r, "name")))
            .Append("</h1><p class=\"ab-tagline\"").Append(TextAddress(r, "intro")).Append('>')
            .Append(Esc(Str(r, "intro"))).Append("</p>")
            .Append("<form class=\"ab-form\" novalidate>")
            // A field no person sees and no person fills. The commonest robot fills in
            // everything it finds, and this costs one input to turn away.
            .Append("<input type=\"text\" name=\"website\" tabindex=\"-1\" autocomplete=\"off\"")
            .Append(" aria-hidden=\"true\" style=\"position:absolute;left:-9999px\">")
            .Append("<div class=\"ab-fields\">").Append(fields)
            .Append("</div><div class=\"ab-consent\">").Append(consent).Append("</div>")
            .Append("<button type=\"submit\" class=\"ab-submit\"").Append(TextAddress(r, "cta")).Append('>')
            .Append(Esc(Str(r, "cta")))
            .Append("</button><p class=\"ab-form-note\" hidden></p></form>")
            .Append("<p class=\"ab-band-sub\" style=\"margin:44px 0 88px\">Other enquiries: ")
            .Append(string.Join("<span aria-hidden=\"true\"> · </span>", others))
            .Append("</p></div>").ToString();
    }

    /// <summary>One labelled control, built from its declaration in contact.json.</summary>
    private static string Field(JsonNode f)
    {
        var label = Str(f, "n");
        var type = Str(f, "t");
        var hint = Str(f, "hint");
        var required = f["req"]?.GetValue<bool>() ?? false;

        var id = "f-" + Slug(label);
        var req = required ? " required" : string.Empty;

        var input = type switch
        {
            "textarea" => $"<textarea id=\"{id}\" name=\"{id}\" rows=\"5\"{req}></textarea>",
            "select" => "<select id=\"" + id + "\" name=\"" + id + "\"" + req + ">"
                        + "<option value=\"\">Select…</option>"
                        + string.Concat(Arr(f, "opts").Select(o => "<option>" + Esc(o.ToString()) + "</option>"))
                        + "</select>",
            _ => $"<input type=\"{Esc(type)}\" id=\"{id}\" name=\"{id}\"{req}>",
        };

        var wide = type is "textarea" or "file" ? " is-wide" : string.Empty;
        // A required field puts an <abbr> after its words, so the label is the lead there and
        // the whole text where there is no star.
        var mark = required ? "<abbr title=\"required\">*</abbr>" : string.Empty;
        var labelAddr = required
            ? " data-ab-lead=\"." + Esc(Where(f, "n")) + "\""
            : TextAddress(f, "n");

        return "<div class=\"ab-field" + wide + "\"><label for=\"" + id + "\"" + labelAddr + ">"
               + Esc(label) + mark + "</label>" + input
               + (hint.Length > 0
                  ? "<span class=\"ab-hint\"" + TextAddress(f, "hint") + ">" + Esc(hint) + "</span>"
                  : string.Empty)
               + "</div>";
    }

    /// <summary>Matches the script: lower case, runs of anything else become one hyphen.</summary>
    private static string Slug(string s)
    {
        var sb = new StringBuilder();
        foreach (var ch in s.ToLowerInvariant())
        {
            if (ch is >= 'a' and <= 'z' or >= '0' and <= '9') sb.Append(ch);
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }
        return sb.ToString().Trim('-');
    }

    private static readonly string[] Months =
    [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];

    /// <summary>"19 August 2026" - the day without a leading zero, matching the script.</summary>
    private static string LongDate(string iso)
    {
        var p = iso.Split('-');
        if (p.Length != 3 || !int.TryParse(p[1], out var m) || m < 1 || m > 12) return Esc(iso);
        return int.Parse(p[2]) + " " + Months[m - 1] + " " + p[0];
    }

    /// <summary>
    /// The numbered chapter bar. The numbering is the one structural idea worth keeping from the
    /// page this section is modelled on: it says how many chapters there are and where you are in
    /// them, which a plain menu does not. Numbers come from position, so reordering renumbers.
    /// </summary>
    private static string AboutNav(JsonNode doc, string? activeId = null)
    {
        // The overview links down into the chapters; a chapter links sideways to its siblings.
        var up = activeId is null ? "" : "../";

        var chapters = Arr(doc, "chapters");
        var sb = new StringBuilder("<div class=\"ab-wrap ab-chapbar\">");
        for (var i = 0; i < chapters.Count; i++)
        {
            var id = Str(chapters[i], "id");
            sb.Append("<a class=\"ab-chap").Append(id == activeId ? " is-on" : "").Append("\" href=\"")
              .Append(up).Append(Href(chapters[i]))
              // The number is a child element, so the chapter's name is what follows it -
              // neither the link's whole text nor its lead. Edited on the chapter's own card.
              .Append("\"><span class=\"ab-chap-n\">").Append(Num(i)).Append(".</span>")
              .Append(Esc(Str(chapters[i], "name"))).Append("</a>");
        }
        return sb.Append("</div>").ToString();
    }

    /// <summary>
    /// The key-figures panel, with the first tab already open - the state the page settles into.
    /// The other tabs stay in the data the script reads, so switching them costs no round trip.
    /// </summary>
    private static string AboutFigures(JsonNode doc)
    {
        var f = doc["figures"];
        var tabs = (f?["tabs"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
        if (tabs.Count == 0) return string.Empty;

        var sb = new StringBuilder("<div class=\"ab-wrap\"><h2 class=\"ab-fig-title\"");
        sb.Append(TextAddress(f, "title")).Append('>')
          .Append(Esc(Str(f, "title"))).Append("</h2><div class=\"ab-fig-tabs\">");
        for (var i = 0; i < tabs.Count; i++)
        {
            sb.Append("<button type=\"button\" data-i=\"").Append(i).Append('"');
            if (i == 0) sb.Append(" class=\"is-on\"");
            sb.Append(TextAddress(tabs[i], "label"))
              .Append('>').Append(Esc(Str(tabs[i], "label"))).Append("</button>");
        }
        sb.Append("</div><div class=\"ab-fig-body\" id=\"ab-fig-body\">");

        foreach (var r in (tabs[0]["rows"] as JsonArray)?.OfType<JsonArray>() ?? [])
        {
            // A row is a two-element array - the label and the figure - so each half is
            // addressed by its own position rather than by a field name.
            sb.Append("<div class=\"ab-fig\"><span class=\"ab-fig-k\"")
              .Append(r.Count > 0 ? TextAt(r[0]) : string.Empty).Append('>')
              .Append(Esc(r.Count > 0 ? r[0]!.ToString() : string.Empty))
              .Append("</span><span class=\"ab-fig-v\"")
              .Append(r.Count > 1 ? TextAt(r[1]) : string.Empty).Append('>')
              .Append(Esc(r.Count > 1 ? r[1]!.ToString() : string.Empty))
              .Append("</span></div>");
        }
        return sb.Append("</div></div>").ToString();
    }

    /// <summary>One card per chapter, numbered to match the bar above.</summary>
    private static string AboutChapters(JsonNode doc, string root)
    {
        var chapters = Arr(doc, "chapters");
        var sb = new StringBuilder();
        for (var i = 0; i < chapters.Count; i++)
        {
            var c = chapters[i];
            var name = Str(c, "name");
            sb.Append("<a class=\"ab-chapcard\" href=\"").Append(Href(c)).Append("\">")
              .Append("<img src=\"").Append(Src(c, root, Placeholder.Uri(560, 340, name)))
              .Append('"').Append(ImgAddress(c))
              .Append(" width=\"560\" height=\"340\" alt=\"").Append(Esc(name))
              .Append("\" loading=\"lazy\">")
              .Append("<span class=\"ab-chap-n\">").Append(Num(i)).Append(".</span>")
              .Append("<h3").Append(TextAddress(c, "title")).Append('>')
              .Append(Esc(Str(c, "title"))).Append("</h3>")
              .Append("<p").Append(TextAddress(c, "lede")).Append('>')
              .Append(Esc(Str(c, "lede"))).Append("</p></a>");
        }
        return sb.ToString();
    }

    /// <summary>"01", "02" - two digits, so the numbers line up in a column.</summary>
    private static string Num(int i) => (i + 1).ToString("00");

    /// <summary>
    /// Each office as an address block with a real tel: and mailto: link. These are the two things
    /// a visitor came for and the two things an AI answer engine is asked for by name, so they
    /// belong in the HTML rather than in a script's output.
    /// </summary>
    private static string ContactOffices(JsonNode doc)
    {
        var offices = doc["offices"] as JsonArray;
        if (offices is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var o in offices.OfType<JsonNode>())
        {
            var phone = Str(o, "phone");
            var email = Str(o, "email");
            var lines = (o["lines"] as JsonArray)?.OfType<JsonNode>()
                .Select(l => "<span" + TextAt(l) + ">" + Esc(l.ToString()) + "</span>");

            sb.Append("<div class=\"ab-office\"><h2").Append(TextAddress(o, "name")).Append('>')
              .Append(Esc(Str(o, "name"))).Append("</h2>")
              .Append("<p>").Append(string.Join("<br>", lines ?? [])).Append("</p>")
              .Append("<p><a href=\"tel:").Append(Esc(StripSpace(phone))).Append('"')
              .Append(TextAddress(o, "phone")).Append('>')
              .Append(Esc(phone)).Append("</a><br><a href=\"mailto:").Append(Esc(email))
              .Append('"').Append(TextAddress(o, "email")).Append('>')
              .Append(Esc(email)).Append("</a></p></div>");
        }
        return sb.ToString();
    }

    /// <summary>The four enquiry routes, each a card linking to its own form.</summary>
    private static string ContactRoutes(JsonNode doc)
    {
        var routes = doc["routes"] as JsonArray;
        if (routes is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var r in routes.OfType<JsonNode>())
        {
            sb.Append("<a class=\"ab-route\" href=\"").Append(Href(r)).Append("\">")
              .Append("<h3").Append(TextAddress(r, "name")).Append('>')
              .Append(Esc(Str(r, "name"))).Append("</h3>")
              .Append("<p").Append(TextAddress(r, "blurb")).Append('>')
              .Append(Esc(Str(r, "blurb"))).Append("</p>")
              .Append("<span class=\"ab-route-cta\"").Append(TextAddress(r, "cta")).Append('>')
              .Append(Esc(Str(r, "cta")))
              .Append("</span></a>");
        }
        return sb.ToString();
    }

    /// <summary>A tel: href carries no spaces. Matches the script's <c>replace(/\s/g, '')</c>.</summary>
    private static string StripSpace(string s) => new(s.Where(c => !char.IsWhiteSpace(c)).ToArray());

    /// <summary>
    /// "3 months ago" rather than a date. It answers "is this current" without arithmetic, which
    /// is what a listing is for; the exact date is on the article itself.
    /// </summary>
    private static string Ago(string iso)
    {
        if (!DateTime.TryParse(iso, out var then)) return string.Empty;
        var days = (int)Math.Round((DateTime.UtcNow.Date - then.Date).TotalDays);
        if (days < 1) return "today";
        if (days < 30) return days + (days == 1 ? " day ago" : " days ago");
        var months = (int)Math.Round(days / 30.44);
        if (months < 12) return months + (months == 1 ? " month ago" : " months ago");
        var years = months / 12;
        return years + (years == 1 ? " year ago" : " years ago");
    }

    private static string Str(JsonNode? node, string key) => node?[key]?.ToString() ?? string.Empty;

    /// <summary>
    /// Matches <c>AB.esc</c> in app.js character for character, the double quote included. No
    /// content carries a quote today, but the whole point of this project is that a client will
    /// soon be typing this text - and a quote inside an attribute would end the attribute.
    /// </summary>
    private static string Esc(string s) => s
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;");
}
