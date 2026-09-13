using System.Text.Json.Nodes;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// Addresses are the contract three separate things agree on: the markup writes one as
/// data-ab-t, the composer resolves it, and the editor posts it to patch the preview. A bug here
/// shows up as text that silently stops updating, so the cases are spelled out rather than
/// assumed.
/// </summary>
public class ContentPathTests
{
    private static JsonNode Doc() => JsonNode.Parse("""
    {
      "wordmark": "AluminumBoss",
      "nav": [
        { "label": "About us", "href": "about-us/" },
        { "label": "Products", "href": "products/" }
      ],
      "home": { "products": { "heading": "Six product families" } },
      "count": 6
    }
    """)!;

    [Fact]
    public void Resolves_a_plain_key()
        => Assert.Equal("AluminumBoss", ContentPath.Resolve(Doc(), "wordmark"));

    [Fact]
    public void Resolves_through_an_array_index()
        => Assert.Equal("Products", ContentPath.Resolve(Doc(), "nav.1.label"));

    [Fact]
    public void Resolves_a_nested_object()
        => Assert.Equal("Six product families", ContentPath.Resolve(Doc(), "home.products.heading"));

    [Fact]
    public void Resolves_a_number_as_text()
        => Assert.Equal("6", ContentPath.Resolve(Doc(), "count"));

    [Theory]
    [InlineData("nowhere")]
    [InlineData("nav.9.label")]        // index past the end
    [InlineData("nav.label")]          // object key used on an array
    [InlineData("wordmark.deeper")]    // walking into a scalar
    [InlineData("")]
    public void Returns_null_for_an_address_that_leads_nowhere(string path)
        => Assert.Null(ContentPath.Resolve(Doc(), path));

    [Fact]
    public void Sets_a_plain_key()
    {
        var d = Doc();
        Assert.True(ContentPath.TrySet(d, "wordmark", "Boss Group"));
        Assert.Equal("Boss Group", ContentPath.Resolve(d, "wordmark"));
    }

    [Fact]
    public void Sets_through_an_array_index()
    {
        var d = Doc();
        Assert.True(ContentPath.TrySet(d, "nav.0.label", "Gioi thieu"));
        Assert.Equal("Gioi thieu", ContentPath.Resolve(d, "nav.0.label"));
    }

    [Fact]
    public void Refuses_to_invent_a_field_that_does_not_exist()
    {
        // An address with no field behind it is a typo in the markup, not an instruction to
        // create one. Inventing it would hide the typo until someone noticed empty text.
        var d = Doc();
        Assert.False(ContentPath.TrySet(d, "nav.0.subtitle", "x"));
        Assert.False(ContentPath.TrySet(d, "brand.new.thing", "x"));
        Assert.Null(ContentPath.Resolve(d, "nav.0.subtitle"));
    }

    [Fact]
    public void Exists_agrees_with_Resolve()
    {
        var d = Doc();
        Assert.True(ContentPath.Exists(d, "nav.1.href"));
        Assert.False(ContentPath.Exists(d, "nav.5.href"));
    }
}
