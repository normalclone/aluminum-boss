using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;

namespace QlWeb2.Content;

/// <summary>
/// How far back the History screen can reach, and the one place that decides it.
///
/// Every save keeps the version it replaced, which means the table grows for as long as the site
/// is edited and nothing in it is ever read after the fiftieth entry. Trimming lived inside the
/// restore path for a while - so a client who edited for a year and never restored anything had
/// a year of revisions and a screen claiming fifty. The rule belongs beside the writing, not
/// beside the one operation that happened to think of it.
/// </summary>
public static class RevisionLog
{
    /// <summary>
    /// How far back the history goes.
    ///
    /// Fifty per document is weeks of ordinary editing and a few minutes of a bad afternoon. It
    /// is a limit rather than a promise: the git history of this repository is the real archive,
    /// and this is the one the client can reach without asking anybody.
    /// </summary>
    public const int Keep = 50;

    /// <summary>Drops everything past <see cref="Keep"/> for each document just written.</summary>
    public static async Task TrimAsync(AppDbContext db, IEnumerable<string> names)
    {
        var cut = false;
        foreach (var name in names.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var old = await db.ContentRevisions
                .Where(r => r.Name == name)
                .OrderByDescending(r => r.SavedAt)
                .Skip(Keep)
                .ToListAsync();

            if (old.Count == 0) continue;
            db.ContentRevisions.RemoveRange(old);
            cut = true;
        }
        if (cut) await db.SaveChangesAsync();
    }

    public static Task TrimAsync(AppDbContext db, string name) => TrimAsync(db, [name]);
}
