using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QlWeb2.Content;

namespace QlWeb2.Areas.Admin.Controllers;

/// <summary>
/// The picture library as a page of its own.
///
/// The rules about what may be uploaded live in <see cref="MediaLibrary"/> rather than here,
/// because the editor's image picker takes uploads too and two copies of "is this really a JPEG"
/// is one copy too many - the day one of them learns about a new format, the other would not.
/// </summary>
[Area("Admin")]
[Authorize]
public class MediaController : Controller
{
    private readonly MediaLibrary _media;
    public MediaController(MediaLibrary media) => _media = media;

    public IActionResult Index() => View(_media.All());

    [HttpPost]
    [ValidateAntiForgeryToken]
    [RequestSizeLimit(MediaLibrary.MaxBytes)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            TempData["Error"] = "No file was chosen.";
            return RedirectToAction(nameof(Index));
        }

        await using var stream = file.OpenReadStream();
        var saved = await _media.Accept(stream, file.FileName, file.Length);
        if (saved.Name is null) TempData["Error"] = saved.Error;
        else TempData["Flash"] = $"Uploaded as {saved.Name}. Use that name in an image field.";

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Delete(string name)
    {
        var error = _media.Delete(name);
        if (error is null) TempData["Flash"] = $"Deleted {Path.GetFileName(name ?? "")}.";
        else TempData["Error"] = error;
        return RedirectToAction(nameof(Index));
    }
}
