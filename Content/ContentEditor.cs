using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// The one place a change made in the editor becomes a change on disk.
///
/// Everything the client edits is a field in <c>wwwroot/_data/*.json</c>, addressed the same way
/// the markup addresses it: <c>news.items.3.image</c> - the document, then the path inside it.
/// Nothing here knows what a page is.
///
/// Three rules the writing follows, each of them because of a way this can go wrong:
///
///   A field that does not exist is not created. An address with no field behind it is a typo in
///   the markup or a stale editor tab; inventing the field would bury the mistake under a value
///   nobody can find again.
///
///   The document is re-read from disk, not taken from the cache. The cached node is what every
///   page is being composed from right now; editing it in place would change the live site before
///   anything was written, and leave it changed if the write then failed.
///
///   Both trees are written. <c>site/</c> is the static copy, and its data files have to stay
///   byte-identical to <c>wwwroot/</c> - a rule this project has already broken once, silently,
///   straight onto the published site. Writing both keeps <c>tools/trees.py</c> true.
/// </summary>
public sealed class ContentEditor
{
    private readonly ContentStore _store;
    private readonly string _webRoot;
    private readonly ILogger<ContentEditor>? _log;

    // Indented, and with the encoder that leaves a curly quote as a curly quote. The default
    // encoder would write ’ for every apostrophe in the file and turn a one-field edit into
    // a diff across the whole document.
    private static readonly JsonSerializerOptions Pretty = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public ContentEditor(ContentStore store, IWebHostEnvironment env,
                         ILogger<ContentEditor>? log = null)
        : this(store, env.WebRootPath ?? "wwwroot", log) { }

    /// <summary>The same editor over a directory, for tests.</summary>
    public ContentEditor(ContentStore store, string webRoot, ILogger<ContentEditor>? log = null)
    {
        _store = store;
        _webRoot = webRoot;
        _log = log;
    }

    public record Change(string Address, string Value);

    /// <summary>
    /// What the save did. <paramref name="Previous"/> holds each touched document as it was
    /// before, keyed by name - the caller records those as revisions, which is the whole of what
    /// "undo" will be built from.
    /// </summary>
    public record Result(int Applied, List<string> Rejected, Dictionary<string, string?> Previous);

    /// <summary>
    /// Applies a batch of changes and writes every document one of them touched.
    ///
    /// A batch rather than one call per field: a document is rewritten whole, so saving six fields
    /// one at a time would rewrite the same file six times and leave five chances to stop halfway.
    /// </summary>
    public Result Apply(IEnumerable<Change> changes)
    {
        var rejected = new List<string>();
        var touched = new Dictionary<string, JsonNode>(StringComparer.OrdinalIgnoreCase);

        // Loaded is not the same as changed. A batch whose only address is a typo would otherwise
        // rewrite the file it names - same words, re-serialised, and a diff across every line of
        // a document nobody edited.
        var changed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var applied = 0;

        foreach (var change in changes)
        {
            var cut = change.Address.IndexOf('.');
            if (cut <= 0) { rejected.Add(change.Address); continue; }

            var name = change.Address[..cut];
            var path = change.Address[(cut + 1)..];

            if (!touched.TryGetValue(name, out var doc))
            {
                var raw = _store.RawJson(name);
                if (raw is null) { rejected.Add(change.Address); continue; }
                try { doc = JsonNode.Parse(raw)!; }
                catch (JsonException) { rejected.Add(change.Address); continue; }
                touched[name] = doc;
            }

            if (ContentPath.TrySet(doc, path, change.Value)) { applied++; changed.Add(name); }
            else rejected.Add(change.Address);
        }

        var previous = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (name, doc) in touched.Where(t => changed.Contains(t.Key)))
        {
            // The indented writer ends its lines with Environment.NewLine, which on this machine
            // is CRLF - so saving one field rewrote all 141 lines of the file. The content files
            // are LF, the two trees are compared byte for byte, and a diff of the whole document
            // hides the one line that actually changed.
            var json = doc.ToJsonString(Pretty).Replace("\r\n", "\n") + "\n";
            previous[name] = _store.Save(name, json);
            Mirror(name, json);
        }

        if (rejected.Count > 0)
            _log?.LogWarning("Bỏ qua {Count} địa chỉ không có thật: {Addr}",
                rejected.Count, string.Join(", ", rejected.Take(5)));

        return new Result(applied, rejected, previous);
    }

    /// <summary>
    /// Copies a saved document into the static tree.
    ///
    /// The static copy's pages are templates that read these same files, so the data is the only
    /// part of it that has to follow an edit - the fanned-out HTML does not change when a word
    /// does. Failing to mirror is logged rather than thrown: the site the server serves is
    /// already correct, and refusing the save would be a worse answer than a stale copy.
    /// </summary>
    private void Mirror(string name, string json)
    {
        try
        {
            var site = Path.Combine(Path.GetDirectoryName(_webRoot)!, "site", "_data", name + ".json");
            if (File.Exists(site)) File.WriteAllText(site, json, new System.Text.UTF8Encoding(false));
        }
        catch (Exception e)
        {
            _log?.LogWarning(e, "Không chép được {Name}.json sang site/", name);
        }
    }
}
