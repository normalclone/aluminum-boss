using System.Text.Json;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// The site's content, read from and written to <c>wwwroot/_data/*.json</c>.
///
/// The files on disk are the single source of truth. An earlier design served the same documents
/// from SQLite through a middleware sitting above the static-file handler, which produced exactly
/// the confusion two sources always produce: editing a JSON file changed nothing, because the
/// database was what answered. The database now keeps revision history and nothing else.
///
/// Parsed documents are cached in memory and re-read when the file changes underneath us, so an
/// edit made with a text editor is picked up without a restart.
/// </summary>
public sealed class ContentStore
{
    private readonly string _dir;
    private readonly object _lock = new();
    private readonly Dictionary<string, Entry> _cache = new(StringComparer.OrdinalIgnoreCase);

    private sealed record Entry(string Raw, JsonNode Node, DateTime Stamp);

    /// <summary>Raised with the document name after a successful save, or null after a bulk change.</summary>
    public event Action<string?>? Changed;

    public ContentStore(IWebHostEnvironment env)
        : this(Path.Combine(env.WebRootPath ?? "wwwroot", "_data")) { }

    public ContentStore(string dataDirectory) => _dir = dataDirectory;

    /// <summary>Document names present on disk, without the .json extension.</summary>
    public IReadOnlyList<string> Names =>
        Directory.Exists(_dir)
            ? Directory.GetFiles(_dir, "*.json")
                       .Select(Path.GetFileNameWithoutExtension)
                       .Where(n => !string.IsNullOrEmpty(n))
                       .Select(n => n!)
                       .OrderBy(n => n, StringComparer.Ordinal)
                       .ToList()
            : Array.Empty<string>();

    /// <summary>The parsed document, or null when there is no such file.</summary>
    public JsonNode? Get(string name) => Load(name)?.Node;

    /// <summary>The document exactly as it sits on disk, or null.</summary>
    public string? RawJson(string name) => Load(name)?.Raw;

    /// <summary>
    /// Writes a document and returns the previous content so the caller can record a revision.
    ///
    /// Invalid JSON is refused before anything is written: a half-written content file takes the
    /// whole site down, and "it saved but the page is blank" is the worst failure this can have.
    /// </summary>
    /// <exception cref="JsonException">The text is not valid JSON.</exception>
    public string? Save(string name, string json)
    {
        var safe = SafeName(name);

        // Parse first. Nothing touches the disk until we know the text is a valid document.
        JsonNode parsed;
        try
        {
            parsed = JsonNode.Parse(json)
                     ?? throw new JsonException("Tài liệu rỗng.");
        }
        catch (JsonException e)
        {
            throw new JsonException($"'{safe}' không phải JSON hợp lệ: {e.Message}", e);
        }

        Directory.CreateDirectory(_dir);
        var target = Path.Combine(_dir, safe + ".json");
        var previous = File.Exists(target) ? File.ReadAllText(target) : null;

        // Write beside the target and rename over it. A crash mid-write leaves the old file
        // intact rather than a truncated one; File.Move with overwrite is atomic on NTFS.
        var temp = target + ".tmp-" + Guid.NewGuid().ToString("N")[..8];
        File.WriteAllText(temp, json);
        File.Move(temp, target, overwrite: true);

        lock (_lock)
        {
            _cache[safe] = new Entry(json, parsed, File.GetLastWriteTimeUtc(target));
        }

        Changed?.Invoke(safe);
        return previous;
    }

    /// <summary>Drops the in-memory copies. The next read comes from disk.</summary>
    public void Reload()
    {
        lock (_lock) _cache.Clear();
        Changed?.Invoke(null);
    }

    private Entry? Load(string name)
    {
        var safe = SafeName(name);
        var path = Path.Combine(_dir, safe + ".json");
        if (!File.Exists(path)) return null;

        var stamp = File.GetLastWriteTimeUtc(path);
        lock (_lock)
        {
            if (_cache.TryGetValue(safe, out var hit) && hit.Stamp == stamp) return hit;
        }

        string raw;
        JsonNode node;
        try
        {
            raw = File.ReadAllText(path);
            node = JsonNode.Parse(raw) ?? throw new JsonException("rỗng");
        }
        catch (Exception)
        {
            // A document that will not parse is reported as missing rather than thrown from a
            // read: one broken file should cost one section, not the whole page.
            return null;
        }

        var entry = new Entry(raw, node, stamp);
        lock (_lock) _cache[safe] = entry;
        return entry;
    }

    /// <summary>
    /// Document names come from our own routes and views, but this is the boundary where a name
    /// becomes a file path, so it is checked here rather than trusted from every caller.
    /// </summary>
    private static string SafeName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 64)
            throw new ArgumentException("Tên tài liệu không hợp lệ.", nameof(name));

        foreach (var c in name)
            if (!char.IsAsciiLetterOrDigit(c) && c != '-' && c != '_')
                throw new ArgumentException($"Tên tài liệu không hợp lệ: '{name}'.", nameof(name));

        return name;
    }
}
