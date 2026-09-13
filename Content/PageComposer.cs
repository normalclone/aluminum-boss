using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
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
///   data-ab-count  how many items that list is showing. The one address nobody types a value
///                  into: a tally written by hand goes wrong the first time somebody hides
///                  something, and goes wrong silently.
/// </summary>
public sealed class PageComposer
{
    private readonly ContentStore _store;
    private readonly SectionRenderer _sections;
    private readonly StructuredData _schema;
    private readonly string _webRoot;
    private readonly ILogger<PageComposer>? _log;
    private readonly ConcurrentDictionary<string, string> _cache = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _templates = new(StringComparer.OrdinalIgnoreCase);

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

    // A detail section is the one section whose output depends on the query string. Named by
    // convention rather than by a list, so adding a type needs no change here.
    private static readonly Regex DetailSection = new(
        @"\bdata-ab-section=""(?<name>[a-z0-9-]+-detail)""",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // <script type="application/json" data-ab-json="globe">…</script> — the whole document, put
    // into the page for a script that cannot wait for a fetch.
    //
    // The two canvas blocks draw from several hundred coordinates and start drawing on the frame
    // after they are parsed. Turning them into fetch-then-draw would mean restructuring seven
    // hundred lines of working drawing code for no gain to anybody, so the data travels in the
    // page instead - one source in _data, delivered synchronously. The template keeps a literal
    // copy as its fallback, exactly like every other address, so the static tree still works.
    private static readonly Regex JsonTag = new(
        @"<(?<tag>script)(?<attrs>[^>]*\bdata-ab-json=""(?<name>[^""]+)""[^>]*)>(?<inner>.*?)</script>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    private static readonly Regex LinesTag = new(
        @"<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-lines=""(?<addr>[^""]+)""[^>]*)>(?<inner>.*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    // <b data-ab-count="factories.sites">5</b> — how many items are in that list, right now.
    //
    // Not a field anybody types. A number written into the markup beside a list is a promise the
    // markup cannot keep: the day somebody hides a factory, the tally still says five and the map
    // still draws four, and nothing in the file says which one is lying.
    private static readonly Regex CountTag = new(
        @"<(?<tag>[a-z][a-z0-9]*)(?<attrs>[^>]*\bdata-ab-count=""(?<addr>[^""]+)""[^>]*)>(?<inner>.*?)</\k<tag>>",
        RegexOptions.Compiled | RegexOptions.Singleline | RegexOptions.IgnoreCase);

    public PageComposer(ContentStore store, SectionRenderer sections, StructuredData schema,
                        IWebHostEnvironment env, ILogger<PageComposer>? log = null)
        : this(store, sections, env.WebRootPath ?? "wwwroot", log, schema) { }

    /// <summary>The same composer over a directory of templates, for tests.</summary>
    public PageComposer(ContentStore store, SectionRenderer sections,
                        string webRoot, ILogger<PageComposer>? log = null,
                        StructuredData? schema = null)
    {
        _store = store;
        _sections = sections;
        _schema = schema ?? new StructuredData(store);
        _webRoot = webRoot;
        _log = log;
        _store.Changed += _ => Invalidate();
    }

    /// <summary>How many documents this page addressed, for the health check.</summary>
    public int LastAddressCount { get; private set; }

    /// <summary>
    /// The composed page for a URL path, or null when no template answers it.
    ///
    /// <paramref name="itemId"/> is the <c>?id=</c> of a detail page. It is ignored by every page
    /// that has no detail section, which is what keeps the cache from growing one entry per
    /// query string a stranger invents.
    ///
    /// <paramref name="edit"/> adds the bridge script the editor talks to. It is a separate cache
    /// entry rather than a separate composition path, so the page a visitor gets and the page the
    /// editor previews are the same bytes plus one script tag - which is the only reason the
    /// preview is worth looking at.
    /// </summary>
    public string? Compose(string urlPath, string? itemId = null, bool edit = false)
    {
        var file = TemplateFile(urlPath);
        if (file is null) return null;

        var html = _templates.GetOrAdd(file, path => File.ReadAllText(path, Encoding.UTF8));

        // Only a page carrying a detail section varies by id, and even then the key is the id we
        // recognise rather than the one that arrived: an id nobody knows renders the first item,
        // exactly as the script did, so caching it under its own name would mean an unbounded
        // dictionary keyed by someone else's input.
        var key = file;
        var detail = DetailSection.Match(html);
        if (detail.Success)
        {
            itemId = _sections.CanonicalId(detail.Groups["name"].Value, itemId);
            key = file + " " + itemId;
        }

        var id = itemId;
        var root = RootPrefix(urlPath);
        return _cache.GetOrAdd(edit ? key + " +edit" : key, _ =>
        {
            var filled = Fill(html, root, id);

            // A composition that loses text is worse than one that never ran: the page would go
            // out with blanks where the words were, and nothing would say so. Check before
            // serving, and fall back to the template - whose fallback text is still correct.
            if (!Verify(filled, out var missing))
            {
                _log?.LogError("Ghép trang {Path} thiếu {Count} địa chỉ, trả về khuôn: {Addr}",
                    urlPath, missing.Count, string.Join(", ", missing.Take(5)));
                return html;
            }
            filled = Describe(filled, urlPath, root, detail.Success ? detail.Groups["name"].Value : null, id);
            return edit ? WithBridge(filled, root) : filled;
        });
    }

    /// <summary>
    /// The page's own title, description and structured data.
    ///
    /// Runs after the body is filled, on the composed page rather than on the template, because
    /// what the page is ABOUT is decided by the item it ended up showing. Ninety-four item pages
    /// shared one title until this existed - the template's - and a search engine showing eight
    /// articles under one headline is showing one result.
    ///
    /// The origin is a placeholder until the site has a domain. It appears only inside JSON-LD
    /// ids and absolute URLs, which is exactly where a relative address is not allowed; the day
    /// there is a real domain it is one line in site.json.
    /// </summary>
    private string Describe(string html, string urlPath, string rootPrefix, string? section, string? itemId)
    {
        var origin = (_store.Get("site")?["origin"]?.ToString() ?? "https://aluminumboss.example")
            .TrimEnd('/');
        var siteName = _store.Get("site")?["wordmark"]?["lead"]?.ToString()
                       + _store.Get("site")?["wordmark"]?["tail"]?.ToString();

        var item = section is null ? null : _sections.ItemFor(section, itemId);
        html = PageHead.ForItem(html, item, section ?? "", siteName ?? "", origin + urlPath, rootPrefix);
        return PageHead.WithJsonLd(html, _schema.For(urlPath, origin, section, item));
    }

    /// <summary>Whether a template answers this path at all.</summary>
    public bool HasTemplate(string urlPath) => TemplateFile(urlPath) is not null;

    /// <summary>
    /// The same page with the editor's bridge script appended.
    ///
    /// The script lives under <c>admin/</c> rather than <c>_app/</c> for two reasons: the static
    /// copy of the site must never carry it (<c>trees.py</c> skips that folder, and a bridge in
    /// the published tree would be a script waiting for a message that can never come), and it
    /// belongs to the editor, not to the site.
    ///
    /// Nothing here checks who is asking. Authentication has not run this early in the pipeline,
    /// and the script alone does nothing: it only answers messages from a same-origin parent
    /// frame, so the worst a stranger can do with <c>?edit=1</c> is rewrite text in their own
    /// browser, which they can already do with the developer tools.
    /// </summary>
    private static string WithBridge(string html, string rootPrefix)
    {
        var tag = $"<script src=\"{rootPrefix}admin/edit-bridge.js\" defer></script>";
        var close = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return close < 0 ? html + tag : html[..close] + tag + "\n" + html[close..];
    }

    /// <summary>
    /// The name of the detail section a page carries, or null when it carries none.
    ///
    /// The router asks this to learn whether <c>/news/</c> has item pages under it, and which
    /// content the slug belongs to. Answering from the template itself rather than from a list
    /// of sections means the folder layout stays the only place a page type is declared: put a
    /// <c>detail/index.html</c> under a new section and its items get paths, with nothing else
    /// to remember to update.
    /// </summary>
    public string? DetailSectionFor(string urlPath)
    {
        var file = TemplateFile(urlPath);
        if (file is null) return null;

        var html = _templates.GetOrAdd(file, path => File.ReadAllText(path, Encoding.UTF8));
        var m = DetailSection.Match(html);
        return m.Success ? m.Groups["name"].Value : null;
    }

    /// <summary>Drops every composed page and every template read from disk.</summary>
    public void Invalidate()
    {
        _cache.Clear();
        _templates.Clear();
    }

    // ---------------------------------------------------------------------------------------

    private string Fill(string html, string rootPrefix, string? itemId)
    {
        var count = 0;

        html = SectionTag.Replace(html, m =>
        {
            var section = m.Groups["name"].Value;
            var markup = _sections.Render(section, rootPrefix, itemId);
            if (markup is null) return m.Value;
            count++;

            // Which file the words inside came from, stamped once per section. Everything the
            // renderer writes inside carries a path relative to that file - "items.3.image" - so
            // the editor joins the two to get the address it can save against. Written here
            // because it is one line for a whole section, rather than a document name threaded
            // through a dozen renderer signatures for one attribute.
            var doc = _sections.DocumentFor(section);
            var attrs = m.Groups["attrs"].Value
                        + (doc is null ? "" : $" data-ab-doc=\"{doc}\"");
            return $"<{m.Groups["tag"].Value}{attrs}>{markup}</{m.Groups["tag"].Value}>";
        });

        html = LinesTag.Replace(html, m =>
        {
            var value = Lookup(m.Groups["addr"].Value, asLines: true);
            if (value is null) return m.Value;
            count++;
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>{value}</{m.Groups["tag"].Value}>";
        });

        html = CountTag.Replace(html, m =>
        {
            var n = Count(m.Groups["addr"].Value);
            if (n is null) return m.Value;
            count++;
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>{n}</{m.Groups["tag"].Value}>";
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

        // Last, so nothing above scans the document we just inserted.
        html = JsonTag.Replace(html, m =>
        {
            var raw = _store.RawJson(m.Groups["name"].Value);
            if (raw is null) return m.Value;
            count++;
            // "</script" inside a script element ends it, whatever the quoting. Escaping every
            // "<" as < is still valid JSON and JSON.parse gives back the same characters.
            return $"<{m.Groups["tag"].Value}{m.Groups["attrs"].Value}>"
                   + Published(raw).Replace("<", "\\u003c")
                   + "</script>";
        });

        LastAddressCount = count;
        return html;
    }

    /// <summary>
    /// The same document with every hidden item taken out.
    ///
    /// The lists rendered server-side go through <c>SectionRenderer.Arr</c>, which filters on
    /// <c>visible</c>. The two canvas blocks do not: they read their whole document out of the
    /// page and draw from it. Without this, hiding an export route took it off the list beside
    /// the globe and left it on the globe - one document, two answers.
    ///
    /// The text is returned untouched when nothing was hidden, which is the normal case. A parse
    /// and re-serialise would otherwise rewrite the bytes of a document nobody has edited -
    /// different indentation, different escapes - and every page that carries one would drift
    /// away from its baseline for no reason anybody could point at.
    /// </summary>
    public static string Published(string raw)
    {
        JsonNode? doc;
        try { doc = JsonNode.Parse(raw); }
        catch (JsonException) { return raw; }        // the fallback in the template is better than nothing
        if (doc is null || !Strip(doc)) return raw;

        return doc.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        }).Replace("\r\n", "\n");
    }

    /// <summary>Removes hidden items from every array under this node. True if it removed any.</summary>
    private static bool Strip(JsonNode node)
    {
        var cut = false;
        switch (node)
        {
            case JsonArray arr:
                for (var i = arr.Count - 1; i >= 0; i--)
                {
                    if (arr[i] is JsonObject o && o["visible"] is JsonValue v
                        && v.TryGetValue<bool>(out var yes) && !yes)
                    {
                        arr.RemoveAt(i);
                        cut = true;
                    }
                    else if (arr[i] is { } child && Strip(child)) cut = true;
                }
                break;

            case JsonObject obj:
                foreach (var (_, value) in obj)
                    if (value is not null && Strip(value)) cut = true;
                break;
        }
        return cut;
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
    /// How many items the list at this address is showing - hidden ones not counted, since the
    /// number sits next to a drawing of exactly the ones that are.
    /// </summary>
    private int? Count(string address)
    {
        var cut = address.IndexOf('.');
        if (cut <= 0) return null;

        var doc = _store.Get(address[..cut]);
        if (doc is null) return null;

        var node = doc;
        foreach (var step in address[(cut + 1)..].Split('.'))
        {
            node = node switch
            {
                JsonArray arr when int.TryParse(step, out var i) && i >= 0 && i < arr.Count => arr[i],
                JsonObject obj when obj.TryGetPropertyValue(step, out var next) => next,
                _ => null,
            };
            if (node is null) return null;
        }

        if (node is not JsonArray list) return null;
        return list.Count(item => item is not JsonObject o
                                  || o["visible"] is not JsonValue v
                                  || !v.TryGetValue<bool>(out var yes) || yes);
    }

    /// <summary>
    /// The data holds characters; the page holds HTML. Escaping here is what keeps a quotation
    /// mark or an ampersand in someone's product name from ending the element early.
    /// </summary>
    private static string Escape(string s) => s
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;");

    /// <summary>
    /// Every address in the page must have resolved to something.
    ///
    /// Both kinds are checked. An address the template wrote names its document and this class
    /// filled it in; one the renderer wrote begins with a dot and is relative to the section it
    /// sits in, which this class only stamped - but a dangling address is a field the client
    /// will click on and not be able to save, whichever half of the system wrote it.
    /// </summary>
    private bool Verify(string html, out List<string> missing)
    {
        missing = new List<string>();

        // Where each section's document stamp sits, so a relative address can be given the name
        // of the nearest one before it. Sections do not nest, so "nearest before" is "inside".
        var stamps = Regex.Matches(html, @"data-ab-doc=""([^""]+)""")
                          .Select(m => (At: m.Index, Name: m.Groups[1].Value))
                          .ToList();

        foreach (Match m in Regex.Matches(html, @"data-ab-(?:t|lead|lines)=""([^""]+)"""))
        {
            var address = m.Groups[1].Value;

            if (address.StartsWith('.'))
            {
                var stamp = stamps.LastOrDefault(s => s.At < m.Index);
                if (stamp.Name is null) { missing.Add(address); continue; }
                address = stamp.Name + address;
            }

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
