using System.Text;
using System.Text.RegularExpressions;
using QlWeb2.Models;

namespace QlWeb2.Helpers;

/// <summary>
/// Writes search-engine metadata into a page's <c>&lt;head&gt;</c>.
///
/// The imported site is static HTML, so the alternative was to buffer and rewrite every HTML
/// response as it goes out. That costs on every request forever to serve a value that changes a
/// few times a year, and it means the file on disk stops being what visitors get - which would
/// undermine the one check this port is measured by, that the served page matches the version it
/// came from.
///
/// So metadata is written into the file when it is saved. Each tag is replaced by name, or added
/// before <c>&lt;/head&gt;</c> if it was not there; nothing else in the document is touched.
/// </summary>
public static class SeoWriter
{
    public static bool Write(string webRoot, PageSeo seo)
    {
        var file = PageFile(webRoot, seo.Path);
        if (file is null) return false;

        var html = File.ReadAllText(file, Encoding.UTF8);

        html = ReplaceTitle(html, seo.Title);
        html = SetMeta(html, "name", "description", seo.Description);
        html = SetMeta(html, "property", "og:title", Fallback(seo.OgTitle, seo.Title));
        html = SetMeta(html, "property", "og:description", Fallback(seo.OgDescription, seo.Description));
        html = SetMeta(html, "property", "og:image", seo.OgImage);
        html = SetMeta(html, "name", "robots", seo.NoIndex ? "noindex, nofollow" : "");

        File.WriteAllText(file, html, new UTF8Encoding(false));
        return true;
    }

    /// <summary>Maps <c>/colors/</c> to the file that serves it.</summary>
    private static string? PageFile(string webRoot, string path)
    {
        var relative = path.Trim('/').Replace('/', Path.DirectorySeparatorChar);
        var candidate = Path.Combine(webRoot, relative, "index.html");
        if (!File.Exists(candidate)) return null;

        // Defence in depth against a path arriving from anywhere but our own seeded table.
        var full = Path.GetFullPath(candidate);
        return full.StartsWith(Path.GetFullPath(webRoot), StringComparison.OrdinalIgnoreCase) ? full : null;
    }

    private static string ReplaceTitle(string html, string title)
    {
        if (string.IsNullOrWhiteSpace(title)) return html;
        return Regex.Replace(html, "<title[^>]*>.*?</title>",
            "<title>" + Escape(title) + "</title>",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);
    }

    private static string SetMeta(string html, string attribute, string name, string content)
    {
        var pattern = $"<meta[^>]+{attribute}\\s*=\\s*[\"']{Regex.Escape(name)}[\"'][^>]*>";
        var existing = Regex.Match(html, pattern, RegexOptions.IgnoreCase);

        // An empty value means the tag should not be there at all - an empty description is worse
        // than none, and "robots" with no content says nothing.
        if (string.IsNullOrWhiteSpace(content))
            return existing.Success ? html.Remove(existing.Index, existing.Length) : html;

        var tag = $"<meta {attribute}=\"{name}\" content=\"{Escape(content)}\">";
        if (existing.Success)
            return html.Remove(existing.Index, existing.Length).Insert(existing.Index, tag);

        var head = html.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return head < 0 ? html : html.Insert(head, tag + "\n");
    }

    private static string Fallback(string preferred, string other) =>
        string.IsNullOrWhiteSpace(preferred) ? other : preferred;

    private static string Escape(string s) =>
        s.Replace("&", "&amp;").Replace("\"", "&quot;").Replace("<", "&lt;").Replace(">", "&gt;");
}
