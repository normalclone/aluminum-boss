namespace QlWeb2.Content;

/// <summary>
/// Takes what the contact form sends.
///
/// A middleware rather than a controller because the public site has no MVC surface at all - the
/// only routes registered are the admin's - and adding one for a single endpoint would put a
/// second way into the application beside the one everything else uses.
/// </summary>
public sealed class EnquiryMiddleware
{
    private readonly RequestDelegate _next;
    public EnquiryMiddleware(RequestDelegate next) => _next = next;

    public async Task Invoke(HttpContext context, Enquiries enquiries)
    {
        if (!HttpMethods.IsPost(context.Request.Method)
            || !context.Request.Path.Equals("/contact/send", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        if (!context.Request.HasFormContentType)
        {
            context.Response.StatusCode = StatusCodes.Status415UnsupportedMediaType;
            return;
        }

        var form = await context.Request.ReadFormAsync();
        var fields = form.ToDictionary(f => f.Key, f => f.Value.ToString());
        fields.Remove("route");

        var route = form["route"].ToString();
        var who = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var outcome = enquiries.Take(route, fields, who);

        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsync(outcome switch
        {
            // The wording the page shows is the page's business; what travels is what happened.
            Enquiries.Outcome.Saved => """{"ok":true}""",
            Enquiries.Outcome.TooMany => """{"ok":false,"why":"rate"}""",
            _ => """{"ok":false,"why":"empty"}""",
        });
    }
}
