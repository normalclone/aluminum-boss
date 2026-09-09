using System.Text.RegularExpressions;
using Microsoft.Playwright;
using NUnit.Framework;

namespace QlWeb2.Tests;

[Parallelizable(ParallelScope.Self)]
public class HomePageTests : TestBase
{
    [Test]
    public async Task Hero_ShowsHeadingAndPrimaryActions()
    {
        await GotoAsync("/");
        await Expect(Page.Locator(".hero__heading")).ToContainTextAsync("Kitchens");
        await Expect(Page.Locator(".hero .btn-primary")).ToContainTextAsync("Request a quote");
    }

    [Test]
    public async Task NavLinks_NavigateToCorrectPages()
    {
        await GotoAsync("/");

        await Page.Locator(".site-nav a", new() { HasText = "Colors" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/Colors$"));

        await Page.Locator(".site-nav a", new() { HasText = "About Us" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/About$"));

        await Page.Locator(".site-nav a", new() { HasText = "News" }).ClickAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"/News$"));
    }

    [Test]
    public async Task NewSection_ShowsThreeDbBackedProductsWithWorkingLinks()
    {
        await GotoAsync("/");
        var cards = Page.Locator(".new-card");
        await Expect(cards).ToHaveCountAsync(3);

        var href = await cards.First.GetAttributeAsync("href");
        Assert.That(href, Does.Match(@"^/colors/[a-z-]+/[a-z0-9-]+$"));

        await cards.First.ClickAsync();
        await Expect(Page.Locator("h1")).ToBeVisibleAsync();
        Assert.That(Page.Url, Does.Contain("/colors/"));
    }

    [Test]
    public async Task StyleFinder_ShowsFiveSwatchesWithViewColorLinks()
    {
        await GotoAsync("/");
        var links = Page.Locator("section:has(.style-picker__tabs) a.card__link");
        await Expect(links).ToHaveCountAsync(5);
    }

    [Test]
    public async Task Newsletter_SubmitShowsConfirmationMessage()
    {
        await GotoAsync("/");
        await Page.FillAsync("input[name=email]", "tester@example.com");
        await Page.ClickAsync("button:has-text('I want to subscribe')");

        await Expect(Page).ToHaveURLAsync(new Regex(@"/$"));
        await Expect(Page.Locator(".newsletter-form__confirm")).ToContainTextAsync("tester@example.com");
    }
}
