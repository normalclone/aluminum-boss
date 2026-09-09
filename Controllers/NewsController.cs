using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Controllers;

public class NewsController : Controller
{
    private const int PageSize = 4;
    private readonly AppDbContext _db;

    public NewsController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index(int page = 1)
    {
        ViewData["Title"] = "News";
        ViewData["BodyClass"] = "page-news";
        ViewData["PageCss"] = new[] { "news" };

        var featured = await _db.NewsArticles
            .Where(a => a.IsFeatured)
            .OrderByDescending(a => a.PublishedAt)
            .FirstOrDefaultAsync()
            ?? await _db.NewsArticles.OrderByDescending(a => a.PublishedAt).FirstOrDefaultAsync();

        var rest = _db.NewsArticles.Where(a => featured == null || a.Id != featured.Id)
            .OrderByDescending(a => a.PublishedAt);

        var total = await rest.CountAsync();
        page = Math.Max(1, page);
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)PageSize));
        page = Math.Min(page, totalPages);

        var items = await rest.Skip((page - 1) * PageSize).Take(PageSize).ToListAsync();

        var vm = new NewsIndexViewModel
        {
            Featured = featured,
            Articles = items,
            Page = page,
            TotalPages = totalPages,
        };
        return View(vm);
    }

    public async Task<IActionResult> Details(string slug)
    {
        var article = await _db.NewsArticles.FirstOrDefaultAsync(a => a.Slug == slug);
        if (article is null) return NotFound();

        var neighbors = await _db.NewsArticles.OrderByDescending(a => a.PublishedAt).Select(a => a.Slug).ToListAsync();
        var idx = neighbors.IndexOf(slug);

        ViewData["Title"] = article.Title;
        ViewData["BodyClass"] = "page-news-article";
        ViewData["PageCss"] = new[] { "news", "home" };

        var vm = new NewsDetailsViewModel
        {
            Article = article,
            PrevSlug = idx > 0 ? neighbors[idx - 1] : null,
            NextSlug = idx >= 0 && idx < neighbors.Count - 1 ? neighbors[idx + 1] : null,
        };
        return View(vm);
    }
}

public class NewsIndexViewModel
{
    public NewsArticle? Featured { get; set; }
    public List<NewsArticle> Articles { get; set; } = new();
    public int Page { get; set; }
    public int TotalPages { get; set; }
}

public class NewsDetailsViewModel
{
    public NewsArticle Article { get; set; } = null!;
    public string? PrevSlug { get; set; }
    public string? NextSlug { get; set; }
}
