using System.Text;

namespace QlWeb2.Content;

/// <summary>
/// The grey stand-in drawn where a photograph will go, as a data URI.
///
/// A port of AB.ph from wwwroot/_app/app.js, and it has to stay a port: the same section can be
/// drawn by the server for a first load and by the browser while someone is editing, and two
/// placeholders that differ would show as a flicker on every keystroke.
///
/// It states its own pixel size and simplified ratio, because whoever supplies the real
/// photographs has to know what to crop to and reading that off a stylesheet is not reasonable.
/// Everything is sized as a fraction of the image rather than in absolute pixels: a placeholder
/// is almost never displayed at its own size, and an absolute 28px label on a 1920-wide image
/// renders at about 6px once the layout scales it into a card.
/// </summary>
public static class Placeholder
{
    private const string Bg = "#d9d6d1", Edge = "#c2beb7", Fg = "#6f6a62";

    /// <summary>
    /// The ratio, reduced. 1364x620 reads as 11:5; something that will not reduce to a short
    /// pair is given as a decimal, with the 1 on the side that keeps the number above one -
    /// "1:1.32" is read straight off, "0.76:1" has to be worked out.
    /// </summary>
    public static string Ratio(int w, int h)
    {
        int a = w, b = h;
        while (b != 0) { (a, b) = (b, a % b); }
        int rw = w / a, rh = h / a;
        if (rw <= 32 && rh <= 32) return $"{rw}:{rh}";
        return w >= h
            ? $"{Math.Round((double)w / h, 2)}:1"
            : $"1:{Math.Round((double)h / w, 2)}";
    }

    public static string Uri(int width, int height, string? label)
    {
        var fs = Math.Max(10, (int)Math.Round(Math.Min(width, height) / 10.0));
        var sfs = Math.Max(10, (int)Math.Round(fs * 0.72));

        var words = (label ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var perLine = Math.Max(8, (int)(width / (fs * 0.58)));
        var lines = new List<string>();
        var line = new StringBuilder();
        foreach (var w in words)
        {
            if (line.Length > 0 && line.Length + 1 + w.Length > perLine)
            {
                lines.Add(line.ToString());
                line.Clear();
            }
            if (line.Length > 0) line.Append(' ');
            line.Append(w);
        }
        if (line.Length > 0) lines.Add(line.ToString());
        if (lines.Count > 2) lines = lines.Take(2).ToList();

        var spec = $"{width}×{height}  ·  {Ratio(width, height)}";

        // Absolute positions, not em offsets: the spec line is set in a smaller font, so an em
        // shift on it means something different from an em shift on the label above, and a
        // two-line label runs straight through the spec.
        var lineH = fs * 1.25;
        var specH = sfs * 1.7;
        var top = (height - (lines.Count * lineH + specH)) / 2;

        var text = new StringBuilder();
        for (var i = 0; i < lines.Count; i++)
        {
            var y = (int)Math.Round(top + i * lineH + fs * 0.82);
            text.Append($"<tspan x=\"50%\" y=\"{y}\">{Esc(lines[i])}</tspan>");
        }
        var specY = (int)Math.Round(top + lines.Count * lineH + sfs * 1.0);

        // Corner ticks: at small sizes the one-pixel frame disappears into whatever is behind it,
        // and the point of a placeholder is that the shape of the hole is obvious.
        var t = Math.Max(6, (int)Math.Round(Math.Min(width, height) * 0.07));
        var tw = Math.Max(1, (int)Math.Round(Math.Min(width, height) / 160.0));
        var ticks = new StringBuilder();
        foreach (var (x, y, dx, dy) in new[]
                 {
                     (0, 0, t, 0), (0, 0, 0, t),
                     (width, 0, -t, 0), (width, 0, 0, t),
                     (0, height, t, 0), (0, height, 0, -t),
                     (width, height, -t, 0), (width, height, 0, -t),
                 })
            ticks.Append($"<path d=\"M{x} {y}l{dx} {dy}\"/>");

        var svg =
            $"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" " +
            $"viewBox=\"0 0 {width} {height}\">" +
            $"<rect width=\"{width}\" height=\"{height}\" fill=\"{Bg}\"/>" +
            $"<rect x=\"0.5\" y=\"0.5\" width=\"{width - 1}\" height=\"{height - 1}\" " +
            $"fill=\"none\" stroke=\"{Edge}\"/>" +
            $"<g stroke=\"{Fg}\" stroke-width=\"{tw}\" fill=\"none\" opacity=\".5\">{ticks}</g>" +
            $"<text text-anchor=\"middle\" font-family=\"Helvetica,Arial,sans-serif\" " +
            $"font-size=\"{fs}\" fill=\"{Fg}\">{text}</text>" +
            $"<text x=\"50%\" y=\"{specY}\" text-anchor=\"middle\" " +
            $"font-family=\"Helvetica,Arial,sans-serif\" font-size=\"{sfs}\" fill=\"{Fg}\" " +
            $"opacity=\".72\" letter-spacing=\"0.06em\">{Esc(spec)}</text></svg>";

        // System.Uri spelled out: this class has a method called Uri, and inside the class the
        // method wins the name lookup over the type.
        return "data:image/svg+xml," + System.Uri.EscapeDataString(svg);
    }

    private static string Esc(string s) => s
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;");
}
