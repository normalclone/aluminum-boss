using Microsoft.EntityFrameworkCore;
using QlWeb2.Content;
using QlWeb2.Data;

var builder = WebApplication.CreateBuilder(args);

Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "App_Data"));

// Whether the editor is wired up. On from Task 11; the site does not change either way.
//
// The comment that used to sit here said that turning the admin on made /_data/*.json come from
// the database instead of from the files. That was true of the prototype and stopped being true
// at Task 3: the middleware that served documents from SQLite is gone, and ContentStore reads the
// files in every case. What the database still holds is revision history and the one login.
//
// So this switch decides one thing only - whether /Admin answers - and turning it on also creates
// the database file and seeds it, which is why it is a switch rather than nothing at all.
var adminEnabled = builder.Configuration.GetValue("Admin:Enabled", false);

builder.Services.AddControllersWithViews(options =>
{
    // While the seeded password is still in force, every admin screen goes to Change password.
    // See Areas/Admin/FirstPassword.cs - the point is that it cannot be skipped by adding a
    // screen and forgetting the check.
    if (adminEnabled) options.Filters.Add<QlWeb2.Areas.Admin.FirstPasswordFilter>();
});
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// The site's content. Files on disk are the single source of truth; the database keeps revision
// history and the admin account, and nothing else.
builder.Services.AddSingleton<ContentStore>();
builder.Services.AddSingleton<SectionRenderer>();
builder.Services.AddSingleton<StructuredData>();
builder.Services.AddSingleton<PageComposer>();
builder.Services.AddSingleton<SlugRouter>();
builder.Services.AddSingleton<ContentEditor>();
builder.Services.AddSingleton<MediaLibrary>();
builder.Services.AddSingleton<SiteFiles>();
builder.Services.AddSingleton<Enquiries>();

if (adminEnabled)
{
    builder.Services.AddSingleton<QlWeb2.Areas.Admin.FirstPassword>();

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
// create a schema at all.
//
// EnsureCreated has to be here rather than inside the seeder: it used to sit in the prototype's
// seeder, and removing that left the file being created with no tables in it - which the site
// did not notice, because with the admin off it never asks.
//
// EnsureCreated also never alters a database that exists. Deleting the three prototype tables at
// Task 15 is therefore a no-op on an installed site - the tables stay behind, empty of meaning,
// and nothing opens them. A fresh site simply never gets them.
if (adminEnabled)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    AdminSeeder.Seed(db);
    scope.ServiceProvider.GetRequiredService<QlWeb2.Areas.Admin.FirstPassword>()
        .Set(AdminSeeder.AnyDefault(db));
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
app.UseMiddleware<EnquiryMiddleware>();
app.UseMiddleware<SiteFilesMiddleware>();
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
        pattern: "Admin/{controller=Edit}/{action=Index}/{id?}");
}

// No conventional routes: every page of the site is a file under wwwroot, and the only
// controllers left belong to the admin area, which registers its own route above when enabled.
app.Run();
