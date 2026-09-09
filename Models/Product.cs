namespace QlWeb2.Models;

public class Product
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string BrandSlug { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ColorFamily { get; set; } = string.Empty;
    public string FinishName { get; set; } = "Matte";
    public string Thicknesses { get; set; } = "0.8 cm, 1.2 cm, 2.0 cm";
    public string Format { get; set; } = "132 x 65 in";
    public string Description { get; set; } = string.Empty;
    public bool IsNew { get; set; }
    public bool IsFeatured { get; set; }
    public int SortOrder { get; set; }
}
