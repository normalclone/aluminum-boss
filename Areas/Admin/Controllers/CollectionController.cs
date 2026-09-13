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
    /// The ten kinds of thing a client adds and removes.
    ///
    /// <c>Page</c> is where an item of this kind appears. Seven have a page each, addressed by
    /// slug; the other three live on the home page and are edited there, which is why their page
    /// is "/" and their items have no link of their own.
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
    public record Kind(string Key, string Label, string Document, string Array, string Page,
                       bool CanAdd = true)
    {
        public bool HasOwnPage => Page != "/";
    }

    public static readonly Kind[] Kinds =
    [
        new("products",     "Products",      "products",     "categories", "/products/"),
        new("colors",       "Colors",        "colors",       "items",      "/colors/"),
        new("news",         "News",          "news",         "items",      "/news/"),
        new("projects",     "Projects",      "projects",     "albums",     "/projects/"),
        new("documents",    "Documents",     "documents",    "categories", "/documents/"),
        new("gallery",      "Gallery",       "gallery",      "items",      "/"),
        new("highlights",   "Highlights",    "highlights",   "items",      "/"),
        new("applications", "Applications",  "applications", "tabs",       "/"),
        new("routes",       "Export routes", "globe",        "routes",     "/", CanAdd: false),
        new("factories",    "Factories",     "factories",    "sites",      "/", CanAdd: false),
    ];

    public IActionResult Index()
    {
        ViewData["Title"] = "Content";
        return View(Kinds.Select(k => new Summary(k, Count(k))).ToList());
    }

    public record Summary(Kind Kind, int Items);

    /// <summary><c>Page</c> is where this item is looked at and edited - its own, or the home page.</summary>
    public record Row(int Index, string Id, string Title, string Note, string? Image, bool Visible,
                      string Page);

    public IActionResult Items(string id)
    {
        var kind = Kinds.FirstOrDefault(k => k.Key == id);
        if (kind is null) return NotFound();

        ViewData["Title"] = kind.Label;
        ViewData["Kind"] = kind;
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
            var mentions = _editor.Mentions(row.Id, kind.Document);
            TempData["Confirm"] = index;
            TempData["ConfirmWhat"] = row.Title;
            TempData["ConfirmRefs"] = mentions.Count == 0
                ? "Nothing else points at it."
                : "Other content points at it: " + string.Join(", ", mentions);
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

        var rows = new List<Row>();
        for (var i = 0; i < list.Count; i++)
        {
            var item = list[i];
            var image = Text(item, "image");
            rows.Add(new Row(
                Index: i,
                Id: Text(item, "id"),
                // Each kind names its items differently; take whichever it has rather than
                // teaching this screen ten field names.
                Title: First(item, "title", "name", "label", "caption") is { Length: > 0 } t
                       ? t : Text(item, "id"),
                Note: First(item, "tagline", "spec", "code", "year", "location", "description"),
                Image: image.Length > 0 ? "/_media/" + image : null,
                Visible: item?["visible"] is not JsonValue v || !v.TryGetValue<bool>(out var y) || y,
                Page: PageFor(kind, Text(item, "id"))));
        }
        return rows;
    }

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
