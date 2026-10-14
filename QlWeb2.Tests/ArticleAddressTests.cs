using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// An article's address (14/10/2026): the client wrote a new article over an old one, and it
/// went out at the old one's link with no box to change it.
/// </summary>
public class ArticleAddressTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public ArticleAddressTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abslug-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        File.WriteAllText(Path.Combine(_root, "_data", "news.json"), """
        { "items": [
          { "id": "press-line-2500", "title": "AAMA certification" },
          { "id": "operator-role", "title": "Choosing an operator", "visible": false },
          { "id": "service-life", "slug": "how-long-a-shutter-lasts", "title": "Service life" }
        ] }
        """);
        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string? At(int i, string key) => _store.Get("news")!["items"]![i]![key]?.ToString();

    private ContentEditor.Result Write(string address, string value)
        => _editor.Apply([new ContentEditor.Change(address, value)]);

    [Fact]
    public void A_new_address_is_written_and_the_move_reported()
    {
        var r = Write("news.items.0.slug", "aama-coating-certification");
        Assert.Empty(r.Rejected);
        Assert.Equal("aama-coating-certification", At(0, "slug"));
        Assert.Equal("press-line-2500", At(0, "id"));
        Assert.Equal("aama-coating-certification", r.Renamed!["press-line-2500"]);
    }

    [Fact]
    public void Back_to_the_id_removes_the_field()
    {
        Write("news.items.0.slug", "aama-coating-certification");
        Assert.Empty(Write("news.items.0.slug", "press-line-2500").Rejected);
        Assert.Null(At(0, "slug"));
    }

    [Fact]
    public void The_same_address_again_writes_nothing()
    {
        var r = Write("news.items.0.slug", "press-line-2500");
        Assert.Empty(r.Rejected);
        Assert.Empty(r.Previous);
    }

    [Theory]
    [InlineData("operator-role")]            // a hidden article still owns its address
    [InlineData("how-long-a-shutter-lasts")] // a written slug
    public void An_address_another_article_holds_is_refused(string slug)
    {
        Assert.Equal(["news.items.0.slug"], Write("news.items.0.slug", slug).Rejected);
        Assert.Null(At(0, "slug"));
    }

    [Fact]
    public void The_id_under_a_written_slug_is_not_an_address_here()
    {
        // Nothing answers at /news/service-life/ but the redirect table, and that table is the
        // controller's check (EditController.OldLinkOfAnother), not this one.
        Assert.Empty(Write("news.items.0.slug", "service-life").Rejected);
    }

    [Theory]
    [InlineData("", "needs an address")]
    [InlineData("AAMA Coating", "small letters")]
    [InlineData("a--b", "small letters")]
    [InlineData("detail", "kept by the site")]
    [InlineData("operator-role", "\"Choosing an operator\" already uses")]
    public void A_refusal_says_why(string slug, string words)
    {
        Assert.Equal(["news.items.0.slug"], Write("news.items.0.slug", slug).Rejected);
        Assert.Contains(words, ContentEditor.SlugProblem(_store.Get("news")!, "items.0.slug", slug));
    }

    [Fact]
    public void Only_an_existing_article_gets_the_field()
        => Assert.Equal(["news.items.9.slug"], Write("news.items.9.slug", "anything").Rejected);

    [Fact]
    public void A_new_article_does_not_take_an_old_link()
    {
        // An article moved away from old-press; its old link is in the table. A new article with
        // that title would sit behind the redirect, so it gets the next free address.
        File.WriteAllText(Path.Combine(_root, "_data", "redirects.json"),
            """{ "paths": { "/usa/": "/", "/news/old-press/": "/news/press-line-2500/" } }""");
        File.WriteAllText(Path.Combine(_root, "_data", "news.json"),
            """{ "items": [ { "id": "new-abc123", "title": "" } ] }""");
        var r = Write("news.items.0.title", "Old press");
        Assert.Equal("old-press-2", r.Renamed!["new-abc123"]);
    }

    [Fact]
    public void A_long_title_is_cut_between_words()
    {
        var slug = ContentEditor.Slugify("BOSSGROUP AFFIRMS CAPABILITY WITH AAMA 2603 & AAMA 2604 COATING PROCESS CERTIFICATIONS");
        Assert.Equal("bossgroup-affirms-capability-with-aama-2603-aama-2604", slug);
    }
}
