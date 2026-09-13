using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// The write path from the editor to the content files.
///
/// This is the code that can lose someone's words, so what is tested here is mostly what it
/// refuses to do: invent a field, write to a document that is not there, or rewrite a file it was
/// not asked to touch.
/// </summary>
public class ContentEditorTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public ContentEditorTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abedit-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));

        File.WriteAllText(Path.Combine(_root, "_data", "news.json"), """
        {
          "section": "News",
          "items": [
            { "id": "press-line-2500", "title": "A press", "image": "" },
            { "id": "qualicoat-class-2", "title": "A coating", "image": "old.jpg" }
          ]
        }
        """);

        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string OnDisk() => File.ReadAllText(Path.Combine(_root, "_data", "news.json"));

    [Fact]
    public void Writes_a_picture_into_the_field_the_address_names()
    {
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.image", "roof-a1b2c3.jpg")]);

        Assert.Equal(1, result.Applied);
        Assert.Empty(result.Rejected);
        Assert.Equal("roof-a1b2c3.jpg", ContentPath.Resolve(_store.Get("news"), "items.0.image"));
        Assert.Contains("roof-a1b2c3.jpg", OnDisk());
    }

    [Fact]
    public void Emptying_a_picture_field_is_a_change_like_any_other()
    {
        // "No picture" has to be as reachable as choosing one: the placeholder it goes back to is
        // what the page showed before, and putting the wrong photograph in must be undoable.
        _editor.Apply([new ContentEditor.Change("news.items.1.image", "")]);
        Assert.Equal("", ContentPath.Resolve(_store.Get("news"), "items.1.image"));
    }

    [Fact]
    public void Refuses_an_address_with_no_field_behind_it()
    {
        var before = OnDisk();
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.subtitle", "x")]);

        Assert.Equal(0, result.Applied);
        Assert.Contains("news.items.0.subtitle", result.Rejected);
        Assert.Equal(before, OnDisk());
    }

    [Fact]
    public void Refuses_a_document_that_does_not_exist()
    {
        var result = _editor.Apply([new ContentEditor.Change("nowhere.title", "x")]);
        Assert.Equal(0, result.Applied);
        Assert.Single(result.Rejected);
        Assert.Empty(result.Previous);
    }

    [Fact]
    public void Refuses_an_address_with_no_document_in_front_of_it()
    {
        var result = _editor.Apply([new ContentEditor.Change("title", "x")]);
        Assert.Equal(0, result.Applied);
        Assert.Single(result.Rejected);
    }

    [Fact]
    public void Writes_one_document_once_however_many_fields_it_carries()
    {
        var result = _editor.Apply([
            new ContentEditor.Change("news.items.0.title", "One"),
            new ContentEditor.Change("news.items.1.title", "Two"),
            new ContentEditor.Change("news.section", "Nieuws"),
        ]);

        Assert.Equal(3, result.Applied);
        Assert.Single(result.Previous);
        Assert.Equal("Nieuws", ContentPath.Resolve(_store.Get("news"), "section"));
    }

    [Fact]
    public void Hands_back_what_the_document_said_before()
    {
        // This is the whole of what an undo will be built from, so it is worth asserting rather
        // than assuming: what comes back has to be the old text, not the new.
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.title", "Changed")]);
        Assert.Contains("A press", result.Previous["news"]);
        Assert.DoesNotContain("Changed", result.Previous["news"]);
    }

    [Fact]
    public void Keeps_the_file_in_the_line_endings_it_was_written_in()
    {
        // The indented JSON writer ends its lines with Environment.NewLine, which on Windows
        // turns a one-field edit into a diff of every line in the file - and the two content
        // trees are compared byte for byte.
        _editor.Apply([new ContentEditor.Change("news.items.0.title", "Changed")]);
        Assert.DoesNotContain("\r", OnDisk());
        Assert.EndsWith("\n", OnDisk());
    }

    [Fact]
    public void A_curly_quote_stays_a_curly_quote()
    {
        // The default JSON encoder escapes anything non-ASCII, so one edit would rewrite every
        // apostrophe in the file as ’ and make the diff unreadable.
        _editor.Apply([new ContentEditor.Change("news.items.0.title", "Door’s accessory")]);
        Assert.Contains("Door’s accessory", OnDisk());
    }

    /* ---- a new item is given an address by being given a name ------------------------- */

    [Fact]
    public void Titling_a_brand_new_item_turns_its_placeholder_id_into_a_slug()
    {
        // "Add an item" cannot know the title, so it writes new-3f9a2c. Without this the first
        // article a client writes lives at /news/new-3f9a2c/ for as long as the site does.
        _editor.Structure("news.items", ContentEditor.Op.Add);
        var made = ContentPath.Resolve(_store.Get("news"), "items.0.id")!;
        Assert.StartsWith("new-", made);

        var result = _editor.Apply([new ContentEditor.Change("news.items.0.title", "Press line 2,500 t")]);

        Assert.Equal("press-line-2-500-t", ContentPath.Resolve(_store.Get("news"), "items.0.id"));
        Assert.Equal("press-line-2-500-t", result.Renamed![made]);
    }

    [Fact]
    public void Renaming_happens_once_and_never_again()
    {
        // After the first save the address is public. Fixing a typo in the headline must not
        // move the page out from under everyone who has the link.
        _editor.Apply([new ContentEditor.Change("news.items.0.title", "A different headline")]);

        Assert.Equal("press-line-2500", ContentPath.Resolve(_store.Get("news"), "items.0.id"));
        Assert.Empty(_editor.Apply([new ContentEditor.Change("news.items.1.title", "Another")]).Renamed!);
    }

    [Fact]
    public void A_title_that_is_already_taken_costs_a_suffix_not_the_save()
    {
        _editor.Structure("news.items", ContentEditor.Op.Add);
        _editor.Apply([new ContentEditor.Change("news.items.0.title", "A press")]);

        // news.items already holds "press-line-2500"; the collision is with the slug this title
        // makes, "a-press", only once there are two of them.
        _editor.Structure("news.items", ContentEditor.Op.Add);
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.title", "A press")]);

        Assert.Equal(1, result.Applied);
        Assert.Equal("a-press-2", ContentPath.Resolve(_store.Get("news"), "items.0.id"));
    }

    [Fact]
    public void A_title_with_nothing_url_shaped_in_it_leaves_the_placeholder_alone()
    {
        // An id is a URL. Better a placeholder somebody can still read than an empty path segment.
        _editor.Structure("news.items", ContentEditor.Op.Add);
        _editor.Apply([new ContentEditor.Change("news.items.0.title", "?!?")]);

        Assert.StartsWith("new-", ContentPath.Resolve(_store.Get("news"), "items.0.id"));
    }

    [Theory]
    [InlineData("Nhôm định hình", "nhom-dinh-hinh")]
    [InlineData("Đường ống dẫn", "duong-ong-dan")]
    [InlineData("  Two  spaces  ", "two-spaces")]
    [InlineData("QUALICOAT class 2", "qualicoat-class-2")]
    [InlineData("Door’s accessory", "door-s-accessory")]
    public void Writes_a_title_the_way_a_path_segment_has_to_be_written(string title, string slug)
    {
        // The client writes Vietnamese. What comes out has to satisfy the same expression
        // tools/slugs.py checks every id against.
        Assert.Equal(slug, ContentEditor.Slugify(title));
        Assert.Matches("^[a-z0-9]+(-[a-z0-9]+)*$", ContentEditor.Slugify(title));
    }

    [Fact]
    public void Two_documents_in_different_categories_cannot_take_the_same_address()
    {
        // Documents is the one list the site flattens: one page per file regardless of the
        // heading it is filed under. Two files in different categories never look like
        // neighbours on the screen, which is exactly why two of them get the same name.
        File.WriteAllText(Path.Combine(_root, "_data", "documents.json"), """
        {
          "categories": [
            { "name": "Catalogues", "items": [ { "id": "profile-catalogue", "title": "Profiles" } ] },
            { "name": "Technical",  "items": [ { "id": "new-a1b2c3",        "title": "" } ] }
          ]
        }
        """);
        var store = new ContentStore(Path.Combine(_root, "_data"));
        var editor = new ContentEditor(store, _root);

        editor.Apply([new ContentEditor.Change("documents.categories.1.items.0.title", "Profiles")]);

        Assert.Equal("profiles", ContentPath.Resolve(store.Get("documents"), "categories.1.items.0.id"));

        // And now the collision the flattening makes possible.
        File.WriteAllText(Path.Combine(_root, "_data", "documents.json"), """
        {
          "categories": [
            { "name": "Catalogues", "items": [ { "id": "profiles", "title": "Profiles" } ] },
            { "name": "Technical",  "items": [ { "id": "new-a1b2c3", "title": "" } ] }
          ]
        }
        """);
        store = new ContentStore(Path.Combine(_root, "_data"));
        editor = new ContentEditor(store, _root);

        editor.Apply([new ContentEditor.Change("documents.categories.1.items.0.title", "Profiles")]);

        Assert.Equal("profiles-2", ContentPath.Resolve(store.Get("documents"), "categories.1.items.0.id"));
    }
}
