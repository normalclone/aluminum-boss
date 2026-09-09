using Microsoft.AspNetCore.Mvc;

namespace QlWeb2.Controllers;

public class AboutController : Controller
{
    public IActionResult Index()
    {
        ViewData["Title"] = "About Us";
        ViewData["BodyClass"] = "page-about";
        ViewData["PageCss"] = new[] { "about" };
        return View();
    }
}
