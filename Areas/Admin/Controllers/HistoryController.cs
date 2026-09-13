using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Content;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Areas.Admin.Controllers;

/// <summary>
/// What the content said before, and how to put it back.
///
/// Every save writes the previous version of each document it touched. That has been happening
/// since the editor could save at all - before this screen existed - because the edits worth
/// getting back are the ones being made now, not the ones made after somebody built a way to
/// look at them.
///
/// Restoring is itself a save: it writes a revision of its own first, so the thing you restored
/// from is never the last copy of anything. Undo has an undo.
/// </summary>
[Area("Admin")]
[Authorize]
public class HistoryController : Controller
{
    private readonly AppDbContext _db;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public HistoryController(AppDbContext db, ContentStore store, ContentEditor editor)
    {
        _db = db;
        _store = store;
        _editor = editor;
    }

    public record Entry(int Id, string Name, DateTime SavedAt, string SavedBy, int Bytes);

    public async Task<IActionResult> Index(string? name = null)
    {
        var query = _db.ContentRevisions.AsNoTracking();
        if (!string.IsNullOrEmpty(name)) query = query.Where(r => r.Name == name);

        var entries = await query
            .OrderByDescending(r => r.SavedAt)
            .Take(200)
            .Select(r => new Entry(r.Id, r.Name, r.SavedAt, r.SavedBy, r.Json.Length))
            .ToListAsync();

        ViewData["Title"] = "History";
        ViewData["Documents"] = _store.Names;
        ViewData["Filter"] = name;
        return View(entries);
    }

    /// <summary>The document as that revision had it, for reading before deciding.</summary>
    public async Task<IActionResult> Show(int id)
    {
        var revision = await _db.ContentRevisions.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        return revision is null ? NotFound() : Content(revision.Json, "application/json; charset=utf-8");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Restore(int id)
    {
        var revision = await _db.ContentRevisions.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
        if (revision is null) return NotFound();

        // Restoring is a save like any other, so it leaves its own revision behind: whatever is
        // being replaced right now is somebody's work too, and this is the only copy of it.
        var previous = _store.Save(revision.Name, revision.Json);
        _editor.MirrorTo(revision.Name, revision.Json);

        if (previous is not null)
        {
            _db.ContentRevisions.Add(new ContentRevision
            {
                Name = revision.Name,
                Json = previous,
                SavedAt = DateTime.UtcNow,
                SavedBy = (User.Identity?.Name ?? "editor") + " (before restore)",
            });
            await _db.SaveChangesAsync();
        }

        await RevisionLog.TrimAsync(_db, revision.Name);
        TempData["Flash"] = $"Restored {revision.Name} to the version from "
                          + revision.SavedAt.ToLocalTime().ToString("d MMM yyyy, HH:mm") + ".";
        return RedirectToAction(nameof(Index), new { name = revision.Name });
    }
}
