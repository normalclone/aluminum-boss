using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;

namespace QlWeb2.Tests;

/// <summary>
/// Base fixture for interaction tests. Assumes the app is already running
/// (dotnet run) at BaseUrl — override with the QLWEB2_TEST_BASE_URL env var.
/// PageTest gives each test its own Browser/Context/Page automatically.
/// </summary>
public abstract class TestBase : PageTest
{
    protected static string BaseUrl =>
        Environment.GetEnvironmentVariable("QLWEB2_TEST_BASE_URL") ?? "http://localhost:5117";

    protected async Task GotoAsync(string path) => await Page.GotoAsync(BaseUrl + path);

    public override BrowserNewContextOptions ContextOptions()
        => new() { ViewportSize = new ViewportSize { Width = 1440, Height = 900 } };
}
