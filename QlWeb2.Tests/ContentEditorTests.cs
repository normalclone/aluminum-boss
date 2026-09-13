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
}
