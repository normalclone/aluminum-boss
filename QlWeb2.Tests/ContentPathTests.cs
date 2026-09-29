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

    // ---- a value keeps its shape --------------------------------------------------------------
    //
    // Until 29/09/2026 a save replaced whatever was at the address with a string. The editor only
    // ever posts addresses of text, so on the screen nothing went wrong - but the footer address
    // is stored as a list of lines, and saving it would have turned the list into one string with
    // a newline in it, which the page prints on one line. And a hand-made request could replace a
    // number, a whole item or a whole list with a word.

    private static JsonNode Shapes() => JsonNode.Parse("""
    { "lines": ["Lot 14", "Binh Duong"], "lat": 21.7, "on": true, "none": null,
      "site": { "name": "A" }, "sites": [ { "name": "A" } ], "tags": ["Plant"] }
    """)!;

    [Fact]
    public void A_list_of_lines_is_saved_back_as_a_list_of_lines()
    {
        var d = Shapes();
        Assert.True(ContentPath.TrySet(d, "lines", "Lot 15\nTan Uyen\nBinh Duong"));
        Assert.Equal("""["Lot 15","Tan Uyen","Binh Duong"]""", d["lines"]!.ToJsonString());
    }

    [Fact]
    public void Windows_line_ends_do_not_leave_a_stray_return_in_a_line()
    {
        var d = Shapes();
        Assert.True(ContentPath.TrySet(d, "lines", "Lot 15\r\nBinh Duong"));
        Assert.Equal("""["Lot 15","Binh Duong"]""", d["lines"]!.ToJsonString());
    }

    [Fact]
    public void One_entry_of_a_list_of_strings_is_still_just_a_string()
    {
        var d = Shapes();
        Assert.True(ContentPath.TrySet(d, "tags.0", "Capacity"));
        Assert.Equal("Capacity", ContentPath.Resolve(d, "tags.0"));
    }

    [Theory]
    [InlineData("lat")]       // a number the map draws from
    [InlineData("on")]
    [InlineData("none")]
    [InlineData("site")]      // a whole item
    [InlineData("sites")]     // a whole list of items
    [InlineData("sites.0")]   // one item of it
    public void Refuses_to_replace_anything_that_is_not_text_with_text(string path)
    {
        var d = Shapes();
        var before = d.ToJsonString();
        Assert.False(ContentPath.TrySet(d, path, "Ha Noi"));
        Assert.Equal(before, d.ToJsonString());
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
