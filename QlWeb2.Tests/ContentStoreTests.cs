using System.Text.Json;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// The store is the only thing that writes content. A half-written file takes the whole site
/// down, so the write path is what these tests are about.
/// </summary>
public class ContentStoreTests : IDisposable
{
    private readonly string _dir;
    private readonly ContentStore _store;

    public ContentStoreTests()
    {
        _dir = Path.Combine(Path.GetTempPath(), "abtest-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(_dir);
        _store = new ContentStore(_dir);
    }

    public void Dispose()
    {
        try { Directory.Delete(_dir, recursive: true); } catch { /* temp dir */ }
    }

    [Fact]
    public void Round_trips_a_document()
    {
        _store.Save("news", """{ "section": "News", "items": [] }""");
        Assert.Equal("News", ContentPath.Resolve(_store.Get("news"), "section"));
    }

    [Fact]
    public void Save_returns_the_previous_content_so_a_revision_can_be_recorded()
    {
        Assert.Null(_store.Save("news", """{ "a": 1 }"""));
        var previous = _store.Save("news", """{ "a": 2 }""");
        Assert.Contains("\"a\": 1", previous);
    }

    [Fact]
    public void Refuses_invalid_json_and_leaves_the_old_file_untouched()
    {
        _store.Save("news", """{ "section": "News" }""");
        Assert.Throws<JsonException>(() => _store.Save("news", "{ this is not json"));

        // The point of refusing: the previous content must still be servable.
        Assert.Equal("News", ContentPath.Resolve(_store.Get("news"), "section"));
    }

    [Fact]
    public void Leaves_no_temporary_files_behind()
    {
        _store.Save("news", """{ "a": 1 }""");
        Assert.Empty(Directory.GetFiles(_dir, "*.tmp-*"));
    }

    [Fact]
    public void Picks_up_a_file_edited_underneath_it()
    {
        _store.Save("news", """{ "section": "News" }""");
        var path = Path.Combine(_dir, "news.json");
        File.SetLastWriteTimeUtc(path, DateTime.UtcNow.AddSeconds(1));
        File.WriteAllText(path, """{ "section": "Tin" }""");
        Assert.Equal("Tin", ContentPath.Resolve(_store.Get("news"), "section"));
    }

    [Fact]
    public void Reports_a_missing_document_as_null_rather_than_throwing()
    {
        Assert.Null(_store.Get("khong-co"));
        Assert.Null(_store.RawJson("khong-co"));
    }

    [Fact]
    public void Reports_an_unparseable_document_as_missing_rather_than_throwing()
    {
        // One broken file should cost one section, not the whole page.
        File.WriteAllText(Path.Combine(_dir, "broken.json"), "{ oops");
        Assert.Null(_store.Get("broken"));
    }

    [Theory]
    [InlineData("../secrets")]
    [InlineData("a/b")]
    [InlineData("a\b")]
    [InlineData("")]
    public void Rejects_a_name_that_would_escape_the_data_folder(string name)
        => Assert.Throws<ArgumentException>(() => _store.Save(name, "{}"));

    [Fact]
    public void Raises_Changed_after_a_save()
    {
        string? got = null;
        _store.Changed += n => got = n;
        _store.Save("news", "{}");
        Assert.Equal("news", got);
    }

    [Fact]
    public void Lists_the_documents_on_disk()
    {
        _store.Save("news", "{}");
        _store.Save("products", "{}");
        Assert.Equal(new[] { "news", "products" }, _store.Names);
    }
}
