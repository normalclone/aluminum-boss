using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;

namespace QlWeb2.Content;

/// <summary>
/// Gui moi yeu cau lien he toi hop thu cua khach (02/11/2026: "sau khi nop contact thi gui ve
/// export@bossdoor.vn").
///
/// Qua HTTP API cua Brevo chu khong qua SMTP: may chu nhieu noi chan cong 587, cong 443 thi luon
/// mo. Nguoi gui la no-reply@bossg.vn - ten mien da xac thuc tren Brevo, nen thu khong roi vao
/// Spam. Reply-To la dia chi nguoi dien form, bam Reply la tra loi thang ho.
///
/// Thu la thu yeu cau DA LUU, khong thay cho viec luu. Gui loi chi ghi log: yeu cau van nam trong
/// Admin > Enquiries. Khoa API nam trong /etc/qlweb2/mail.env (Mail__ApiKey), khong nam trong repo;
/// khong co khoa thi khong gui gi ca.
/// </summary>
public sealed class EnquiryMail
{
    private const string Endpoint = "https://api.brevo.com/v3/smtp/email";

    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<EnquiryMail> _log;

    public EnquiryMail(IConfiguration config, IHttpClientFactory http, ILogger<EnquiryMail> log)
    {
        _config = config;
        _http = http;
        _log = log;
    }

    private string? Setting(string key) => _config["Mail:" + key] is { Length: > 0 } v ? v : null;

    /// <summary>Gui o nen: nguoi bam Send khong phai cho Brevo tra loi.</summary>
    public void SendLater(Enquiries.Enquiry e)
    {
        if (Setting("ApiKey") is null || Setting("To") is null) return;
        _ = Task.Run(async () =>
        {
            try { await Send(e); }
            catch (Exception ex) { _log.LogError(ex, "Khong gui duoc thu cho yeu cau lien he"); }
        });
    }

    public async Task Send(Enquiries.Enquiry e)
    {
        var body = Build(e, Setting("To")!, Setting("FromEmail") ?? "no-reply@bossg.vn",
                         Setting("FromName") ?? "Aluminum Boss website");
        using var req = new HttpRequestMessage(HttpMethod.Post, Endpoint) { Content = JsonContent.Create(body) };
        req.Headers.Add("api-key", Setting("ApiKey"));
        req.Headers.Add("accept", "application/json");
        using var res = await _http.CreateClient().SendAsync(req);
        if (res.IsSuccessStatusCode)
            _log.LogInformation("Da gui thu yeu cau lien he toi {To}", Setting("To"));
        else
            _log.LogError("Brevo tu choi thu yeu cau lien he: {Status} {Body}",
                (int)res.StatusCode, await res.Content.ReadAsStringAsync());
    }

    /// <summary>"f-contact-name" -> "Contact name": nguoi doc thu thay dung nhan tren form.</summary>
    public static string Label(string key)
    {
        var k = key.StartsWith("f-") ? key[2..] : key;
        k = k.Replace('-', ' ');
        return k.Length == 0 ? key : char.ToUpperInvariant(k[0]) + k[1..];
    }

    /// <summary>Than yeu cau gui Brevo. Tach rieng de kiem ma khong goi mang.</summary>
    public static JsonObject Build(Enquiries.Enquiry e, string to, string fromEmail, string fromName)
    {
        string? F(string k) => e.Fields.TryGetValue(k, out var v) ? v : null;
        // Ten truong la "f-" + nhan cua o tren form (contact-detail.js): "Contact name" -> f-contact-name.
        var name = F("f-contact-name") ?? "";
        var company = F("f-company") ?? "";
        var email = F("f-email");

        var text = new StringBuilder();
        text.Append("New enquiry from the website contact form\n");
        text.Append("Time (UTC): ").Append(e.At.ToString("yyyy-MM-dd HH:mm")).Append('\n');
        if (e.Route.Length > 0) text.Append("Page: ").Append(e.Route).Append('\n');
        text.Append('\n');
        foreach (var (k, v) in e.Fields) text.Append(Label(k)).Append(": ").Append(v).Append('\n');

        var who = string.Join(", ", new[] { name, company }.Where(x => x.Length > 0));
        var subject = "Website enquiry" + (who.Length > 0 ? " from " + who : "")
                    + (e.Route.Length > 0 ? " (" + e.Route + ")" : "");
        var mail = new JsonObject
        {
            ["sender"] = new JsonObject { ["email"] = fromEmail, ["name"] = fromName },
            ["to"] = new JsonArray(new JsonObject { ["email"] = to }),
            ["subject"] = subject.Length > 200 ? subject[..200] : subject,
            ["textContent"] = text.ToString(),
        };
        // Chi dat Reply-To khi trong giong mot dia chi that; Brevo tu choi ca thu neu dia chi hong.
        if (email is not null && System.Net.Mail.MailAddress.TryCreate(email, out var a) && a.Address == email.Trim())
            mail["replyTo"] = new JsonObject { ["email"] = a.Address, ["name"] = name.Length > 0 ? name : a.Address };
        return mail;
    }
}
