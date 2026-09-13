using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace QlWeb2.Content;

/// <summary>
/// What a page says about itself: its title, its description, and the structured data that lets a
/// machine read it as a thing rather than as a document.
///
/// Before this, every one of the ninety-four item pages carried the same title - "News |
/// AluminumBoss" - and the same description, because the head was written into the template and
/// the template serves them all. A search engine showing eight articles with one title is showing
/// one result; a person choosing between them has nothing to choose from.
///
/// Everything here is derived from the item's own fields. Ninety-four new "SEO title" boxes for a
/// client to fill in would mostly stay empty, and empty is worse than derived - but where somebody
/// does write <c>seoTitle</c> or <c>seoDescription</c> on an item, that wins.
/// </summary>
public static class PageHead
{
    /// <summary>
    /// Rewrites the head of a composed page for the item it is showing.
    ///
    /// <paramref name="item"/> is null on a listing page, which keeps the head its template has -
    /// those were written for the page they belong to and are already right.
    /// </summary>
    public static string ForItem(string html, JsonNode? item, string section, string siteName,
                                 string canonical, string rootPrefix)
    {
        if (item is null) return html;

        var title = Pick(item, "seoTitle", "title", "name", "label", "caption");
        // In the order a page would introduce itself. "lede" belongs here: an About chapter has
        // one and nothing else, and without it every chapter borrowed the section's description.
        var description = Trim(Pick(item, "seoDescription", "excerpt", "lede", "blurb", "tagline",
                                    "description", "intro", "note", "scope", "text"), 160);
        var image = Str(item, "image");

        if (title.Length > 0)
        {
            html = Title(html, title + " | " + siteName);
            html = Meta(html, "property", "og:title", title + " | " + siteName);
        }
        if (description.Length > 0)
        {
            html = Meta(html, "name", "description", description);
            html = Meta(html, "property", "og:description", description);
        }
        if (image.Length > 0)
            html = Meta(html, "property", "og:image", rootPrefix + "_media/" + image);

        // An item page is a thing, not a website; and it has one address, which is worth saying
        // out loud now that the old query form still answers and redirects.
        html = Meta(html, "property", "og:type", section == "news-detail" ? "article" : "product");
        html = Link(html, "canonical", canonical);

        return html;
    }

    /// <summary>Adds a block of JSON-LD just before the closing head tag.</summary>
    public static string WithJsonLd(string html, string json)
    {
        if (json.Length == 0) return html;

        var head = html.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        var tag = "<script type=\"application/ld+json\">"
                  // A "</script" inside the block would end it early, whatever the quoting.
                  + json.Replace("<", "\\u003c") + "</script>\n";
        return head < 0 ? html : html.Insert(head, tag);
    }

    // ---------------------------------------------------------------------------------------

    private static string Str(JsonNode? node, string key)
        => node is JsonObject o && o.TryGetPropertyValue(key, out var v)
            ? v?.ToString() ?? string.Empty
            : string.Empty;

    private static string Pick(JsonNode? node, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = Str(node, key);
            if (value.Length > 0) return value;

            // Some items carry their standfirst as an array of lines rather than a string.
            if (node is JsonObject o && o.TryGetPropertyValue(key, out var v) && v is JsonArray arr
                && arr.FirstOrDefault()?.ToString() is { Length: > 0 } first)
                return first;
        }
        return string.Empty;
    }

    /// <summary>
    /// A description a search result can show whole.
    ///
    /// Cut at a word, not mid-syllable, and only when there is enough left to be a sentence -
    /// a description ending in "the" reads as a fault in the site rather than a long article.
    /// </summary>
    private static string Trim(string s, int max)
    {
        s = Regex.Replace(s, @"\s+", " ").Trim();
        if (s.Length <= max) return s;

        var cut = s.LastIndexOf(' ', max - 1);
        return (cut > max / 2 ? s[..cut] : s[..(max - 1)]).TrimEnd(',', ';', '.', ' ') + "…";
    }

    private static string Title(string html, string title)
        => Regex.Replace(html, "<title[^>]*>.*?</title>", "<title>" + Escape(title) + "</title>",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);

    private static string Meta(string html, string attribute, string name, string content)
    {
        var pattern = $"<meta[^>]+{attribute}\\s*=\\s*[\"']{Regex.Escape(name)}[\"'][^>]*>";
        var existing = Regex.Match(html, pattern, RegexOptions.IgnoreCase);
        var tag = $"<meta {attribute}=\"{name}\" content=\"{Escape(content)}\">";

        if (existing.Success) return html.Remove(existing.Index, existing.Length).Insert(existing.Index, tag);

        var head = html.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return head < 0 ? html : html.Insert(head, tag + "\n");
    }

    private static string Link(string html, string rel, string href)
    {
        var pattern = $"<link[^>]+rel\\s*=\\s*[\"']{Regex.Escape(rel)}[\"'][^>]*>";
        var existing = Regex.Match(html, pattern, RegexOptions.IgnoreCase);
        var tag = $"<link rel=\"{rel}\" href=\"{Escape(href)}\">";

        if (existing.Success) return html.Remove(existing.Index, existing.Length).Insert(existing.Index, tag);

        var head = html.LastIndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return head < 0 ? html : html.Insert(head, tag + "\n");
    }

    private static string Escape(string s) => s
        .Replace("&", "&amp;").Replace("\"", "&quot;").Replace("<", "&lt;").Replace(">", "&gt;");
}
