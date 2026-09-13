using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QlWeb2.Content;

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
    private readonly PageComposer _composer;
    private readonly SectionRenderer _sections;
    private readonly IWebHostEnvironment _env;

    public EditController(PageComposer composer, SectionRenderer sections, IWebHostEnvironment env)
    {
        _composer = composer;
        _sections = sections;
        _env = env;
    }

    public IActionResult Index(string? page = null)
    {
        var pages = Pages();
        ViewData["Pages"] = pages;
        ViewData["Page"] = pages.Any(p => p.Path == page) ? page : pages[0].Path;
        ViewData["Title"] = "Edit pages";
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

    private static string Title(string folder)
        => string.Join(' ', folder.Split('-').Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
}
