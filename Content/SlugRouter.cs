using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// Decides which URL an item lives at, and sends every other URL that used to show it there.
///
/// An article was addressed as <c>/news/detail/?id=press-line-2500</c> and is now addressed as
/// <c>/news/press-line-2500/</c>. The change is worth making because the query form says nothing
/// about the article - not to a person reading a link in a message, not to a search engine
/// weighing the words in a URL, and not to the site's own analytics, where every article shares
/// one path. It is worth making carefully because every one of those old links still exists in
/// somebody's history.
///
/// Two rules, pulling in opposite directions:
///
///   The old form redirects, permanently. Including the form with no id at all, which used to
///   show the first item and now lands on that item's page rather than on a 404.
///
///   A slug nobody has is a 404. The old page fell back to the first item when the id was
///   unknown - reasonable, because a bad id could only come from a bug in our own markup. A path
///   cannot do that: answering /news/anything-at-all/ with the first article would publish it
///   under an unbounded number of URLs, which is worse for a search engine than a missing page.
///
/// Which sections have item pages is read from the folder layout - a section has them when its
/// <c>detail/index.html</c> carries a detail section - so adding a section needs no change here.
/// </summary>
public sealed class SlugRouter
{
    private readonly ContentStore _store;
    private readonly SectionRenderer _sections;
    private readonly PageComposer _composer;

    public SlugRouter(ContentStore store, SectionRenderer sections, PageComposer composer)
    {
        _store = store;
        _sections = sections;
        _composer = composer;
    }

    /// <summary>
    /// Where this request should be sent instead, or null when it is already where it belongs.
    /// </summary>
    public string? RedirectFor(string urlPath, string? itemId) => RedirectFor(urlPath, itemId, 4);

    private string? RedirectFor(string urlPath, string? itemId, int hops)
    {
        var path = Normalise(urlPath);

        // A path that moved, written down rather than derived: the only way to know that the
        // whole site once sat under /usa/ is that somebody remembers.
        //
        // The answer is followed rather than returned, up to a few hops, so that a path which
        // moved and then moved again costs the visitor one redirect instead of a chain - and so
        // that /usa/news/detail/?id=press-line-2500 lands on the article rather than on the old
        // address of the listing, which no longer carries an id.
        if (hops > 0 && MovedPrefix(path) is { } moved && moved != path)
            return RedirectFor(moved, itemId, hops - 1) ?? moved;

        // /news/press-line-2500 - the browser would have to guess, and a guess that lands on a
        // 404 is the browser's, not ours. Only sent when the slash form actually answers.
        //
        // Followed on, for the same reason the table above is followed: /news/detail?id=X used to
        // work, because the static-file handler added the slash and kept the query. Stopping at
        // /news/detail/ here would spend the redirect on the slash, and the id - which does not
        // survive a redirect - would be gone by the time anything looked at it.
        if (!path.EndsWith('/'))
        {
            var withSlash = path + "/";
            if (!_composer.HasTemplate(withSlash) && Resolve(withSlash) is null) return null;
            return hops > 0 ? RedirectFor(withSlash, itemId, hops - 1) ?? withSlash : withSlash;
        }

        // /news/detail/?id=press-line-2500, and /news/detail/ with nothing at all.
        var cut = path.TrimEnd('/').LastIndexOf('/');
        if (cut < 0 || !path.TrimEnd('/')[(cut + 1)..].Equals("detail", StringComparison.Ordinal))
            return null;

        var section = _composer.DetailSectionFor(path);
        if (section is null) return null;

        var slug = _sections.SlugForId(section, itemId);
        return slug is null ? null : path[..(cut + 1)] + slug + "/";
    }

    /// <summary>
    /// The template that answers a slug path and the id it should be composed with, or null when
    /// nothing claims the slug.
    ///
    /// The template path rather than the requested one is what comes back, because the composer
    /// takes a path and both must agree: it decides how many <c>../</c> the page's images need,
    /// and it is the cache key. The two paths sit at the same depth, which is why an article can
    /// move without a single asset link changing.
    /// </summary>
    public (string TemplatePath, string ItemId)? Resolve(string urlPath)
    {
        var path = Normalise(urlPath);
        if (!path.EndsWith('/')) return null;

        // A page that exists answers for itself; nothing here may shadow it.
        if (_composer.HasTemplate(path)) return null;

        var trimmed = path.TrimEnd('/');
        var cut = trimmed.LastIndexOf('/');
        if (cut <= 0) return null;

        var parent = trimmed[..(cut + 1)];
        var slug = trimmed[(cut + 1)..];

        var template = parent + "detail/";
        var section = _composer.DetailSectionFor(template);
        if (section is null) return null;

        var id = _sections.IdForSlug(section, slug);
        return id is null ? null : (template, id);
    }

    // ---------------------------------------------------------------------------------------

    private JsonObject? Table() => _store.Get("redirects")?["paths"] as JsonObject;

    /// <summary>
    /// The path with its longest moved prefix swapped for where that prefix went, or null.
    ///
    /// Prefixes rather than whole paths, because things move in folders: the site moved out of
    /// <c>/usa/</c> and took ninety-four pages with it, and one line saying so is a table anybody
    /// can read. An entry naming a whole path still works - it is the case where the prefix
    /// happens to be everything.
    /// </summary>
    private string? MovedPrefix(string path)
    {
        var table = Table();
        if (table is null) return null;

        string? bestKey = null;
        foreach (var (key, value) in table)
        {
            if (value is null || !path.StartsWith(key, StringComparison.Ordinal)) continue;
            if (bestKey is null || key.Length > bestKey.Length) bestKey = key;
        }
        return bestKey is null ? null : table[bestKey]!.ToString() + path[bestKey.Length..];
    }

    /// <summary>
    /// One spelling per page. A directory URL ends in a slash and never names its index file:
    /// left alone, <c>/news/detail/index.html</c> would go on composing the first article under
    /// the old address for ever, because nothing above would recognise it as the old address.
    /// </summary>
    private static string Normalise(string urlPath)
    {
        var path = string.IsNullOrEmpty(urlPath) ? "/" : urlPath;
        if (path[0] != '/') path = "/" + path;

        const string index = "index.html";
        if (path.EndsWith(index, StringComparison.OrdinalIgnoreCase))
            path = path[..^index.Length];

        return path;
    }
}
