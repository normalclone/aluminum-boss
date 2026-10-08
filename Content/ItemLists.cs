using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// The lists INSIDE an item that the editor may grow, shrink and reorder: the paragraphs of an
/// article, a project's photos, the documents in a group.
///
/// The Content screen already handles the lists at the top of a document - the articles, the
/// colours. What it never could do is the list inside one of them, and until 28/09/2026 that meant
/// a new article could not be given a body at all: it had no paragraphs, so the page drew no
/// paragraph, so the editor - which builds its column from what the page draws - offered no box.
///
/// A table rather than "any array": each entry here is a list somebody has looked at and decided
/// is safe to change from the screen, and the endpoint refuses everything that is not in it. The
/// screen is not the door; a hand-built POST reaches the endpoint just as easily.
///
/// 08/10/2026: lists of objects joined (a project's photos, the documents in a group, the
/// sections of an About chapter), so an entry may carry the shape of a new item, and the address
/// is a pattern - <c>about.chapters.*.sections.*.photos</c> - rather than a fixed four parts.
/// </summary>
public static class ItemLists
{
    /// <param name="Section">The section on whose page the list is offered. A detail section
    ///   offers the lists of the one item it shows; a list section offers them for every item.</param>
    /// <param name="Pattern">Where the list is: dots between steps, <c>*</c> for any position.</param>
    /// <param name="Each">What one entry is called on the screen: "Add a paragraph".</param>
    /// <param name="Multiline">A paragraph is sentences, and gets a box with room for them.</param>
    /// <param name="First">For a list of objects: the field the cursor goes to in a new entry.</param>
    /// <param name="Template">For a list of objects: a new entry, as JSON. An "id" in it is
    ///   given a placeholder (new-xxxxxx), which the first title saved turns into the address.</param>
    /// <param name="Create">An item written before this list existed has no such field; the first
    ///   "Add" creates it. Off for lists every item already has.</param>
    public record Entry(string Section, string Pattern, string Each, bool Multiline = false,
                        string? First = null, string? Template = null, bool Create = false)
    {
        public JsonObject? NewEntry() => Template is null ? null : (JsonObject)JsonNode.Parse(Template)!;
    }

    public static readonly Entry[] All =
    [
        new("news-detail", "news.items.*.body", "Paragraph", Multiline: true),
        new("news-detail", "news.items.*.tags", "Tag"),

        // A project is written like an article now (08/10/2026), in the page it always had.
        new("projects-detail", "projects.albums.*.body", "Paragraph", Multiline: true, Create: true),
        new("projects-detail", "projects.albums.*.photos", "Photo", First: "c",
            Template: """{ "c": "", "image": "" }""", Create: true),
        new("projects-detail", "projects.albums.*.products", "Product", Create: true),

        // A document is added inside its group, on the list of all of them.
        new("documents-list", "documents.categories.*.items", "Document", First: "title",
            Template: """{ "id": "", "title": "", "blurb": "", "edition": "", "lang": "English", "pages": "", "file": "" }"""),

        // The sections of an About chapter - Capability first, from the company profile.
        new("about-detail", "about.chapters.*.sections", "Section", First: "heading",
            Template: """{ "heading": "", "text": "", "photos": [] }""", Create: true),
        new("about-detail", "about.chapters.*.sections.*.photos", "Photo", First: "c",
            Template: """{ "c": "", "image": "" }""", Create: true),
    ];

    public static IEnumerable<Entry> ForSection(string? section)
        => section is null ? [] : All.Where(e => e.Section == section);

    /// <summary>
    /// Reads what the screen asked for, or refuses it.
    ///
    /// One shape of address for everything, the one ContentEditor.Structure already reads:
    /// "append" names the LIST (<c>news.items.3.body</c>), the others name the ENTRY
    /// (<c>news.items.3.body.2</c>). The screen never sends a bare position to be joined on here -
    /// the index a paragraph has among the boxes on the screen is not the index it has in the
    /// file, and trusting the first to mean the second is how the wrong paragraph gets deleted.
    /// </summary>
    public static bool TryRead(string address, string op, out string target, out ContentEditor.Op what)
        => TryRead(address, op, out target, out what, out _);

    public static bool TryRead(string address, string op, out string target, out ContentEditor.Op what,
                               out Entry entry)
    {
        target = string.Empty;
        what = default;
        entry = null!;

        var wanted = op switch
        {
            "append" => ContentEditor.Op.Append,
            "remove" => ContentEditor.Op.Remove,
            "up" => ContentEditor.Op.Up,
            "down" => ContentEditor.Op.Down,
            _ => (ContentEditor.Op?)null,
        };
        if (wanted is not { } w) return false;

        var parts = address.Split('.');
        string[] list;
        if (w == ContentEditor.Op.Append) list = parts;
        else
        {
            if (parts.Length < 2 || !IsIndex(parts[^1])) return false;
            list = parts[..^1];
        }

        var found = All.FirstOrDefault(e => Matches(e.Pattern, list));
        if (found is null) return false;

        target = address;
        what = w;
        entry = found;
        return true;
    }

    /// <summary>The entry whose pattern this list address fits, or null.</summary>
    public static Entry? For(string listAddress) => All.FirstOrDefault(e => Matches(e.Pattern, listAddress.Split('.')));

    /// <summary>
    /// Every list this entry names in the document, as full addresses.
    ///
    /// A list that is not there yet is named too when the entry may create it and the item that
    /// would hold it is there - that is a project written before projects had a body, and the
    /// whole reason the "Add a paragraph" button has to appear on its page.
    /// </summary>
    public static IEnumerable<string> Expand(Entry entry, JsonNode? doc)
    {
        var steps = entry.Pattern.Split('.');
        var results = new List<string>();
        Walk(doc, steps, 1, steps[0], entry.Create, results);
        return results;
    }

    private static void Walk(JsonNode? node, string[] steps, int i, string at, bool create, List<string> into)
    {
        if (i == steps.Length)
        {
            if (node is JsonArray) into.Add(at);
            return;
        }

        var step = steps[i];
        if (step == "*")
        {
            if (node is not JsonArray arr) return;
            for (var k = 0; k < arr.Count; k++) Walk(arr[k], steps, i + 1, at + "." + k, create, into);
            return;
        }

        if (node is not JsonObject obj) return;
        if (obj.TryGetPropertyValue(step, out var next)) Walk(next, steps, i + 1, at + "." + step, create, into);
        else if (create && i == steps.Length - 1) into.Add(at + "." + step);
    }

    private static bool Matches(string pattern, string[] parts)
    {
        var p = pattern.Split('.');
        if (p.Length != parts.Length) return false;
        for (var i = 0; i < p.Length; i++)
        {
            if (p[i] == "*") { if (!IsIndex(parts[i])) return false; }
            else if (p[i] != parts[i]) return false;
        }
        return true;
    }

    private static bool IsIndex(string s) => s.Length > 0 && s.All(char.IsAsciiDigit);
}
