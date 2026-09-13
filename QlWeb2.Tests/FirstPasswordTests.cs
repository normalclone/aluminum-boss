using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using QlWeb2.Areas.Admin;
using QlWeb2.Data;
using QlWeb2.Models;

namespace QlWeb2.Tests;

/// <summary>
/// The gate that stands in front of the admin while the seeded password is still in force.
///
/// Worth a test rather than a look, because the way it fails is silent. A gate that lets one
/// screen through leaves the whole admin reachable from that screen; a gate that lets nothing
/// through - Account included - locks the operator out of the only form that can open it. Both
/// look like an ordinary redirect from the outside.
/// </summary>
public class FirstPasswordTests
{
    private static AdminUser Seeded()
    {
        var (hash, salt) = PasswordHasher.Hash(AdminSeeder.DefaultPassword);
        return new AdminUser { Username = "admin", PasswordHash = hash, PasswordSalt = salt };
    }

    [Fact]
    public void Knows_the_seeded_password_when_it_sees_it()
    {
        Assert.True(AdminSeeder.IsDefault(Seeded()));
    }

    [Fact]
    public void Stops_knowing_it_once_it_is_changed()
    {
        var user = Seeded();
        var (hash, salt) = PasswordHasher.Hash("a longer thing entirely");
        user.PasswordHash = hash;
        user.PasswordSalt = salt;

        Assert.False(AdminSeeder.IsDefault(user));
    }

    /// <summary>A request as the filter sees one: who is asking, and which controller answers.</summary>
    private static ActionExecutingContext Asking(string controller, bool signedIn)
    {
        var http = new DefaultHttpContext();
        if (signedIn)
        {
            http.User = new ClaimsPrincipal(
                new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "admin") }, "cookie"));
        }

        var descriptor = new ControllerActionDescriptor { ControllerName = controller };
        var action = new ActionContext(http, new RouteData(), descriptor);
        return new ActionExecutingContext(action, new List<IFilterMetadata>(),
                                          new Dictionary<string, object?>(), controller: null!);
    }

    private static string? Went(FirstPassword flag, string controller, bool signedIn = true)
    {
        var context = Asking(controller, signedIn);
        new FirstPasswordFilter(flag).OnActionExecuting(context);
        return (context.Result as RedirectToActionResult)?.ActionName;
    }

    private static FirstPassword On()
    {
        var flag = new FirstPassword();
        flag.Set(true);
        return flag;
    }

    [Fact]
    public void Sends_every_working_screen_to_the_password_form()
    {
        var flag = On();

        foreach (var screen in new[] { "Edit", "Collection", "Media", "Enquiry", "History" })
            Assert.Equal("Password", Went(flag, screen));
    }

    [Fact]
    public void Leaves_the_account_screens_alone()
    {
        // The form that opens the gate and the button that signs out both live here. Redirecting
        // Account would be a loop with no way out of it.
        Assert.Null(Went(On(), "Account"));
    }

    [Fact]
    public void Lets_everything_through_once_the_password_is_changed()
    {
        Assert.Null(Went(new FirstPassword(), "Edit"));
    }

    [Fact]
    public void Ignores_a_visitor_who_is_not_signed_in()
    {
        // [Authorize] turns these away first. Redirecting them here instead would replace the
        // sign-in screen with a password form nobody can fill in.
        Assert.Null(Went(On(), "Edit", signedIn: false));
    }
}
