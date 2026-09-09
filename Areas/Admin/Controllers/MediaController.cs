using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace QlWeb2.Areas.Admin.Controllers;

[Area("Admin")]
[Authorize]
public class MediaController : Controller
{
    /// <summary>Where the site already looks for its pictures.</summary>
    private const string Folder = "_media";

    private const long MaxBytes = 20 * 1024 * 1024;

    /// <summary>
    /// What may be uploaded, by both extension and file signature.
    ///
    /// SVG is deliberately absent. An SVG is a document that may carry script, so accepting one
    /// through a form the site owner is told is for pictures would put stored cross-site scripting
    /// on the public site. The only SVG here is the favicon, which a developer placed.
    /// </summary>
    private static readonly Dictionary<string, byte[][]> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = new[] { new byte[] { 0xFF, 0xD8, 0xFF } },
        [".jpeg"] = new[] { new byte[] { 0xFF, 0xD8, 0xFF } },
        [".png"] = new[] { new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
        [".webp"] = new[] { new byte[] { 0x52, 0x49, 0x46, 0x46 } },
        [".gif"] = new[] { new byte[] { 0x47, 0x49, 0x46, 0x38 } },
    };

    private readonly IWebHostEnvironment _env;
    public MediaController(IWebHostEnvironment env) => _env = env;

    public IActionResult Index()
    {
        var dir = Path.Combine(_env.WebRootPath, Folder);
        Directory.CreateDirectory(dir);

        var files = new DirectoryInfo(dir).GetFiles()
            .Where(f => Allowed.ContainsKey(f.Extension))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new MediaItem(f.Name, f.Length, f.LastWriteTimeUtc))
            .ToList();

        return View(files);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(MaxBytes)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            TempData["Error"] = "No file was chosen.";
            return RedirectToAction(nameof(Index));
        }

        if (file.Length > MaxBytes)
        {
            TempData["Error"] = "That file is larger than 20 MB. Please resize it first.";
            return RedirectToAction(nameof(Index));
        }

        var ext = Path.GetExtension(file.FileName);
        if (!Allowed.TryGetValue(ext, out var signatures))
        {
            TempData["Error"] = "Pictures only: JPG, PNG, WebP or GIF. "
                              + "If this came from an iPhone, set the camera to \"Most Compatible\" and try again.";
            return RedirectToAction(nameof(Index));
        }

        // Trusting the extension alone would let anything through under a picture's name.
        await using var stream = file.OpenReadStream();
        var head = new byte[8];
        var read = await stream.ReadAsync(head);
        if (!signatures.Any(sig => read >= sig.Length && head.Take(sig.Length).SequenceEqual(sig)))
        {
            TempData["Error"] = "That file is not the kind of picture its name says it is.";
            return RedirectToAction(nameof(Index));
        }
        stream.Position = 0;

        var dir = Path.Combine(_env.WebRootPath, Folder);
        Directory.CreateDirectory(dir);

        var name = SafeName(Path.GetFileNameWithoutExtension(file.FileName));
        // A short content hash in the name means re-uploading the same picture is harmless and a
        // replaced picture gets a new address, so no browser keeps showing the old one.
        var hash = await ShortHash(stream);
        stream.Position = 0;

        var final = $"{name}-{hash}{ext.ToLowerInvariant()}";
        var path = Path.Combine(dir, final);

        if (!System.IO.File.Exists(path))
        {
            await using var target = System.IO.File.Create(path);
            await stream.CopyToAsync(target);
        }

        TempData["Flash"] = $"Uploaded as {final}. Use that name in an image field.";
        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Delete(string name)
    {
        var safe = Path.GetFileName(name ?? "");
        var dir = Path.GetFullPath(Path.Combine(_env.WebRootPath, Folder));
        var path = Path.GetFullPath(Path.Combine(dir, safe));

        // Only inside the media folder, whatever the name claims to be.
        if (!path.StartsWith(dir, StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(path))
        {
            TempData["Error"] = "That picture was not found.";
            return RedirectToAction(nameof(Index));
        }

        if (safe.Equals("hero-profile.jpg", StringComparison.OrdinalIgnoreCase) ||
            safe.Equals("favicon.svg", StringComparison.OrdinalIgnoreCase))
        {
            TempData["Error"] = "That one is used by the site's own layout and cannot be deleted here.";
            return RedirectToAction(nameof(Index));
        }

        System.IO.File.Delete(path);
        TempData["Flash"] = $"Deleted {safe}.";
        return RedirectToAction(nameof(Index));
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

    public record MediaItem(string Name, long Bytes, DateTime Modified);
}
