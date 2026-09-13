using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
public class AccountController : Controller
{
    private readonly AppDbContext _db;
    private readonly FirstPassword _first;

    public AccountController(AppDbContext db, FirstPassword first)
    {
        _db = db;
        _first = first;
    }

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewData["ReturnUrl"] = returnUrl;
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(string username, string password, string? returnUrl = null)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Username == username);

        // One message for both a wrong name and a wrong password: saying which was wrong tells an
        // attacker which usernames exist.
        if (user is null || !PasswordHasher.Verify(password ?? "", user.PasswordHash, user.PasswordSalt))
        {
            ModelState.AddModelError("", "That username and password do not match.");
            ViewData["ReturnUrl"] = returnUrl;
            return View();
        }

        user.LastSignInAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // The one moment the password is in hand as text. Cheaper than re-deriving the hash, and
        // it keeps the flag right when the database was replaced under a running app.
        _first.Set(password == AdminSeeder.DefaultPassword);

        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim("display", user.DisplayName),
        }, CookieAuthenticationDefaults.AuthenticationScheme);

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));

        return LocalRedirect(returnUrl ?? "/Admin");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    [HttpGet]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public IActionResult Password()
    {
        // Told to the view, not decided by it: while this is set the rest of the admin redirects
        // here, so the screen has to say why rather than look like an ordinary detour.
        ViewData["Forced"] = _first.Still;
        return View();
    }

    [HttpPost]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Password(string current, string next, string confirm)
    {
        var user = await _db.AdminUsers.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
        if (user is null) return RedirectToAction(nameof(Login));

        if (!PasswordHasher.Verify(current ?? "", user.PasswordHash, user.PasswordSalt))
            ModelState.AddModelError("", "The current password is not right.");
        else if (string.IsNullOrWhiteSpace(next) || next.Length < 10)
            ModelState.AddModelError("", "The new password needs to be at least 10 characters.");
        else if (next != confirm)
            ModelState.AddModelError("", "The two new passwords do not match.");

        if (!ModelState.IsValid)
        {
            ViewData["Forced"] = _first.Still;
            return View();
        }

        var (hash, salt) = PasswordHasher.Hash(next!);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await _db.SaveChangesAsync();

        _first.Set(next == AdminSeeder.DefaultPassword);

        TempData["Flash"] = "Password changed.";
        return RedirectToAction("Index", "Edit");
    }
}
