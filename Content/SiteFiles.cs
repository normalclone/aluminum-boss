using System.Text;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// The three files written for machines rather than for people: <c>sitemap.xml</c>,
/// <c>robots.txt</c> and <c>llms.txt</c>.
///
/// All three are generated rather than stored, for the same reason the pages are: the moment a
/// client adds an article, a stored sitemap is wrong and nothing says so. They are cheap - the
/// whole sitemap is a hundred and nine lines - and they are always true.
///
/// <c>llms.txt</c> is the newest of the three and the least settled. It is a plain-language map of
/// the site for a language model that has been asked a question about this company: what the
/// company does, where the pages are, and which of them answer what. This site is already written
/// to be read without JavaScript, which is most of the work; this file is the index to it.
/// </summary>
public sealed class SiteFiles
{
    private readonly ContentStore _store;
    private readonly SectionRenderer _sections;
    private readonly PageComposer _composer;
    private readonly string _webRoot;

    public SiteFiles(ContentStore store, SectionRenderer sections, PageComposer composer,
                     IWebHostEnvironment env)
    {
        _store = store;
        _sections = sections;
        _composer = composer;
        _webRoot = env.WebRootPath ?? "wwwroot";
    }

    public string Origin => (_store.Get("site")?["origin"]?.ToString()
                             ?? "https://aluminumboss.example").TrimEnd('/');

    /// <summary>Every page the site has, listings first and then the items under each.</summary>
    public List<string> Urls()
    {
        var urls = new List<string> { "/" };

        foreach (var dir in Directory.GetDirectories(_webRoot).OrderBy(d => d, StringComparer.Ordinal))
        {
            var name = Path.GetFileName(dir);
            if (name.StartsWith('_') || name.Equals("admin", StringComparison.OrdinalIgnoreCase)) continue;
            if (!File.Exists(Path.Combine(dir, "index.html"))) continue;

            var page = "/" + name + "/";
            urls.Add(page);

            var section = _composer.DetailSectionFor(page + "detail/");
            if (section is null) continue;
            foreach (var slug in _sections.SlugsFor(section)) urls.Add(page + slug + "/");
        }
        return urls;
    }

    public string Sitemap()
    {
        var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
            .Append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        foreach (var url in Urls())
        {
            // A listing changes whenever an item is added; an item page changes when it is
            // edited. Both are better described as "often" than by a date this file would have
            // to keep, and keep true.
            sb.Append("  <url><loc>").Append(Origin).Append(Xml(url)).Append("</loc>")
              .Append("<changefreq>weekly</changefreq>")
              .Append("<priority>").Append(url == "/" ? "1.0" : url.Count(c => c == '/') > 2 ? "0.6" : "0.8")
              .Append("</priority></url>\n");
        }
        return sb.Append("</urlset>\n").ToString();
    }

    /// <summary>
    /// Who may read the site, from <c>site.json</c>.
    ///
    /// A per-bot switch rather than one blanket rule, because the answer genuinely differs: a
    /// search crawler brings customers, an AI crawler brings the company's words into an answer
    /// someone reads instead of visiting, and a scraper selling the text on brings nothing. The
    /// owner of the site is the one who gets to decide, so the decision is content, not code.
    /// </summary>
    public string Robots()
    {
        var sb = new StringBuilder();
        var rules = _store.Get("site")?["robots"] as JsonObject;

        if (rules is not null)
        {
            foreach (var (bot, allowed) in rules)
            {
                var yes = allowed is not JsonValue v || !v.TryGetValue<bool>(out var b) || b;
                sb.Append("User-agent: ").Append(bot).Append('\n')
                  .Append(yes ? "Allow: /\n\n" : "Disallow: /\n\n");
            }
        }

        sb.Append("User-agent: *\nAllow: /\n")
          .Append("Disallow: /Admin\n\n")
          .Append("Sitemap: ").Append(Origin).Append("/sitemap.xml\n");
        return sb.ToString();
    }

    public string Llms()
    {
        var site = _store.Get("site");
        var about = _store.Get("about");
        var name = site?["wordmark"]?["lead"]?.ToString() + site?["wordmark"]?["tail"]?.ToString();

        var sb = new StringBuilder()
            .Append("# ").Append(name).Append('\n').Append('\n')
            .Append("> ").Append(One(about?["lede"]?.ToString())).Append('\n').Append('\n')
            .Append(One(about?["intro"]?.ToString())).Append('\n').Append('\n');

        sb.Append("Every page below is readable without JavaScript: the words are in the HTML.\n\n");

        foreach (var (heading, doc, key, title, note) in new[]
                 {
                     ("Products", "products", "categories", "name", "tagline"),
                     ("Colors", "colors", "items", "name", "note"),
                     ("News", "news", "items", "title", "excerpt"),
                     ("Projects", "projects", "albums", "title", "scope"),
                 })
        {
            var section = doc == "colors" ? "/colors/" : "/" + doc + "/";
            sb.Append("## ").Append(heading).Append("\n\n");
            foreach (var item in (_store.Get(doc)?[key] as JsonArray)?.OfType<JsonNode>() ?? [])
            {
                var slug = item["slug"]?.ToString() ?? item["id"]?.ToString() ?? "";
                if (slug.Length == 0) continue;
                sb.Append("- [").Append(item[title]?.ToString()).Append("](")
                  .Append(Origin).Append(section).Append(slug).Append("/): ")
                  .Append(One(item[note]?.ToString())).Append('\n');
            }
            sb.Append('\n');
        }

        sb.Append("## Also\n\n")
          .Append("- [About us](").Append(Origin).Append("/about-us/): history, capability, quality\n")
          .Append("- [Documents](").Append(Origin).Append("/documents/): catalogues, technical data, certificates\n")
          .Append("- [Contact](").Append(Origin).Append("/contact/): quotations, samples, technical help\n");

        return sb.ToString();
    }

    private static string One(string? s)
        => System.Text.RegularExpressions.Regex.Replace(s ?? "", @"\s+", " ").Trim();

    private static string Xml(string s) => s
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
