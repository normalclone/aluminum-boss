using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Controllers;

public class HomeController : Controller
{
    private readonly AppDbContext _db;

    public HomeController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        ViewData["Title"] = "Home";
        ViewData["BodyClass"] = "page-home";
        ViewData["PageCss"] = new[] { "home" };

        var newProducts = await _db.Products.Where(p => p.IsNew).OrderBy(p => p.SortOrder).ToListAsync();
        var featuredSwatches = await _db.Products.Where(p => p.IsFeatured).OrderBy(p => p.SortOrder).Take(5).ToListAsync();

        var vm = new HomeViewModel
        {
            NewProducts = newProducts,
            FeaturedSwatches = featuredSwatches,
        };
        return View(vm);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Subscribe(string email, string role)
    {
        // Placeholder handler — wire up to a real mailing-list provider before going live.
        TempData["SubscribeMessage"] = string.IsNullOrWhiteSpace(email)
            ? null
            : $"Thanks, {email}! You're on the list.";
        return RedirectToAction(nameof(Index));
    }

    public IActionResult Error() => View();
}

public class HomeViewModel
{
    public List<Product> NewProducts { get; set; } = new();
    public List<Product> FeaturedSwatches { get; set; } = new();
}
