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
/// Everything on an item page is derived from the item's own fields. Ninety-four new "SEO title"
/// boxes for a client to fill in would mostly stay empty, and empty is worse than derived - but
/// where somebody does write <c>seoTitle</c> or <c>seoDescription</c> on an item, that wins, and
/// since 25/09/2026 there is a box on the editor's left column to write it in.
///
/// The eight listing pages have no item to derive from, so their words are written down: in
/// site.json under <c>seo</c>, which <c>build/reskin.py</c> reads as well, so the page this
/// server composes and the page built into <c>site/</c> say the same thing.
///
/// ONE RULE ACROSS BOTH, and it is the one worth stating out loud: a title somebody TYPED is the
/// whole title, and a description somebody typed is the whole description. Nothing is appended to
/// them and nothing is cut off them. Trimming and the " | Boss Group" suffix belong to the
/// DERIVED values, where the source is a paragraph or a bare product name and has to be made to
/// fit. An editor box that silently edits what was typed into it is a box you cannot trust.
/// </summary>
public static class PageHead
{
    /// <summary>
    /// Rewrites the head of a composed page for the item it is showing.
    ///
    /// <paramref name="item"/> is null on a listing page, which is not this method's business:
    /// <see cref="ForPage"/> handles those.
    /// </summary>
    public static string ForItem(string html, JsonNode? item, string section, string siteName,
                                 string canonical, string rootPrefix)
    {
        if (item is null) return html;

        var (autoTitle, autoDescription) = Automatic(item, siteName);

        // Written or derived - see the rule in the class comment. Str, not Pick, because there is
        // nothing to fall through to here: the fallback IS the derived value on the next line.
        var written = Str(item, "seoTitle");
        var title = written.Length > 0 ? written : autoTitle;

        var said = Str(item, "seoDescription");
        var description = said.Length > 0 ? said : autoDescription;

        var image = Str(item, "image");

        if (title.Length > 0)
        {
            html = Title(html, title);
            html = Meta(html, "property", "og:title", title);
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

    /// <summary>
    /// What the head would say if nobody had written an override.
    ///
    /// The editor shows these two as the placeholder in its SEO boxes, so an empty box is not a
    /// blank page - it is this, and the client can read it before deciding whether to replace it.
    /// Which is exactly why it has to be the same computation the page uses rather than a second
    /// one standing beside it: a placeholder that disagrees with the page is worse than none,
    /// because it is believed.
    /// </summary>
    public static (string Title, string Description) Automatic(JsonNode? item, string siteName)
    {
        if (item is null) return (string.Empty, string.Empty);

        var name = Pick(item, "title", "name", "label", "caption");

        // In the order a page would introduce itself. "lede" belongs here: an About chapter has
        // one and nothing else, and without it every chapter borrowed the section's description.
        var about = Trim(Pick(item, "excerpt", "lede", "blurb", "tagline", "description",
                              "intro", "note", "scope", "text"), 160);

        return (name.Length > 0 ? name + " | " + siteName : string.Empty, about);
    }

    /// <summary>
    /// The head of a listing page, from the <c>seo</c> block of site.json.
    ///
    /// These eight pages used to keep whatever head their template carried, and the reason given
    /// was that those heads "were written for the page they belong to and are already right".
    /// True, and beside the point: they were written in build/reskin.py, where a client cannot
    /// reach them. The words have not changed - they were copied across character for character,
    /// and the old and new reskin were run side by side on the same tree to prove it. What
    /// changed is that they are now content, and there is a box to edit them in.
    ///
    /// No canonical and no og:type here, deliberately. reskin.py already writes og:type on these
    /// pages and writes no canonical at all, and a server that adds one while the published copy
    /// has none is two versions of the same page disagreeing about its own address.
    /// </summary>
    public static string ForPage(string html, JsonNode? seo, string rootPrefix)
    {
        if (seo is null) return html;

        var title = Str(seo, "title");
        var description = Str(seo, "description");
        var image = Str(seo, "image");

        if (title.Length > 0)
        {
            html = Title(html, title);
            html = Meta(html, "property", "og:title", title);
        }
        if (description.Length > 0)
        {
            html = Meta(html, "name", "description", description);
            html = Meta(html, "property", "og:description", description);
        }
        if (image.Length > 0)
            html = Meta(html, "property", "og:image", rootPrefix + "_media/" + image);

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
