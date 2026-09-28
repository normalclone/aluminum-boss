namespace QlWeb2.Content;

/// <summary>
/// The lists INSIDE an item that the editor may grow, shrink and reorder: the paragraphs of an
/// article, its tags.
///
/// The Content screen already handles the lists at the top of a document - the articles, the
/// colours. What it never could do is the list inside one of them, and until 28/09/2026 that meant
/// a new article could not be given a body at all: it had no paragraphs, so the page drew no
/// paragraph, so the editor - which builds its column from what the page draws - offered no box.
///
/// A table rather than "any array": each entry here is a list somebody has looked at and decided
/// is safe to change from the screen, and the endpoint refuses everything that is not in it. The
/// screen is not the door; a hand-built POST reaches the endpoint just as easily. Other sections
/// have lists of the same kind (a project's photos) - they join when they have been checked, not
/// because the pattern happens to match.
/// </summary>
public static class ItemLists
{
    /// <param name="Section">The detail section whose page shows this item.</param>
    /// <param name="Each">What one entry is called on the screen: "Add a paragraph".</param>
    /// <param name="Multiline">A paragraph is sentences, and gets a box with room for them.</param>
    public record Entry(string Section, string Document, string Items, string Field, string Each, bool Multiline);

    public static readonly Entry[] All =
    [
        new("news-detail", "news", "items", "body", "Paragraph", Multiline: true),
        new("news-detail", "news", "items", "tags", "Tag", Multiline: false),
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
    {
        target = string.Empty;
        what = default;

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
        var entryAt = w == ContentEditor.Op.Append ? parts.Length == 4 : parts.Length == 5;
        if (!entryAt) return false;

        if (!int.TryParse(parts[2], out var item) || item < 0) return false;
        if (parts.Length == 5 && (!int.TryParse(parts[4], out var at) || at < 0)) return false;

        if (!All.Any(e => e.Document == parts[0] && e.Items == parts[1] && e.Field == parts[3]))
            return false;

        target = address;
        what = w;
        return true;
    }
}
