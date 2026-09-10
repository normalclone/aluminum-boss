using Microsoft.EntityFrameworkCore;
using QlWeb2.Helpers;
using QlWeb2.Data;

var builder = WebApplication.CreateBuilder(args);

Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "App_Data"));

// The admin is parked, not removed. Every controller, view and helper it needs is still in the
// project and still compiles; this switch decides whether the app wires any of it up.
//
// It matters more than a hidden menu would: with the admin off, /_data/*.json is served from the
// files on disk instead of from the database, so the site is a plain static site plus JSON and
// editing a JSON file is all it takes. With it on, the database answers instead - and a change
// made to a file would appear to do nothing until it was imported.
//
// Turn it back on with "Admin:Enabled": true in appsettings.json.
var adminEnabled = builder.Configuration.GetValue("Admin:Enabled", false);

builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

if (adminEnabled)
{
    // Cookie authentication straight from the framework - no Identity package, because the admin
    // has one account and no self-service registration, password reset or roles to justify one.
    builder.Services
        .AddAuthentication(Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme)
        .AddCookie(options =>
        {
            options.LoginPath = "/Admin/Account/Login";
            options.LogoutPath = "/Admin/Account/Logout";
            options.AccessDeniedPath = "/Admin/Account/Login";
            options.ExpireTimeSpan = TimeSpan.FromHours(12);
            options.SlidingExpiration = true;
            options.Cookie.Name = "qlweb2.admin";
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
        });
}

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    DbSeeder.Seed(db);
    // Importing the JSON into the database is only worth doing when the database is what answers
    // for it. Left running with the admin off it would keep a second, stale copy of every
    // document that nothing reads.
    if (adminEnabled) ContentSeeder.Seed(db, app.Environment.WebRootPath);
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

if (adminEnabled)
{
    // Must sit above UseStaticFiles: static files are matched first in the pipeline, so below it
    // the file on disk would answer and every edit through the admin would appear to do nothing.
    app.UseMiddleware<ContentFileMiddleware>();
}

// The imported site addresses its pages as directories - /, /colors/detail/ - so the
// directory's index.html has to be found without naming it. UseStaticFiles alone will not.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

if (adminEnabled)
{
    app.UseAuthentication();
    app.UseAuthorization();

    // Above the conventional routes so /Admin/... never falls through to {controller}/{action}.
    app.MapAreaControllerRoute(
        name: "admin",
        areaName: "Admin",
        pattern: "Admin/{controller=Dashboard}/{action=Index}/{id?}");
}

app.MapControllerRoute(
    name: "productDetail",
    pattern: "colors/{brand}/{slug}",
    defaults: new { controller = "Colors", action = "Detail" });

app.MapControllerRoute(
    name: "newsDetail",
    pattern: "news/{slug}",
    defaults: new { controller = "News", action = "Details" });

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
