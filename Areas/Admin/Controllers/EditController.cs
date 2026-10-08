using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QlWeb2.Content;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Areas.Admin.Controllers;

/// <summary>
/// The two-column editor: what to change on the left, the page itself on the right.
///
/// The preview is the real page at its real URL with one script added, not a rendering of the
/// content in admin styling. That costs an iframe and buys the only thing the client actually
/// wants to know - what it will look like.
///
/// This controller renders a shell and nothing else. The fields in the left column are reported
/// by the page in the frame, which is the one thing that knows for certain which addresses it
/// carries; a list assembled here would be a second opinion, and the two would drift.
/// </summary>
[Area("Admin")]
[Authorize]
public class EditController : Controller
{
    private readonly ContentStore _store;
    private readonly PageComposer _composer;
    private readonly SectionRenderer _sections;
    private readonly ContentEditor _editor;
    private readonly MediaLibrary _media;
    private readonly DocumentFiles _files;
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public EditController(ContentStore store, PageComposer composer, SectionRenderer sections,
                          ContentEditor editor, MediaLibrary media, DocumentFiles files,
                          AppDbContext db, IWebHostEnvironment env)
    {
        _store = store;
        _composer = composer;
        _sections = sections;
        _editor = editor;
        _media = media;
        _files = files;
        _db = db;
        _env = env;
    }

    public IActionResult Index(string? page = null)
    {
        var pages = Pages();
        // An item page that is not the one the picker lists for its kind. The picker carries the
        // FIRST item of each kind only, and until 08/10/2026 any other page fell through to Home -
        // which meant "Edit" on the Content screen opened the home page for every row but the
        // first. Accepted when the slug belongs to an item, and added to the picker so the select
        // can show it as chosen.
        if (page is not null && !pages.Any(p => p.Path == page) && ItemPage(page) is { } link)
            pages.Insert(pages.FindLastIndex(p => link.Path.StartsWith(p.Path, StringComparison.Ordinal)) + 1, link);
        ViewData["Pages"] = pages;
        ViewData["Page"] = pages.Any(p => p.Path == page) ? page : pages[0].Path;
        ViewData["Title"] = "Edit pages";
        // Which lists a page belongs to, so the editor can offer "add one" from the page itself.
        //
        // This screen edits what an item SAYS; adding, removing and reordering live on the
        // Content screen, and a client looking at the Colors page had no way to learn that from
        // here. Sending the map rather than one answer: the frame can now move between pages on
        // its own, so the answer has to be recomputed there.
        ViewData["Kinds"] = CollectionController.Kinds
            .Select(k => new { key = k.Key, label = k.Label, page = k.Page, one = k.One, add = k.CanAdd })
            .ToList();
        return View();
    }

    public record PageLink(string Path, string Label);

    /// <summary>
    /// Every page the site has, read from the folders rather than from a list.
    ///
    /// A folder holding index.html is a page. A folder whose detail/index.html carries a detail
    /// section has one page per item, and the first item stands for all of them here - the item
    /// picker is Task 12's job, and until then the detail template is still reachable and still
    /// editable through the item the listing puts first.
    /// </summary>
    private List<PageLink> Pages()
    {
        var root = _env.WebRootPath ?? "wwwroot";
        var links = new List<PageLink>();

        foreach (var dir in Directory.GetDirectories(root).Prepend(root).OrderBy(d => d, StringComparer.Ordinal))
        {
            var name = Path.GetFileName(dir);
            if (name.StartsWith('_') || name.Equals("admin", StringComparison.OrdinalIgnoreCase)) continue;
            if (!System.IO.File.Exists(Path.Combine(dir, "index.html"))) continue;

            var urlPath = dir == root ? "/" : "/" + name + "/";
            links.Add(new PageLink(urlPath, dir == root ? "Home" : Title(name)));

            // The item pages behind it, represented by the first item.
            var section = _composer.DetailSectionFor(urlPath + "detail/");
            if (section is null) continue;
            var slug = _sections.SlugForId(section, null);
            if (slug is not null) links.Add(new PageLink(urlPath + slug + "/", Title(name) + " — one item"));
        }

        return links;
    }

    /// <summary>
    /// <c>/projects/skyliving/</c> as a page the editor may open, or null: the folder has a
    /// detail template and the slug is an item's. Strict, so a made-up address still opens Home.
    /// </summary>
    private PageLink? ItemPage(string path)
    {
        var parts = path.Trim('/').Split('/');
        if (parts.Length != 2 || !path.StartsWith('/') || !path.EndsWith('/')) return null;
        var section = _composer.DetailSectionFor("/" + parts[0] + "/detail/");
        if (section is null || _sections.IdForSlug(section, parts[1]) is null) return null;
        return new PageLink(path, Title(parts[0]) + " — " + parts[1]);
    }

    private static string Title(string folder)
        => string.Join(' ', folder.Split('-').Select(w => char.ToUpperInvariant(w[0]) + w[1..]));

    // ---------------------------------------------------------------------------------------
    // What the editor's JavaScript talks to. JSON in, JSON out; the screen itself never reloads.

    public record Edit(string Address, string Value);

    /// <summary>
    /// Writes a batch of changes to the content files.
    ///
    /// One request for the whole batch, because a document is rewritten whole: six fields saved
    /// one at a time would rewrite the same file six times and leave five places to stop halfway.
    ///
    /// Every touched document's previous contents are kept as a revision before the new one goes
    /// down. Nothing reads those yet - the history screen is the last task in this project - but
    /// the edits being made now are the ones that would be worth getting back, so they are
    /// recorded from the first save rather than from the day the screen exists.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Save([FromBody] List<Edit>? edits)
    {
        if (edits is null || edits.Count == 0) return Json(new { saved = 0 });

        // What each slug said before, read before anything is written. A renamed slug moves a
        // page, and the old address has to keep working - which means writing down where it went
        // while we still know where it came from.
        var slugs = edits
            .Where(e => e.Address.EndsWith(".slug", StringComparison.Ordinal))
            .ToDictionary(e => e.Address, e => Current(e.Address));

        var result = _editor.Apply(edits.Select(e => new ContentEditor.Change(e.Address, e.Value)));

        foreach (var edit in edits)
        {
            if (!slugs.TryGetValue(edit.Address, out var was) || was is null || was == edit.Value)
                continue;
            if (result.Rejected.Contains(edit.Address)) continue;
            RecordMove(edit.Address, was, edit.Value);
        }

        await Record(result);

        return Json(new
        {
            saved = result.Applied,
            rejected = result.Rejected,
            documents = result.Previous.Keys,
            // A new item that was just given a title also just got its address. The screen is
            // still looking at the placeholder one, which stopped existing a line ago.
            renamed = result.Renamed,
        });
    }

    public record ListChange(string Address, string Op);

    /// <summary>
    /// Adds, removes or moves one entry of a list INSIDE an item - a paragraph, a tag.
    ///
    /// Written straight away, like the Content screen's buttons, not held until Save: it changes
    /// how many boxes the page has, and the column has to be rebuilt from the page to show the
    /// new one. The screen asks to save any pending edits first, so that rebuilding cannot show a
    /// box its old value while the new one is still waiting to be written.
    ///
    /// Only the lists in <see cref="ItemLists"/> get through, and the address arrives whole - the
    /// list for "append", the entry for the rest - rather than as a list plus a position counted
    /// on the screen, which is not the position in the file.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> List([FromBody] ListChange? change)
    {
        if (change is null || !ItemLists.TryRead(change.Address ?? "", change.Op ?? "", out var target, out var op, out var entry))
            return Json(new { ok = false, error = "That list cannot be changed from here." });

        var result = _editor.Structure(target, op, entry.NewEntry(), entry.Create);
        if (result.Rejected.Count > 0)
            return Json(new { ok = false, error = "That could not be changed. Reload the page and try again." });

        await Record(result);
        return Json(new { ok = true });
    }

    /// <summary>
    /// Keeps what every touched document said before, so History can put it back.
    ///
    /// One helper for both doors - Save and the list buttons - because a change that leaves no
    /// revision is a change nobody can undo, and two copies of this block would drift.
    /// </summary>
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

    /// <summary>The value an address holds right now, or null.</summary>
    private string? Current(string address)
    {
        var cut = address.IndexOf('.');
        if (cut <= 0) return null;
        var doc = _store.Get(address[..cut]);
        return doc is null ? null : ContentPath.Resolve(doc, address[(cut + 1)..]);
    }

    /// <summary>
    /// Writes "the page that was here is now there" into redirects.json.
    ///
    /// Which URL an item sits at is a fact about the folder the section lives in, and the list of
    /// sections is kept once, in <see cref="CollectionController.Kinds"/>. An address whose
    /// document is not one of them is a kind with no page of its own, and nothing moved.
    /// </summary>
    private void RecordMove(string address, string was, string now)
    {
        var document = address[..address.IndexOf('.')];
        var kind = CollectionController.Kinds.FirstOrDefault(
            k => k.Document == document && k.HasOwnPage);
        if (kind is null) return;

        var table = _store.Get("redirects") as JsonObject;
        if (table?["paths"] is not JsonObject paths) return;

        paths[kind.Page + was + "/"] = kind.Page + now + "/";
        _editor.SaveDocument("redirects", table);
    }

    /// <summary>
    /// Takes a PDF for a document and hands back the name to put in its "file" field.
    ///
    /// Like a picture, the file is stored straight away and the field changes only when the
    /// person saves - so an upload they walk away from changes no page.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(DocumentFiles.MaxBytes + 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = DocumentFiles.MaxBytes + 1024 * 1024)]
    public async Task<IActionResult> UploadDocument(IFormFile? file)
    {
        if (file is null) return Json(new { error = "No file was chosen." });

        await using var stream = file.OpenReadStream();
        var saved = await _files.Accept(stream, file.FileName, file.Length);
        return saved.Name is null
            ? Json(new { error = saved.Error })
            : Json(new { name = saved.Name, url = "/" + DocumentFiles.Folder + "/" + saved.Name });
    }

    /// <summary>Every picture in the library, newest first.</summary>
    [HttpGet]
    public IActionResult Pictures()
        => Json(_media.All().Select(p => new
        {
            name = p.Name,
            url = "/" + MediaLibrary.Folder + "/" + p.Name,
            kb = (int)Math.Ceiling(p.Bytes / 1024.0),
        }));

    /// <summary>
    /// Takes a picture and hands back the name to put in the field.
    ///
    /// Answers with a message rather than a status code when the file is refused: every reason a
    /// picture is turned away is something the person can fix - the wrong kind of file, or one too
    /// large - and they are the ones who have to read it.
    /// </summary>
    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(MediaLibrary.MaxBytes)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file is null) return Json(new { error = "No file was chosen." });

        await using var stream = file.OpenReadStream();
        var saved = await _media.Accept(stream, file.FileName, file.Length);
        return saved.Name is null
            ? Json(new { error = saved.Error })
            : Json(new { name = saved.Name, url = "/" + MediaLibrary.Folder + "/" + saved.Name });
    }
}
