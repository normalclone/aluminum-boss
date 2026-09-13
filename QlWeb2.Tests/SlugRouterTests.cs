using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// An article lives at /news/press-line-2500/ now, not at /news/detail/?id=press-line-2500.
///
/// Two rules decide everything here, and they pull in opposite directions, which is why they are
/// written down as tests rather than left to the router's shape:
///
///   Every URL ever published must still answer. The old query form was linked from the site for
///   months, so it redirects - permanently, to the one path that now holds that article.
///
///   A slug nobody has is a 404. The old form fell back to the first item when the id was
///   unknown, because a list page passing a bad id was a bug in our own markup. A path is
///   different: /news/anything-at-all/ answering with the first article would put the whole
///   article under an unbounded number of URLs, which is the one thing a search engine punishes
///   harder than a 404.
/// </summary>
public class SlugRouterTests : IDisposable
{
    private readonly string _root;
    private readonly SlugRouter _router;

    public SlugRouterTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abslug-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        Directory.CreateDirectory(Path.Combine(_root, "news", "detail"));

        File.WriteAllText(Path.Combine(_root, "_data", "news.json"), """
        {
          "section": "News",
          "items": [
            { "id": "press-line-2500", "title": "A", "date": "2026-03-01" },
            { "id": "qualicoat-class-2", "title": "B", "date": "2026-02-01" }
          ]
        }
        """);
        File.WriteAllText(Path.Combine(_root, "_data", "redirects.json"), """
        { "paths": { "/tin-tuc/": "/news/", "/usa/": "/" } }
        """);
        File.WriteAllText(Path.Combine(_root, "news", "index.html"),
            """<html><body><div data-ab-section="news-list"></div></body></html>""");
        File.WriteAllText(Path.Combine(_root, "news", "detail", "index.html"),
            """<html><body><div data-ab-section="news-detail"></div></body></html>""");

        var store = new ContentStore(Path.Combine(_root, "_data"));
        var composer = new PageComposer(store, new SectionRenderer(store), _root);
        _router = new SlugRouter(store, new SectionRenderer(store), composer);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    [Fact]
    public void A_slug_resolves_to_the_detail_template_and_its_id()
        => Assert.Equal(("/news/detail/", "press-line-2500"),
                        _router.Resolve("/news/press-line-2500/"));

    [Fact]
    public void A_slug_nobody_has_is_not_answered()
        => Assert.Null(_router.Resolve("/news/no-such-article/"));

    [Fact]
    public void The_listing_page_is_not_a_slug()
        => Assert.Null(_router.Resolve("/news/"));

    [Fact]
    public void A_section_with_no_detail_template_has_no_slugs()
        => Assert.Null(_router.Resolve("/careers/anything/"));

    [Fact]
    public void The_old_query_url_redirects_to_the_path_that_replaced_it()
        => Assert.Equal("/news/press-line-2500/", _router.RedirectFor("/news/detail/", "press-line-2500"));

    [Fact]
    public void The_old_url_with_no_id_redirects_to_what_it_used_to_show()
        // It showed the first item. It still has to land on that article rather than on a 404.
        => Assert.Equal("/news/press-line-2500/", _router.RedirectFor("/news/detail/", null));

    [Fact]
    public void An_id_nobody_has_lands_where_the_old_page_landed()
        => Assert.Equal("/news/press-line-2500/", _router.RedirectFor("/news/detail/", "nothing"));

    [Fact]
    public void The_spelt_out_index_file_redirects_too()
        => Assert.Equal("/news/qualicoat-class-2/",
                        _router.RedirectFor("/news/detail/index.html", "qualicoat-class-2"));

    [Fact]
    public void A_page_that_is_already_where_it_belongs_is_not_redirected()
    {
        Assert.Null(_router.RedirectFor("/news/press-line-2500/", null));
        Assert.Null(_router.RedirectFor("/news/", null));
        Assert.Null(_router.RedirectFor("/", null));
    }

    [Fact]
    public void The_missing_slash_does_not_cost_the_id()
        // /news/detail?id=X used to work: the static-file handler added the slash and kept the
        // query. Spending the redirect on the slash alone would drop the id on the way and land
        // the visitor on a different article.
        => Assert.Equal("/news/qualicoat-class-2/",
                        _router.RedirectFor("/news/detail", "qualicoat-class-2"));

    [Fact]
    public void A_path_listed_in_redirects_json_is_redirected()
        // The table is how a slug can be renamed later without breaking the link someone sent.
        => Assert.Equal("/news/", _router.RedirectFor("/tin-tuc/", null));

    [Fact]
    public void A_whole_folder_that_moved_takes_the_pages_under_it_along()
        // The site itself sat under /usa/ for a month. One line in the table moves all of it.
        => Assert.Equal("/news/", _router.RedirectFor("/usa/news/", null));

    [Fact]
    public void A_path_that_moved_and_then_changed_shape_costs_one_redirect()
        // /usa/news/detail/?id=X was live. Sending it to /news/detail/ would drop the id on the
        // way and land the visitor on a different article.
        => Assert.Equal("/news/qualicoat-class-2/",
                        _router.RedirectFor("/usa/news/detail/", "qualicoat-class-2"));
}
