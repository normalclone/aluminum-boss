using System.Collections.Concurrent;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace QlWeb2.Content;

/// <summary>
/// What somebody typed into the contact form, kept where the site owner can read it.
///
/// The form has been on the site since the beginning and until now it posted nowhere - it said so,
/// in a line that had to go before handover. Saying "we got it" without keeping it would be worse
/// than the demo notice was.
///
/// One line of JSON per enquiry, appended. No table, no schema, no migration: an enquiry is
/// written once and read by a person, the file opens in any text editor, and the whole of the
/// backup instructions is "copy App_Data".
///
/// It is a public endpoint on the open internet, so it is written assuming abuse: fields are
/// capped, a hidden field nobody should fill catches the simplest robots, and one address gets a
/// handful of submissions an hour.
/// </summary>
public sealed class Enquiries
{
    private const int MaxField = 4000;
    private const int PerHour = 8;

    private readonly string _file;
    private readonly ILogger<Enquiries>? _log;
    private readonly object _lock = new();
    private readonly ConcurrentDictionary<string, List<DateTime>> _recent = new();

    private static readonly JsonSerializerOptions Line = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public Enquiries(IWebHostEnvironment env, ILogger<Enquiries>? log = null)
    {
        var dir = Path.Combine(env.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dir);
        _file = Path.Combine(dir, "enquiries.jsonl");
        _log = log;
    }

    public record Enquiry(DateTime At, string Route, Dictionary<string, string> Fields);

    public enum Outcome { Saved, TooMany, Empty }

    public Outcome Take(string route, IDictionary<string, string> fields, string who)
    {
        // A field no human sees and no human fills. A robot filling in everything it finds is the
        // commonest kind there is, and this costs one hidden input to turn away.
        if (fields.TryGetValue("website", out var trap) && trap.Length > 0) return Outcome.Saved;

        var kept = fields
            .Where(f => f.Key != "website" && f.Value.Trim().Length > 0)
            .ToDictionary(f => Clip(f.Key, 60), f => Clip(f.Value.Trim(), MaxField));

        if (kept.Count == 0) return Outcome.Empty;
        if (!Allow(who)) return Outcome.TooMany;

        var enquiry = new Enquiry(DateTime.UtcNow, Clip(route, 60), kept);
        lock (_lock)
        {
            try
            {
                File.AppendAllText(_file, JsonSerializer.Serialize(enquiry, Line) + "\n");
            }
            catch (Exception e)
            {
                // Losing an enquiry silently is the one outcome worth shouting about: the person
                // who sent it has been told it arrived.
                _log?.LogError(e, "Không ghi được yêu cầu liên hệ từ {Route}", route);
            }
        }
        return Outcome.Saved;
    }

    /// <summary>Newest first, for the screen that reads them.</summary>
    public List<Enquiry> All(int limit = 200)
    {
        if (!File.Exists(_file)) return [];

        var out_ = new List<Enquiry>();
        foreach (var line in File.ReadLines(_file))
        {
            if (line.Length == 0) continue;
            try
            {
                if (JsonSerializer.Deserialize<Enquiry>(line, Line) is { } e) out_.Add(e);
            }
            catch (JsonException) { /* one bad line is not a reason to show none */ }
        }
        out_.Reverse();
        return out_.Take(limit).ToList();
    }

    private bool Allow(string who)
    {
        var now = DateTime.UtcNow;
        var seen = _recent.GetOrAdd(who, _ => []);
        lock (seen)
        {
            seen.RemoveAll(t => now - t > TimeSpan.FromHours(1));
            if (seen.Count >= PerHour) return false;
            seen.Add(now);
            return true;
        }
    }

    private static string Clip(string s, int max) => s.Length <= max ? s : s[..max];
}
