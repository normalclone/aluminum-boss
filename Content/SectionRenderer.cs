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
        "products-list" => _store.Get("products"),
        "projects-list" => _store.Get("projects"),
        "colors-filters" or "colors-count" or "colors-list" => _store.Get("colors"),
        "documents-filters" or "documents-count" or "documents-list" => _store.Get("documents"),
        "about-nav" or "about-figures" or "about-chapters" => _store.Get("about"),
        "contact-offices" or "contact-routes" => _store.Get("contact"),
        _ => null,
    };

    /// <summary>
    /// The items a detail page can show, in the order the listing shows them. The first is what an
    /// unrecognised id falls back to, which is what the scripts have always done.
    /// </summary>
    private static List<JsonNode> DetailItems(string section, JsonNode doc) => section switch
    {
        "news-detail" => (doc["items"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [],
        _ => [],
    };

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
    private static string AboutNav(JsonNode doc)
    {
        var chapters = (doc["chapters"] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
        var sb = new StringBuilder("<div class=\"ab-wrap ab-chapbar\">");
        for (var i = 0; i < chapters.Count; i++)
        {
            sb.Append("<a class=\"ab-chap\" href=\"detail/?id=")
              .Append(Uri.EscapeDataString(Str(chapters[i], "id")))
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
