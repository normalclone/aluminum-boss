using System.Text;
using System.Text.RegularExpressions;

namespace QlWeb2.Helpers;

/// <summary>
/// Reads and rewrites the ordered bands of the home page.
///
/// Each band is delimited in the HTML by a pair of comments - "region:globe" and "/region:globe".
/// Reordering is then moving whole spans, which is the only kind of layout change that is safe to
/// hand to someone without a stylesheet in front of them: every band already lays itself out
/// independently at every screen width, so their order cannot break the responsive behaviour.
/// Editing anything inside a band is deliberately not offered here.
/// </summary>
public static class RegionMarkup
{
    public const string HomeFile = "index.html";

    private const string Placeholder = "@@REGION-SLOT@@";

    private static Regex Span(string key) =>
        new($"<!--region:{Regex.Escape(key)}-->.*?<!--/region:{Regex.Escape(key)}-->",
            RegexOptions.Singleline);

    /// <summary>True when the page already carries region markers.</summary>
    public static bool IsPrepared(string html) => html.Contains("<!--region:", StringComparison.Ordinal);

    /// <summary>The keys present in the page, in the order they appear.</summary>
    public static List<string> ReadOrder(string html) =>
        Regex.Matches(html, "<!--region:([a-z0-9-]+)-->")
             .Select(m => m.Groups[1].Value)
             .ToList();

    /// <summary>True when this band is currently parked out of sight.</summary>
    public static bool IsHidden(string html, string key)
    {
        var m = Span(key).Match(html);
        return m.Success && m.Value.Contains("data-region-hidden", StringComparison.Ordinal);
    }

    /// <summary>
    /// Arranges the bands named in <paramref name="order"/> into that order, and parks the ones
    /// missing from <paramref name="visible"/> out of sight.
    ///
    /// Only the named bands are touched. Any other band stays exactly where it is, which is not a
    /// nicety: the bands do not all share a parent. The opening screen sits outside the page's
    /// padded container so it can run edge to edge, while the rest sit inside it and the two canvas
    /// sections lean on that padding - they use a negative margin of exactly its width to break
    /// out. An earlier version of this method gathered every band into the position of the first
    /// one, which moved those two outside the padding and left the page 38px wider than the window.
    /// </summary>
    public static string Rewrite(string html, IReadOnlyList<string> order, ISet<string> visible)
    {
        var present = ReadOrder(html);
        if (present.Count == 0) return html;

        // Only bands that are both asked for and actually in the page.
        var moving = order.Where(present.Contains).ToList();
        if (moving.Count == 0) return html;

        var blocks = new Dictionary<string, string>();
        foreach (var key in moving)
        {
            var m = Span(key).Match(html);
            if (m.Success) blocks[key] = m.Value;
        }
        if (blocks.Count == 0) return html;

        // Lift out the moving spans, leaving a placeholder where the first of them was.
        var first = true;
        foreach (var key in present)
        {
            if (!blocks.ContainsKey(key)) continue;
            html = Span(key).Replace(html, first ? Placeholder : "", 1);
            first = false;
        }

        var rebuilt = new StringBuilder();
        foreach (var key in moving)
        {
            if (!blocks.TryGetValue(key, out var span)) continue;
            rebuilt.Append(visible.Contains(key) ? Show(span) : Hide(span, key));
            rebuilt.Append('\n');
        }

        return html.Replace(Placeholder, rebuilt.ToString());
    }

    /// <summary>
    /// Hides a band by parking it inside a template element.
    ///
    /// A comment would have been the obvious move and is the wrong one: this markup contains "--"
    /// in several places and an HTML comment cannot, so it would have to be mangled going in and
    /// unmangled coming out - a lossy round trip through content nobody can see to check. A
    /// template keeps the bytes exactly as they are while the browser ignores them: no styles
    /// apply, no scripts run, nothing paints.
    /// </summary>
    private static string Hide(string span, string key) =>
        "<!--region:" + key + "--><template data-region-hidden=\"" + key + "\">"
        + Inner(span, key) + "</template><!--/region:" + key + "-->";

    private static string Show(string span)
    {
        var key = Regex.Match(span, "<!--region:([a-z0-9-]+)-->").Groups[1].Value;
        return "<!--region:" + key + "-->" + Inner(span, key) + "<!--/region:" + key + "-->";
    }

    /// <summary>The band's own markup, with the markers and any hiding wrapper taken off.</summary>
    private static string Inner(string span, string key)
    {
        var inner = span
            .Replace("<!--region:" + key + "-->", "")
            .Replace("<!--/region:" + key + "-->", "");

        var parked = Regex.Match(inner, "<template data-region-hidden=\"[a-z0-9-]+\">(.*?)</template>",
            RegexOptions.Singleline);
        return parked.Success ? parked.Groups[1].Value : inner;
    }
}
