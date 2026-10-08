using System.Text;
using System.Text.Json.Nodes;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// Documents a client can add, each with its own uploaded PDF (08/10/2026).
///
/// Before, a document's file was <c>_docs/&lt;id&gt;.pdf</c>, placed by hand, and no document
/// could be added from the screen. Tested: the upload takes only real PDFs, a document may name
/// its file (and only a file, never a path), and the old ones keep their id-named file.
/// </summary>
public class DocumentFileTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;
    private readonly DocumentFiles _files;

    public DocumentFileTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abdoc-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        File.WriteAllText(Path.Combine(_root, "_data", "documents.json"), """
        { "section": "Documents", "categories": [
          { "id": "catalogues", "name": "Catalogues", "blurb": "", "items": [
            { "id": "cat-profile-2026", "title": "Profile Systems", "blurb": "", "edition": "2026.1", "lang": "English", "pages": 184 } ] } ] }
        """);
        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
        _files = new DocumentFiles(_root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private static MemoryStream Bytes(string s) => new(Encoding.ASCII.GetBytes(s));
    private JsonObject Doc0() => (JsonObject)_store.Get("documents")!["categories"]![0]!["items"]![0]!;

    // ---- the upload ----------------------------------------------------------------------------

    [Fact]
    public async Task Takes_a_pdf_and_names_it_with_a_hash_of_its_content()
    {
        var s = Bytes("%PDF-1.4\n%fake but shaped like a pdf\n");
        var saved = await _files.Accept(s, "Company Profile 2026.pdf", s.Length);
        Assert.Null(saved.Error);
        Assert.Matches("^company-profile-2026-[0-9a-f]{6}\\.pdf$", saved.Name);
        Assert.True(File.Exists(Path.Combine(_root, "_docs", saved.Name!)));
    }

    [Theory]
    [InlineData("notes.pdf", "hello, not a pdf")]
    [InlineData("photo.jpg", "%PDF-1.4 but called a picture")]
    public async Task Refuses_anything_that_is_not_a_pdf(string name, string content)
    {
        var s = Bytes(content);
        var saved = await _files.Accept(s, name, s.Length);
        Assert.Null(saved.Name);
        Assert.NotNull(saved.Error);
    }

    [Fact]
    public async Task Refuses_a_file_over_the_limit_before_reading_it()
    {
        var saved = await _files.Accept(Bytes("%PDF-"), "big.pdf", DocumentFiles.MaxBytes + 1);
        Assert.Contains("40 MB", saved.Error);
    }

    // ---- the field ---------------------------------------------------------------------------------

    [Fact]
    public void A_document_written_before_files_can_be_given_one()
    {
        var r = _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.file", "profile-a1b2c3.pdf")]);
        Assert.Empty(r.Rejected);
        Assert.Equal("profile-a1b2c3.pdf", Doc0()["file"]!.GetValue<string>());
    }

    [Fact]
    public void Emptied_the_field_goes_and_the_id_named_file_comes_back()
    {
        _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.file", "x.pdf")]);
        _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.file", "")]);
        Assert.False(Doc0().ContainsKey("file"));
    }

    [Theory]
    [InlineData("../../App_Data/keys/key.xml")]
    [InlineData("sub/x.pdf")]
    [InlineData("x.exe")]
    [InlineData(".x.pdf")]
    public void A_file_is_one_pdf_by_name_never_a_path(string value)
        => Assert.Equal(["documents.categories.0.items.0.file"],
            _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.file", value)]).Rejected);

    [Fact]
    public void Still_refuses_to_invent_other_fields_on_a_document()
        => Assert.Equal(["documents.categories.0.items.0.url"],
            _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.url", "x.pdf")]).Rejected);

    // ---- the pages -----------------------------------------------------------------------------------

    [Fact]
    public void Links_the_named_file_or_else_the_id_named_one()
    {
        var sections = new SectionRenderer(_store);
        Assert.Contains("href=\"_docs/cat-profile-2026.pdf\" download", sections.Render("documents-list", "") ?? "");

        _editor.Apply([new ContentEditor.Change("documents.categories.0.items.0.file", "profile-a1b2c3.pdf")]);
        var list = sections.Render("documents-list", "") ?? "";
        Assert.Contains("href=\"_docs/profile-a1b2c3.pdf\" download", list);
        Assert.Contains("data-ab-file=\".categories.0.items.0.file\" data-ab-value=\"profile-a1b2c3.pdf\"", list);
        Assert.Contains("data=\"../_docs/profile-a1b2c3.pdf\"", sections.Render("documents-detail", "../", "cat-profile-2026") ?? "");
    }
}
