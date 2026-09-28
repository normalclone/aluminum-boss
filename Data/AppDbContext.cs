using Microsoft.EntityFrameworkCore;
using QlWeb2.Models;

namespace QlWeb2.Data;

/// <summary>
/// Two tables, and that is the whole database.
///
/// The prototype kept the site's words here as well, in ContentDocuments, plus a row per page for
/// the search tags and a row per band of the home page for the running order. None of those are
/// read any more: wwwroot/_data/*.json is the single source of truth and has been since Task 3,
/// the search tags are generated from it, and the running order lives in the documents too. The
/// tables and the four screens that wrote to them were removed rather than left to be found -
/// a Save button that writes somewhere nobody reads is worse than no button.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<ContentRevision> ContentRevisions => Set<ContentRevision>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // The two columns that carry an index get a length, and on SQLite this changes nothing:
        // SQLite ignores the length of a text column, and EnsureCreated never alters a database
        // that already exists.
        //
        // On MySQL it is the difference between a schema and an error. An unbounded string maps
        // to longtext there, and MySQL will not index a longtext without a prefix length -
        // EnsureCreated fails on the first CREATE INDEX and the app never starts. A hundred is
        // several times the longest document name the site has ("home-products"), and a
        // hundred utf8mb4 characters is 400 bytes, well inside the 3072-byte key limit even
        // with SavedAt beside it.
        modelBuilder.Entity<ContentRevision>().Property(r => r.Name).HasMaxLength(100);
        modelBuilder.Entity<AdminUser>().Property(u => u.Username).HasMaxLength(100);

        modelBuilder.Entity<ContentRevision>()
            .HasIndex(r => new { r.Name, r.SavedAt });

        modelBuilder.Entity<AdminUser>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}
