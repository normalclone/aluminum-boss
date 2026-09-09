using Microsoft.Playwright;
using NUnit.Framework;

namespace QlWeb2.Tests;

[Parallelizable(ParallelScope.Self)]
public class NewsTests : TestBase
{
    [Test]
    public async Task Index_ShowsFeaturedStoryAndFourGridCards()
    {
        await GotoAsync("/news");
        await Expect(Page.Locator(".featured")).ToBeVisibleAsync();
        await Expect(Page.Locator(".news-card")).ToHaveCountAsync(4);
    }

    [Test]
    public async Task Pagination_NextShowsDifferentArticles()
    {
        await GotoAsync("/news");
        var firstPageTitle = await Page.Locator(".news-card h3").First.InnerTextAsync();

        await Page.Locator(".pagination a", new() { HasText = "Next" }).ClickAsync();

        var secondPageTitle = await Page.Locator(".news-card h3").First.InnerTextAsync();
        Assert.That(secondPageTitle, Is.Not.EqualTo(firstPageTitle));
    }

    [Test]
    public async Task Article_ShowsTitleBulletsBodyAndTags()
    {
        await GotoAsync("/news/product-launch-announcement");

        await Expect(Page.Locator(".article-header h1")).ToBeVisibleAsync();
        await Expect(Page.Locator(".article-summary li")).ToHaveCountAsync(3);
        await Expect(Page.Locator(".article-body h2")).ToHaveCountAsync(2);
        await Expect(Page.Locator(".article-tags")).ToContainTextAsync("Tags:");
    }

    [Test]
    public async Task PrevNext_ChainIsConsistentBetweenArticles()
    {
        await GotoAsync("/news/product-launch-announcement");
        var nextHref = await Page.Locator(".pagination a", new() { HasText = "Next" }).GetAttributeAsync("href");
        Assert.That(nextHref, Is.Not.Null);

        await Page.GotoAsync(BaseUrl + nextHref!);
        var prevHref = await Page.Locator(".pagination a", new() { HasText = "Prev" }).GetAttributeAsync("href");

        Assert.That(prevHref, Is.EqualTo("/news/product-launch-announcement"));
    }

    [Test]
    public async Task UnknownArticle_Returns404()
    {
        var response = await Page.GotoAsync(BaseUrl + "/news/does-not-exist");
        Assert.That(response?.Status, Is.EqualTo(404));
    }
}
