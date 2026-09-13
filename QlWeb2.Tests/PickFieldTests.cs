using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// The three fields of a finish that have to be one of a set.
///
/// A wrong value here does not fail, which is the whole reason for the check: a gloss typed as
/// "satin" takes that finish out of the Gloss filter, and a family that no longer matches a row
/// in familySpecs turns three rows of its own specification table into em dashes. Both happen
/// quietly and are noticed weeks later, by a client who thinks they broke it.
///
/// The editor draws these as a list to choose from. A list on a screen is not a control - the
/// same address can be posted by anything that can reach /Admin/Edit/Save - so the refusal lives
/// here, on the only door to the files.
/// </summary>
public class PickFieldTests : IDisposable
{
    private readonly string _root;
    private readonly ContentStore _store;
    private readonly ContentEditor _editor;

    public PickFieldTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "abpick-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(Path.Combine(_root, "_data"));

        File.WriteAllText(Path.Combine(_root, "_data", "colors.json"), """
        {
          "filters": [
            { "id": "family", "label": "Finish", "options": ["Anodised", "Powder coated"] },
            { "id": "use", "label": "Use", "options": ["Interior", "Exterior"] },
            { "id": "gloss", "label": "Gloss", "options": ["Matt", "Satin"] }
          ],
          "items": [
            { "id": "an-natural", "name": "Natural Silver", "family": "Anodised",
              "use": "Exterior", "gloss": "Satin", "note": "Anything at all." }
          ],
          "familySpecs": {
            "Anodised":      { "layer": "15 µm", "std": "QUALANOD", "warranty": "10 years" },
            "Powder coated": { "layer": "60 µm", "std": "QUALICOAT", "warranty": "15 years" }
          }
        }
        """);

        _store = new ContentStore(Path.Combine(_root, "_data"));
        _editor = new ContentEditor(_store, _root);
    }

    public void Dispose()
    {
        try { Directory.Delete(_root, recursive: true); } catch { /* temp dir */ }
    }

    private string? Now(string path) => ContentPath.Resolve(_store.Get("colors"), path);

    [Theory]
    [InlineData("items.0.gloss", "Matt")]
    [InlineData("items.0.use", "Interior")]
    [InlineData("items.0.family", "Powder coated")]
    public void Takes_a_value_that_is_on_the_list(string path, string value)
    {
        var result = _editor.Apply([new ContentEditor.Change("colors." + path, value)]);

        Assert.Equal(1, result.Applied);
        Assert.Empty(result.Rejected);
        Assert.Equal(value, Now(path));
    }

    [Theory]
    [InlineData("items.0.gloss", "satin")]          // the real one, in the wrong case
    [InlineData("items.0.gloss", "Eggshell")]
    [InlineData("items.0.use", "Marine")]           // plausible, and not in this file
    [InlineData("items.0.family", "Wood grain")]    // a family with no row in familySpecs
    [InlineData("items.0.family", "")]
    public void Refuses_a_value_that_is_not(string path, string value)
    {
        var was = Now(path);

        var result = _editor.Apply([new ContentEditor.Change("colors." + path, value)]);

        Assert.Equal(0, result.Applied);
        Assert.Single(result.Rejected);
        Assert.Equal(was, Now(path));
    }

    [Fact]
    public void A_refused_field_does_not_take_the_rest_of_the_save_with_it()
    {
        // A batch is one save. Losing the note because the gloss beside it was wrong would make
        // one bad value look like a broken screen.
        var result = _editor.Apply([
            new ContentEditor.Change("colors.items.0.gloss", "satin"),
            new ContentEditor.Change("colors.items.0.note", "Written the same second."),
        ]);

        Assert.Equal(1, result.Applied);
        Assert.Equal(["colors.items.0.gloss"], result.Rejected);
        Assert.Equal("Satin", Now("items.0.gloss"));
        Assert.Equal("Written the same second.", Now("items.0.note"));
    }

    [Fact]
    public void Leaves_every_other_field_free_to_say_anything()
    {
        // The check is three named fields of one document, not a mood. A note is prose and a name
        // is a name; narrowing either would be a different bug with the same shape.
        var result = _editor.Apply([new ContentEditor.Change("colors.items.0.name", "Satin")]);

        Assert.Equal(1, result.Applied);
        Assert.Empty(result.Rejected);
    }
}
