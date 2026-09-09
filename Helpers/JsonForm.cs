using System.Text.Json;
using System.Text.Json.Nodes;

namespace QlWeb2.Helpers;

/// <summary>What kind of control a value should be edited with.</summary>
public enum FieldKind { Text, LongText, Paragraphs, Number, Toggle, Colour, Image, Locked }

/// <summary>One editable leaf of a content document, addressed by its path.</summary>
public record FormField(string Path, string Label, FieldKind Kind, string Value, int Depth, string Group);

/// <summary>
/// Turns a content document into a flat list of labelled fields, and puts edited values back.
///
/// The alternative was a hand-written schema per document. Seven documents with quite different
/// shapes would have meant seven forms to write and seven to keep in step with the data; deriving
/// the form from the document means adding a field to the JSON makes it editable with no code at
/// all.
///
/// What stops that from becoming "the client can change anything" is <see cref="Locked"/>: keys
/// that the site's own scripts or layout depend on are shown but not editable. Identifiers are in
/// the URLs people have bookmarked, and coordinates and route geometry are drawing instructions,
/// not prose - a plausible-looking edit to any of them breaks a page quietly.
/// </summary>
public static class JsonForm
{
    /// <summary>Keys that are structure, not content. Rendered read-only.</summary>
    private static readonly HashSet<string> Locked = new(StringComparer.OrdinalIgnoreCase)
    {
        "id", "key", "type", "source", "mode", "code",
        "lat", "lon", "at", "via", "legs", "pts", "tone", "vein",
        "file", "image", "hex",   // handled by their own kinds below, never as free text
    };

    /// <summary>Keys that never appear in the form at all - geometry with hundreds of numbers.</summary>
    private static readonly HashSet<string> Hidden = new(StringComparer.OrdinalIgnoreCase)
    {
        "via", "legs", "pts", "photos",
    };

    /// <summary>Keys whose string value is a colour.</summary>
    private static readonly HashSet<string> Colours = new(StringComparer.OrdinalIgnoreCase)
    {
        "hex", "tone", "vein",
    };

    /// <summary>Keys whose string value names a file in <c>_media</c>.</summary>
    private static readonly HashSet<string> Images = new(StringComparer.OrdinalIgnoreCase)
    {
        "image", "file", "photo", "cover",
    };

    public static List<FormField> Flatten(string json)
    {
        var fields = new List<FormField>();
        var root = JsonNode.Parse(json);
        if (root is null) return fields;
        Walk(root, "", "", 0, fields);
        return fields;
    }

    private static void Walk(JsonNode node, string path, string group, int depth, List<FormField> into)
    {
        switch (node)
        {
            case JsonObject obj:
                foreach (var (key, child) in obj)
                {
                    if (child is null || Hidden.Contains(key)) continue;
                    var childPath = path.Length == 0 ? key : path + "." + key;
                    var childGroup = depth <= 1 ? Humanise(key) : group;
                    Walk(child, childPath, childGroup, depth + 1, into);
                }
                break;

            case JsonArray arr:
                // An array of plain strings is prose split into paragraphs, not a list to manage.
                if (arr.Count > 0 && arr.All(x => x is JsonValue v && v.TryGetValue<string>(out _)))
                {
                    var text = string.Join("\n\n", arr.Select(x => x!.GetValue<string>()));
                    into.Add(new FormField(path, Humanise(LastSegment(path)), FieldKind.Paragraphs, text, depth, group));
                    return;
                }
                for (var i = 0; i < arr.Count; i++)
                {
                    if (arr[i] is null) continue;
                    Walk(arr[i]!, $"{path}[{i}]", group, depth + 1, into);
                }
                break;

            case JsonValue value:
                into.Add(Leaf(path, value, depth, group));
                break;
        }
    }

    private static FormField Leaf(string path, JsonValue value, int depth, string group)
    {
        var key = LastSegment(path);
        var label = Humanise(key);

        if (value.TryGetValue<bool>(out var b))
            return new FormField(path, label, FieldKind.Toggle, b ? "true" : "false", depth, group);

        if (value.TryGetValue<double>(out var d) && value.GetValue<JsonElement>().ValueKind == JsonValueKind.Number)
            return new FormField(path, label, FieldKind.Number, d.ToString("0.####"), depth, group);

        var s = value.TryGetValue<string>(out var str) ? str : value.ToString();

        if (Colours.Contains(key)) return new FormField(path, label, FieldKind.Colour, s, depth, group);
        if (Images.Contains(key)) return new FormField(path, label, FieldKind.Image, s, depth, group);
        if (Locked.Contains(key)) return new FormField(path, label, FieldKind.Locked, s, depth, group);

        var kind = s.Length > 90 ? FieldKind.LongText : FieldKind.Text;
        return new FormField(path, label, kind, s, depth, group);
    }

    /// <summary>Writes edited values back into the document, leaving everything else untouched.</summary>
    public static string Apply(string json, IDictionary<string, string> values)
    {
        var root = JsonNode.Parse(json) ?? throw new JsonException("Document is not valid JSON.");

        foreach (var (path, raw) in values)
        {
            var target = Resolve(root, path, out var key, out var index);
            if (target is null) continue;

            var existing = index >= 0 ? (target as JsonArray)?[index] : (target as JsonObject)?[key!];
            JsonNode? replacement = existing switch
            {
                JsonArray => new JsonArray(SplitParagraphs(raw).Select(p => (JsonNode?)JsonValue.Create(p)).ToArray()),
                JsonValue v when v.TryGetValue<bool>(out _) => JsonValue.Create(raw == "true" || raw == "on"),
                JsonValue v when v.GetValue<JsonElement>().ValueKind == JsonValueKind.Number
                    => double.TryParse(raw, out var n) ? JsonValue.Create(n) : existing,
                _ => JsonValue.Create(raw),
            };

            if (index >= 0) (target as JsonArray)![index] = replacement;
            else (target as JsonObject)![key!] = replacement;
        }

        return root.ToJsonString(new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        });
    }

    /// <summary>Finds the container of <paramref name="path"/> so the leaf can be replaced in place.</summary>
    private static JsonNode? Resolve(JsonNode root, string path, out string? key, out int index)
    {
        key = null; index = -1;
        JsonNode? node = root;

        foreach (var (seg, idx, isLast) in Segments(path))
        {
            if (isLast) { key = seg; index = idx; return node; }
            node = idx >= 0 ? (node as JsonArray)?[idx] : (node as JsonObject)?[seg!];
            if (node is null) return null;
        }
        return null;
    }

    private static IEnumerable<(string? Name, int Index, bool IsLast)> Segments(string path)
    {
        var parts = new List<(string?, int)>();
        foreach (var chunk in path.Split('.'))
        {
            var name = chunk;
            var bracket = chunk.IndexOf('[');
            if (bracket >= 0)
            {
                name = chunk[..bracket];
                if (name.Length > 0) parts.Add((name, -1));
                foreach (var piece in chunk[bracket..].Split('[', StringSplitOptions.RemoveEmptyEntries))
                    if (int.TryParse(piece.TrimEnd(']'), out var n)) parts.Add((null, n));
            }
            else parts.Add((name, -1));
        }
        for (var i = 0; i < parts.Count; i++)
            yield return (parts[i].Item1, parts[i].Item2, i == parts.Count - 1);
    }

    private static string[] SplitParagraphs(string raw) =>
        raw.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries)
           .Select(p => p.Trim()).Where(p => p.Length > 0).ToArray();

    private static string LastSegment(string path)
    {
        var i = path.LastIndexOf('.');
        var s = i >= 0 ? path[(i + 1)..] : path;
        var b = s.IndexOf('[');
        return b >= 0 ? s[..b] : s;
    }

    /// <summary>"itemLabel" becomes "Item label"; "desc" becomes "Description".</summary>
    public static string Humanise(string key)
    {
        if (key.Length == 0) return key;
        var expanded = key switch
        {
            "desc" => "Description",
            "sub" => "Subheading",
            "lede" => "Standfirst",
            "blurb" => "Summary",
            "cta" => "Button label",
            "meta" => "Route summary",
            "spec" => "Specification",
            _ => null,
        };
        if (expanded is not null) return expanded;

        var chars = new List<char> { char.ToUpperInvariant(key[0]) };
        foreach (var c in key[1..])
        {
            if (char.IsUpper(c) || c == '_' || c == '-') chars.Add(' ');
            chars.Add(c == '_' || c == '-' ? ' ' : char.ToLowerInvariant(c));
        }
        return new string(chars.ToArray()).Replace("  ", " ").Trim();
    }
}
