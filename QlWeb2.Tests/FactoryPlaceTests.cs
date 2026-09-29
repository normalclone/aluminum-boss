using System.Text.Json.Nodes;
using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// Where a factory stands on the map, and what it is.
///
/// Until 29/09/2026 a factory's pin could not be moved from the screen at all: the province under
/// its name was words, and the coordinates were the demo's. The client renamed all five and every
/// pin stayed where the demo had put it. What is tested here is that choosing a place moves the
/// pin, that nothing but a place off the list can do so, and that the two fields can be written
/// onto the sites that were saved before they existed - which is every site on the live server.
/// </summary>
public class FactoryPlaceTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public FactoryPlaceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abfac-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));

        // The shape of the live file: renamed, re-provinced, and still at the demo's coordinates.
        File.WriteAllText(Path.Combine(_root, "_data", "factories.json"), """
        {
          "section": "Factories",
          "sites": [
            { "id": "yb", "name": "TAN TRUONG SON FACTORY", "region": "Ha Noi", "lat": 21.72, "lon": 104.9,
              "desc": "", "since": "2009", "output": "6k t/yr", "tone": [228, 226, 221], "vein": [176, 170, 160] },
            { "id": "bd", "name": "BOSS BINH PHUOC FACTORY", "region": "Binh Phuoc", "lat": 11.16, "lon": 106.68,
              "desc": "", "since": "2016", "output": "9k t/yr", "tone": [226, 223, 216], "vein": [170, 164, 154] }
          ]
        }
        """);
        File.WriteAllText(Path.Combine(_root, "_data", "news.json"), """
        { "items": [ { "id": "a", "title": "A", "place": "" } ] }
        """);

        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private JsonObject Site(int i) => (JsonObject)_store.Get("factories")!["sites"]![i]!;
    private double N(int i, string f) => Site(i)[f]!.GetValue<double>();
    private ContentEditor.Result Save(string address, string value)
        => _editor.Apply([new ContentEditor.Change(address, value)]);

    // ---- the list itself -----------------------------------------------------------------------

    [Fact]
    public void Offers_all_63_provinces_once_each_and_every_one_inside_Vietnam()
    {
        Assert.Equal(63, Places.All.Length);
        Assert.Equal(63, Places.Names.Distinct().Count());
        Assert.All(Places.All, p =>
        {
            Assert.InRange(p.Lat, 8.5, 23.4);
            Assert.InRange(p.Lon, 102.1, 109.5);
        });
    }

    [Theory]
    [InlineData(21.72, 104.9, "Yen Bai")]        // the five demo pins
    [InlineData(19.81, 105.78, "Thanh Hoa")]
    [InlineData(18.68, 105.68, "Nghe An")]
    [InlineData(13.78, 109.22, "Binh Dinh")]
    [InlineData(11.16, 106.68, "Binh Duong")]
    public void Names_the_province_a_pin_is_standing_in(double lat, double lon, string name)
        => Assert.Equal(name, Places.Nearest(lat, lon)?.Name);

    [Fact]
    public void Names_nothing_for_a_point_far_from_every_province()
    {
        Assert.Null(Places.Nearest(0, 0));            // a factory added a minute ago
        Assert.Null(Places.Nearest(16.48, 111.95));   // Hoang Sa: on the map, but not a seat
    }

    // ---- choosing a place moves the pin -------------------------------------------------------

    [Fact]
    public void Choosing_a_place_writes_it_and_moves_the_pin_there()
    {
        var r = Save("factories.sites.0.place", "Ha Noi");

        Assert.Equal(1, r.Applied);
        Assert.Empty(r.Rejected);
        Assert.Equal("Ha Noi", Site(0)["place"]!.GetValue<string>());
        Assert.Equal(21.028, N(0, "lat"), 3);
        Assert.Equal(105.854, N(0, "lon"), 3);
        Assert.Equal(11.16, N(1, "lat"), 3);          // the other site did not move
    }

    [Fact]
    public void The_coordinates_stay_numbers()
    {
        Save("factories.sites.1.place", "Ho Chi Minh City");
        var text = File.ReadAllText(Path.Combine(_root, "_data", "factories.json"));
        Assert.Contains("\"lat\": 10.776", text);
        Assert.DoesNotContain("\"lat\": \"", text);
    }

    [Theory]
    [InlineData("Hanoi")]                // near enough for a person, not for the map
    [InlineData("ha noi")]
    [InlineData("")]
    [InlineData("Paris")]
    public void Refuses_a_place_that_is_not_on_the_list(string place)
    {
        var r = Save("factories.sites.0.place", place);

        Assert.Equal(["factories.sites.0.place"], r.Rejected);
        Assert.Null(Site(0)["place"]);
        Assert.Equal(21.72, N(0, "lat"), 3);
    }

    // ---- what kind of place --------------------------------------------------------------------

    [Theory]
    [InlineData("Factory")]
    [InlineData("Warehouse")]
    public void Takes_either_kind(string kind)
    {
        Assert.Empty(Save("factories.sites.1.kind", kind).Rejected);
        Assert.Equal(kind, Site(1)["kind"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("warehouse")]
    [InlineData("Store")]
    public void Refuses_any_other_kind(string kind)
        => Assert.Equal(["factories.sites.1.kind"], Save("factories.sites.1.kind", kind).Rejected);

    // ---- how narrow the exception is -----------------------------------------------------------

    [Theory]
    [InlineData("factories.sites.0.lat")]         // the coordinates themselves stay out of reach
    [InlineData("factories.sites.0.city")]        // not one of the two names
    [InlineData("factories.sites.9.place")]       // no such site
    [InlineData("factories.place")]
    public void Still_refuses_to_invent_any_other_address(string address)
        => Assert.Equal([address], Save(address, "Ha Noi").Rejected);

    [Fact]
    public void Leaves_a_field_called_place_in_another_document_alone()
        => Assert.Empty(Save("news.items.0.place", "anything at all").Rejected);

    // ---- what the editor is shown --------------------------------------------------------------

    [Fact]
    public void An_old_site_shows_the_province_its_pin_is_in_and_Factory()
    {
        var html = new SectionRenderer(_store).Render("factories-list", "") ?? "";

        Assert.Contains("data-ab-pick=\".sites.0.place\"", html);
        Assert.Matches(@"data-ab-pick=""\.sites\.0\.place""[^>]*>Yen Bai<", html);
        Assert.Matches(@"data-ab-pick=""\.sites\.0\.kind""[^>]*>Factory<", html);
        Assert.DoesNotContain("vfx-fkind", html);
    }

    [Fact]
    public void A_warehouse_says_so_on_the_list()
    {
        Save("factories.sites.1.kind", "Warehouse");
        var html = new SectionRenderer(_store).Render("factories-list", "") ?? "";
        Assert.Contains("<p class=\"vfx-fkind\">Warehouse</p>", html);
    }
}
