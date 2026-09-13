namespace QlWeb2.Models;

/// <summary>A previous version of a document, written before every save so an edit can be undone.</summary>
public class ContentRevision
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Json { get; set; } = string.Empty;
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    public string SavedBy { get; set; } = string.Empty;
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
