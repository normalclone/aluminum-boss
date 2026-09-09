using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Helpers;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize]
public class SeoController : Controller
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public SeoController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    public async Task<IActionResult> Index() =>
        View(await _db.PageSeos.AsNoTracking().OrderBy(p => p.Path).ToListAsync());

    public async Task<IActionResult> Edit(int id)
    {
        var seo = await _db.PageSeos.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return seo is null ? NotFound() : View(seo);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Edit(int id, string title, string description,
        string ogTitle, string ogDescription, string ogImage, bool noIndex)
    {
        var seo = await _db.PageSeos.FirstOrDefaultAsync(p => p.Id == id);
        if (seo is null) return NotFound();

        seo.Title = (title ?? "").Trim();
        seo.Description = (description ?? "").Trim();
        seo.OgTitle = (ogTitle ?? "").Trim();
        seo.OgDescription = (ogDescription ?? "").Trim();
        seo.OgImage = (ogImage ?? "").Trim();
        seo.NoIndex = noIndex;
        await _db.SaveChangesAsync();

        var written = SeoWriter.Write(_env.WebRootPath, seo);

        TempData["Flash"] = written
            ? "Saved, and the page has been updated."
            : "Saved, but the page file could not be found - nothing was published.";
        return RedirectToAction(nameof(Index));
    }
}
