using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace QlWeb2.Content;

/// <summary>
/// The one place a change made in the editor becomes a change on disk.
///
/// Everything the client edits is a field in <c>wwwroot/_data/*.json</c>, addressed the same way
/// the markup addresses it: <c>news.items.3.image</c> - the document, then the path inside it.
/// Nothing here knows what a page is.
///
/// Three rules the writing follows, each of them because of a way this can go wrong:
///
///   A field that does not exist is not created. An address with no field behind it is a typo in
///   the markup or a stale editor tab; inventing the field would bury the mistake under a value
///   nobody can find again. Two fields are a named exception - see <see cref="SeoLeaf"/> - and
///   naming them is the point: the rule holds for everything it does not name.
///
///   The document is re-read from disk, not taken from the cache. The cached node is what every
///   page is being composed from right now; editing it in place would change the live site before
///   anything was written, and leave it changed if the write then failed.
///
///   Both trees are written. <c>site/</c> is the static copy, and its data files have to stay
///   byte-identical to <c>wwwroot/</c> - a rule this project has already broken once, silently,
///   straight onto the published site. Writing both keeps <c>tools/trees.py</c> true.
/// </summary>
public sealed class ContentEditor
{
    private readonly ContentStore _store;
    private readonly string _webRoot;
    private readonly ILogger<ContentEditor>? _log;

    // Indented, and with the encoder that leaves a curly quote as a curly quote. The default
    // encoder would write ’ for every apostrophe in the file and turn a one-field edit into
    // a diff across the whole document.
    private static readonly JsonSerializerOptions Pretty = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public ContentEditor(ContentStore store, IWebHostEnvironment env,
                         ILogger<ContentEditor>? log = null)
        : this(store, env.WebRootPath ?? "wwwroot", log) { }

    /// <summary>The same editor over a directory, for tests.</summary>
    public ContentEditor(ContentStore store, string webRoot, ILogger<ContentEditor>? log = null)
    {
        _store = store;
        _webRoot = webRoot;
        _log = log;
    }

    public record Change(string Address, string Value);

    /// <summary>
    /// What the save did. <paramref name="Previous"/> holds each touched document as it was
    /// before, keyed by name - the caller records those as revisions, which is the whole of what
    /// "undo" will be built from.
    /// </summary>
    /// <param name="Renamed">
    /// Placeholder id → the slug it became, for the items that were just given a title. The
    /// screen that asked for the save is looking at the old address; this is how it learns where
    /// the page went.
    /// </param>
    public record Result(int Applied, List<string> Rejected, Dictionary<string, string?> Previous,
                         Dictionary<string, string>? Renamed = null);

    /// <summary>
    /// Applies a batch of changes and writes every document one of them touched.
    ///
    /// A batch rather than one call per field: a document is rewritten whole, so saving six fields
    /// one at a time would rewrite the same file six times and leave five chances to stop halfway.
    /// </summary>
    public Result Apply(IEnumerable<Change> changes)
    {
        var rejected = new List<string>();
        var renamed = new Dictionary<string, string>(StringComparer.Ordinal);
        var touched = new Dictionary<string, JsonNode>(StringComparer.OrdinalIgnoreCase);

        // Loaded is not the same as changed. A batch whose only address is a typo would otherwise
        // rewrite the file it names - same words, re-serialised, and a diff across every line of
        // a document nobody edited.
        var changed = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var applied = 0;

        foreach (var change in changes)
        {
            var cut = change.Address.IndexOf('.');
            if (cut <= 0) { rejected.Add(change.Address); continue; }

            var name = change.Address[..cut];
            var path = change.Address[(cut + 1)..];

            if (!touched.TryGetValue(name, out var doc))
            {
                var raw = _store.RawJson(name);
                if (raw is null) { rejected.Add(change.Address); continue; }
                try { doc = JsonNode.Parse(raw)!; }
                catch (JsonException) { rejected.Add(change.Address); continue; }
                touched[name] = doc;
            }

            // A slug is not text like the rest: it becomes a URL the moment it is saved. Checked
            // here rather than in the screen, because this is the only door.
            if (path.EndsWith(".slug", StringComparison.Ordinal) && !SlugIsFree(doc, path, change.Value))
            {
                rejected.Add(change.Address);
                continue;
            }

            // Same reason, and the same door. The editor draws these as a list to choose from,
            // but the list is drawn by a script on a screen, and a screen is not a control.
            if (Allowed(doc, name, path) is { } only && !only.Contains(change.Value, StringComparer.Ordinal))
            {
                rejected.Add(change.Address);
                continue;
            }

            // And again for an article's date. The screen offers a date picker, which can only
            // produce the right shape - but the screen is not the door.
            if (IsArticleDate(name, path) && !IsDay(change.Value))
            {
                rejected.Add(change.Address);
                continue;
            }

            // A factory's place and type: may be written onto a site that predates them, and the
            // place carries the site's coordinates with it. Allowed() has already held the value
            // to its list, so what arrives here is a name the table knows.
            if (FactoryLeaf(name, path) is { } fleaf)
            {
                if (!Factory(doc, path, fleaf, change.Value)) { rejected.Add(change.Address); continue; }
                applied++;
                changed.Add(name);
                continue;
            }

            // A document's own PDF (08/10/2026): may be written onto a document that never had
            // one; emptied, the field goes and the document falls back to _docs/<id>.pdf.
            if (IsDocumentFile(name, path))
            {
                if (!DocumentFiles.IsName(change.Value) || !DocumentFile(doc, path, change.Value))
                { rejected.Add(change.Address); continue; }
                applied++;
                changed.Add(name);
                continue;
            }

            // A project's cover (09/10/2026): two albums came in from the import without an
            // "image" field, so the client's picture for them had nowhere to land.
            if (IsAlbumCover(name, path))
            {
                if (!AlbumCover(doc, path, change.Value)) { rejected.Add(change.Address); continue; }
                applied++;
                changed.Add(name);
                continue;
            }

            // The two names that may be created where none exists, and removed when emptied.
            // Handled before TrySet because TrySet is the rule they are the exception to.
            if (SeoLeaf(path) is { } leaf)
            {
                if (!Seo(doc, path, leaf, change.Value, out var wrote)) { rejected.Add(change.Address); continue; }
                applied++;
                if (wrote) changed.Add(name);
                continue;
            }

            if (ContentPath.TrySet(doc, path, change.Value))
            {
                applied++;
                changed.Add(name);
                Named(doc, path, change.Value, renamed);
            }
            else rejected.Add(change.Address);
        }

        var previous = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var (name, doc) in touched.Where(t => changed.Contains(t.Key)))
        {
            var json = Text(doc);
            previous[name] = _store.Save(name, json);
            Mirror(name, json);
        }

        if (rejected.Count > 0)
            _log?.LogWarning("Bỏ qua {Count} địa chỉ không có thật: {Addr}",
                rejected.Count, string.Join(", ", rejected.Take(5)));

        return new Result(applied, rejected, previous, renamed);
    }

    /// <summary>The fields the ten kinds use to name an item, in the order the list screen reads them.</summary>
    private static readonly string[] TitleFields = ["title", "name", "label", "caption"];

    /// <summary>
    /// The two fields the editor may create, and the only exception to the rule at the top of
    /// this file.
    ///
    /// These are absences with meaning. Almost every item leaves them out, and the composer then
    /// derives the page's title from the item's own words - which is right, and is why writing
    /// <c>"seoTitle": ""</c> onto three hundred items so the editor would have something to
    /// address would be three hundred lines saying nothing. The exception stays narrow on
    /// purpose: these two names only, and only where the object that would hold them is already
    /// there, so a typo in an address still cannot invent a field.
    ///
    /// Emptied means removed, not <c>""</c>. Same reason <see cref="Op.Show"/> removes
    /// <c>visible</c> rather than writing true: an override nobody wrote and an override somebody
    /// cleared have to leave the file in the same state, or the content fills up with empty
    /// strings recording a moment of indecision.
    /// </summary>
    private static string? SeoLeaf(string path)
    {
        var leaf = path[(path.LastIndexOf('.') + 1)..];
        return leaf is "seoTitle" or "seoDescription" && leaf.Length < path.Length ? leaf : null;
    }

    /// <param name="wrote">
    /// False when the document already said exactly this. The save is still a success - the
    /// client asked for a state the file is in - but rewriting the file would put a diff on it
    /// for nothing, which is the same trap the <c>changed</c> set exists to avoid.
    /// </param>
    private static bool Seo(JsonNode doc, string path, string leaf, string value, out bool wrote)
    {
        wrote = false;
        var parent = path[..(path.Length - leaf.Length - 1)];
        if (Walk(doc, parent.Split('.', StringSplitOptions.RemoveEmptyEntries)) is not JsonObject item)
            return false;

        var had = item.TryGetPropertyValue(leaf, out var v) ? v?.ToString() ?? "" : "";
        if (had == value) return true;

        if (value.Length == 0) item.Remove(leaf);
        else item[leaf] = JsonValue.Create(value);
        wrote = true;
        return true;
    }

    /// <summary>
    /// The only values an address may hold, or null when it may hold anything.
    ///
    /// Three fields of a finish are not sentences, they are one of a set: the gloss and the
    /// exposure have to match the filter above the listing exactly, and the family has to match a
    /// row in familySpecs. A value off the list does not fail - it disappears out of a filter, or
    /// turns three rows of the specification table into em dashes, quietly and much later.
    ///
    /// The set is read out of the same document, so it cannot drift away from the thing that has
    /// to match it. Kept in step with SectionRenderer.PickAddress, which is what puts these
    /// fields on the screen as a list in the first place.
    /// </summary>
    private static List<string>? Allowed(JsonNode doc, string name, string path)
    {
        if (FactoryLeaf(name, path) is { } leaf)
            return leaf switch { "place" => Places.Names, "kind" => FactoryKinds, _ => null };
        if (!name.Equals("colors", StringComparison.OrdinalIgnoreCase)) return null;
        if (!ItemField.IsMatch(path)) return null;

        var field = path[(path.LastIndexOf('.') + 1)..];
        if (field is "gloss" or "use") return Filter(doc, field);
        if (field is "family")
            return (doc["familySpecs"] as JsonObject)?.Select(p => p.Key).ToList();
        return null;
    }

    /// <summary>
    /// <c>documents.categories.N.items.M.file</c>, or an About chapter's
    /// <c>about.chapters.N.file</c> (the company profile on Capability, 08/10/2026) - and only those.
    /// </summary>
    public static bool IsDocumentFile(string name, string path)
        => (name.Equals("documents", StringComparison.OrdinalIgnoreCase) && DocFileField.IsMatch(path))
        || (name.Equals("about", StringComparison.OrdinalIgnoreCase) && ChapterFileField.IsMatch(path));

    private static readonly Regex ChapterFileField =
        new(@"^chapters\.\d+\.file$", RegexOptions.Compiled);

    private static readonly Regex DocFileField =
        new(@"^categories\.\d+\.items\.\d+\.file$", RegexOptions.Compiled);

    private static bool DocumentFile(JsonNode doc, string path, string value)
    {
        var parent = path[..path.LastIndexOf('.')];
        if (Walk(doc, parent.Split('.')) is not JsonObject item) return false;
        if (value.Length == 0) item.Remove("file");
        else item["file"] = JsonValue.Create(value);
        return true;
    }

    /// <summary><c>projects.albums.N.image</c> - an album's cover, which may be written onto an album that never had one.</summary>
    public static bool IsAlbumCover(string name, string path)
        => name.Equals("projects", StringComparison.OrdinalIgnoreCase) && AlbumCoverField.IsMatch(path);

    private static readonly Regex AlbumCoverField = new(@"^albums\.\d+\.image$", RegexOptions.Compiled);

    /// <summary>Writes the cover. Empty removes it, so the card goes back to the placeholder. One file name, no folder.</summary>
    private static bool AlbumCover(JsonNode doc, string path, string value)
    {
        var parent = path[..path.LastIndexOf('.')];
        if (Walk(doc, parent.Split('.')) is not JsonObject album) return false;
        if (value.Length == 0) { album.Remove("image"); return true; }
        if (Path.GetFileName(value) != value || value.StartsWith('.') || value.Contains('\\')) return false;
        album["image"] = JsonValue.Create(value);
        return true;
    }

    /// <summary>What a point on the factory map can be. Empty or absent reads as the first.</summary>
    public static readonly List<string> FactoryKinds = ["Factory", "Warehouse"];

    /// <summary>
    /// <c>place</c>, <c>kind</c> or one of the three photos when the address is one of those on
    /// a factory site, else null.
    ///
    /// The second exception to "an address must already exist", after the two SEO fields, and
    /// for the same kind of reason: the five sites were written before any of these fields did,
    /// and writing them into the live file by hand would mean editing the client's content on the
    /// server. Narrow on purpose - these five names, on factories.sites.N only.
    ///
    /// The photos came on 06/10/2026: the client's director asked why the factories had no
    /// pictures. The cards and the pop-up drew a picture of a generic plant on a canvas - sample
    /// art from the demo - and there was nowhere to put a real one.
    /// </summary>
    public static string? FactoryLeaf(string name, string path)
    {
        if (!name.Equals("factories", StringComparison.OrdinalIgnoreCase)) return null;
        var m = FactoryField.Match(path);
        return m.Success ? m.Groups[1].Value : null;
    }

    private static readonly Regex FactoryField =
        new(@"^sites\.\d+\.(place|kind|photo|photo2|photo3)$", RegexOptions.Compiled);

    /// <summary>
    /// Writes a site's place or kind. A place also moves the pin: the coordinates are looked up
    /// here, on the server, so the numbers the canvas draws from are never typed by anybody.
    /// </summary>
    private static bool Factory(JsonNode doc, string path, string leaf, string value)
    {
        var parent = path[..(path.Length - leaf.Length - 1)];
        if (Walk(doc, parent.Split('.', StringSplitOptions.RemoveEmptyEntries)) is not JsonObject site)
            return false;

        if (leaf.StartsWith("photo", StringComparison.Ordinal))
        {
            // "No picture" removes the field, so the map goes back to drawing one. A name is a
            // file in the picture library - one name, no folder - never a path somewhere else.
            if (value.Length == 0) { site.Remove(leaf); return true; }
            if (Path.GetFileName(value) != value || value.StartsWith('.') || value.Contains('\\'))
                return false;
        }

        if (leaf == "place")
        {
            if (Places.Find(value) is not { } at) return false;
            site["lat"] = JsonValue.Create(at.Lat);
            site["lon"] = JsonValue.Create(at.Lon);
        }
        site[leaf] = JsonValue.Create(value);
        return true;
    }

    private static readonly Regex ItemField =
        new(@"^items\.\d+\.(gloss|use|family)$", RegexOptions.Compiled);

    /// <summary>
    /// An article's date: <c>news.items.N.date</c>, and only that.
    ///
    /// Narrow on purpose. contact.json has a field called "date" too - it is the TYPE of a form
    /// field, "date" as in a date picker - and a rule matched on the key's name alone would start
    /// refusing to let that be changed to anything but a day.
    /// </summary>
    private static bool IsArticleDate(string name, string path)
        => name.Equals("news", StringComparison.OrdinalIgnoreCase) && ArticleDate.IsMatch(path);

    private static readonly Regex ArticleDate = new(@"^items\.\d+\.date$", RegexOptions.Compiled);

    /// <summary>
    /// A day that exists, written <c>YYYY-MM-DD</c> - or nothing, meaning "not dated yet".
    ///
    /// The news list sorts on this string, as a string. A date in any other shape does not fail:
    /// "19/08/2026" sorts after every 2026 date there is, and the article sits in the wrong place,
    /// quietly, for as long as nobody looks. DateOnly rather than DateTime, because DateTime's
    /// parser is forgiving in exactly the ways that matter here - it reads "2026-8-19", and it
    /// lets a trailing space through.
    /// </summary>
    private static bool IsDay(string value)
        => value.Length == 0
           || DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                                     DateTimeStyles.None, out _);

    private static List<string>? Filter(JsonNode doc, string id)
        => ((doc["filters"] as JsonArray)?.OfType<JsonNode>()
                .FirstOrDefault(f => f["id"]?.ToString() == id)?["options"] as JsonArray)
           ?.OfType<JsonNode>().Select(o => o.ToString()).ToList();

    private static readonly System.Text.RegularExpressions.Regex Placeholder =
        new("^new-[0-9a-f]{6}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    /// <summary>
    /// Turns the placeholder id of a brand-new item into a slug made from the title it was just
    /// given, and records the rename.
    ///
    /// An id is a URL from the moment the item is saved. "Add an item" cannot know the title yet,
    /// so it writes <c>new-3f9a2c</c>; without this, the first article a client writes would live
    /// at <c>/news/new-3f9a2c/</c> for as long as the site does. Renaming happens once, on the
    /// save that first names the item, and never again: after that the address is public, people
    /// have it, and moving it is a decision rather than a side effect of fixing a typo.
    ///
    /// No redirect is written, deliberately. Nothing has ever linked to a placeholder - it was
    /// minted minutes ago on a screen only the owner can reach - and a redirect table filling up
    /// with <c>new-xxxxxx</c> lines would be noise in the one file that has to stay readable.
    /// </summary>
    private static void Named(JsonNode doc, string path, string value, Dictionary<string, string> renamed)
    {
        var steps = path.Split('.');
        if (steps.Length < 2 || !TitleFields.Contains(steps[^1], StringComparer.OrdinalIgnoreCase)) return;
        if (Walk(doc, steps[..^1]) is not JsonObject item) return;
        if (item["id"]?.ToString() is not { } was || !Placeholder.IsMatch(was)) return;

        var stem = Slugify(value);
        if (stem.Length == 0) return;

        // A title the client has used before is not an error and must not cost them the save;
        // it costs the item a suffix instead, which is what every publishing tool does.
        var idPath = string.Join('.', steps[..^1]) + ".id";
        var slug = stem;
        for (var n = 2; n < 100 && !SlugIsFree(doc, idPath, slug); n++) slug = $"{stem}-{n}";
        if (!SlugIsFree(doc, idPath, slug)) return;

        item["id"] = slug;
        renamed[was] = slug;
    }

    /// <summary>
    /// A title written the way a path segment has to be written.
    ///
    /// The client writes Vietnamese, so the marks come off first: decompose, drop every combining
    /// mark, and translate đ by hand - it is a letter in its own right, not a d wearing an
    /// accent, so decomposition leaves it untouched. What survives is what
    /// <c>tools/slugs.py</c> checks for: lowercase letters, digits, single hyphens between them.
    /// </summary>
    public static string Slugify(string text)
    {
        var flat = text.Replace('Đ', 'D').Replace('đ', 'd').Normalize(NormalizationForm.FormD);

        var sb = new StringBuilder(flat.Length);
        foreach (var ch in flat)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsAsciiLetterOrDigit(ch)) sb.Append(char.ToLowerInvariant(ch));
            else if (sb.Length > 0 && sb[^1] != '-') sb.Append('-');
        }

        // A path segment, not a sentence. Sixty characters is longer than every slug the site
        // already has and short enough to read in a browser's address bar.
        var slug = sb.ToString().Trim('-');
        return slug.Length > 60 ? slug[..60].Trim('-') : slug;
    }

    /// <summary>What a list screen can do to a collection.</summary>
    /// <remarks>
    /// <see cref="Append"/> is for the lists INSIDE an item - an article's paragraphs, its tags -
    /// and it is not <see cref="Add"/> with a different position. Add puts the new entry at the
    /// TOP and builds it from the shape of the first one, which is right for a new article at the
    /// head of the news and wrong twice over for a paragraph: a new paragraph belongs at the end,
    /// and an empty body has no first paragraph to copy, so Add would fall back to an object
    /// with an id and drop it among the strings.
    /// </remarks>
    public enum Op { Add, Remove, Up, Down, Show, Hide, Append }

    /// <summary>
    /// Adds, removes, reorders or hides an item.
    ///
    /// Order is the array's own order rather than a sort key on every item: the file already has
    /// an order, it is the one the page shows, and a second one written beside it is a second
    /// thing to keep true. Moving an item means moving it.
    ///
    /// <paramref name="address"/> names the collection for <see cref="Op.Add"/>
    /// (<c>news.items</c>) and the item for everything else (<c>news.items.3</c>).
    /// </summary>
    /// <param name="template">For <see cref="Op.Append"/> on a list of objects: the new entry.
    ///   Null means a list of strings. Comes from <see cref="ItemLists"/>, never from a request.</param>
    /// <param name="create">For <see cref="Op.Append"/>: create the list when the item has none.
    ///   An item written before the list existed is the case - a project before projects had a
    ///   body. Only the list's own name is created, and only on an item that is there.</param>
    public Result Structure(string address, Op op, JsonObject? template = null, bool create = false)
    {
        var cut = address.IndexOf('.');
        if (cut <= 0) return Refused(address);

        var name = address[..cut];
        var raw = _store.RawJson(name);
        if (raw is null) return Refused(address);

        JsonNode doc;
        try { doc = JsonNode.Parse(raw)!; }
        catch (JsonException) { return Refused(address); }

        var path = address[(cut + 1)..].Split('.');
        // Add and Append name the list; everything else names one entry in it.
        var wantsItem = op is not (Op.Add or Op.Append);

        // The array, and - for everything but Add - which of its items.
        var arrayPath = wantsItem ? path[..^1] : path;
        if (op == Op.Append && create && arrayPath.Length > 1
            && Walk(doc, arrayPath[..^1]) is JsonObject holder && !holder.ContainsKey(arrayPath[^1]))
            holder[arrayPath[^1]] = new JsonArray();
        if (Walk(doc, arrayPath) is not JsonArray list) return Refused(address);

        var at = -1;
        if (wantsItem && (!int.TryParse(path[^1], out at) || at < 0 || at >= list.Count))
            return Refused(address);

        switch (op)
        {
            case Op.Add:
                // The new item takes its shape from the ones already there, blanked. A template
                // written here would be a second description of a document's fields, and the
                // first thing to go stale when one of them gains a field.
                list.Insert(0, Blank(list.FirstOrDefault()));
                break;

            case Op.Append when template is not null:
                // Objects only, every entry checked, for the same reason as strings below: a
                // photo object dropped into a list of strings, or a string into a list of photos,
                // is an entry every page that reads the list draws wrongly.
                if (list.Any(e => e is not JsonObject)) return Refused(address);
                var made = (JsonObject)template.DeepClone();
                if (made.ContainsKey("id")) made["id"] = NewId();
                list.Add(made);
                break;

            case Op.Append:
                // Strings only, and EVERY entry checked, not the first. The two checks - this one
                // and ItemLists' table - look redundant and are not. This one refuses a list of
                // objects: news.items is the list of articles, and a bare "" among them is a card
                // that draws nothing on every page that reads it. But an EMPTY list has no entries
                // to check, so it passes here whatever it holds; what authorises appending to an
                // empty body is that "news.items.N.body" is in ItemLists, not its contents.
                if (list.Any(e => e is not JsonValue v || v.GetValueKind() != JsonValueKind.String))
                    return Refused(address);
                list.Add(JsonValue.Create(""));
                break;

            case Op.Remove:
                list.RemoveAt(at);
                break;

            case Op.Up when at > 0:
            case Op.Down when at < list.Count - 1:
            {
                var to = op == Op.Up ? at - 1 : at + 1;
                var moved = list[at]!.DeepClone();
                list.RemoveAt(at);
                list.Insert(to, moved);
                break;
            }

            case Op.Show:
            case Op.Hide:
                if (list[at] is not JsonObject item) return Refused(address);
                // Written by this screen rather than by an address, and showing an item removes
                // it again rather than writing true. Absent already means shown, which is what all
                // but a handful of items say by saying nothing; leaving "visible": true behind on
                // everything anyone ever hid for an afternoon would fill the files with a field
                // that carries no information.
                if (op == Op.Hide) item["visible"] = false;
                else item.Remove("visible");
                break;

            default:
                // Up on the first item, Down on the last: nothing to do, and not a failure.
                return new Result(0, [], []);
        }

        var json = Text(doc);
        var previous = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            [name] = _store.Save(name, json),
        };
        Mirror(name, json);
        return new Result(1, [], previous);
    }

    /// <summary>
    /// Every place in the content that mentions this text, outside the item it belongs to.
    ///
    /// Asked before an item is deleted. An id travels: a home-page card points at an article by
    /// it, a footer link at a product family. Deleting the item leaves those pointing at a 404,
    /// and the person doing the deleting is the only one who can say whether that matters.
    /// </summary>
    public List<string> Mentions(string needle, string exceptDocument)
    {
        var found = new List<string>();
        if (needle.Length < 3) return found;

        foreach (var name in _store.Names)
        {
            var raw = _store.RawJson(name);
            if (raw is null) continue;

            var count = 0;
            for (var i = raw.IndexOf(needle, StringComparison.Ordinal); i >= 0;
                 i = raw.IndexOf(needle, i + 1, StringComparison.Ordinal))
                count++;

            // In its own document the item mentions itself once, as its id; that one is not a
            // reference to it from somewhere else.
            if (name.Equals(exceptDocument, StringComparison.OrdinalIgnoreCase)) count--;
            if (count > 0) found.Add($"{name}.json ({count})");
        }
        return found;
    }

    // ---------------------------------------------------------------------------------------

    /// <summary>
    /// A document as it should sit on disk.
    ///
    /// The indented writer ends its lines with <c>Environment.NewLine</c>, which on this machine
    /// is CRLF - so saving one field rewrote all 141 lines of the file. The content files are LF,
    /// the two trees are compared byte for byte, and a diff of the whole document hides the one
    /// line that actually changed.
    /// </summary>
    private static string Text(JsonNode doc)
        => doc.ToJsonString(Pretty).Replace("\r\n", "\n") + "\n";

    private static Result Refused(string address) => new(0, [address], []);

    /// <summary>
    /// Whether this slug may be written: url-shaped, not the word the detail templates use, and
    /// not already taken by anything it shares a list of pages with.
    ///
    /// The shape rule is the one that would otherwise reach production as a broken link: a space
    /// or a capital in a path segment is legal in a URL and wrong in every other way. "detail" is
    /// refused because <c>/news/detail/</c> is the old address of the listing and still redirects;
    /// an item that claimed it would be unreachable. And a duplicate would quietly take the other
    /// item's page away - the flattened Documents list is where that is easiest to do by accident,
    /// since two files in different categories never look like neighbours.
    /// </summary>
    private static bool SlugIsFree(JsonNode doc, string path, string slug)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(slug, "^[a-z0-9]+(-[a-z0-9]+)*$")) return false;
        if (slug == "detail") return false;

        var steps = path.Split('.');
        if (steps.Length < 2) return false;

        var arrayPath = steps[..^2];
        if (Walk(doc, arrayPath) is not JsonArray siblings) return true;
        var mine = int.TryParse(steps[^2], out var i) ? i : -1;

        foreach (var (list, skip) in Flattened(doc, arrayPath, siblings, mine))
            for (var n = 0; n < list.Count; n++)
            {
                if (n == skip || list[n] is not JsonObject o) continue;
                var theirs = o["slug"]?.ToString() ?? o["id"]?.ToString();
                if (theirs == slug) return false;
            }
        return true;
    }

    /// <summary>
    /// Every array this item competes with for an address.
    ///
    /// Usually one: its own. The exception is a list of lists - <c>documents.categories[].items</c>
    /// - which the site flattens into one page per document regardless of category. Two files
    /// filed under different headings never look like neighbours on the screen, and that is
    /// exactly why two of them can be given the same name and one of them quietly loses its page.
    /// </summary>
    private static IEnumerable<(JsonArray List, int Skip)> Flattened(
        JsonNode doc, string[] arrayPath, JsonArray own, int mine)
    {
        yield return (own, mine);

        // ...categories.3.items -> the key is "items" and the grandparent is "categories".
        if (arrayPath.Length < 3 || !int.TryParse(arrayPath[^2], out var owner)) yield break;
        if (Walk(doc, arrayPath[..^2]) is not JsonArray cousins) yield break;

        var key = arrayPath[^1];
        for (var c = 0; c < cousins.Count; c++)
            if (c != owner && cousins[c]?[key] is JsonArray also)
                yield return (also, -1);
    }

    private static JsonNode? Walk(JsonNode? node, string[] path)
    {
        foreach (var step in path)
        {
            if (node is JsonArray arr)
                node = int.TryParse(step, out var i) && i >= 0 && i < arr.Count ? arr[i] : null;
            else if (node is JsonObject obj)
                node = obj.TryGetPropertyValue(step, out var next) ? next : null;
            else return null;
        }
        return node;
    }

    /// <summary>
    /// An item shaped like its neighbours with nothing written in it.
    ///
    /// Strings empty, numbers zero, arrays empty, nested objects blanked the same way. The one
    /// exception is <c>id</c>, which gets a placeholder rather than an empty string: an item with
    /// no id has no address and no page, and the list screen would show a row nobody can open.
    /// </summary>
    private static JsonNode Blank(JsonNode? like)
    {
        if (like is not JsonObject shape) return new JsonObject { ["id"] = NewId() };

        var made = new JsonObject();
        foreach (var (key, value) in shape)
        {
            made[key] = value switch
            {
                JsonArray => new JsonArray(),
                JsonObject o => Blank(o),
                JsonValue v when v.TryGetValue<bool>(out _) => JsonValue.Create(false),
                JsonValue v when v.TryGetValue<double>(out _) => JsonValue.Create(0),
                _ => JsonValue.Create(""),
            };
        }
        if (made.ContainsKey("id")) made["id"] = NewId();
        return made;
    }

    private static string NewId() => "new-" + Guid.NewGuid().ToString("N")[..6];

    /// <summary>
    /// Writes a whole document, formatted and mirrored the way every other save is.
    ///
    /// For the callers that build a document rather than address a field in one - the redirect
    /// table, which gains a line when a slug is renamed.
    /// </summary>
    public string? SaveDocument(string name, JsonNode doc)
    {
        var json = Text(doc);
        var previous = _store.Save(name, json);
        Mirror(name, json);
        return previous;
    }

    /// <summary>
    /// Copies a saved document into the static tree.
    ///
    /// The static copy's pages are templates that read these same files, so the data is the only
    /// part of it that has to follow an edit - the fanned-out HTML does not change when a word
    /// does. Failing to mirror is logged rather than thrown: the site the server serves is
    /// already correct, and refusing the save would be a worse answer than a stale copy.
    /// </summary>
    public void MirrorTo(string name, string json) => Mirror(name, json);

    private void Mirror(string name, string json)
    {
        try
        {
            var site = Path.Combine(Path.GetDirectoryName(_webRoot)!, "site", "_data", name + ".json");
            if (File.Exists(site)) File.WriteAllText(site, json, new System.Text.UTF8Encoding(false));
        }
        catch (Exception e)
        {
            _log?.LogWarning(e, "Không chép được {Name}.json sang site/", name);
        }
    }
}
