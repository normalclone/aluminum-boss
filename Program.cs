using Microsoft.EntityFrameworkCore;
using QlWeb2.Content;
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

// The site's content. Files on disk are the single source of truth; the database keeps revision
// history and the admin account, and nothing else.
builder.Services.AddSingleton<ContentStore>();
builder.Services.AddSingleton<PageComposer>();

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

// Only when the admin is on. With it off nothing reads the database, so there is no reason to
// create a schema or import a second copy of every document that would immediately go stale.
//
// EnsureCreated has to be here rather than inside the seeder: it used to sit in the prototype's
// seeder, and removing that left the file being created with no tables in it - which the site
// did not notice, because with the admin off it never asks.
if (adminEnabled)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    ContentSeeder.Seed(db, app.Environment.WebRootPath);
}

if (!app.Environment.IsDevelopment())
{
    // A static page, not a controller action: the app no longer has an MVC surface of its
    // own, and an error page that needs the framework to be working is the wrong shape.
    app.UseExceptionHandler("/500.html");
    app.UseHsts();
}

app.UseHttpsRedirection();

// Above UseStaticFiles, and the ordering is the whole point: static files are matched first
// in the pipeline, so registered below it the raw template would answer and the composition
// would be silently skipped.
app.UseMiddleware<PageCompositionMiddleware>();

// Pages the composer has no template for - and every asset - fall through to here. The imported
// site addresses its pages as directories, so the directory's index.html has to be found without
// naming it, which UseStaticFiles alone will not do.
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

// No conventional routes: every page of the site is a file under wwwroot, and the only
// controllers left belong to the admin area, which registers its own route above when enabled.
app.Run();
