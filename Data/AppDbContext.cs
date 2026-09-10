using Microsoft.EntityFrameworkCore;
using QlWeb2.Models;

namespace QlWeb2.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }


    public DbSet<ContentDocument> ContentDocuments => Set<ContentDocument>();
    public DbSet<ContentRevision> ContentRevisions => Set<ContentRevision>();
    public DbSet<PageSeo> PageSeos => Set<PageSeo>();
    public DbSet<PageRegion> PageRegions => Set<PageRegion>();
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContentDocument>()
            .HasIndex(d => d.Name)
            .IsUnique();

        modelBuilder.Entity<ContentRevision>()
            .HasIndex(r => new { r.Name, r.SavedAt });

        modelBuilder.Entity<PageSeo>()
            .HasIndex(p => p.Path)
            .IsUnique();

        modelBuilder.Entity<PageRegion>()
            .HasIndex(r => new { r.Page, r.Key })
            .IsUnique();

        modelBuilder.Entity<AdminUser>()
            .HasIndex(u => u.Username)
            .IsUnique();
    }
}
