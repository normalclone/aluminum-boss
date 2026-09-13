using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace QlWeb2.Areas.Admin;

/// <summary>
/// Whether the admin account still has the password it was created with.
///
/// "admin" / "changeme" is written in <see cref="Data.AdminSeeder"/>, which is in the source of a
/// public repository. The handover document asked the operator to change it. Asking is not a
/// control: a site can run for a year with the password from the README, and the person who
/// finds it is not the person who read the document.
///
/// So this is a flag, not a plea. While it is set, every admin screen sends the operator to
/// Change password, and nothing else in the admin answers.
///
/// It is a cached answer rather than a column. A column can say no while the password says yes -
/// restore an old database, copy one between machines, and the flag is wrong in the dangerous
/// direction. The truth is the stored hash; verifying it costs 210,000 PBKDF2 rounds, which is
/// the right price once at startup and the wrong price on every request, so the answer is
/// computed at startup and then kept honest at the two moments it can change: signing in (where
/// the password is in hand) and changing it.
/// </summary>
public sealed class FirstPassword
{
    private volatile bool _still;

    /// <summary>True while the seeded password is still in force.</summary>
    public bool Still => _still;

    public void Set(bool still) => _still = still;
}

/// <summary>
/// Sends every admin screen to Change password while <see cref="FirstPassword"/> is set.
///
/// One filter rather than a check per controller: the screens are added to over time, and the one
/// somebody forgets is the one that matters. Account is exempt in full - the way to fix this and
/// the way out both live there, and a redirect loop would lock the operator out of their own site
/// more thoroughly than a weak password ever could.
/// </summary>
public sealed class FirstPasswordFilter : IActionFilter
{
    private readonly FirstPassword _first;
    public FirstPasswordFilter(FirstPassword first) => _first = first;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!_first.Still) return;
        if (context.HttpContext.User.Identity?.IsAuthenticated != true) return;
        if (context.ActionDescriptor is ControllerActionDescriptor d && d.ControllerName == "Account") return;

        context.Result = new RedirectToActionResult("Password", "Account", new { area = "Admin" });
    }

    public void OnActionExecuted(ActionExecutedContext context) { }
}
