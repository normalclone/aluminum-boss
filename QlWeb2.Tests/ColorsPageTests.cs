using System.Text.RegularExpressions;
using Microsoft.Playwright;
using NUnit.Framework;

namespace QlWeb2.Tests;

[Parallelizable(ParallelScope.Self)]
public class ColorsPageTests : TestBase
{
    [Test]
    public async Task Index_ShowsTwelveItemsAndTwoPagesOfPagination()
    {
        await GotoAsync("/colors");
        await Expect(Page.Locator(".swatch-card")).ToHaveCountAsync(12);
        await Expect(Page.Locator(".pagination a", new() { HasText = "2" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Pagination_NextShowsDifferentProductsAndUpdatesUrl()
    {
        await GotoAsync("/colors");
        var firstPageFirstName = await Page.Locator(".swatch-card__name").First.InnerTextAsync();

        await Page.Locator(".pagination a", new() { HasText = "Next" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"[?&]page=2"));

        var secondPageFirstName = await Page.Locator(".swatch-card__name").First.InnerTextAsync();
        Assert.That(secondPageFirstName, Is.Not.EqualTo(firstPageFirstName));
    }

    [Test]
    public async Task FamilyFilter_OnlyShowsMatchingColorFamily()
    {
        await GotoAsync("/colors");
        await Page.Locator(".filter-bar a", new() { HasText = "Beige" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"[?&]family=Beige"));

        var cards = Page.Locator(".swatch-card");
        var count = await cards.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "expected at least one Beige product");

        for (int i = 0; i < count; i++)
        {
            var family = await cards.Nth(i).GetAttributeAsync("data-family");
            Assert.That(family, Is.EqualTo("Beige"));
        }
    }

    [Test]
    public async Task BrandFilter_OnlyShowsMatchingBrand()
    {
        await GotoAsync("/colors?brand=brand-a");
        var cards = Page.Locator(".swatch-card");
        var count = await cards.CountAsync();
        Assert.That(count, Is.GreaterThan(0));

        for (int i = 0; i < count; i++)
        {
            var brand = await cards.Nth(i).GetAttributeAsync("data-brand");
            Assert.That(brand, Is.EqualTo("brand-a"));
        }
    }

    [Test]
    public async Task ClickingSwatch_NavigatesToMatchingDetailPage()
    {
        await GotoAsync("/colors");
        var name = await Page.Locator(".swatch-card__name").First.InnerTextAsync();

        await Page.Locator(".swatch-card").First.ClickAsync();

        await Expect(Page.Locator("h1")).ToHaveTextAsync(name);
        await Expect(Page.Locator(".breadcrumb")).ToContainTextAsync(name);
    }
}
