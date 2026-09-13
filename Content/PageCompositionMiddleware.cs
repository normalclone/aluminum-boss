namespace QlWeb2.Content;

/// <summary>
/// Answers page requests with composed HTML instead of the template on disk.
///
/// This must sit ABOVE UseStaticFiles. Static files are matched first in the pipeline, so
/// registered below it the raw template would win every time and the composition would be
/// silently skipped - the sort of fault that looks fine until someone edits content and nothing
/// changes. That exact mistake has already been made once in this project with the old
/// database-backed content middleware.
///
/// Only page requests are intercepted. Assets, data files and everything else fall through to the
/// static-file handler untouched.
/// </summary>
public sealed class PageCompositionMiddleware
{
    private readonly RequestDelegate _next;

    public PageCompositionMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context, PageComposer composer, SlugRouter router)
    {
        if (!IsPageRequest(context.Request))
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path.Value ?? "/";
        var wanted = context.Request.Query["id"].ToString();
        var itemId = wanted.Length == 0 ? null : wanted;

        // Before composing, not after: /news/detail/ still has a template behind it, so composing
        // first would answer the old address with a page instead of moving it to the new one.
        var moved = router.RedirectFor(path, itemId);
        if (moved is not null)
        {
            context.Response.Redirect(moved, permanent: true);
            return;
        }

        var html = composer.Compose(path, itemId);
        if (html is null)
        {
            // No template answers this path. It may still be an item: /news/press-line-2500/ is
            // composed from /news/detail/, which sits at the same depth, so the page it produces
            // is the page the old address produced, byte for byte.
            if (router.Resolve(path) is { } item)
                html = composer.Compose(item.TemplatePath, item.ItemId);
        }
        if (html is null)
        {
            await _next(context);
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        // Content changes when someone saves, not on a timer, so a validator is the wrong tool.
        // No-cache keeps an edit visible on the next load without giving up conditional requests.
        context.Response.Headers.CacheControl = "no-cache";
        await context.Response.WriteAsync(html);
    }

    private static bool IsPageRequest(HttpRequest request)
    {
        if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method)) return false;

        var path = request.Path.Value ?? "/";
        if (path.Contains("..", StringComparison.Ordinal)) return false;

        // Directory-style URLs - "/", "/news/", "/news/press-line-2500/" - and explicit .html
        // files. Everything with another extension is an asset.
        if (path.EndsWith('/')) return true;
        if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase)) return true;

        // An item path with the last slash left off. It is not a page, but the router knows
        // where it was meant to go, and a person typing a link by hand should not meet a 404
        // over a slash. Anything carrying an extension is an asset and is left alone.
        return !Path.HasExtension(path);
    }
}
