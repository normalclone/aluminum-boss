using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// What it takes to write a whole article from the editor: its date, and the lists inside it -
/// the paragraphs of the body and the tags.
///
/// Until 28/09/2026 none of the three could be done from the screen. A new article came up with
/// six boxes and no way to give it a body, and the date of every article, new or old, could not be
/// changed anywhere. What is tested here is mostly the ways each of these can quietly corrupt a
/// file rather than fail: an object dropped into a list of strings, a paragraph added at the top
/// instead of the end, a date the list of news cannot sort.
/// </summary>
public class ArticleEditingTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public ArticleEditingTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abart-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));

        File.WriteAllText(Path.Combine(_root, "_data", "news.json"), """
        {
          "section": "News",
          "items": [
            { "id": "press-line-2500", "title": "A press", "date": "2026-08-19",
              "tags": ["Plant", "Capacity"], "body": ["First.", "Second.", "Third."] },
            { "id": "new-3f9a2c", "title": "", "date": "", "tags": [], "body": [] }
          ]
        }
        """);

        // A document whose "date" means something else entirely: the definition of a form field.
        // The date rule must not reach it.
        File.WriteAllText(Path.Combine(_root, "_data", "contact.json"), """
        { "routes": [ { "id": "quote", "fields": [ { "id": "delivery", "type": "date" } ] } ] }
        """);

        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string OnDisk(string name = "news") => File.ReadAllText(Path.Combine(_root, "_data", name + ".json"));
    private string? At(string path) => ContentPath.Resolve(_store.Get("news"), path);

    // ---- appending ---------------------------------------------------------------------------

    [Fact]
    public void Appends_an_empty_paragraph_at_the_END_of_the_body()
    {
        var result = _editor.Structure("news.items.0.body", ContentEditor.Op.Append);

        Assert.Equal(1, result.Applied);
        Assert.Equal("First.", At("items.0.body.0"));
        Assert.Equal("Third.", At("items.0.body.2"));
        Assert.Equal("", At("items.0.body.3"));
        Assert.Null(At("items.0.body.4"));
    }

    [Fact]
    public void Appends_to_a_list_that_is_empty()
    {
        // The brand-new article: nothing to copy a shape from. What authorises this is that the
        // address is on the list of editable lists, not the array's contents - there are none.
        _editor.Structure("news.items.1.body", ContentEditor.Op.Append);

        Assert.Equal("", At("items.1.body.0"));
        Assert.Contains("\"body\": [\n        \"\"\n      ]", OnDisk());
    }

    [Fact]
    public void Refuses_to_append_to_a_list_of_objects()
    {
        // news.items is a list of ARTICLES. Appending "" there would put a bare string among
        // them, and every page that reads the list would trip over it.
        var before = OnDisk();
        var result = _editor.Structure("news.items", ContentEditor.Op.Append);

        Assert.Equal(0, result.Applied);
        Assert.Equal(before, OnDisk());
    }

    [Fact]
    public void Refuses_to_append_to_something_that_is_not_a_list()
    {
        var before = OnDisk();
        var result = _editor.Structure("news.items.0.title", ContentEditor.Op.Append);

        Assert.Equal(0, result.Applied);
        Assert.Equal(before, OnDisk());
    }

    [Fact]
    public void Appending_hands_back_the_document_as_it_was_for_the_history()
    {
        var result = _editor.Structure("news.items.0.tags", ContentEditor.Op.Append);

        Assert.True(result.Previous.ContainsKey("news"));
        Assert.DoesNotContain("\"Capacity\",\n        \"\"", result.Previous["news"]!);
    }

    [Fact]
    public void Removes_and_moves_the_paragraph_the_address_names()
    {
        _editor.Structure("news.items.0.body.1", ContentEditor.Op.Remove);
        Assert.Equal("Third.", At("items.0.body.1"));

        _editor.Structure("news.items.0.body.1", ContentEditor.Op.Up);
        Assert.Equal("Third.", At("items.0.body.0"));
        Assert.Equal("First.", At("items.0.body.1"));
    }

    // ---- the date ----------------------------------------------------------------------------

    [Theory]
    [InlineData("2026-09-28")]
    [InlineData("2024-02-29")]   // a leap day that exists
    [InlineData("")]             // clearing it is allowed: "not dated yet"
    public void Accepts_a_real_date_or_none(string value)
    {
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.date", value)]);

        Assert.Equal(1, result.Applied);
        Assert.Equal(value, At("items.0.date"));
    }

    [Theory]
    [InlineData("19/08/2026")]
    [InlineData("2026-8-19")]
    [InlineData("2026-02-30")]   // looks right, is not a day
    [InlineData("2025-02-29")]   // not a leap year
    [InlineData("yesterday")]
    [InlineData("2026-08-19 ")]
    public void Refuses_a_date_the_list_of_news_could_not_sort(string value)
    {
        // The news list sorts on this string. A value in any other shape does not fail - it just
        // puts the article in the wrong place, quietly, for as long as nobody notices.
        var before = OnDisk();
        var result = _editor.Apply([new ContentEditor.Change("news.items.0.date", value)]);

        Assert.Equal(0, result.Applied);
        Assert.Contains("news.items.0.date", result.Rejected);
        Assert.Equal(before, OnDisk());
    }

    [Fact]
    public void The_date_rule_does_not_reach_a_field_that_only_shares_its_name()
    {
        // contact.json's "date" is a form field's TYPE, not a day. The rule is for news items.
        var result = _editor.Apply([new ContentEditor.Change("contact.routes.0.fields.0.type", "text")]);
        Assert.Equal(1, result.Applied);
    }

    // ---- which lists the screen may change ---------------------------------------------------

    [Theory]
    [InlineData("news.items.0.body", "append", "news.items.0.body")]
    [InlineData("news.items.12.tags", "append", "news.items.12.tags")]
    [InlineData("news.items.0.body.3", "remove", "news.items.0.body.3")]
    [InlineData("news.items.0.tags.0", "up", "news.items.0.tags.0")]
    [InlineData("news.items.0.body.2", "down", "news.items.0.body.2")]
    public void Lets_through_the_lists_that_are_on_the_list(string address, string op, string expected)
    {
        Assert.True(ItemLists.TryRead(address, op, out var target, out _));
        Assert.Equal(expected, target);
    }

    [Theory]
    [InlineData("news.items", "append")]                    // the articles themselves: Content screen's job
    [InlineData("news.items.0.title", "append")]            // not a list
    [InlineData("news.items.0.body", "remove")]             // remove needs to name WHICH paragraph
    [InlineData("news.items.0.body.3", "append")]           // append names the list, not a paragraph
    [InlineData("products.categories.0.items", "append")]   // a list nobody has put on the table yet
    [InlineData("news.items.x.body", "append")]
    [InlineData("news.items.0.body", "delete")]             // not an operation
    public void Stops_everything_else_at_the_door(string address, string op)
    {
        Assert.False(ItemLists.TryRead(address, op, out _, out _));
    }
}
