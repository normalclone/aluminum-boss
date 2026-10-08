using System.Security.Cryptography;

namespace QlWeb2.Content;

/// <summary>
/// The PDFs behind the Documents section: <c>wwwroot/_docs</c>.
///
/// Until 08/10/2026 every document's file was <c>_docs/&lt;id&gt;.pdf</c>, put there by hand,
/// and a client could not add a document at all. Now a document may name its own file, uploaded
/// from the editor; the old ones keep working by their id.
///
/// The same rules as <see cref="MediaLibrary"/>, for the same reasons: the file must be what its
/// name says (a PDF starts with "%PDF-"), and the stored name carries a short hash of the content,
/// so a replaced file gets a new address and no browser keeps showing the old one.
/// </summary>
public class DocumentFiles
{
    public const string Folder = "_docs";

    /// <summary>Catalogues run long and are scanned more often than not. Matches nginx.</summary>
    public const long MaxBytes = 40 * 1024 * 1024;

    private static readonly byte[] Pdf = "%PDF-"u8.ToArray();
    private readonly string _dir;

    public DocumentFiles(IWebHostEnvironment env)
        => _dir = Path.Combine(env.WebRootPath ?? "wwwroot", Folder);

    public DocumentFiles(string webRoot) => _dir = Path.Combine(webRoot, Folder);

    public record Saved(string? Name, string? Error);

    /// <summary>Takes one uploaded PDF, or says in plain words why it will not.</summary>
    public async Task<Saved> Accept(Stream content, string fileName, long length)
    {
        if (length == 0) return new Saved(null, "That file is empty.");
        if (length > MaxBytes)
            return new Saved(null, "That file is larger than 40 MB. Please save a smaller PDF (reduce the picture quality) and try again.");
        if (!Path.GetExtension(fileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            return new Saved(null, "PDF files only.");

        var head = new byte[Pdf.Length];
        var read = await content.ReadAsync(head);
        if (read < Pdf.Length || !head.SequenceEqual(Pdf))
            return new Saved(null, "That file is not a PDF, whatever its name says.");
        content.Position = 0;

        Directory.CreateDirectory(_dir);
        var stem = SafeName(Path.GetFileNameWithoutExtension(fileName));
        string hash;
        using (var sha = SHA256.Create())
            hash = Convert.ToHexString(await sha.ComputeHashAsync(content))[..6].ToLowerInvariant();
        content.Position = 0;

        var final = $"{stem}-{hash}.pdf";
        var path = Path.Combine(_dir, final);
        if (!File.Exists(path))
        {
            await using var target = File.Create(path);
            await content.CopyToAsync(target);
        }
        return new Saved(final, null);
    }

    /// <summary>
    /// A value that may stand in a document's "file": empty (use the id), or the name of one
    /// PDF in this folder - no path, no folder, nothing hidden.
    /// </summary>
    public static bool IsName(string value)
        => value.Length == 0
        || (Path.GetFileName(value) == value && !value.StartsWith('.') && !value.Contains('\\')
            && value.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase));

    private static string SafeName(string raw)
    {
        var chars = raw.ToLowerInvariant().Select(c => char.IsAsciiLetterOrDigit(c) ? c : '-').ToArray();
        var s = new string(chars).Trim('-');
        while (s.Contains("--")) s = s.Replace("--", "-");
        if (s.Length == 0) s = "document";
        return s.Length > 48 ? s[..48].Trim('-') : s;
    }
}
