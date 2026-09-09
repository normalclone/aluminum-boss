using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Helpers;
using QlWeb2.Models;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize]
public class ContentController : Controller
{
    private readonly AppDbContext _db;
    public ContentController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        var docs = await _db.ContentDocuments.AsNoTracking().OrderBy(d => d.Name).ToListAsync();
        ViewData["Labels"] = ContentSeeder.Documents.ToDictionary(d => d.Name, d => d.Label);
        return View(docs);
    }

    public async Task<IActionResult> Edit(string id)
    {
        var doc = await _db.ContentDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.Name == id);
        if (doc is null) return NotFound();

        ViewData["Title"] = Label(doc.Name);
        ViewData["Name"] = doc.Name;
        return View(JsonForm.Flatten(doc.Json));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestFormLimits(ValueCountLimit = 8000)]
    public async Task<IActionResult> Edit(string id, IFormCollection form)
    {
        var doc = await _db.ContentDocuments.FirstOrDefaultAsync(d => d.Name == id);
        if (doc is null) return NotFound();

        // Only fields the form actually offered. A path arriving that the editor never rendered
        // is either a stale tab or someone poking at the endpoint; either way it is not applied.
        var offered = JsonForm.Flatten(doc.Json).ToDictionary(f => f.Path, f => f.Kind);
        var values = new Dictionary<string, string>();
        foreach (var key in form.Keys)
        {
            if (!offered.TryGetValue(key, out var kind) || kind == FieldKind.Locked) continue;
            values[key] = form[key].ToString();
        }
        // An unchecked checkbox posts nothing, so absent toggles have to be read as false.
        foreach (var (path, kind) in offered)
            if (kind == FieldKind.Toggle && !form.ContainsKey(path)) values[path] = "false";

        string updated;
        try { updated = JsonForm.Apply(doc.Json, values); }
        catch (JsonException ex)
        {
            TempData["Error"] = "Could not save: " + ex.Message;
            return RedirectToAction(nameof(Edit), new { id });
        }

        // Prove the result still parses before it can reach the public site.
        try { using var _ = JsonDocument.Parse(updated); }
        catch (JsonException)
        {
            TempData["Error"] = "Could not save: the result was not valid content.";
            return RedirectToAction(nameof(Edit), new { id });
        }

        _db.ContentRevisions.Add(new ContentRevision
        {
            Name = doc.Name,
            Json = doc.Json,
            SavedAt = DateTime.UtcNow,
            SavedBy = User.Identity?.Name ?? "",
        });

        doc.Json = updated;
        doc.UpdatedAt = DateTime.UtcNow;
        doc.UpdatedBy = User.Identity?.Name ?? "";
        await _db.SaveChangesAsync();

        TempData["Flash"] = Label(doc.Name) + " saved.";
        return RedirectToAction(nameof(Edit), new { id });
    }

    public async Task<IActionResult> History(string id)
    {
        var revisions = await _db.ContentRevisions.AsNoTracking()
            .Where(r => r.Name == id)
            .OrderByDescending(r => r.SavedAt)
            .Take(30)
            .ToListAsync();
        ViewData["Name"] = id;
        ViewData["Title"] = Label(id);
        return View(revisions);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Restore(int revisionId)
    {
        var rev = await _db.ContentRevisions.FindAsync(revisionId);
        if (rev is null) return NotFound();

        var doc = await _db.ContentDocuments.FirstOrDefaultAsync(d => d.Name == rev.Name);
        if (doc is null) return NotFound();

        // Restoring is itself a change, so the version being replaced is kept too.
        _db.ContentRevisions.Add(new ContentRevision
        {
            Name = doc.Name, Json = doc.Json,
            SavedAt = DateTime.UtcNow, SavedBy = User.Identity?.Name ?? "",
        });

        doc.Json = rev.Json;
        doc.UpdatedAt = DateTime.UtcNow;
        doc.UpdatedBy = User.Identity?.Name ?? "";
        await _db.SaveChangesAsync();

        TempData["Flash"] = "Restored the version from " + rev.SavedAt.ToString("d MMM yyyy HH:mm") + ".";
        return RedirectToAction(nameof(Edit), new { id = rev.Name });
    }

    private static string Label(string name) =>
        ContentSeeder.Documents.FirstOrDefault(d => d.Name == name).Label ?? JsonForm.Humanise(name);
}
