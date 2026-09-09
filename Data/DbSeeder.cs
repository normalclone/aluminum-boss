using QlWeb2.Models;

namespace QlWeb2.Data;

/// <summary>Idempotent placeholder-data seeder — replace with your real content before going live.</summary>
public static class DbSeeder
{
    private static readonly (string Slug, string Name)[] Brands =
    {
        ("brand-a", "Brand A"),
        ("brand-b", "Brand B"),
        ("brand-c", "Brand C"),
        ("brand-d", "Brand D"),
    };

    private static readonly string[] ColorFamilies =
        { "White", "Beige", "Gray", "Black", "Brown", "Blue", "Green" };

    public static void Seed(AppDbContext db)
    {
        db.Database.EnsureCreated();

        if (!db.Products.Any())
        {
            var products = new List<Product>();
            for (int i = 1; i <= 24; i++)
            {
                var brand = Brands[i % Brands.Length];
                var family = ColorFamilies[i % ColorFamilies.Length];
                products.Add(new Product
                {
                    Slug = $"color-{i:00}",
                    BrandSlug = brand.Slug,
                    BrandName = brand.Name,
                    Name = $"Color {i:00}",
                    ColorFamily = family,
                    Description = "A short product description goes here — sourcing, character, and ideal use cases for this material, written in your own voice once real content is ready.",
                    IsNew = i <= 3,
                    IsFeatured = i > 3 && i <= 8,
                    SortOrder = i,
                });
            }
            db.Products.AddRange(products);
            db.SaveChanges();
        }

        if (!db.NewsArticles.Any())
        {
            string GenericBody(string topic) => $"""
                <p>Placeholder lede paragraph introducing the story about {topic} — who was involved, what was unveiled or announced, and why it matters, written in your own voice once real content is ready.</p>
                <p>A second placeholder paragraph continuing the narrative with supporting detail, quotes, or context.</p>
                <div class="ph-img" data-label="In-article photo 01"></div>
                <h2>A Subheading Placeholder</h2>
                <p>Placeholder body text expanding on a specific aspect of the story.</p>
                <ul>
                  <li>Detail point placeholder one.</li>
                  <li>Detail point placeholder two.</li>
                  <li>Detail point placeholder three.</li>
                </ul>
                <div class="ph-img" data-label="In-article photo 02"></div>
                <h2>Another Subheading Placeholder</h2>
                <p>Closing placeholder paragraph wrapping up the story with a forward-looking statement or call to action.</p>
                """;

            var topics = new[]
            {
                ("A New Product Launch", "product-launch-announcement", true, -30),
                ("A Brand Collaboration Event", "brand-collaboration-event", false, -90),
                ("A Trade Show Appearance", "trade-show-spring-edit", false, -120),
                ("A Design Partnership", "design-partnership-unveiled", false, -120),
                ("A Company Milestone", "company-milestone-announcement", false, -120),
                ("Annual Financial Results", "annual-financial-results", false, -150),
                ("A Showcase Project", "showcase-project-feature", false, -150),
            };

            var articles = topics.Select((t, idx) => new NewsArticle
            {
                Slug = t.Item2,
                Title = $"Headline Placeholder About {t.Item1}",
                SummaryBullets = "Summary bullet placeholder describing the first key point.|Summary bullet placeholder describing a second notable detail.|Summary bullet placeholder describing where and when this took place.",
                BodyHtml = GenericBody(t.Item1),
                Tags = "Placeholder, Tag, Names",
                Author = "Your Brand",
                PublishedAt = DateTime.UtcNow.AddDays(t.Item4),
                IsFeatured = t.Item3,
            }).ToList();

            db.NewsArticles.AddRange(articles);
            db.SaveChanges();
        }
    }
}
