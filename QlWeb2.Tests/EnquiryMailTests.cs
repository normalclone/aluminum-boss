using QlWeb2.Content;

namespace QlWeb2.Tests;

/// <summary>
/// Thu gui cho moi yeu cau lien he (02/11/2026): toi export@bossdoor.vn, qua Brevo.
/// Chi kiem than thu - khong goi mang.
/// </summary>
public class EnquiryMailTests
{
    private static Enquiries.Enquiry Quote(string email) => new(
        new DateTime(2026, 10, 16, 13, 45, 0, DateTimeKind.Utc), "quote",
        new Dictionary<string, string>
        {
            ["f-company"] = "Mayur Hardware",
            ["f-contact-name"] = "Khushwant",
            ["f-email"] = email,
            ["f-estimated-annual-tonnage"] = "30",
        });

    [Fact]
    public void The_mail_goes_to_the_inbox_from_the_verified_sender()
    {
        var m = EnquiryMail.Build(Quote("k@example.com"), "export@bossdoor.vn", "no-reply@bossg.vn", "Site");
        Assert.Equal("export@bossdoor.vn", m["to"]![0]!["email"]!.ToString());
        Assert.Equal("no-reply@bossg.vn", m["sender"]!["email"]!.ToString());
        Assert.Equal("Website enquiry from Khushwant, Mayur Hardware (quote)", m["subject"]!.ToString());
    }

    [Fact]
    public void Reply_goes_to_the_person_who_filled_the_form()
        => Assert.Equal("k@example.com",
            EnquiryMail.Build(Quote("k@example.com"), "a@b.c", "d@e.f", "S")["replyTo"]!["email"]!.ToString());

    [Fact]
    public void A_broken_address_is_not_used_for_reply()
        => Assert.Null(EnquiryMail.Build(Quote("not an address"), "a@b.c", "d@e.f", "S")["replyTo"]);

    [Fact]
    public void The_body_names_fields_as_the_form_does()
    {
        var text = EnquiryMail.Build(Quote("k@example.com"), "a@b.c", "d@e.f", "S")["textContent"]!.ToString();
        Assert.Contains("Contact name: Khushwant\n", text);
        Assert.Contains("Estimated annual tonnage: 30\n", text);
        Assert.Contains("Page: quote\n", text);
    }
}
