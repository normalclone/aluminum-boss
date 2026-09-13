using System.Text.RegularExpressions;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// The home page is a shelf, not a second copy of the site.
///
/// Four bands - New, Products, Colors, Recent projects - draw the library items their shelf
/// document points at. A shelf holds ids and nothing else, so there is exactly one of every
/// headline and every picture, and the home page cannot say something the listing page does not.
///
/// Three of the rules below are the ones a client will actually lean on and none of them fails
/// loudly when broken. An empty shelf that drew an empty band would take three bands off the
/// home page of every install that has not been given shelf files; a shelf whose order was
/// ignored would look like the screen simply not working; an id left pointing at a deleted
/// article would draw a card with no words in it.
/// </summary>
public class ShelfTests : IDisposable
{
    private readonly string _root;
    private readonly SectionRenderer _sections;

    public ShelfTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abshelf-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));

        Write("products", """
        {
          "categories": [
            { "id": "profile",   "name": "Profile",   "tagline": "One" },
            { "id": "facade",    "name": "Facade",    "tagline": "Two" },
            { "id": "furniture", "name": "Furniture", "tagline": "Three" }
          ]
        }
        """);

        _sections = new SectionRenderer(new ContentStore(Path.Combine(_root, "_data")));
    }

    private void Write(string name, string json)
        => File.WriteAllText(Path.Combine(_root, "_data", name + ".json"), json);

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    /// <summary>The families the band drew, in the order it drew them.</summary>
    private List<string> Drawn()
        => Regex.Matches(_sections.Render("home-products", "") ?? string.Empty,
                         @"href=""products/([^/""]+)/""")
                .Select(m => m.Groups[1].Value).ToList();

    [Fact]
    public void No_shelf_file_at_all_draws_the_whole_library()
    {
        // The band's own rule before shelves existed, kept as what it falls back to. Without it,
        // deploying this change to a site that has no shelf files empties three bands.
        Assert.Equal(["profile", "facade", "furniture"], Drawn());
    }

    [Fact]
    public void An_empty_shelf_falls_back_the_same_way()
    {
        Write("home-products", """{ "items": [] }""");
        Assert.Equal(["profile", "facade", "furniture"], Drawn());
    }

    [Fact]
    public void The_shelf_says_which_and_in_what_order()
    {
        // Not a filter over the library's order - a choice. This is the whole reason a shelf is
        // a list of ids rather than a "show on home" flag on the library item.
        Write("home-products", """{ "items": [{ "id": "furniture" }, { "id": "profile" }] }""");
        Assert.Equal(["furniture", "profile"], Drawn());
    }

    [Fact]
    public void What_the_card_says_comes_from_the_library()
    {
        Write("home-products", """{ "items": [{ "id": "facade", "name": "Ignored" }] }""");
        var html = _sections.Render("home-products", "") ?? string.Empty;

        // One card, so this cannot pass by the band having fallen back to all three.
        Assert.Equal(["facade"], Drawn());
        Assert.Contains(">Facade</h3>", html);
        Assert.DoesNotContain("Ignored", html);
        // And its address names the library, so typing over it on the home page edits the family.
        Assert.Contains("data-ab-t=\"products.categories.1.name\"", html);
    }

    [Fact]
    public void An_id_naming_nothing_draws_nothing()
    {
        // A deleted family, or a typo. The card has no words and no picture to draw, so drawing
        // an empty one would be worse than drawing none.
        Write("home-products", """{ "items": [{ "id": "gone" }, { "id": "facade" }] }""");
        Assert.Equal(["facade"], Drawn());
    }

    [Fact]
    public void Hiding_a_family_takes_its_card_off_the_home_page()
    {
        // The promise the Content screen's Hidden button makes everywhere else. A hidden item
        // that kept its card would be published on the busiest page of the site.
        Write("products", """
        {
          "categories": [
            { "id": "profile",   "name": "Profile",   "tagline": "One" },
            { "id": "facade",    "name": "Facade",    "tagline": "Two", "visible": false },
            { "id": "furniture", "name": "Furniture", "tagline": "Three" }
          ]
        }
        """);
        // Furniture is left off the shelf, so falling back would draw it and the answer below
        // could not be reached by accident.
        Write("home-products", """{ "items": [{ "id": "facade" }, { "id": "profile" }] }""");
        Assert.Equal(["profile"], Drawn());
    }

    [Fact]
    public void An_empty_shelf_can_be_filled_from_the_screen()
    {
        // The path the Content screen promises in so many words: "This shelf is empty... Add a
        // card and the shelf takes over." Add writes a blank item shaped like the ones already
        // there - and on an EMPTY list there are none to copy, so what it writes is decided by
        // one branch nobody had walked. An item with no id would refuse the very next step.
        Write("home-products", """{ "items": [] }""");
        var store = new ContentStore(Path.Combine(_root, "_data"));
        var editor = new ContentEditor(store, _root);
        var sections = new SectionRenderer(store);

        var added = editor.Structure("home-products.items", ContentEditor.Op.Add);
        Assert.Equal(1, added.Applied);

        var set = editor.Apply([new ContentEditor.Change("home-products.items.0.id", "facade")]);
        Assert.Equal(1, set.Applied);
        Assert.Empty(set.Rejected);

        var drawn = Regex.Matches(sections.Render("home-products", "") ?? string.Empty,
                                  @"href=""products/([^/""]+)/""")
                         .Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(["facade"], drawn);
    }

    [Fact]
    public void Every_shelf_band_names_its_own_document()
    {
        // The composer stamps this on the section, and the Content screen writes to it. A band
        // reading the library's name instead would save a pick into products.json.
        Assert.Equal("home-products", _sections.DocumentFor("home-products"));
        Assert.Equal("home-colors", _sections.DocumentFor("home-colors"));
        Assert.Equal("home-projects", _sections.DocumentFor("home-projects"));
        Assert.Equal("home-news", _sections.DocumentFor("home-highlights"));
    }
}
