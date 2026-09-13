namespace QlWeb2.Content;

using System.Security.Cryptography;

/// <summary>
/// The site's pictures: what is in the folder, and what is allowed into it.
///
/// Two screens put pictures here - the library page and the image picker inside the editor - and
/// the rules about what may be uploaded are the kind that must not exist in two copies. The
/// interesting one is that SVG is refused: an SVG is a document that can carry script, so
/// accepting one through a form labelled "pictures" would put stored cross-site scripting on the
/// public site.
/// </summary>
public sealed class MediaLibrary
{
    /// <summary>Where the site already looks for its pictures.</summary>
    public const string Folder = "_media";

    public const long MaxBytes = 20 * 1024 * 1024;

    /// <summary>What may be uploaded, by extension and by the bytes the file actually starts with.</summary>
    private static readonly Dictionary<string, byte[][]> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = [[0xFF, 0xD8, 0xFF]],
        [".jpeg"] = [[0xFF, 0xD8, 0xFF]],
        [".png"] = [[0x89, 0x50, 0x4E, 0x47]],
        [".webp"] = [[0x52, 0x49, 0x46, 0x46]],
        [".gif"] = [[0x47, 0x49, 0x46, 0x38]],
    };

    private readonly string _dir;

    public MediaLibrary(IWebHostEnvironment env)
        => _dir = Path.Combine(env.WebRootPath ?? "wwwroot", Folder);

    public record Picture(string Name, long Bytes, DateTime Modified);

    public bool Accepts(string extension) => Allowed.ContainsKey(extension);

    /// <summary>Newest first, because the one somebody wants is almost always the one just added.</summary>
    public List<Picture> All()
    {
        Directory.CreateDirectory(_dir);
        return new DirectoryInfo(_dir).GetFiles()
            .Where(f => Allowed.ContainsKey(f.Extension))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new Picture(f.Name, f.Length, f.LastWriteTimeUtc))
            .ToList();
    }

    public record Saved(string? Name, string? Error);

    /// <summary>
    /// Takes one uploaded file, or says in plain words why it will not.
    ///
    /// The stored name carries a short hash of the content, so uploading the same picture twice
    /// is harmless and replacing a picture gives it a new address - no browser is left showing
    /// the old one from its cache.
    /// </summary>
    public async Task<Saved> Accept(Stream content, string fileName, long length)
    {
        if (length == 0) return new Saved(null, "That file is empty.");
        if (length > MaxBytes)
            return new Saved(null, "That file is larger than 20 MB. Please resize it first.");

        var ext = Path.GetExtension(fileName);
        if (!Allowed.TryGetValue(ext, out var signatures))
            return new Saved(null, "Pictures only: JPG, PNG, WebP or GIF. "
                + "If this came from an iPhone, set the camera to \"Most Compatible\" and try again.");

        // Trusting the extension alone would let anything through under a picture's name.
        var head = new byte[8];
        var read = await content.ReadAsync(head);
        if (!signatures.Any(sig => read >= sig.Length && head.Take(sig.Length).SequenceEqual(sig)))
            return new Saved(null, "That file is not the kind of picture its name says it is.");
        content.Position = 0;

        Directory.CreateDirectory(_dir);
        var stem = SafeName(Path.GetFileNameWithoutExtension(fileName));
        var hash = await ShortHash(content);
        content.Position = 0;

        var final = $"{stem}-{hash}{ext.ToLowerInvariant()}";
        var path = Path.Combine(_dir, final);
        if (!File.Exists(path))
        {
            await using var target = File.Create(path);
            await content.CopyToAsync(target);
        }
        return new Saved(final, null);
    }

    /// <summary>Removes a picture, refusing anything that is not one of ours.</summary>
    public string? Delete(string name)
    {
        var safe = Path.GetFileName(name ?? "");
        var dir = Path.GetFullPath(_dir);
        var path = Path.GetFullPath(Path.Combine(dir, safe));

        if (!path.StartsWith(dir, StringComparison.OrdinalIgnoreCase) || !File.Exists(path))
            return "That picture was not found.";

        if (safe.Equals("hero-profile.jpg", StringComparison.OrdinalIgnoreCase) ||
            safe.Equals("favicon.svg", StringComparison.OrdinalIgnoreCase))
            return "That one is used by the site's own layout and cannot be deleted here.";

        File.Delete(path);
        return null;
    }

    private static string SafeName(string raw)
    {
        var chars = raw.ToLowerInvariant()
            .Select(c => char.IsAsciiLetterOrDigit(c) ? c : '-')
            .ToArray();
        var s = new string(chars).Trim('-');
        while (s.Contains("--")) s = s.Replace("--", "-");
        if (s.Length == 0) s = "picture";
        return s.Length > 48 ? s[..48].Trim('-') : s;
    }

    private static async Task<string> ShortHash(Stream stream)
    {
        using var sha = SHA256.Create();
        var digest = await sha.ComputeHashAsync(stream);
        return Convert.ToHexString(digest)[..6].ToLowerInvariant();
    }
}
