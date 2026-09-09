namespace QlWeb2.Models;

/// <summary>
/// One editable content document, stored as the JSON the front-end already speaks.
///
/// The imported site renders itself in the browser from <c>/_data/{name}.json</c>. Keeping that
/// contract means the database can become the source of truth without touching a single line of
/// the site's markup or scripts — the response is served from here instead of from a file, and
/// the page cannot tell the difference. It is also what makes the port verifiable: the rendered
/// result has to stay pixel-identical to the version on git.
/// </summary>
public class ContentDocument
{
    public int Id { get; set; }

    /// <summary>Document name without extension: <c>colors</c>, <c>products</c>, <c>site</c>.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>The document itself. Validated as JSON before it is ever written.</summary>
    public string Json { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Who saved it last, for the history list.</summary>
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>A previous version of a document, written before every save so an edit can be undone.</summary>
public class ContentRevision
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Json { get; set; } = string.Empty;
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    public string SavedBy { get; set; } = string.Empty;
}

/// <summary>
/// Search-engine metadata for one page of the imported site.
///
/// The site's pages carry these tags in their HTML; a small middleware rewrites them from here on
/// the way out, so editing a description does not mean rebuilding a page.
/// </summary>
public class PageSeo
{
    public int Id { get; set; }

    /// <summary>Site-relative path with both slashes, e.g. <c>/colors/</c>.</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>Human name shown in the admin list, not published.</summary>
    public string Label { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Optional; falls back to <see cref="Title"/> and <see cref="Description"/>.</summary>
    public string OgTitle { get; set; } = string.Empty;
    public string OgDescription { get; set; } = string.Empty;

    /// <summary>Image key or path used for link previews. Empty means none.</summary>
    public string OgImage { get; set; } = string.Empty;

    public bool NoIndex { get; set; }
}

/// <summary>
/// One region of a page, in the order it appears.
///
/// Only the order and the visibility are editable. A region is a whole band of the page — the
/// export globe, the product row, the news strip — and moving one is safe at every screen width
/// because each band already lays itself out independently. Editing what is *inside* a band is
/// done through the content documents, not here; that boundary is what keeps a content change
/// from breaking the responsive behaviour.
/// </summary>
public class PageRegion
{
    public int Id { get; set; }

    /// <summary>Which page the region belongs to, e.g. <c>/</c>.</summary>
    public string Page { get; set; } = string.Empty;

    /// <summary>Stable key matching the markup, e.g. <c>globe</c>, <c>products</c>, <c>cta</c>.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Name shown in the admin, e.g. "Export globe".</summary>
    public string Label { get; set; } = string.Empty;

    public int SortOrder { get; set; }
    public bool Visible { get; set; } = true;

    /// <summary>Regions that must not move or be hidden — the hero, for one.</summary>
    public bool Locked { get; set; }
}

/// <summary>An account that may sign in to the admin area.</summary>
public class AdminUser
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;

    /// <summary>Base64 scrypt-style PBKDF2 hash. Never the password itself.</summary>
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;
    public DateTime? LastSignInAt { get; set; }
}
