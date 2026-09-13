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

    /// <summary>The markup for a named section, or null when the name is not one we render.</summary>
    public string? Render(string section, string rootPrefix)
    {
        var doc = section switch
        {
            "news-list" => _store.Get("news"),
            _ => null,
        };
        if (doc is null) return null;

        return section switch
        {
            "news-list" => NewsList(doc, rootPrefix),
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

    private static string Esc(string s) => s
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;");
}
