using Microsoft.EntityFrameworkCore;
using QlWeb2.Models;

namespace QlWeb2.Data;

/// <summary>
/// Creates the one account that may sign in, the first time the app runs.
///
/// This used to import the whole site into the database as well - eleven documents, a row per
/// page of search tags, a row per band of the home page. All of it is gone: the site's words are
/// read from wwwroot/_data/*.json, and a second copy in SQLite was a copy that went stale the
/// first time anybody saved. What is left is the account, and the database also keeps revision
/// history, which is written as edits happen rather than seeded.
/// </summary>
public static class AdminSeeder
{
    /// <summary>
    /// The password the first account is created with.
    ///
    /// It is in the source of a public repository, so it is not a secret and is not treated as
    /// one: while the stored password still matches this string, every admin screen redirects to
    /// Change password. See <see cref="IsDefault"/> - there is no "must change" column, because a
    /// flag can say no while the password says yes.
    /// </summary>
    public const string DefaultPassword = "changeme";

    public static void Seed(AppDbContext db)
    {
        if (!db.AdminUsers.Any())
        {
            var (hash, salt) = PasswordHasher.Hash(DefaultPassword);
            db.AdminUsers.Add(new AdminUser
            {
                Username = "admin",
                DisplayName = "Site owner",
                PasswordHash = hash,
                PasswordSalt = salt,
            });
        }

        db.SaveChanges();
    }

    /// <summary>True while this account still has the password it was created with.</summary>
    public static bool IsDefault(AdminUser user) =>
        PasswordHasher.Verify(DefaultPassword, user.PasswordHash, user.PasswordSalt);

    /// <summary>
    /// True while any account can still be signed into with the seeded password.
    ///
    /// Read once at startup. Each call is 210,000 PBKDF2 rounds per account, which is what makes
    /// it an answer worth caching rather than a check to repeat.
    /// </summary>
    public static bool AnyDefault(AppDbContext db) =>
        db.AdminUsers.AsNoTracking().ToList().Any(IsDefault);
}
