using System.Text.Json.Nodes;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// Lists of objects inside an item, and lists an item did not have yet (08/10/2026).
///
/// A project's photos, the documents in a group and the sections of an About chapter are lists
/// of objects; the first editor of item lists took only strings. And a project written before
/// projects had a body has no "body" at all, so "Add a paragraph" has to create the list. What
/// is tested here is mostly how each of these could quietly corrupt a file: a string dropped
/// into a list of photos, a list created somewhere the table never named.
/// </summary>
public class ItemListTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public ItemListTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abil-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        File.WriteAllText(Path.Combine(_root, "_data", "projects.json"), """
        { "section": "Projects", "albums": [
          { "id": "skyliving", "title": "SkyLiving", "year": 2026, "location": "Surrey", "client": "", "scope": "",
            "products": ["Unitised UC160", "Sun Louvre"], "note": "N",
            "photos": [ { "c": "West elevation", "image": "" } ] },
          { "id": "old", "title": "Old", "year": 2020, "location": "", "client": "", "scope": "", "note": "",
            "photos": ["a stray string"] } ] }
        """);
        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private JsonObject Album(int i) => (JsonObject)_store.Get("projects")!["albums"]![i]!;

    // ---- the door -----------------------------------------------------------------------------

    [Theory]
    [InlineData("projects.albums.0.photos", "append")]
    [InlineData("projects.albums.3.photos.2", "remove")]
    [InlineData("projects.albums.0.body", "append")]
    [InlineData("projects.albums.0.products.1", "up")]
    [InlineData("documents.categories.2.items", "append")]
    [InlineData("documents.categories.2.items.4", "down")]
    [InlineData("about.chapters.1.sections", "append")]
    [InlineData("about.chapters.1.sections.0.photos", "append")]
    [InlineData("about.chapters.1.sections.0.photos.3", "remove")]
    [InlineData("news.items.0.body", "append")]
    public void Lets_through_the_lists_on_the_table(string address, string op)
        => Assert.True(ItemLists.TryRead(address, op, out _, out _));

    [Theory]
    [InlineData("projects.albums", "append")]                  // the projects: Content screen's job
    [InlineData("projects.albums.0.title", "append")]
    [InlineData("projects.albums.0.photos.0.c", "remove")]     // a field, not an entry
    [InlineData("documents.categories", "append")]
    [InlineData("about.chapters.1.sections.x.photos", "append")]
    [InlineData("about.chapters.1.figures", "append")]
    public void Stops_everything_else(string address, string op)
        => Assert.False(ItemLists.TryRead(address, op, out _, out _));

    [Fact]
    public void A_list_of_objects_carries_the_shape_of_a_new_entry()
    {
        Assert.True(ItemLists.TryRead("projects.albums.0.photos", "append", out _, out _, out var e));
        Assert.Equal("""{"c":"","image":""}""", e.NewEntry()!.ToJsonString());
        Assert.True(ItemLists.TryRead("projects.albums.0.body", "append", out _, out _, out var b));
        Assert.Null(b.NewEntry());
    }

    // ---- appending objects ----------------------------------------------------------------------

    [Fact]
    public void Adds_a_photo_at_the_end_in_the_template_shape()
    {
        var r = _editor.Structure("projects.albums.0.photos", ContentEditor.Op.Append,
                                  JsonNode.Parse("""{ "c": "", "image": "" }""")!.AsObject());
        Assert.Empty(r.Rejected);
        var photos = (JsonArray)Album(0)["photos"]!;
        Assert.Equal(2, photos.Count);
        Assert.Equal("West elevation", photos[0]!["c"]!.GetValue<string>());
        Assert.Equal("""{"c":"","image":""}""", photos[1]!.ToJsonString());
    }

    [Fact]
    public void Refuses_to_put_an_object_among_strings()
    {
        var r = _editor.Structure("projects.albums.1.photos", ContentEditor.Op.Append,
                                  JsonNode.Parse("""{ "c": "" }""")!.AsObject());
        Assert.Equal(["projects.albums.1.photos"], r.Rejected);
    }

    [Fact]
    public void Refuses_to_put_a_string_among_objects()
        => Assert.Equal(["projects.albums.0.photos"],
                        _editor.Structure("projects.albums.0.photos", ContentEditor.Op.Append).Rejected);

    [Fact]
    public void An_id_in_the_template_gets_a_placeholder_the_first_title_turns_into_the_address()
    {
        _editor.Structure("projects.albums.0.photos", ContentEditor.Op.Append,
                          JsonNode.Parse("""{ "id": "", "title": "" }""")!.AsObject());
        var made = ((JsonArray)Album(0)["photos"]!)[1]!;
        Assert.Matches("^new-[0-9a-f]{6}$", made["id"]!.GetValue<string>());
    }

    // ---- creating a list the item did not have ----------------------------------------------------

    [Fact]
    public void Add_a_paragraph_creates_the_body_of_a_project_written_before_bodies()
    {
        var r = _editor.Structure("projects.albums.0.body", ContentEditor.Op.Append, create: true);
        Assert.Empty(r.Rejected);
        Assert.Equal("""[""]""", Album(0)["body"]!.ToJsonString());
    }

    [Fact]
    public void Without_leave_to_create_a_missing_list_is_refused()
        => Assert.Equal(["projects.albums.0.body"],
                        _editor.Structure("projects.albums.0.body", ContentEditor.Op.Append).Rejected);

    [Fact]
    public void Creates_nothing_on_an_item_that_is_not_there()
    {
        var r = _editor.Structure("projects.albums.9.body", ContentEditor.Op.Append, create: true);
        Assert.Equal(["projects.albums.9.body"], r.Rejected);
    }

    [Fact]
    public void Names_a_missing_list_only_where_it_may_be_created()
    {
        var doc = _store.Get("projects");
        var body = ItemLists.All.Single(e => e.Pattern == "projects.albums.*.body");
        Assert.Equal(["projects.albums.0.body", "projects.albums.1.body"], ItemLists.Expand(body, doc));
        Assert.Empty(ItemLists.Expand(body with { Create = false }, doc));
    }

    // ---- the project page -----------------------------------------------------------------------

    [Fact]
    public void Each_product_is_its_own_box_and_the_body_is_drawn()
    {
        _editor.Structure("projects.albums.0.body", ContentEditor.Op.Append, create: true);
        _editor.Apply([new ContentEditor.Change("projects.albums.0.body.0", "Forty-two storeys.")]);

        var html = new SectionRenderer(_store).Render("projects-detail", "", "skyliving") ?? "";
        Assert.Contains("<span data-ab-t=\".albums.0.products.0\">Unitised UC160</span>, <span data-ab-t=\".albums.0.products.1\">Sun Louvre</span>", html);
        Assert.Contains("<div class=\"ab-article ab-project-body\"><p data-ab-t=\".albums.0.body.0\">Forty-two storeys.</p></div>", html);
        Assert.Contains("1 photograph —", html);
    }
}
