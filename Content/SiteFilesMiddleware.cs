namespace QlWeb2.Content;

/// <summary>
/// Answers <c>/sitemap.xml</c>, <c>/robots.txt</c> and <c>/llms.txt</c>.
///
/// Above the static-file handler for the same reason the page composer is: a file of that name
/// dropped into wwwroot one day would win silently, and the generated one - the one that is
/// actually true - would stop being served with nothing to say so.
/// </summary>
public sealed class SiteFilesMiddleware
{
    private readonly RequestDelegate _next;
    public SiteFilesMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context, SiteFiles files)
    {
        var path = context.Request.Path.Value ?? "/";
        var (body, type) = path.ToLowerInvariant() switch
        {
            "/sitemap.xml" => (files.Sitemap(), "application/xml; charset=utf-8"),
            "/robots.txt" => (files.Robots(), "text/plain; charset=utf-8"),
            "/llms.txt" => (files.Llms(), "text/plain; charset=utf-8"),
            _ => (null, null),
        };

        if (body is null)
        {
            await _next(context);
            return;
        }

        context.Response.ContentType = type!;
        context.Response.Headers.CacheControl = "no-cache";
        await context.Response.WriteAsync(body);
    }
}
