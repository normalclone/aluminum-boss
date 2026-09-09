using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Helpers;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize]
public class LayoutController : Controller
{
    private const string HomePage = "/";

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public LayoutController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<IActionResult> Index()
    {
        var regions = await _db.PageRegions.AsNoTracking()
            .Where(r => r.Page == HomePage)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        // Show what the page actually contains, not just what the table remembers - if the two
        // disagree the table is wrong, and saying so is more use than quietly showing a fiction.
        var file = Path.Combine(_env.WebRootPath, RegionMarkup.HomeFile);
        ViewData["InPage"] = System.IO.File.Exists(file)
            ? RegionMarkup.ReadOrder(System.IO.File.ReadAllText(file))
            : new List<string>();

        return View(regions);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Move(int id, string direction)
    {
        var regions = await _db.PageRegions
            .Where(r => r.Page == HomePage)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        var index = regions.FindIndex(r => r.Id == id);
        if (index < 0) return RedirectToAction(nameof(Index));

        var target = direction == "up" ? index - 1 : index + 1;
        if (target < 0 || target >= regions.Count) return RedirectToAction(nameof(Index));

        // A locked band stays put, and nothing may be moved above one.
        if (regions[index].Locked || regions[target].Locked)
        {
            TempData["Error"] = $"\"{regions[index].Label}\" cannot move past \"{regions[target].Label}\".";
            return RedirectToAction(nameof(Index));
        }

        (regions[index], regions[target]) = (regions[target], regions[index]);
        for (var i = 0; i < regions.Count; i++) regions[i].SortOrder = i;

        await _db.SaveChangesAsync();
        return await Publish("Order changed.");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Toggle(int id)
    {
        var region = await _db.PageRegions.FirstOrDefaultAsync(r => r.Id == id && r.Page == HomePage);
        if (region is null) return RedirectToAction(nameof(Index));

        if (region.Locked)
        {
            TempData["Error"] = $"\"{region.Label}\" is always shown.";
            return RedirectToAction(nameof(Index));
        }

        region.Visible = !region.Visible;
        await _db.SaveChangesAsync();
        return await Publish(region.Visible ? $"\"{region.Label}\" is showing again." : $"\"{region.Label}\" is hidden.");
    }

    /// <summary>Writes the current order and visibility into the page.</summary>
    private async Task<IActionResult> Publish(string message)
    {
        var regions = await _db.PageRegions.AsNoTracking()
            .Where(r => r.Page == HomePage)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        var file = Path.Combine(_env.WebRootPath, RegionMarkup.HomeFile);
        if (!System.IO.File.Exists(file))
        {
            TempData["Error"] = "Saved, but the home page file could not be found.";
            return RedirectToAction(nameof(Index));
        }

        var html = await System.IO.File.ReadAllTextAsync(file);

        // Locked bands are left where they are. The opening screen is one, and it lives outside
        // the padded container the others sit in - rearranging it along with them would drag the
        // rest out of that container too.
        var order = regions.Where(r => !r.Locked).Select(r => r.Key).ToList();
        var visible = regions.Where(r => r.Visible).Select(r => r.Key).ToHashSet();

        var updated = RegionMarkup.Rewrite(html, order, visible);

        // A rewrite that loses a band has gone wrong; better to keep the page as it was and say so
        // than to publish a page with a section missing.
        var before = RegionMarkup.ReadOrder(html).Count;
        var after = RegionMarkup.ReadOrder(updated).Count;
        if (after != before)
        {
            TempData["Error"] = $"Nothing was published: the rewrite would have left {after} sections instead of {before}.";
            return RedirectToAction(nameof(Index));
        }

        await System.IO.File.WriteAllTextAsync(file, updated);
        TempData["Flash"] = message;
        return RedirectToAction(nameof(Index));
    }
}
