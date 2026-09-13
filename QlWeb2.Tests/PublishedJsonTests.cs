using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// What the two canvas blocks are handed.
///
/// They read their whole document out of a script tag in the page and draw from it, so they are
/// the one place a hidden item can come back to life. Everything else on the site goes through
/// <c>SectionRenderer.Arr</c>, which filters; this does the same filtering for the documents that
/// travel whole.
/// </summary>
public class PublishedJsonTests
{
    private const string Globe = """
    {
      "section": "Export routes",
      "routes": [
        { "key": "eu", "name": "European Union", "visible": false },
        { "key": "na", "name": "North America" }
      ]
    }
    """;

    [Fact]
    public void Takes_a_hidden_item_out()
    {
        var json = PageComposer.Published(Globe);

        Assert.DoesNotContain("European Union", json);
        Assert.Contains("North America", json);
    }

    [Fact]
    public void Hands_back_the_same_bytes_when_nothing_is_hidden()
    {
        // The normal case, and the one that has to cost nothing: re-serialising a document
        // nobody has hidden anything in would change its indentation and its escapes, and every
        // page carrying one would drift away from its baseline for no reason anybody can name.
        var untouched = Globe.Replace(", \"visible\": false", "");

        Assert.Same(untouched, PageComposer.Published(untouched));
    }

    [Fact]
    public void Reaches_a_list_nested_inside_the_document()
    {
        var json = PageComposer.Published("""
        { "categories": [ { "items": [ { "id": "a", "visible": false }, { "id": "b" } ] } ] }
        """);

        Assert.DoesNotContain("\"a\"", json);
        Assert.Contains("\"b\"", json);
    }

    [Fact]
    public void Leaves_a_document_it_cannot_read_exactly_as_it_found_it()
    {
        // The fallback copy written into the template is better than an empty script tag: the
        // globe draws something instead of throwing on the frame after it parses.
        const string broken = "{ not json at all";
        Assert.Same(broken, PageComposer.Published(broken));
    }

    [Fact]
    public void Visible_true_is_not_a_reason_to_rewrite_anything()
    {
        const string shown = """
        { "routes": [ { "key": "eu", "visible": true } ] }
        """;
        Assert.Same(shown, PageComposer.Published(shown));
    }
}
