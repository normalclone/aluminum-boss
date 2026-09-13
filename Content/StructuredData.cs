using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// The site described in the vocabulary a machine already reads: schema.org, as JSON-LD.
///
/// This is not decoration on top of the words. The words are what a person reads and what a
/// language model reads; this is what a search engine uses to decide that "Böss Group" is one
/// company with five factories, that an article has an author and a date, and that a product
/// family belongs to a brand. It is written from the same content files as the page, so the two
/// cannot say different things.
///
/// Deliberately small. Every claim here is one the site actually makes somewhere a reader can
/// see; a rating or a price nobody published would be a lie in a format built for machines to
/// believe.
/// </summary>
public sealed class StructuredData
{
    private static readonly JsonSerializerOptions Compact = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly ContentStore _store;
    public StructuredData(ContentStore store) => _store = store;

    /// <summary>
    /// The block for a page, or an empty string when there is nothing worth saying about it.
    ///
    /// <paramref name="section"/> is the detail section the page carries, if any;
    /// <paramref name="item"/> the item it is showing.
    /// </summary>
    public string For(string urlPath, string origin, string? section, JsonNode? item)
    {
        var graph = new JsonArray();

        // The home page carries the company itself. Once, on one page: repeating an Organization
        // on all fifteen is how a site ends up claiming to be fifteen companies.
        if (urlPath == "/") graph.Add(Organisation(origin));
        foreach (var factory in Factories(origin)) graph.Add(factory);

        if (item is not null && section is not null)
        {
            graph.Add(Breadcrumbs(urlPath, origin, item));
            var thing = Thing(section, item, origin, urlPath);
            if (thing is not null) graph.Add(thing);
        }

        if (graph.Count == 0) return string.Empty;

        var doc = new JsonObject
        {
            ["@context"] = "https://schema.org",
            ["@graph"] = graph,
        };
        return doc.ToJsonString(Compact);
    }

    // ---------------------------------------------------------------------------------------

    private JsonObject Organisation(string origin)
    {
        var site = _store.Get("site");
        var about = _store.Get("about");

        var node = new JsonObject
        {
            ["@type"] = "Organization",
            ["@id"] = origin + "/#organisation",
            ["name"] = Str(site, "wordmark", "lead") + Str(site, "wordmark", "tail"),
            ["url"] = origin + "/",
            ["description"] = Str(about, "lede"),
        };

        var contact = _store.Get("contact");
        if (Arr(contact, "offices").FirstOrDefault() is { } office)
        {
            node["email"] = Str(office, "email");
            node["telephone"] = Str(office, "phone");
        }
        return node;
    }

    /// <summary>
    /// The five plants, each as a place with coordinates.
    ///
    /// They are on every page rather than only the home page because they are what the company
    /// IS - and the lat/lon are already in the file, drawn onto a map. A machine that can read
    /// the map's data is a machine that can answer "where do they extrude".
    /// </summary>
    private IEnumerable<JsonObject> Factories(string origin)
    {
        foreach (var site in Arr(_store.Get("factories"), "sites"))
        {
            var node = new JsonObject
            {
                ["@type"] = "LocalBusiness",
                ["@id"] = origin + "/#factory-" + Str(site, "id"),
                ["name"] = Str(site, "name"),
                ["description"] = Str(site, "desc"),
                ["parentOrganization"] = new JsonObject { ["@id"] = origin + "/#organisation" },
            };

            if (double.TryParse(Str(site, "lat"), out var lat)
                && double.TryParse(Str(site, "lon"), out var lon))
            {
                node["geo"] = new JsonObject
                {
                    ["@type"] = "GeoCoordinates",
                    ["latitude"] = lat,
                    ["longitude"] = lon,
                };
            }
            yield return node;
        }
    }

    private static JsonObject Breadcrumbs(string urlPath, string origin, JsonNode item)
    {
        var parts = urlPath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries);
        var list = new JsonArray
        {
            Crumb(1, "Home", origin + "/"),
        };
        if (parts.Length > 0)
            list.Add(Crumb(2, Title(parts[0]), origin + "/" + parts[0] + "/"));
        if (parts.Length > 1)
            list.Add(Crumb(3, Name(item), origin + urlPath));

        return new JsonObject { ["@type"] = "BreadcrumbList", ["itemListElement"] = list };
    }

    private static JsonObject Crumb(int position, string name, string url) => new()
    {
        ["@type"] = "ListItem",
        ["position"] = position,
        ["name"] = name,
        ["item"] = url,
    };

    private JsonObject? Thing(string section, JsonNode item, string origin, string urlPath)
    {
        var url = origin + urlPath;
        var image = Str(item, "image") is { Length: > 0 } f ? origin + "/_media/" + f : null;

        JsonObject node = section switch
        {
            "news-detail" => new JsonObject
            {
                ["@type"] = "NewsArticle",
                ["headline"] = Str(item, "title"),
                ["datePublished"] = Str(item, "date"),
                ["author"] = new JsonObject
                {
                    ["@type"] = "Organization",
                    ["name"] = Str(item, "author"),
                },
                ["description"] = Str(item, "excerpt"),
            },
            "products-detail" => new JsonObject
            {
                ["@type"] = "ProductGroup",
                ["name"] = Str(item, "name"),
                ["description"] = Str(item, "blurb"),
                ["brand"] = new JsonObject { ["@id"] = origin + "/#organisation" },
            },
            "colors-detail" => new JsonObject
            {
                ["@type"] = "Product",
                ["name"] = Str(item, "name"),
                ["sku"] = Str(item, "code"),
                ["description"] = Str(item, "note"),
                ["brand"] = new JsonObject { ["@id"] = origin + "/#organisation" },
            },
            "documents-detail" => new JsonObject
            {
                ["@type"] = "DigitalDocument",
                ["name"] = Str(item, "title"),
                ["description"] = Str(item, "blurb"),
                ["inLanguage"] = Str(item, "lang"),
            },
            "projects-detail" => new JsonObject
            {
                ["@type"] = "CreativeWork",
                ["name"] = Str(item, "title"),
                ["description"] = Str(item, "scope"),
                ["dateCreated"] = Str(item, "year"),
                ["locationCreated"] = new JsonObject
                {
                    ["@type"] = "Place",
                    ["name"] = Str(item, "location"),
                },
            },
            _ => null!,
        };
        if (node is null) return null;

        node["@id"] = url + "#item";
        node["url"] = url;
        if (image is not null) node["image"] = image;
        node["publisher"] = new JsonObject { ["@id"] = origin + "/#organisation" };
        return node;
    }

    private static string Title(string segment)
        => string.Join(' ', segment.Split('-').Select(w => char.ToUpperInvariant(w[0]) + w[1..]));

    private static string Name(JsonNode item)
        => Str(item, "title") is { Length: > 0 } t ? t : Str(item, "name");

    private static string Str(JsonNode? node, string key)
        => node is JsonObject o && o.TryGetPropertyValue(key, out var v)
            ? v?.ToString() ?? string.Empty
            : string.Empty;

    private static string Str(JsonNode? node, string key, string then)
        => Str(node is JsonObject o && o.TryGetPropertyValue(key, out var v) ? v : null, then);

    private static List<JsonNode> Arr(JsonNode? node, string key)
        => (node?[key] as JsonArray)?.OfType<JsonNode>().ToList() ?? [];
}
