using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;

namespace QlWeb2.Content;

/// <summary>
/// Fills a page template with content and hands back the finished HTML.
///
/// The template carries addresses rather than words: an element marked
/// <c>data-ab-t="site.nav.1.label"</c> gets its text from that address in <c>site.json</c>. The
/// page delivered to the browser therefore contains real text - which is the whole point, since
/// GPTBot, ClaudeBot, PerplexityBot and CCBot fetch HTML and read it without running JavaScript.
///
/// Substitution is done with targeted regular expressions rather than by parsing and
/// re-serialising the document. That is a deliberate choice: a parse-and-write round trip
/// rewrites the entire file - attribute quoting, self-closing tags, entity spelling - and this
/// codebase is verified by comparing rendered pages pixel for pixel against a baseline. Touching
/// only the matched spans keeps every other byte exactly as it was, so a difference in the output
/// means a difference this class actually made.
///
/// The attributes, and why there is more than one:
///
///   data-ab-t      the element's text. The element must contain no child elements.
///   data-ab-lead   the text before the element's first child element, leaving the children
///                  alone. The wordmark is `Aluminum&lt;span&gt;Boss&lt;/span&gt;` and the span is set
///                  200 weights lighter, so the two halves cannot share one address and the lead
///                  cannot be wrapped in a span of its own without flattening the mark.
///   data-ab-lines  an array of strings, joined with &lt;br&gt;. Addresses and taglines are written
///                  as lines in the data rather than as one string with markup in it.
/// </summary>
public sealed class PageComposer
{
    private readonly ContentStore _store;
    private readonly SectionRenderer _sections;
    private readonly string _webRoot;
    private readonly ILogger<PageComposer>? _log;
    private readonly ConcurrentDictionary<string, string> _cache = new(StringComparer.OrdinalIgnoreCase);

    // <tag ... data-ab-t="addr" ...>inner</tag> — the inner group is lazy so a following element
    // of the same name cannot be swallowed.
    private static readonly Regex TextTag = new(
        @"<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-t=""(?<addr>[^""]+)""[^>]*)>(?<inner>.*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    private static readonly Regex LeadTag = new(
        @"(<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-lead=""(?<addr>[^""]+)""[^>]*)>)(?<lead>[^<]*)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // <div data-ab-section="news-list"></div> - the element's contents are replaced with the
    // markup the browser used to build after load.
    private static readonly Regex SectionTag = new(
        @"<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-section=""(?<name>[^""]+)""[^>]*)>(?<inner>.*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    private static readonly Regex LinesTag = new(
        @"<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-lines=""(?<addr>[^""]+)""[^>]*)>(?<inner>.*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    public PageComposer(ContentStore store, SectionRenderer sections,
                        IWebHostEnvironment env, ILogger<PageComposer>? log = null)
    {
        _store = store;
        _sections = sections;
        _webRoot = env.WebRootPath ?? "wwwroot";
        _log = log;
        _store.Changed += _ => _cache.Clear();
    }

    /// <summary>How many documents this page addressed, for the health check.</summary>
    public int LastAddressCount { get; private set; }

    /// <summary>
    /// The composed page for a URL path, or null when no template answers it.
    /// </summary>
    public string? Compose(string urlPath)
    {
        var file = TemplateFile(urlPath);
        if (file is null) return null;

        return _cache.GetOrAdd(file, path =>
        {
            var html = File.ReadAllText(path, Encoding.UTF8);
            var filled = Fill(html, RootPrefix(urlPath));

            // A composition that loses text is worse than one that never ran: the page would go
            // out with blanks where the words were, and nothing would say so. Check before
            // serving, and fall back to the template - whose fallback text is still correct.
            if (!Verify(filled, out var missing))
            {
                _log?.LogError("Ghép trang {Path} thiếu {Count} địa chỉ, trả về khuôn: {Addr}",
                    urlPath, missing.Count, string.Join(", ", missing.Take(5)));
                return html;
            }
            return filled;
        });
    }

    /// <summary>Drops every composed page. The next request rebuilds from the templates.</summary>
    public void Invalidate() => _cache.Clear();

    // ---------------------------------------------------------------------------------------

    private string Fill(string html, string rootPrefix)
    {
        var count = 0;

        html = SectionTag.Replace(html, m =>
        {
            var markup = _sections.Render(m.Groups["name"].Value, rootPrefix);
            if (markup is null) return m.Value;
            count++;
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>{markup}</{m.Groups["tag"].Value}>";
        });

        html = LinesTag.Replace(html, m =>
        {
            var value = Lookup(m.Groups["addr"].Value, asLines: true);
            if (value is null) return m.Value;
            count++;
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>{value}</{m.Groups["tag"].Value}>";
        });

        html = TextTag.Replace(html, m =>
        {
            var value = Lookup(m.Groups["addr"].Value, asLines: false);
            if (value is null) return m.Value;
            count++;
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>{value}</{m.Groups["tag"].Value}>";
        });

        html = LeadTag.Replace(html, m =>
        {
            var value = Lookup(m.Groups["addr"].Value, asLines: false);
            if (value is null) return m.Value;
            count++;
            return m.Groups[1].Value + value;
        });

        LastAddressCount = count;
        return html;
    }

    /// <summary>
    /// Reads an address of the form <c>document.rest.of.path</c>.
    /// The first segment names the JSON document; the rest is the path inside it.
    /// </summary>
    private string? Lookup(string address, bool asLines)
    {
        var cut = address.IndexOf('.');
        if (cut <= 0) return null;

        var doc = _store.Get(address[..cut]);
        if (doc is null) return null;

        var rest = address[(cut + 1)..];

        if (asLines)
        {
            var node = doc;
            var raw = ContentPath.Resolve(doc, rest);
            if (raw is null) return null;
            // An array arrives as JSON text; split it back into the lines it holds.
            if (raw.TrimStart().StartsWith('['))
            {
                try
                {
                    var arr = System.Text.Json.JsonSerializer.Deserialize<string[]>(raw);
                    return arr is null ? null : string.Join("<br>", arr.Select(Escape));
                }
                catch { return null; }
            }
            return Escape(raw);
        }

        var value = ContentPath.Resolve(doc, rest);
        return value is null ? null : Escape(value);
    }

    /// <summary>
    /// The data holds characters; the page holds HTML. Escaping here is what keeps a quotation
    /// mark or an ampersand in someone's product name from ending the element early.
    /// </summary>
    private static string Escape(string s) => s
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;");

    /// <summary>Every address in the page must have resolved to something.</summary>
    private bool Verify(string html, out List<string> missing)
    {
        missing = new List<string>();
        foreach (Match m in Regex.Matches(html, @"data-ab-(?:t|lead|lines)=""([^""]+)"""))
        {
            var address = m.Groups[1].Value;
            var cut = address.IndexOf('.');
            if (cut <= 0) { missing.Add(address); continue; }
            var doc = _store.Get(address[..cut]);
            if (doc is null || !ContentPath.Exists(doc, address[(cut + 1)..])) missing.Add(address);
        }
        return missing.Count == 0;
    }

    /// <summary>
    /// How many "../" a page at this path needs to reach the site root. The imported site
    /// addresses assets relatively, so a card built for /news/ and one built for /news/detail/
    /// need different prefixes for the same picture.
    /// </summary>
    private static string RootPrefix(string urlPath)
    {
        var depth = urlPath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).Length;
        return string.Concat(Enumerable.Repeat("../", depth));
    }

    /// <summary>
    /// Maps a URL path to the template that answers it, or null.
    /// Directory-style URLs resolve to index.html, the way the imported site addresses its pages.
    /// </summary>
    private string? TemplateFile(string urlPath)
    {
        var rel = urlPath.Trim('/');
        var candidate = string.IsNullOrEmpty(rel)
            ? Path.Combine(_webRoot, "index.html")
            : rel.EndsWith(".html", StringComparison.OrdinalIgnoreCase)
                ? Path.Combine(_webRoot, rel.Replace('/', Path.DirectorySeparatorChar))
                : Path.Combine(_webRoot, rel.Replace('/', Path.DirectorySeparatorChar), "index.html");

        var full = Path.GetFullPath(candidate);
        // Defence in depth: a path arriving from a request must not reach outside wwwroot.
        if (!full.StartsWith(Path.GetFullPath(_webRoot), StringComparison.OrdinalIgnoreCase)) return null;

        return File.Exists(full) ? full : null;
    }
}
