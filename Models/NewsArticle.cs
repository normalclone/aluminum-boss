namespace QlWeb2.Models;

public class NewsArticle
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>Pipe-delimited bullet points shown above the article body.</summary>
    public string SummaryBullets { get; set; } = string.Empty;

    /// <summary>Simple HTML body (headings/paragraphs/placeholder image markers) — seeded content only, never user input.</summary>
    public string BodyHtml { get; set; } = string.Empty;

    public string Tags { get; set; } = string.Empty;
    public string Author { get; set; } = "Your Brand";
    public DateTime PublishedAt { get; set; }
    public bool IsFeatured { get; set; }

    public IEnumerable<string> Bullets =>
        SummaryBullets.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public IEnumerable<string> TagList =>
        Tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
