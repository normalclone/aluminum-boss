using Microsoft.Playwright;
using NUnit.Framework;

namespace QlWeb2.Tests;

/// <summary>
/// Regression guard for the mobile horizontal-overflow bug found on the product
/// page during manual QA (image+text split sections staying 2-column on narrow
/// viewports). Checks all six main routes.
/// </summary>
[Parallelizable(ParallelScope.Self)]
public class ResponsiveTests : TestBase
{
    public override BrowserNewContextOptions ContextOptions()
        => new() { ViewportSize = new ViewportSize { Width = 390, Height = 844 } };

    private static readonly (string Name, string Path)[] Routes =
    {
        ("Home", "/"),
        ("Colors", "/colors"),
        ("Product", "/colors/brand-a/color-04"),
        ("About", "/about"),
        ("News", "/news"),
        ("NewsArticle", "/news/product-launch-announcement"),
    };

    [TestCaseSource(nameof(Routes))]
    public async Task Page_HasNoHorizontalOverflowAt390px((string Name, string Path) route)
    {
        await GotoAsync(route.Path);

        var scrollWidth = await Page.EvaluateAsync<int>("() => document.body.scrollWidth");
        var clientWidth = await Page.EvaluateAsync<int>("() => document.documentElement.clientWidth");

        Assert.That(scrollWidth, Is.LessThanOrEqualTo(clientWidth + 2),
            $"{route.Name} overflows horizontally on mobile: scrollWidth={scrollWidth}, clientWidth={clientWidth}");
    }

    [Test]
    public async Task Home_NavCollapsesOnMobile()
    {
        await GotoAsync("/");
        await Expect(Page.Locator(".site-nav")).ToBeHiddenAsync();
    }
}
