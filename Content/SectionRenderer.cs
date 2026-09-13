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

    /// <summary>The JSON document a section reads from, or null when the name is not one we know.</summary>
    private JsonNode? DocFor(string section) => section switch
    {
        "news-list" or "news-detail" => _store.Get("news"),
        "products-list" or "products-detail" or "home-hero-words" or "home-hero-caption"
            or "home-products" => _store.Get("products"),
        "projects-list" or "projects-detail" or "home-projects" => _store.Get("projects"),
        "colors-filters" or "colors-count" or "colors-list" or "colors-detail" or "home-colors"
            => _store.Get("colors"),
        "documents-filters" or "documents-count" or "documents-list" or "documents-detail"
            => _store.Get("documents"),
        "about-nav" or "about-figures" or "about-chapters" or "about-detail" or "about-chapbar"
            => _store.Get("about"),
        "contact-offices" or "contact-routes" or "contact-detail" => _store.Get("contact"),
        "home-feature" => _store.Get("feature"),
        "home-highlights" => _store.Get("highlights"),
        "home-gallery" or "home-gallery-tags" => _store.Get("gallery"),
        "home-app-tabs" or "home-app-slides" => _store.Get("applications"),
        "globe-routes" => _store.Get("globe"),
        "factories-list" => _store.Get("factories"),
        _ => null,
    };

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
        => (node?[key] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];

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
            "colors-list" => ColorList(doc),
            "documents-filters" => DocumentFilters(doc),
            "documents-count" => DocumentCount(doc),
            "documents-list" => DocumentList(doc, rootPrefix),
            "about-nav" => AboutNav(doc),
            "about-figures" => AboutFigures(doc),
            "about-chapters" => AboutChapters(doc),
            "contact-offices" => ContactOffices(doc),
            "contact-routes" => ContactRoutes(doc),
            "news-detail" => NewsDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "products-detail" => ProductDetail(doc, Pick(section, doc, itemId)),
            "colors-detail" => ColorDetail(doc, Pick(section, doc, itemId)),
            "projects-detail" => ProjectDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "documents-detail" => DocumentDetail(doc, Pick(section, doc, itemId), rootPrefix),
            "about-detail" => AboutDetail(doc, itemId),
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
        var items = doc["items"] as JsonArray;
        if (items is null) return string.Empty;

        // Newest first, the order the listing has always shown.
        var sorted = items.OfType<JsonNode>()
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

            var tags = (a["tags"] as JsonArray)?.Select(t => Esc(t?.ToString() ?? "")) ?? [];

            sb.Append($"<a class=\"ab-post{(lead ? " is-lead" : "")}\" href=\"detail/?id=")
              .Append(Uri.EscapeDataString(Str(a, "id"))).Append("\">")
              .Append("<span class=\"ab-post-img\"><img src=\"").Append(src)
              .Append($"\" width=\"{w}\" height=\"{h}\" alt=\"").Append(Esc(Str(a, "title")))
              .Append("\" loading=\"lazy\"></span>")
              .Append("<span class=\"ab-post-tags\">").Append(string.Join(" &middot; ", tags))
              .Append("</span>")
              .Append("<h2>").Append(Esc(Str(a, "title"))).Append("</h2>")
              .Append("<p class=\"ab-post-excerpt\">").Append(Esc(Str(a, "excerpt"))).Append("</p>")
              .Append("<p class=\"ab-post-meta\">").Append(Ago(Str(a, "date")))
              .Append(" &nbsp;|&nbsp; Written by: ").Append(Esc(Str(a, "author")))
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
        var cats = doc["categories"] as JsonArray;
        if (cats is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var c in cats.OfType<JsonNode>())
        {
            var id = Uri.EscapeDataString(Str(c, "id"));
            var items = (c["items"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];

            var tiles = new StringBuilder();
            foreach (var it in items)
            {
                var image = Str(it, "image");
                var src = string.IsNullOrEmpty(image)
                    ? Placeholder.Uri(340, 300, Str(it, "name"))
                    : root + "_media/" + image;

                tiles.Append("<a class=\"ab-tile\" href=\"detail/?id=").Append(id)
                     .Append('#').Append(Uri.EscapeDataString(Str(it, "id"))).Append("\">")
                     .Append("<span class=\"ab-thumb\"><img src=\"").Append(src)
                     .Append("\" width=\"340\" height=\"300\" alt=\"").Append(Esc(Str(it, "name")))
                     .Append("\" loading=\"lazy\"></span>")
                     .Append("<h3>").Append(Esc(Str(it, "name"))).Append("</h3>")
                     .Append("<p>").Append(Esc(Str(it, "spec"))).Append("</p></a>");
            }

            sb.Append("<section class=\"ab-band\"><div class=\"ab-band-head\">")
              .Append("<h2>").Append(Esc(Str(c, "name"))).Append("</h2>")
              .Append("<a class=\"ab-more\" href=\"detail/?id=").Append(id).Append("\">")
              .Append(items.Count).Append(" products</a></div>")
              .Append("<p class=\"ab-band-sub\">").Append(Esc(Str(c, "tagline"))).Append("</p>")
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
        var albums = doc["albums"] as JsonArray;
        if (albums is null) return string.Empty;

        var byYear = albums.OfType<JsonNode>()
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

                cards.Append("<a class=\"ab-album\" href=\"detail/?id=")
                     .Append(Uri.EscapeDataString(Str(a, "id"))).Append("\">")
                     .Append("<span class=\"ab-album-cover\"><img src=\"").Append(src)
                     .Append("\" width=\"760\" height=\"520\" alt=\"").Append(Esc(Str(a, "title")))
                     .Append("\" loading=\"lazy\">")
                     .Append("<span class=\"ab-album-count\">").Append(photos)
                     .Append(" photographs</span></span>")
                     .Append("<h3>").Append(Esc(Str(a, "title"))).Append("</h3>")
                     .Append("<p class=\"ab-album-where\">").Append(Esc(Str(a, "location"))).Append("</p>")
                     .Append("<p class=\"ab-album-scope\">").Append(Esc(Str(a, "scope"))).Append("</p></a>");
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
                opts.Append("<button type=\"button\" data-k=\"").Append(key)
                    .Append("\" data-v=\"").Append(v).Append("\">").Append(v).Append("</button>");
            }

            sb.Append("<div class=\"ab-filter\"><span class=\"ab-filter-label\">")
              .Append(Esc(Str(f, "label"))).Append("</span><div class=\"ab-filter-opts\">")
              .Append(opts).Append("</div></div>");
        }
        return sb.ToString();
    }

    /// <summary>The unfiltered tally. Counted, never written into the prose.</summary>
    private static string ColorCount(JsonNode doc)
        => ((doc["items"] as JsonArray)?.Count ?? 0) + " finishes";

    /// <summary>
    /// The swatch grid. This is the one listing that shows a real colour instead of the grey
    /// stand-in used everywhere else - the colour IS the product, and a page of grey rectangles
    /// would tell a client nothing.
    /// </summary>
    private static string ColorList(JsonNode doc)
    {
        var items = doc["items"] as JsonArray;
        if (items is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var c in items.OfType<JsonNode>())
        {
            sb.Append("<a class=\"ab-swatch\" href=\"detail/?id=")
              .Append(Uri.EscapeDataString(Str(c, "id"))).Append("\">")
              .Append("<span class=\"ab-chip\" style=\"background:").Append(Esc(Str(c, "hex")))
              .Append("\"></span>")
              .Append("<span class=\"ab-swatch-name\">").Append(Esc(Str(c, "name"))).Append("</span>")
              .Append("<span class=\"ab-swatch-meta\">").Append(Esc(Str(c, "code")))
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
        var cats = (doc["categories"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];

        var types = new List<(string V, string T)> { (string.Empty, "All") };
        types.AddRange(cats.Select(c => (Str(c, "id"), Str(c, "name"))));

        var langs = new List<(string V, string T)> { (string.Empty, "All") };
        foreach (var d in cats.SelectMany(c => (c["items"] as JsonArray)?.OfType<JsonNode>() ?? []))
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
        var total = (doc["categories"] as JsonArray)?.OfType<JsonNode>()
            .Sum(c => (c["items"] as JsonArray)?.Count ?? 0) ?? 0;
        return total + " documents";
    }

    /// <summary>
    /// The document list, grouped by category. Each row links twice: to the document's own page,
    /// and straight to the PDF. The second link is what most people came for, so it is a real
    /// link with a real filename rather than something a script attaches later.
    /// </summary>
    private static string DocumentList(JsonNode doc, string root)
    {
        var cats = doc["categories"] as JsonArray;
        if (cats is null) return string.Empty;

        var sb = new StringBuilder();
        foreach (var c in cats.OfType<JsonNode>())
        {
            var items = (c["items"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
            if (items.Count == 0) continue;

            var rows = new StringBuilder();
            foreach (var d in items)
            {
                var id = Str(d, "id");
                rows.Append("<div class=\"ab-doc\">")
                    .Append("<a class=\"ab-doc-main\" href=\"detail/?id=")
                    .Append(Uri.EscapeDataString(id)).Append("\">")
                    .Append("<span class=\"ab-doc-icon\" aria-hidden=\"true\">PDF</span>")
                    .Append("<span class=\"ab-doc-text\">")
                    .Append("<span class=\"ab-doc-title\">").Append(Esc(Str(d, "title"))).Append("</span>")
                    .Append("<span class=\"ab-doc-blurb\">").Append(Esc(Str(d, "blurb"))).Append("</span>")
                    .Append("<span class=\"ab-doc-meta\">").Append(Esc(Str(c, "name")))
                    .Append(" &middot; ").Append(Esc(Str(d, "edition")))
                    .Append(" &middot; ").Append(Esc(Str(d, "lang")))
                    .Append(" &middot; ").Append(Esc(Str(d, "pages"))).Append(" pages</span>")
                    .Append("</span></a>")
                    .Append("<a class=\"ab-doc-dl\" href=\"").Append(root).Append("_docs/")
                    .Append(Esc(id)).Append(".pdf\" download>Download</a></div>");
            }

            sb.Append("<section class=\"ab-doccat\"><div class=\"ab-doccat-head\"><h2>")
              .Append(Esc(Str(c, "name"))).Append("</h2><p>").Append(Esc(Str(c, "blurb")))
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
        var tags = (a["tags"] as JsonArray)?.OfType<JsonNode>().Select(t => Esc(t.ToString())) ?? [];

        var more = (doc["items"] as JsonArray)?.OfType<JsonNode>()
            .Where(x => Str(x, "id") != id)
            .OrderByDescending(x => Str(x, "date"), StringComparer.Ordinal)
            .Take(3) ?? [];

        var cards = new StringBuilder();
        foreach (var x in more)
        {
            var xTitle = Str(x, "title");
            var xImage = Str(x, "image");
            cards.Append("<a class=\"ab-card\" href=\"?id=").Append(Uri.EscapeDataString(Str(x, "id")))
                 .Append("\"><img src=\"")
                 .Append(xImage.Length > 0 ? root + "_media/" + xImage : Placeholder.Uri(400, 260, xTitle))
                 .Append("\" width=\"400\" height=\"260\" alt=\"").Append(Esc(xTitle))
                 .Append("\" loading=\"lazy\"><h3>").Append(Esc(xTitle))
                 .Append("</h3><p class=\"ab-card-spec\">").Append(LongDate(Str(x, "date")))
                 .Append("</p></a>");
        }

        var image = Str(a, "image");
        var sb = new StringBuilder("<div class=\"ab-wrap\">");
        sb.Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
          .Append("</a> &nbsp;/&nbsp; ").Append(string.Join(" &middot; ", tags)).Append("</p>")
          .Append("<h1 class=\"ab-title ab-article-title\">").Append(Esc(title)).Append("</h1>")
          .Append("<p class=\"ab-post-meta\">").Append(LongDate(Str(a, "date")))
          .Append(" &nbsp;|&nbsp; Written by: ").Append(Esc(Str(a, "author"))).Append("</p>")
          .Append("<div class=\"ab-hero\"><img src=\"")
          .Append(image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(1240, 560, title))
          .Append("\" width=\"1240\" height=\"560\" alt=\"").Append(Esc(title)).Append("\"></div>")
          .Append("<div class=\"ab-article\"><p class=\"ab-standfirst\">")
          .Append(Esc(Str(a, "excerpt"))).Append("</p>");

        foreach (var p in (a["body"] as JsonArray)?.OfType<JsonNode>() ?? [])
            sb.Append("<p>").Append(Esc(p.ToString())).Append("</p>");

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
        var cats = Arr(doc, "categories");
        var sb = new StringBuilder();
        for (var i = 0; i < cats.Count; i++)
        {
            sb.Append("<a href=\"").Append(root).Append("products/detail/?id=")
              .Append(Uri.EscapeDataString(Str(cats[i], "id")))
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
        return "<strong>" + Esc(Str(first, "name")) + "</strong> " + Esc(Str(first, "tagline"));
    }

    /// <summary>Every product family as a tile. Same data as the Products page, so they cannot drift.</summary>
    private static string HomeProducts(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        foreach (var c in Arr(doc, "categories"))
        {
            var name = Str(c, "name");
            var image = Str(c, "image");
            sb.Append("<a class=\"ab-tile\" href=\"products/detail/?id=")
              .Append(Uri.EscapeDataString(Str(c, "id"))).Append("\">")
              .Append("<span class=\"ab-thumb\"><img src=\"")
              .Append(image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(340, 300, name))
              .Append("\" width=\"340\" height=\"300\" alt=\"").Append(Esc(name))
              .Append("\" loading=\"lazy\"></span><h3>").Append(Esc(name)).Append("</h3><p>")
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
            var image = Str(c, "image");
            // A finish is a surface, not a flat colour: beside photographed surfaces a plain
            // chip reads as an empty box, so the photograph wins where there is one.
            var chip = image.Length > 0
                ? "<span class=\"ab-chip\"><img src=\"" + root + "_media/" + Esc(image)
                  + "\" alt=\"\" loading=\"lazy\"></span>"
                : "<span class=\"ab-chip\" style=\"background:" + Esc(Str(c, "hex")) + "\"></span>";

            sb.Append("<a class=\"ab-swatch\" href=\"colors/detail/?id=")
              .Append(Uri.EscapeDataString(Str(c, "id"))).Append("\">").Append(chip)
              .Append("<span class=\"ab-swatch-name\">").Append(Esc(Str(c, "name")))
              .Append("</span><span class=\"ab-swatch-meta\">").Append(Esc(Str(c, "code")))
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
            var image = Str(a, "image");
            sb.Append("<a class=\"ab-card\" href=\"projects/detail/?id=")
              .Append(Uri.EscapeDataString(Str(a, "id"))).Append("\"><img src=\"")
              .Append(image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(420, 300, title))
              .Append("\" width=\"420\" height=\"300\" alt=\"").Append(Esc(title))
              .Append("\" loading=\"lazy\"><h3>").Append(Esc(title))
              .Append("</h3><p class=\"ab-card-spec\">")
              .Append(Esc(Str(a, "year") + " · " + Str(a, "location"))).Append("</p><p>")
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
            .Append("<p class=\"core-cta-customizable__text-col__bottom__text font-16 mb-32\">")
            .Append(Esc(Str(doc, "eyebrow"))).Append("</p>")
            .Append("<h2 class=\"font-light font-40\" id=\"abfc-title\">").Append(Esc(Str(doc, "heading")))
            .Append("</h2><p class=\"abfc-text\">").Append(Esc(Str(doc, "text"))).Append("</p></div>")
            .Append("<div class=\"core-cta-customizable__text-col__bottom\">")
            .Append(FeatureLink(doc["cta"], "btn btn-blanco-negro font-14", true, root))
            .Append(FeatureLink(doc["more"], "abfc-alt", false, root))
            .Append("</div></div><div class=\"core-cta-customizable__image-col\">")
            .Append("<img class=\"core-cta-customizable__image-col__image\" src=\"").Append(src)
            .Append("\" width=\"2400\" height=\"1000\" alt=\"").Append(Esc(Str(doc, "alt")))
            .Append("\" loading=\"lazy\"></div>").ToString();
    }

    /// <summary>A link only where both halves are there; a button with no destination is worse than none.</summary>
    private static string FeatureLink(JsonNode? o, string cls, bool arrow, string root)
    {
        var href = Str(o, "href");
        var label = Str(o, "label");
        if (href.Length == 0 || label.Length == 0) return string.Empty;
        return "<a class=\"" + cls + "\" href=\"" + Esc(root + href) + "\">" + Esc(label)
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
    /// </summary>
    private static string HomeHighlights(JsonNode doc, string root)
    {
        var sb = new StringBuilder();
        var items = Arr(doc, "items").Take(6).ToList();
        for (var i = 0; i < items.Count; i++)
        {
            var it = items[i];
            var image = Str(it, "image");
            var src = image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(444, 370, "");
            var title = Str(it, "title");

            sb.Append("<div class=\"core-slider-novedades__slide keen-slider__slide number-slide-")
              .Append(i).Append("\"><a class=\"core-slider-novedades__slide__container\" href=\"")
              .Append(Esc(root + Str(it, "href"))).Append("\"><div class=\"shadow\"></div>")
              .Append("<img class=\"core-slider-novedades__slide__image\" src=\"").Append(Esc(src))
              .Append("\" width=\"444\" height=\"370\" alt=\"").Append(Esc(title))
              .Append("\" loading=\"lazy\">")
              .Append("<div class=\"core-slider-novedades__slide__filter\"></div>")
              .Append("<div class=\"core-slider-novedades__slide__card-body\">")
              .Append("<div class=\"core-slider-novedades__slide__card-body_top\">")
              .Append("<div class=\"core-slider-novedades__slide__card-body__logo\">")
              .Append("<p class=\"core-slider-novedades__logo\">").Append(Esc(Str(it, "label")))
              .Append("</p></div><div class=\"cos-novedades__enlace\">")
              .Append("<h3 class=\"core-slider-novedades__slide__card-body__name font-display-sm uppercase\">")
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
              .Append("<span class=\"abgal-cap\">").Append(Esc(caption)).Append("</span></div>")
              .Append("<img class=\"core-gallery__thumb skip-lazy\" src=\"")
              .Append(GallerySrc(doc, item, root, 640, 640))
              .Append("\" width=\"640\" height=\"640\" alt=\"").Append(Esc(caption))
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
              .Append("\" tabindex=\"").Append(on ? "0" : "-1").Append("\">")
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
              .Append("\" alt=\"\" loading=\"lazy\"><div class=\"core-slider__slide__filter\"></div>")
              .Append("<div class=\"core-slider__slide__card-body\">")
              .Append("<div class=\"core-slider__slide__card-body__block\">")
              .Append("<h3 class=\"core-slider__slide__card-body__name font-16\">")
              .Append(Esc(Str(items[i], "title"))).Append("</h3></div>")
              .Append("<div class=\"core-slider__slide__card-body__block\">")
              .Append("<p class=\"core-slider__slide__card-body__description\">")
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
              .Append("<span class=\"vgx-dot\"></span>\n      <span><span class=\"vgx-name\">")
              .Append(Esc(Str(r, "name"))).Append("</span>\n        <span class=\"vgx-desc\">")
              .Append(Esc(Str(r, "desc"))).Append("</span>\n        <span class=\"vgx-meta\">")
              .Append(Esc(Str(r, "meta"))).Append(" · ").Append(Esc(Str(r, "days")))
              .Append(" days</span></span>\n      <span class=\"vgx-share\">")
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
              .Append("<p class=\"vfx-fname\">").Append(Esc(Str(s, "name"))).Append("</p>")
              .Append("<p class=\"vfx-floc\">").Append(Esc(Str(s, "region"))).Append("</p>")
              .Append("<p class=\"vfx-fdesc\">").Append(Esc(Str(s, "desc"))).Append("</p>")
              .Append("<div class=\"vfx-fstats\"><div>In operation since<b>")
              .Append(Esc(Str(s, "since"))).Append("</b></div><div>Annual capacity<b>")
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
              .Append("\">").Append(Esc(label)).Append("</li>");
        }
        return sb.ToString();
    }

    /// <summary>
    /// One product family: headline, hero, a two-column blurb, and every product in it.
    /// </summary>
    private static string? ProductDetail(JsonNode doc, JsonNode? c)
    {
        if (c is null) return null;

        var id = Str(c, "id");
        var name = Str(c, "name");
        var items = Arr(c, "items");

        var others = Arr(doc, "categories").Where(x => Str(x, "id") != id)
            .Select(x => "<a href=\"?id=" + Uri.EscapeDataString(Str(x, "id")) + "\">"
                         + Esc(Str(x, "name")) + "</a>");

        var cards = new StringBuilder();
        foreach (var it in items)
        {
            var n = Str(it, "name");
            cards.Append("<article class=\"ab-card\" id=\"").Append(Esc(Str(it, "id"))).Append("\">")
                 .Append("<img src=\"").Append(Placeholder.Uri(400, 300, n))
                 .Append("\" width=\"400\" height=\"300\" alt=\"").Append(Esc(n))
                 .Append("\" loading=\"lazy\"><h3>").Append(Esc(n)).Append("</h3>")
                 .Append("<p class=\"ab-card-spec\">").Append(Esc(Str(it, "spec"))).Append("</p>")
                 .Append("<p>").Append(Esc(Str(it, "text"))).Append("</p></article>");
        }

        var para = SplitInTwo(Str(c, "blurb"));

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(name)).Append("</p>")
            .Append("<h1 class=\"ab-title\">").Append(Esc(name)).Append("</h1>")
            .Append("<p class=\"ab-tagline\">").Append(Esc(Str(c, "tagline"))).Append("</p></div>")
            .Append("<div class=\"ab-wrap\"><div class=\"ab-hero\"><img src=\"")
            .Append(Placeholder.Uri(1280, 520, name))
            .Append("\" width=\"1280\" height=\"520\" alt=\"").Append(Esc(name))
            .Append("\"></div></div>")
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
    private static string? ColorDetail(JsonNode doc, JsonNode? c)
    {
        if (c is null) return null;

        var id = Str(c, "id");
        var family = Str(c, "family");
        var spec = doc["familySpecs"]?[family];

        (string K, string V)[] rows =
        [
            ("Code", Str(c, "code")), ("Finish", family), ("Gloss", Str(c, "gloss")),
            ("Exposure", Str(c, "use")),
            ("Coating", Spec(spec, "layer")), ("Standard", Spec(spec, "std")),
            ("Colour warranty", Spec(spec, "warranty")),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v) in rows)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd>")
              .Append(Esc(v)).Append("</dd></div>");

        var siblings = new StringBuilder();
        foreach (var x in Arr(doc, "items").Where(x => Str(x, "family") == family && Str(x, "id") != id).Take(8))
        {
            siblings.Append("<a class=\"ab-swatch\" href=\"?id=")
                    .Append(Uri.EscapeDataString(Str(x, "id"))).Append("\">")
                    .Append("<span class=\"ab-chip\" style=\"background:").Append(Esc(Str(x, "hex")))
                    .Append("\"></span><span class=\"ab-swatch-name\">").Append(Esc(Str(x, "name")))
                    .Append("</span><span class=\"ab-swatch-meta\">").Append(Esc(Str(x, "code")))
                    .Append("</span></a>");
        }

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(family)).Append("</p>")
            .Append("<div class=\"ab-colour-head\"><div class=\"ab-colour-block\" style=\"background:")
            .Append(Esc(Str(c, "hex"))).Append("\"></div><div>")
            .Append("<h1 class=\"ab-title\">").Append(Esc(Str(c, "name"))).Append("</h1>")
            .Append("<p class=\"ab-tagline\">").Append(Esc(Str(c, "code"))).Append(" &middot; ")
            .Append(Esc(family)).Append("</p>")
            .Append("<p class=\"ab-note\">").Append(Esc(Str(c, "note"))).Append("</p></div></div>")
            .Append("<dl class=\"ab-specs\">").Append(dl).Append("</dl>")
            .Append("<div class=\"ab-items\"><h2>Other ").Append(Esc(family.ToLowerInvariant()))
            .Append(" finishes</h2><div class=\"ab-swatches\">").Append(siblings)
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

        (string K, string V)[] facts =
        [
            ("Year", Str(a, "year")), ("Location", Str(a, "location")),
            ("Client", Str(a, "client")), ("Scope", Str(a, "scope")),
            ("Products", string.Join(", ", products)),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v) in facts)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd>")
              .Append(Esc(v)).Append("</dd></div>");

        // The opening frame runs the full width and the rest sit in an even three-column sheet.
        var tiles = new StringBuilder();
        for (var i = 0; i < photos.Count; i++)
        {
            var cap = Str(photos[i], "c");
            var image = Str(photos[i], "image");
            var w = i == 0 ? 1260 : 620;
            var h = i == 0 ? 540 : 414;

            tiles.Append("<button type=\"button\" class=\"ab-shot\" data-i=\"").Append(i)
                 .Append("\"><img src=\"")
                 .Append(image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(w, h, cap))
                 .Append("\" width=\"").Append(w).Append("\" height=\"").Append(h)
                 .Append("\" alt=\"").Append(Esc(cap)).Append("\" loading=\"lazy\">")
                 .Append("<span class=\"ab-shot-cap\">").Append(Esc(cap)).Append("</span></button>");
        }

        var others = new StringBuilder();
        foreach (var x in Arr(doc, "albums").Where(x => Str(x, "id") != id)
                     .OrderByDescending(x => int.TryParse(Str(x, "year"), out var y) ? y : 0).Take(3))
        {
            var t = Str(x, "title");
            var image = Str(x, "image");
            others.Append("<a class=\"ab-card\" href=\"?id=").Append(Uri.EscapeDataString(Str(x, "id")))
                  .Append("\"><img src=\"")
                  .Append(image.Length > 0 ? root + "_media/" + image : Placeholder.Uri(400, 280, t))
                  .Append("\" width=\"400\" height=\"280\" alt=\"").Append(Esc(t))
                  .Append("\" loading=\"lazy\"><h3>").Append(Esc(t))
                  .Append("</h3><p class=\"ab-card-spec\">")
                  .Append(Esc(Str(x, "year") + " · " + Str(x, "location"))).Append("</p></a>");
        }

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(Str(a, "year"))).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\">").Append(Esc(Str(a, "title")))
            .Append("</h1><p class=\"ab-tagline\">").Append(Esc(Str(a, "note"))).Append("</p>")
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

        (string K, string V)[] rows =
        [
            ("Reference", id.ToUpperInvariant()), ("Type", catName), ("Edition", Str(d, "edition")),
            ("Language", Str(d, "lang")), ("Pages", Str(d, "pages")), ("Format", "PDF"),
        ];

        var dl = new StringBuilder();
        foreach (var (k, v) in rows)
            dl.Append("<div class=\"ab-spec\"><dt>").Append(Esc(k)).Append("</dt><dd>")
              .Append(Esc(v)).Append("</dd></div>");

        var siblings = new StringBuilder();
        foreach (var x in Arr(cat, "items").Where(x => Str(x, "id") != id))
        {
            siblings.Append("<a class=\"ab-doc-mini\" href=\"?id=")
                    .Append(Uri.EscapeDataString(Str(x, "id"))).Append("\">")
                    .Append("<span class=\"ab-doc-icon\" aria-hidden=\"true\">PDF</span>")
                    .Append("<span><span class=\"ab-doc-title\">").Append(Esc(Str(x, "title")))
                    .Append("</span><span class=\"ab-doc-meta\">").Append(Esc(Str(x, "edition")))
                    .Append(" &middot; ").Append(Esc(Str(x, "pages")))
                    .Append(" pages</span></span></a>");
        }

        var sb = new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(catName)).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\">").Append(Esc(Str(d, "title")))
            .Append("</h1><p class=\"ab-tagline\">").Append(Esc(Str(d, "blurb"))).Append("</p>")
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
    private static string? AboutDetail(JsonNode doc, string? itemId)
    {
        var chapters = Arr(doc, "chapters");
        if (chapters.Count == 0) return null;

        var at = chapters.FindIndex(x => Str(x, "id") == itemId);
        if (at < 0) at = 0;
        var c = chapters[at];
        var name = Str(c, "name");

        var body = new StringBuilder();
        foreach (var p in Arr(c, "body")) body.Append("<p>").Append(Esc(p.ToString())).Append("</p>");

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(name)).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\">").Append(Esc(Str(c, "title")))
            .Append("</h1><p class=\"ab-tagline\">").Append(Esc(Str(c, "lede"))).Append("</p>")
            .Append("<div class=\"ab-hero\"><img src=\"").Append(Placeholder.Uri(1240, 520, name))
            .Append("\" width=\"1240\" height=\"520\" alt=\"").Append(Esc(name)).Append("\"></div>")
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
            : "<a class=\"ab-step " + cls + "\" href=\"?id=" + Uri.EscapeDataString(Str(x, "id"))
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
                   .Append("\"> ").Append(Esc(consents[i].ToString())).Append("</label>");

        var others = Arr(doc, "routes").Where(x => Str(x, "id") != id)
            .Select(x => "<a href=\"?id=" + Uri.EscapeDataString(Str(x, "id")) + "\">"
                         + Esc(Str(x, "name")) + "</a>");

        return new StringBuilder("<div class=\"ab-wrap\">")
            .Append("<p class=\"ab-crumb\"><a href=\"../\">").Append(Esc(Str(doc, "section")))
            .Append("</a> &nbsp;/&nbsp; ").Append(Esc(Str(r, "name"))).Append("</p>")
            .Append("<h1 class=\"ab-title ab-article-title\">").Append(Esc(Str(r, "name")))
            .Append("</h1><p class=\"ab-tagline\">").Append(Esc(Str(r, "intro"))).Append("</p>")
            .Append("<form class=\"ab-form\" novalidate><div class=\"ab-fields\">").Append(fields)
            .Append("</div><div class=\"ab-consent\">").Append(consent).Append("</div>")
            .Append("<button type=\"submit\" class=\"ab-submit\">").Append(Esc(Str(r, "cta")))
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
        return "<div class=\"ab-field" + wide + "\"><label for=\"" + id + "\">" + Esc(label)
               + (required ? "<abbr title=\"required\">*</abbr>" : string.Empty) + "</label>" + input
               + (hint.Length > 0 ? "<span class=\"ab-hint\">" + Esc(hint) + "</span>" : string.Empty)
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
        var href = activeId is null ? "detail/?id=" : "?id=";

        var chapters = (doc["chapters"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
        var sb = new StringBuilder("<div class=\"ab-wrap ab-chapbar\">");
        for (var i = 0; i < chapters.Count; i++)
        {
            var id = Str(chapters[i], "id");
            sb.Append("<a class=\"ab-chap").Append(id == activeId ? " is-on" : "").Append("\" href=\"")
              .Append(href).Append(Uri.EscapeDataString(id))
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

        var sb = new StringBuilder("<div class=\"ab-wrap\"><h2 class=\"ab-fig-title\">");
        sb.Append(Esc(Str(f, "title"))).Append("</h2><div class=\"ab-fig-tabs\">");
        for (var i = 0; i < tabs.Count; i++)
        {
            sb.Append("<button type=\"button\" data-i=\"").Append(i).Append('"');
            if (i == 0) sb.Append(" class=\"is-on\"");
            sb.Append('>').Append(Esc(Str(tabs[i], "label"))).Append("</button>");
        }
        sb.Append("</div><div class=\"ab-fig-body\" id=\"ab-fig-body\">");

        foreach (var r in (tabs[0]["rows"] as JsonArray)?.OfType<JsonArray>() ?? [])
        {
            sb.Append("<div class=\"ab-fig\"><span class=\"ab-fig-k\">")
              .Append(Esc(r.Count > 0 ? r[0]!.ToString() : string.Empty))
              .Append("</span><span class=\"ab-fig-v\">")
              .Append(Esc(r.Count > 1 ? r[1]!.ToString() : string.Empty))
              .Append("</span></div>");
        }
        return sb.Append("</div></div>").ToString();
    }

    /// <summary>One card per chapter, numbered to match the bar above.</summary>
    private static string AboutChapters(JsonNode doc)
    {
        var chapters = (doc["chapters"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
        var sb = new StringBuilder();
        for (var i = 0; i < chapters.Count; i++)
        {
            var c = chapters[i];
            var name = Str(c, "name");
            sb.Append("<a class=\"ab-chapcard\" href=\"detail/?id=")
              .Append(Uri.EscapeDataString(Str(c, "id"))).Append("\">")
              .Append("<img src=\"").Append(Placeholder.Uri(560, 340, name))
              .Append("\" width=\"560\" height=\"340\" alt=\"").Append(Esc(name))
              .Append("\" loading=\"lazy\">")
              .Append("<span class=\"ab-chap-n\">").Append(Num(i)).Append(".</span>")
              .Append("<h3>").Append(Esc(Str(c, "title"))).Append("</h3>")
              .Append("<p>").Append(Esc(Str(c, "lede"))).Append("</p></a>");
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
            var lines = (o["lines"] as JsonArray)?.OfType<JsonNode>().Select(l => Esc(l.ToString()));

            sb.Append("<div class=\"ab-office\"><h2>").Append(Esc(Str(o, "name"))).Append("</h2>")
              .Append("<p>").Append(string.Join("<br>", lines ?? [])).Append("</p>")
              .Append("<p><a href=\"tel:").Append(Esc(StripSpace(phone))).Append("\">")
              .Append(Esc(phone)).Append("</a><br><a href=\"mailto:").Append(Esc(email))
              .Append("\">").Append(Esc(email)).Append("</a></p></div>");
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
            sb.Append("<a class=\"ab-route\" href=\"detail/?id=")
              .Append(Uri.EscapeDataString(Str(r, "id"))).Append("\">")
              .Append("<h3>").Append(Esc(Str(r, "name"))).Append("</h3>")
              .Append("<p>").Append(Esc(Str(r, "blurb"))).Append("</p>")
              .Append("<span class=\"ab-route-cta\">").Append(Esc(Str(r, "cta")))
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
