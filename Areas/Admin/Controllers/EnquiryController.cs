using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QlWeb2.Content;

namespace QlWeb2.Areas.Admin.Controllers;

/// <summary>
/// What people have sent through the contact form.
///
/// A screen rather than a file the owner has to find: an enquiry nobody reads is the same as an
/// enquiry nobody received, and the person who needs to read it is the one signing in here.
/// </summary>
[Area("Admin")]
[Authorize]
public class EnquiryController : Controller
{
    private readonly Enquiries _enquiries;
    public EnquiryController(Enquiries enquiries) => _enquiries = enquiries;

    public IActionResult Index()
    {
        ViewData["Title"] = "Enquiries";
        return View(_enquiries.All());
    }
}
