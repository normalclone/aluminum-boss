using System.Text.Json.Nodes;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// An About chapter's sections and its PDF (08/10/2026): the Capability page carries the company
/// profile as sections - a heading, a text, photographs - and offers the full PDF.
/// </summary>
public class CapabilityTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public CapabilityTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abcap-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));
        File.WriteAllText(Path.Combine(_root, "_data", "about.json"), """
        { "section": "About us", "chapters": [
          { "id": "company", "name": "Company", "image": "", "title": "T", "lede": "L", "body": ["B"] },
          { "id": "capability", "name": "Capability", "image": "", "title": "Caps", "lede": "L", "body": ["B"],
            "sections": [
              { "heading": "Anodizing", "text": "• 02 lines", "photos": [ { "c": "Line", "image": "a.jpg" } ] },
              { "heading": "Certificates", "text": "", "photos": [ { "c": "ISO", "image": "iso.jpg" } ] } ] } ] }
        """);
        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string Page(string id) => new SectionRenderer(_store).Render("about-detail", "../../", id) ?? "";

    [Fact]
    public void Draws_each_section_with_its_own_addresses()
    {
        var html = Page("capability");
        Assert.Contains("<h2 data-ab-t=\".chapters.1.sections.0.heading\">Anodizing</h2>", html);
        Assert.Contains("data-ab-t=\".chapters.1.sections.0.text\">• 02 lines</p>", html);
        Assert.Contains("src=\"../../_media/a.jpg\" data-ab-img=\".chapters.1.sections.0.photos.0.image\"", html);
        Assert.Contains("<figcaption data-ab-t=\".chapters.1.sections.0.photos.0.c\">Line</figcaption>", html);
    }

    [Fact]
    public void Certificates_are_shown_whole_not_cropped()
    {
        var html = Page("capability");
        Assert.Contains("<section class=\"ab-capsec is-whole\"><h2 data-ab-t=\".chapters.1.sections.1.heading\">Certificates", html);
        Assert.Contains("<section class=\"ab-capsec\"><h2 data-ab-t=\".chapters.1.sections.0.heading\">Anodizing", html);
    }

    [Fact]
    public void A_chapter_without_sections_draws_none()
        => Assert.DoesNotContain("ab-capsec", Page("company"));

    [Fact]
    public void The_profile_download_appears_once_a_file_is_saved()
    {
        Assert.DoesNotContain("ab-capdl", Page("capability"));
        Assert.Empty(_editor.Apply([new ContentEditor.Change("about.chapters.1.file", "profile-a1b2c3.pdf")]).Rejected);
        Assert.Contains("href=\"../../_docs/profile-a1b2c3.pdf\" download>Download the company profile (PDF)</a>", Page("capability"));
    }

    [Theory]
    [InlineData("about.chapters.1.file", "../x.pdf")]
    [InlineData("about.chapters.1.files", "x.pdf")]
    [InlineData("about.figures.file", "x.pdf")]
    public void The_chapter_file_takes_one_pdf_name_on_a_chapter_only(string address, string value)
        => Assert.Equal([address], _editor.Apply([new ContentEditor.Change(address, value)]).Rejected);

    [Fact]
    public void Add_a_section_and_add_a_photo_work_on_a_chapter_that_had_none()
    {
        Assert.True(ItemLists.TryRead("about.chapters.0.sections", "append", out var t, out var op, out var e));
        Assert.Empty(_editor.Structure(t, op, e.NewEntry(), e.Create).Rejected);
        Assert.True(ItemLists.TryRead("about.chapters.0.sections.0.photos", "append", out t, out op, out e));
        Assert.Empty(_editor.Structure(t, op, e.NewEntry(), e.Create).Rejected);
        var made = _store.Get("about")!["chapters"]![0]!["sections"]!.ToJsonString();
        Assert.Equal("""[{"heading":"","text":"","photos":[{"c":"","image":""}]}]""", made);
    }
}
