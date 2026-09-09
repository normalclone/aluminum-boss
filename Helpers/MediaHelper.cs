using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Html;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace QlWeb2.Helpers;

/// <summary>
/// Convention-based image resolution: drop a file into wwwroot/img named after the
/// key (any of the supported extensions) and it replaces the grey placeholder on the
/// next page load — no code change, no rebuild.
/// </summary>
public static class MediaHelper
{
    private static readonly string[] Extensions = { ".jpg", ".jpeg", ".png", ".webp", ".avif" };

    // Keys come from our own views, but this is defence-in-depth against a key ever
    // being built from user input and escaping the img folder.
    private static bool IsSafeKey(string key) =>
        !string.IsNullOrWhiteSpace(key) &&
        key.All(c => char.IsAsciiLetterOrDigit(c) || c == '-' || c == '_');

    /// <summary>Web path of the image for <paramref name="key"/>, or null when none is present.</summary>
    public static string? MediaUrl(this IHtmlHelper html, string key)
    {
        if (!IsSafeKey(key)) return null;

        var env = html.ViewContext.HttpContext.RequestServices
            .GetRequiredService<IWebHostEnvironment>();
        if (string.IsNullOrEmpty(env.WebRootPath)) return null;

        foreach (var ext in Extensions)
        {
            // Deliberately not cached: newly dropped files should appear on refresh.
            if (File.Exists(Path.Combine(env.WebRootPath, "img", key + ext)))
                return $"/img/{key}{ext}";
        }
        return null;
    }

    /// <summary>
    /// Renders the image for <paramref name="key"/> if present, otherwise the labelled
    /// placeholder block. Both carry the .ph-img class so existing aspect-ratio and
    /// layout CSS applies either way.
    /// </summary>
    public static IHtmlContent Media(this IHtmlHelper html, string key, string label)
    {
        var enc = HtmlEncoder.Default;
        var url = html.MediaUrl(key);

        return new HtmlString(url is null
            ? $"<div class=\"ph-img\" data-label=\"{enc.Encode(label)}\"></div>"
            : $"<img class=\"ph-img\" src=\"{enc.Encode(url)}\" alt=\"{enc.Encode(label)}\" loading=\"lazy\">");
    }

    /// <summary>
    /// Inline style that feeds a background image to CSS via --bg-image, or an empty
    /// string when no file exists (CSS then uses its own fallback colour).
    /// </summary>
    public static IHtmlContent BackgroundStyle(this IHtmlHelper html, string key)
    {
        var url = html.MediaUrl(key);
        return new HtmlString(url is null ? "" : $"--bg-image: url('{HtmlEncoder.Default.Encode(url)}');");
    }
}
