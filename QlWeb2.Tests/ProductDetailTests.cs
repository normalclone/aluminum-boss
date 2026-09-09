using Microsoft.Playwright;
using NUnit.Framework;

namespace QlWeb2.Tests;

[Parallelizable(ParallelScope.Self)]
public class ProductDetailTests : TestBase
{
    [Test]
    public async Task Detail_ShowsBreadcrumbSpecsAndRequestQuoteButton()
    {
        await GotoAsync("/colors/brand-a/color-04");

        await Expect(Page.Locator("h1")).ToHaveTextAsync("Color 04");
        await Expect(Page.Locator(".breadcrumb")).ToContainTextAsync("Color 04");
        await Expect(Page.Locator(".spec-row")).ToContainTextAsync("Finishes Available");
        await Expect(Page.Locator(".btn-primary")).ToContainTextAsync("Request a quote");
    }

    [Test]
    public async Task SimilarColors_LinkToOtherProductsInSameFamily()
    {
        await GotoAsync("/colors/brand-a/color-04");

        var similarLinks = Page.Locator(".similar-grid a");
        var count = await similarLinks.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "expected at least one similar color");

        var href = await similarLinks.First.GetAttributeAsync("href");
        Assert.That(href, Does.Match(@"^/colors/[a-z-]+/[a-z0-9-]+$"));

        await similarLinks.First.ClickAsync();
        await Expect(Page.Locator("h1")).ToBeVisibleAsync();
        Assert.That(Page.Url, Is.Not.EqualTo(BaseUrl + "/colors/brand-a/color-04"));
    }

    [Test]
    public async Task UnknownProduct_Returns404()
    {
        var response = await Page.GotoAsync(BaseUrl + "/colors/brand-a/does-not-exist");
        Assert.That(response?.Status, Is.EqualTo(404));
    }

    [Test]
    public async Task BreadcrumbBrandLink_FiltersColorsListByThatBrand()
    {
        await GotoAsync("/colors/brand-a/color-04");
        await Page.Locator(".breadcrumb a").Nth(1).ClickAsync();

        Assert.That(Page.Url, Does.Contain("brand=brand-a"));
        var cards = Page.Locator(".swatch-card");
        var count = await cards.CountAsync();
        for (int i = 0; i < count; i++)
        {
            Assert.That(await cards.Nth(i).GetAttributeAsync("data-brand"), Is.EqualTo("brand-a"));
        }
    }
}
