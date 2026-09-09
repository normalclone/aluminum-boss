using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Controllers;

public class ColorsController : Controller
{
    private const int PageSize = 12;
    private readonly AppDbContext _db;

    public ColorsController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index(string? family, string? brand, int page = 1)
    {
        ViewData["Title"] = "Colors";
        ViewData["BodyClass"] = "page-colors";
        ViewData["PageCss"] = new[] { "colors" };

        var query = _db.Products.AsQueryable();
        if (!string.IsNullOrWhiteSpace(family))
            query = query.Where(p => p.ColorFamily == family);
        if (!string.IsNullOrWhiteSpace(brand))
            query = query.Where(p => p.BrandSlug == brand);

        var total = await query.CountAsync();
        page = Math.Max(1, page);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        page = Math.Min(page, totalPages);

        var items = await query
            .OrderBy(p => p.SortOrder)
            .Skip((page - 1) * PageSize)
            .Take(PageSize)
            .ToListAsync();

        var families = await _db.Products.Select(p => p.ColorFamily).Distinct().OrderBy(f => f).ToListAsync();
        var brands = await _db.Products
            .Select(p => new { p.BrandSlug, p.BrandName })
            .Distinct()
            .OrderBy(b => b.BrandName)
            .ToListAsync();

        var vm = new ColorsIndexViewModel
        {
            Products = items,
            Families = families,
            Brands = brands.ToDictionary(b => b.BrandSlug, b => b.BrandName),
            SelectedFamily = family,
            SelectedBrand = brand,
            Page = page,
            TotalPages = totalPages,
        };
        return View(vm);
    }

    public async Task<IActionResult> Detail(string brand, string slug)
    {
        var product = await _db.Products.FirstOrDefaultAsync(p => p.BrandSlug == brand && p.Slug == slug);
        if (product is null) return NotFound();

        var similar = await _db.Products
            .Where(p => p.ColorFamily == product.ColorFamily && p.Id != product.Id)
            .OrderBy(p => p.SortOrder)
            .Take(3)
            .ToListAsync();

        ViewData["Title"] = product.Name;
        ViewData["BodyClass"] = "page-product";
        ViewData["PageCss"] = new[] { "product" };

        var vm = new ProductDetailViewModel { Product = product, SimilarProducts = similar };
        return View(vm);
    }
}

public class ColorsIndexViewModel
{
    public List<Product> Products { get; set; } = new();
    public List<string> Families { get; set; } = new();
    public Dictionary<string, string> Brands { get; set; } = new();
    public string? SelectedFamily { get; set; }
    public string? SelectedBrand { get; set; }
    public int Page { get; set; }
    public int TotalPages { get; set; }
}

public class ProductDetailViewModel
{
    public Product Product { get; set; } = null!;
    public List<Product> SimilarProducts { get; set; } = new();
}
