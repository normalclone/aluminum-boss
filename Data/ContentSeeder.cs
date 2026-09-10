using System.Text.Json;
using QlWeb2.Models;

namespace QlWeb2.Data;

/// <summary>
/// Moves the imported site's content into the database the first time the app runs.
///
/// The site shipped as flat files under <c>wwwroot/_data</c>. Those files stay on disk as the
/// starting point and as a fallback, but once a document is in the database the database wins —
/// <see cref="Controllers.ContentController"/> serves from there. Seeding reads the files rather
/// than embedding a copy of their contents, so the two can never drift apart at the moment of
/// import.
/// </summary>
public static class ContentSeeder
{
    /// <summary>Documents to import, in the order they appear in the admin.</summary>
    public static readonly (string Name, string Label)[] Documents =
    {
        ("products",     "Products"),
        ("colors",       "Finishes"),
        ("documents",    "Documents"),
        ("projects",     "Projects"),
        ("news",         "News"),
        ("about",        "About us"),
        ("contact",      "Contact"),
        // Home-page sections. They have no page of their own, so they appear here or nowhere.
        ("applications", "Home — where the profiles go"),
        ("highlights",   "Home — what's new"),
        ("gallery",      "Home — finished work"),
        ("feature",      "Home — finish samples panel"),
    };

    /// <summary>
    /// The bands of the home page, in the order the markup has them. Only order and visibility
    /// are editable; the hero is locked because the page has to open with something.
    /// </summary>
    private static readonly (string Key, string Label, bool Locked)[] HomeRegions =
    {
        ("hero",         "Opening screen",         true),
        ("globe",        "Export globe",           false),
        ("factories",    "Factory map",            false),
        ("highlights",   "New — what's changed",   false),
        ("products",     "Product families",       false),
        ("applications", "Where the profiles go",  false),
        ("colors",       "Finishes strip",         false),
        ("feature",      "Finish samples panel",   false),
        ("projects",     "Recent projects",        false),
        ("gallery",      "Finished work gallery",  false),
        // No news strip: the "New" slider above carries the same stories, and the page was
        // running both. The /news/ page is unaffected, and the header and footer still reach it.
        ("cta",          "Closing call to action", false),
    };

    private static readonly (string Path, string Label, string Title, string Description)[] Pages =
    {
        ("/", "Home",
            "Boss Group - Vietnam's Leading Aluminum Exporter",
            "Aluminium extrusion, finishing and fabrication in Vietnam. Profile, facade, furniture, door and car accessories, and honeycomb panels, shipped to forty-three markets."),
        ("/about-us/", "About us", "About us | AluminumBoss",
            "Who we are: five plants between Nghe An and Binh Duong, what they can do, and what we are certified to."),
        ("/products/", "Products", "Products | AluminumBoss",
            "Six product families: profile systems, facade systems, furniture profiles, door and car accessories, and honeycomb panels."),
        ("/colors/", "Finishes", "Colors | AluminumBoss",
            "Anodised, powder coated, wood grain, PVDF and mechanical finishes, all applied on our own lines."),
        ("/documents/", "Documents", "Documents | AluminumBoss",
            "Catalogues, technical data sheets, certificates and installation guides."),
        ("/projects/", "Projects", "Projects | AluminumBoss",
            "Buildings and programmes our aluminium went into, by year of completion."),
        ("/news/", "News", "News | AluminumBoss",
            "Plant, product and market news from Boss Group."),
        ("/contact/", "Contact", "Contact | AluminumBoss",
            "Request a quotation, order finish samples, ask an engineer, or apply to distribute."),
    };

    public static void Seed(AppDbContext db, string webRootPath)
    {
        SeedDocuments(db, webRootPath);
        SeedSeo(db);
        SeedRegions(db);
        SeedAdmin(db);
        db.SaveChanges();
    }

    private static void SeedDocuments(AppDbContext db, string webRootPath)
    {
        foreach (var (name, _) in Documents)
        {
            if (db.ContentDocuments.Any(d => d.Name == name)) continue;

            var file = Path.Combine(webRootPath, "_data", name + ".json");
            if (!File.Exists(file)) continue;

            var json = File.ReadAllText(file);
            // Refuse to import something the site could not have been rendering anyway.
            try { using var _ = JsonDocument.Parse(json); }
            catch (JsonException) { continue; }

            db.ContentDocuments.Add(new ContentDocument
            {
                Name = name,
                Json = json,
                UpdatedAt = DateTime.UtcNow,
                UpdatedBy = "import",
            });
        }
    }

    private static void SeedSeo(AppDbContext db)
    {
        foreach (var (path, label, title, description) in Pages)
        {
            if (db.PageSeos.Any(p => p.Path == path)) continue;
            db.PageSeos.Add(new PageSeo
            {
                Path = path,
                Label = label,
                Title = title,
                Description = description,
            });
        }
    }

    private static void SeedRegions(AppDbContext db)
    {
        for (var i = 0; i < HomeRegions.Length; i++)
        {
            var (key, label, locked) = HomeRegions[i];
            if (db.PageRegions.Any(r => r.Page == "/" && r.Key == key)) continue;
            db.PageRegions.Add(new PageRegion
            {
                Page = "/",
                Key = key,
                Label = label,
                SortOrder = i,
                Visible = true,
                Locked = locked,
            });
        }
    }

    private static void SeedAdmin(AppDbContext db)
    {
        if (db.AdminUsers.Any()) return;

        // A known first password so the site owner can get in; the admin nags until it is changed.
        var (hash, salt) = PasswordHasher.Hash("changeme");
        db.AdminUsers.Add(new AdminUser
        {
            Username = "admin",
            DisplayName = "Site owner",
            PasswordHash = hash,
            PasswordSalt = salt,
        });
    }
}
