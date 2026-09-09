using Microsoft.EntityFrameworkCore;
using QlWeb2.Data;

namespace QlWeb2.Helpers;

/// <summary>
/// Answers <c>/_data/{name}.json</c> from the database instead of from disk.
///
/// The imported site fetches its content at runtime — <c>AB.load('colors')</c> asks for
/// <c>/_data/colors.json</c> — and does not care what produced the response. Serving it from the
/// database means the content is editable without changing one byte of the site's markup or
/// scripts, which is what keeps the port verifiably identical to the version it came from.
///
/// This has to run before the static-file middleware. Static files are matched first in the
/// pipeline, so registered after it, the file on disk would always win and the database would be
/// silently ignored — the sort of thing that looks fine until someone edits content and nothing
/// happens.
///
/// A document missing from the database falls through to the file, so a fresh checkout works
/// before the first import and a document deleted by mistake does not blank a page.
/// </summary>
public class ContentFileMiddleware
{
    private readonly RequestDelegate _next;

    public ContentFileMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context, AppDbContext db)
    {
        var path = context.Request.Path.Value;
        if (path is null || !path.StartsWith("/_data/", StringComparison.OrdinalIgnoreCase)
                         || !path.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        var name = path[7..^5];
        // No traversal, no surprises: document names are a closed set of plain words.
        if (name.Length == 0 || name.Length > 64 || !name.All(c => char.IsAsciiLetterOrDigit(c) || c == '-'))
        {
            await _next(context);
            return;
        }

        var doc = await db.ContentDocuments
            .AsNoTracking()
            .Where(d => d.Name == name)
            .Select(d => new { d.Json, d.UpdatedAt })
            .FirstOrDefaultAsync();

        if (doc is null)
        {
            await _next(context);
            return;
        }

        context.Response.ContentType = "application/json; charset=utf-8";
        // Content is editable and the editor expects to see a change immediately.
        context.Response.Headers.CacheControl = "no-cache";
        context.Response.Headers.LastModified = doc.UpdatedAt.ToString("R");
        await context.Response.WriteAsync(doc.Json);
    }
}
