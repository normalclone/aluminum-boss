using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QlWeb2.Content;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Areas.Admin.Controllers;

/// <summary>
/// The lists: which items exist, in what order, and which of them are published.
///
/// Editing what an item SAYS happens on the item's own page, in the two-column editor - the
/// picture of it is right there, and that is the whole point of this project. What cannot be done
/// from a page is the set: adding one, removing one, moving one up, taking one down for a month.
/// That is what this screen is, and why it is a table rather than a form.
/// </summary>
[Area("Admin")]
[Authorize]
public class CollectionController : Controller
{
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;
    private readonly SectionRenderer _sections;
    private readonly AppDbContext _db;

    public CollectionController(ContentStore store, ContentEditor editor,
                                SectionRenderer sections, AppDbContext db)
    {
        _store = store;
        _editor = editor;
        _sections = sections;
        _db = db;
    }

    /// <summary>
    /// The kinds of thing a client adds and removes: seven libraries, four home-page shelves,
    /// and two canvas blocks.
    ///
    /// <c>Page</c> is where an item of this kind appears. Seven have a page each, addressed by
    /// slug; the rest live on the home page and are edited there, which is why their page is "/"
    /// and their items have no link of their own.
    /// </summary>
    /// <param name="CanAdd">
    /// Whether a new item of this kind can be filled in once it exists.
    ///
    /// False for the two canvas blocks. What makes a route a route is its waypoints - forty
    /// latitude/longitude pairs - and what makes a factory a factory is where it sits on the map.
    /// None of that is text on the page, so none of it has an address, so a route added here
    /// would be a blank line in the legend that nobody can ever complete. Hiding, reordering and
    /// removing still work: those need no new coordinates.
    /// </param>
    /// <param name="PickFrom">
    /// The KEY of the kind this one points at, when its items are pointers rather than things.
    ///
    /// A home-page card is a card FOR something in a library: the picture, the words and the link
    /// all come from whatever it points at, and the pointer is the whole of what makes the card
    /// that card. Which one it is cannot be a text field on the page - it is an id, and ids are
    /// not words anybody reads - so it is chosen here, on the screen that is already about which
    /// items exist.
    ///
    /// It names a KIND rather than a document so the library's array and its word for one item
    /// come with it. Naming only the document meant assuming every library kept its items under
    /// "items", which two of them do not.
    /// </param>
    /// <param name="One">
    /// What one item of this kind is called, in the singular. It is the heading of the column
    /// that chooses one, on the screen of whatever kind points here.
    /// </param>
    public record Kind(string Key, string Label, string Document, string Array, string Page,
                       bool CanAdd = true, string? PickFrom = null, string One = "Item")
    {
        public bool HasOwnPage => Page != "/";

        /// <summary>The library this kind points into, or null when its items are things.</summary>
        public Kind? Source => PickFrom is null ? null : Kinds.FirstOrDefault(k => k.Key == PickFrom);
    }

    public static readonly Kind[] Kinds =
    [
        new("products",     "Products",      "products",     "categories", "/products/",  One: "Product family"),
        new("colors",       "Colors",        "colors",       "items",      "/colors/",    One: "Color"),
        new("news",         "News",          "news",         "items",      "/news/",      One: "Article"),
        new("projects",     "Projects",      "projects",     "albums",     "/projects/",  One: "Project"),
        new("documents",    "Documents",     "documents",    "categories", "/documents/", One: "Document group"),
        new("gallery",      "Gallery",       "gallery",      "items",      "/", One: "Picture"),
        new("applications", "Applications",  "applications", "tabs",       "/", One: "Tab"),

        // The home page's four shelves. Each is a list of ids pointing into the library above it:
        // what the client writes lives in the library, once, and the shelf says which of it the
        // home page shows and in what order.
        new("home-news",     "Home: New",      "home-news",     "items", "/", PickFrom: "news",     One: "Card"),
        new("home-products", "Home: Products", "home-products", "items", "/", PickFrom: "products", One: "Card"),
        new("home-colors",   "Home: Colors",   "home-colors",   "items", "/", PickFrom: "colors",   One: "Card"),
        new("home-projects", "Home: Projects", "home-projects", "items", "/", PickFrom: "projects", One: "Card"),

        new("routes",       "Export routes", "globe",        "routes",     "/", CanAdd: false, One: "Export route"),
        new("factories",    "Factories",     "factories",    "sites",      "/", CanAdd: false, One: "Factory"),
    ];

    public IActionResult Index()
    {
        ViewData["Title"] = "Content";
        return View(Kinds.Select(k => new Summary(k, Count(k))).ToList());
    }

    public record Summary(Kind Kind, int Items);

    /// <summary>
    /// <c>Page</c> is where this item is looked at and edited - its own, or the home page.
    ///
    /// <c>Warn</c> is the one sentence a pointer row sometimes has to say: what it points at is
    /// hidden, or nothing. Either way the card draws nothing on the site while the row here still
    /// says "Shown", because what is shown is the SHELF's own switch. Without the sentence, that
    /// reads as a broken screen.
    /// </summary>
    public record Row(int Index, string Id, string Title, string Note, string? Image, bool Visible,
                      string Page, string? Warn = null);

    public IActionResult Items(string id)
    {
        var kind = Kinds.FirstOrDefault(k => k.Key == id);
        if (kind is null) return NotFound();

        ViewData["Title"] = kind.Label;
        ViewData["Kind"] = kind;
        ViewData["Choices"] = Choices(kind);
        return View(Rows(kind));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Change(string id, int index, string op)
    {
        var kind = Kinds.FirstOrDefault(k => k.Key == id);
        if (kind is null) return NotFound();
        if (!Enum.TryParse<ContentEditor.Op>(op, ignoreCase: true, out var what)) return BadRequest();
        // The button is not on the screen for these two, so this is only reached by hand - but
        // the door has to be shut here as well, because the screen is not the only way in.
        if (what == ContentEditor.Op.Add && !kind.CanAdd) return BadRequest();

        var address = what == ContentEditor.Op.Add
            ? $"{kind.Document}.{kind.Array}"
            : $"{kind.Document}.{kind.Array}.{index}";

        var result = _editor.Structure(address, what);
        if (result.Rejected.Count > 0) TempData["Error"] = "That item could not be changed.";
        else await Record(result);

        if (what == ContentEditor.Op.Add) TempData["Flash"] = "Added. It is at the top of the list.";
        return RedirectToAction(nameof(Items), new { id });
    }

    /// <summary>
    /// Points one item at a different article.
    ///
    /// The id is the whole of the link: the picture, the path and the fallback headline all come
    /// from whatever article carries it. Checked against the real list rather than trusted -
    /// a card pointing at an article that does not exist draws nothing at all, and a silently
    /// blank home page is the worst kind of wrong.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Link(string id, int index, string to)
    {
        var kind = Kinds.FirstOrDefault(k => k.Key == id);
        if (kind?.PickFrom is null) return NotFound();
        if (!Choices(kind).Any(c => c.Id == to)) return BadRequest();

        var change = new ContentEditor.Change($"{kind.Document}.{kind.Array}.{index}.id", to);
        var result = _editor.Apply([change]);
        if (result.Rejected.Count > 0) TempData["Error"] = "That item could not be changed.";
        else await Record(result);

        return RedirectToAction(nameof(Items), new { id });
    }

    /// <summary>
    /// The items a pointer kind may point at, in the order the library holds them.
    ///
    /// Hidden items are on the list. Choosing one and then publishing it is an ordinary way to
    /// work, and leaving it off would mean the card silently loses its selection the day somebody
    /// hides the article for an afternoon. The row says so instead.
    /// </summary>
    public record Choice(string Id, string Title);

    public List<Choice> Choices(Kind kind)
    {
        if (kind.Source is not { } from) return [];
        var list = _store.Get(from.Document)?[from.Array] as JsonArray;
        return list?.OfType<JsonNode>()
            .Select(a => new Choice(Text(a, "id"),
                                    First(a, "title", "name", "label", "caption") is { Length: > 0 } t
                                    ? t : Text(a, "id")))
            .Where(c => c.Id.Length > 0).ToList() ?? [];
    }

    /// <summary>
    /// Deleting, with what points at the item put in front of the person first.
    ///
    /// Two steps on purpose. The first press answers "what would this break"; only the second
    /// actually removes anything, and it carries the answer with it so nobody can say later that
    /// they were not told.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(string id, int index, bool confirmed = false)
    {
        var kind = Kinds.FirstOrDefault(k => k.Key == id);
        if (kind is null) return NotFound();

        var rows = Rows(kind);
        var row = rows.FirstOrDefault(r => r.Index == index);
        if (row is null) return RedirectToAction(nameof(Items), new { id });

        if (!confirmed)
        {
            TempData["Confirm"] = index;
            TempData["ConfirmWhat"] = row.Title;
            // A card is a pointer, so "what else mentions this id" is the wrong question: every
            // hit would be the library item the card points at, and the card's removal touches
            // none of it. Asking it anyway printed "Other content points at it: products.json
            // (3), site.json (1)" over a delete that changes one line of one file - true, and
            // frightening about the wrong thing.
            TempData["ConfirmRefs"] = kind.Source is { } from
                ? $"This removes the card only. The {from.One.ToLowerInvariant()} itself stays in "
                  + $"{from.Label}, and everywhere else it appears."
                : _editor.Mentions(row.Id, kind.Document) is { Count: > 0 } mentions
                  ? "Other content points at it: " + string.Join(", ", mentions)
                  : "Nothing else points at it.";
            return RedirectToAction(nameof(Items), new { id });
        }

        var result = _editor.Structure($"{kind.Document}.{kind.Array}.{index}", ContentEditor.Op.Remove);
        if (result.Rejected.Count > 0) TempData["Error"] = "That item could not be removed.";
        else
        {
            await Record(result);
            TempData["Flash"] = $"Deleted {row.Title}.";
        }
        return RedirectToAction(nameof(Items), new { id });
    }

    // ---------------------------------------------------------------------------------------

    private int Count(Kind kind)
        => (_store.Get(kind.Document)?[kind.Array] as JsonArray)?.Count ?? 0;

    private List<Row> Rows(Kind kind)
    {
        var list = _store.Get(kind.Document)?[kind.Array] as JsonArray;
        if (list is null) return [];

        // A pointer kind has no picture of its own - that is the point of it - so the thumbnail
        // comes from whatever it points at, the same place the card on the site takes it from.
        var source = kind.Source is not { } from ? null
                   : (_store.Get(from.Document)?[from.Array] as JsonArray)?.OfType<JsonNode>().ToList();

        var rows = new List<Row>();
        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            // A pointer kind has nothing of its own to show - no picture, no headline - because
            // that is the point of it. Everything on the row comes from what it points at, the
            // same place the card on the site takes it from.
            var linked = source?.FirstOrDefault(a => Text(a, "id") == Text(item, "id"));
            var shown = linked ?? item;
            var image = Text(shown, "image");
            rows.Add(new Row(
                Index: i,
                Id: Text(item, "id"),
                // Each kind names its items differently; take whichever it has rather than
                // teaching this screen ten field names.
                Title: First(shown, "title", "name", "label", "caption") is { Length: > 0 } t
                       ? t : Text(item, "id"),
                Note: First(shown, "tagline", "spec", "code", "year", "location", "description"),
                Image: image.Length > 0 ? "/_media/" + image : null,
                Visible: item?["visible"] is not JsonValue v || !v.TryGetValue<bool>(out var y) || y,
                Page: PageFor(kind, Text(item, "id")),
                Warn: Warning(kind, linked)));
        }
        return rows;
    }

    /// <summary>Why this pointer row draws nothing on the site, when it draws nothing.</summary>
    private static string? Warning(Kind kind, JsonNode? linked)
    {
        if (kind.Source is not { } from) return null;
        if (linked is null) return $"Until a{An(from.One)} is chosen, this card does not appear.";
        return linked["visible"] is JsonValue v && v.TryGetValue<bool>(out var y) && !y
            ? $"That {from.One.ToLowerInvariant()} is hidden, so this card does not appear."
            : null;
    }

    private static string An(string word)
        => (word.Length > 0 && "AEIOU".Contains(char.ToUpperInvariant(word[0])) ? "n " : " ")
           + word.ToLowerInvariant();

    private static string Text(JsonNode? node, string key)
    {
        if (node is not JsonObject o) return string.Empty;
        return o.TryGetPropertyValue(key, out var v) ? v?.ToString() ?? string.Empty : string.Empty;
    }

    private static string First(JsonNode? node, params string[] keys)
        => keys.Select(k => Text(node, k)).FirstOrDefault(s => s.Length > 0) ?? string.Empty;

    /// <summary>
    /// Where this item is looked at and edited.
    ///
    /// Its own page where it has one. The other three kinds live on the home page, so that is
    /// where the editor opens - the item is somewhere on it, and clicking the item in the preview
    /// is how you find its fields.
    /// </summary>
    private string PageFor(Kind kind, string id)
    {
        if (!kind.HasOwnPage) return "/";
        var slug = _sections.SlugForId(kind.Key + "-detail", id);
        return slug is null ? kind.Page : kind.Page + slug + "/";
    }

    private async Task Record(ContentEditor.Result result)
    {
        foreach (var (name, before) in result.Previous)
        {
            if (before is null) continue;
            _db.ContentRevisions.Add(new ContentRevision
            {
                Name = name,
                Json = before,
                SavedAt = DateTime.UtcNow,
                SavedBy = User.Identity?.Name ?? "editor",
            });
        }
        if (result.Previous.Count > 0)
        {
            await _db.SaveChangesAsync();
            await RevisionLog.TrimAsync(_db, result.Previous.Keys);
        }
    }
}
