using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// Resolves an address like <c>nav.1.label</c> against a parsed document.
///
/// These addresses are the one thing the page markup, the composer and the editor all agree on.
/// The same string is written into the HTML as <c>data-ab-t</c>, used by the composer to find the
/// value, and posted by the editor to patch the preview — so a text field and the element that
/// shows it cannot drift apart.
///
/// A segment of digits is an array index; anything else is an object key.
/// </summary>
public static class ContentPath
{
    /// <summary>The value at the address as text, or null if the address leads nowhere.</summary>
    public static string? Resolve(JsonNode? root, string path)
    {
        var node = Walk(root, path, out _);
        if (node is null) return null;
        return node is JsonValue v ? v.ToString() : node.ToJsonString();
    }

    /// <summary>
    /// Writes a value at the address. Returns false when the address leads nowhere — this
    /// deliberately does not create missing structure, because an address that does not exist is
    /// a typo in the markup, not an instruction to invent a field.
    /// </summary>
    public static bool TrySet(JsonNode? root, string path, string value)
    {
        var segments = Split(path);
        if (segments.Length == 0 || root is null) return false;

        var parentPath = string.Join('.', segments[..^1]);
        var last = segments[^1];
        var parent = segments.Length == 1 ? root : Walk(root, parentPath, out _);

        switch (parent)
        {
            case JsonObject obj when obj.ContainsKey(last):
                obj[last] = JsonValue.Create(value);
                return true;
            case JsonArray arr when int.TryParse(last, out var i) && i >= 0 && i < arr.Count:
                arr[i] = JsonValue.Create(value);
                return true;
            default:
                return false;
        }
    }

    /// <summary>True when every segment of the address exists.</summary>
    public static bool Exists(JsonNode? root, string path) => Walk(root, path, out _) is not null;

    private static JsonNode? Walk(JsonNode? root, string path, out string? failedAt)
    {
        failedAt = null;
        var segments = Split(path);

        // An empty address is not "the whole document" - it is a missing data-ab-t value, and
        // returning the document would put a serialised JSON blob on the page.
        if (segments.Length == 0) { failedAt = string.Empty; return null; }

        var node = root;
        foreach (var seg in segments)
        {
            switch (node)
            {
                case JsonObject obj when obj.TryGetPropertyValue(seg, out var next):
                    node = next;
                    break;
                case JsonArray arr when int.TryParse(seg, out var i) && i >= 0 && i < arr.Count:
                    node = arr[i];
                    break;
                default:
                    failedAt = seg;
                    return null;
            }
            if (node is null) { failedAt = seg; return null; }
        }
        return node;
    }

    private static string[] Split(string path) =>
        string.IsNullOrWhiteSpace(path)
            ? Array.Empty<string>()
            : path.Split('.', StringSplitOptions.RemoveEmptyEntries);
}
