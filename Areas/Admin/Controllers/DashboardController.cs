using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize]
public class DashboardController : Controller
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        var model = new DashboardViewModel
        {
            Documents = await _db.ContentDocuments.AsNoTracking()
                .OrderByDescending(d => d.UpdatedAt)
                .Select(d => new DocSummary(d.Name, d.UpdatedAt, d.UpdatedBy))
                .ToListAsync(),
            PageCount = await _db.PageSeos.CountAsync(),
            HiddenRegions = await _db.PageRegions.CountAsync(r => !r.Visible),
            RegionCount = await _db.PageRegions.CountAsync(),
            RecentEdits = await _db.ContentRevisions.AsNoTracking()
                .OrderByDescending(r => r.SavedAt).Take(5)
                .Select(r => new EditSummary(r.Name, r.SavedAt, r.SavedBy))
                .ToListAsync(),
        };

        // The seeded password is public knowledge; nag until it is not the one in use.
        var admin = await _db.AdminUsers.AsNoTracking().FirstOrDefaultAsync();
        model.UsingDefaultPassword = admin is not null
            && PasswordHasher.Verify("changeme", admin.PasswordHash, admin.PasswordSalt);

        ViewData["Labels"] = ContentSeeder.Documents.ToDictionary(d => d.Name, d => d.Label);
        return View(model);
    }

    public record DocSummary(string Name, DateTime UpdatedAt, string UpdatedBy);
    public record EditSummary(string Name, DateTime SavedAt, string SavedBy);

    public class DashboardViewModel
    {
        public List<DocSummary> Documents { get; set; } = new();
        public List<EditSummary> RecentEdits { get; set; } = new();
        public int PageCount { get; set; }
        public int RegionCount { get; set; }
        public int HiddenRegions { get; set; }
        public bool UsingDefaultPassword { get; set; }
    }
}
