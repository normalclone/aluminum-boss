using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// An album's cover (09/10/2026): two imported albums had no "image" field, and the client's
/// picture for them was refused because the address did not exist.
/// </summary>
public class AlbumCoverTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public AlbumCoverTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abcov-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        File.WriteAllText(Path.Combine(_root, "_data", "projects.json"), """
        { "albums": [ { "id": "a", "year": "", "title": "A", "photos": [] } ] }
        """);
        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string? Cover() => _store.Get("projects")!["albums"]![0]!["image"]?.ToString();

    [Fact]
    public void A_cover_is_written_onto_an_album_that_had_none()
    {
        Assert.Empty(_editor.Apply([new ContentEditor.Change("projects.albums.0.image", "tower.jpg")]).Rejected);
        Assert.Equal("tower.jpg", Cover());
    }

    [Fact]
    public void Emptied_the_cover_goes()
    {
        _editor.Apply([new ContentEditor.Change("projects.albums.0.image", "tower.jpg")]);
        Assert.Empty(_editor.Apply([new ContentEditor.Change("projects.albums.0.image", "")]).Rejected);
        Assert.Null(Cover());
    }

    [Theory]
    [InlineData("projects.albums.0.image", "../x.jpg")]
    [InlineData("projects.albums.0.image", "a\\x.jpg")]
    [InlineData("projects.albums.0.picture", "x.jpg")]
    [InlineData("projects.albums.5.image", "x.jpg")]
    public void Only_one_file_name_on_an_existing_album(string address, string value)
        => Assert.Equal([address], _editor.Apply([new ContentEditor.Change(address, value)]).Rejected);
}
