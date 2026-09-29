namespace QlWeb2.Content;

/// <summary>
/// Where a factory can be put on the map: a list of places, each already carrying its
/// coordinates.
///
/// The factory map draws from a latitude and a longitude, and a client cannot be asked for
/// either. Until 29/09/2026 they were not asked at all - the coordinates were the demo's, and a
/// factory renamed to "Ha Noi" kept its pin in Yen Bai, because the province under the name is
/// only words. Choosing a place from this list is what moves the pin now: the server looks the
/// name up and writes the two numbers itself.
///
/// The 63 provinces as they were before the 2025 merger, each placed at its provincial seat. The
/// old names on purpose: they are what people still write on a factory's address ("Binh Phuoc"),
/// and at this map's scale a provincial seat is exact enough - the whole country is 600 pixels
/// tall.
/// </summary>
public static class Places
{
    public record Place(string Name, double Lat, double Lon);

    public static readonly Place[] All =
    [
        new("An Giang", 10.386, 105.435),
        new("Ba Ria - Vung Tau", 10.496, 107.169),
        new("Bac Giang", 21.273, 106.194),
        new("Bac Kan", 22.147, 105.834),
        new("Bac Lieu", 9.294, 105.727),
        new("Bac Ninh", 21.186, 106.076),
        new("Ben Tre", 10.241, 106.376),
        new("Binh Dinh", 13.776, 109.224),
        new("Binh Duong", 10.980, 106.652),
        new("Binh Phuoc", 11.535, 106.883),
        new("Binh Thuan", 10.928, 108.102),
        new("Ca Mau", 9.177, 105.150),
        new("Can Tho", 10.045, 105.747),
        new("Cao Bang", 22.666, 106.258),
        new("Da Nang", 16.054, 108.202),
        new("Dak Lak", 12.667, 108.038),
        new("Dak Nong", 12.004, 107.690),
        new("Dien Bien", 21.386, 103.023),
        new("Dong Nai", 10.957, 106.843),
        new("Dong Thap", 10.460, 105.633),
        new("Gia Lai", 13.983, 108.000),
        new("Ha Giang", 22.823, 104.984),
        new("Ha Nam", 20.541, 105.914),
        new("Ha Noi", 21.028, 105.854),
        new("Ha Tinh", 18.342, 105.906),
        new("Hai Duong", 20.938, 106.330),
        new("Hai Phong", 20.845, 106.688),
        new("Hau Giang", 9.784, 105.470),
        new("Ho Chi Minh City", 10.776, 106.701),
        new("Hoa Binh", 20.817, 105.338),
        new("Hung Yen", 20.646, 106.051),
        new("Khanh Hoa", 12.238, 109.197),
        new("Kien Giang", 10.012, 105.081),
        new("Kon Tum", 14.350, 108.000),
        new("Lai Chau", 22.396, 103.458),
        new("Lam Dong", 11.940, 108.458),
        new("Lang Son", 21.853, 106.761),
        new("Lao Cai", 22.486, 103.970),
        new("Long An", 10.535, 106.413),
        new("Nam Dinh", 20.420, 106.168),
        new("Nghe An", 18.679, 105.681),
        new("Ninh Binh", 20.251, 105.975),
        new("Ninh Thuan", 11.565, 108.988),
        new("Phu Tho", 21.322, 105.402),
        new("Phu Yen", 13.096, 109.310),
        new("Quang Binh", 17.469, 106.622),
        new("Quang Nam", 15.573, 108.474),
        new("Quang Ngai", 15.120, 108.792),
        new("Quang Ninh", 20.951, 107.080),
        new("Quang Tri", 16.816, 107.100),
        new("Soc Trang", 9.603, 105.974),
        new("Son La", 21.327, 103.914),
        new("Tay Ninh", 11.310, 106.098),
        new("Thai Binh", 20.450, 106.340),
        new("Thai Nguyen", 21.594, 105.848),
        new("Thanh Hoa", 19.807, 105.776),
        new("Thua Thien Hue", 16.463, 107.590),
        new("Tien Giang", 10.360, 106.360),
        new("Tra Vinh", 9.935, 106.345),
        new("Tuyen Quang", 21.823, 105.214),
        new("Vinh Long", 10.254, 105.972),
        new("Vinh Phuc", 21.310, 105.597),
        new("Yen Bai", 21.705, 104.875),
    ];

    /// <summary>The names, in the order the list offers them.</summary>
    public static readonly List<string> Names = All.Select(p => p.Name).ToList();

    public static Place? Find(string? name)
        => All.FirstOrDefault(p => string.Equals(p.Name, name, StringComparison.Ordinal));

    /// <summary>
    /// The place a pin is standing on now, or null when it stands nowhere near one.
    ///
    /// For the factories written before this list existed: they have coordinates and no place,
    /// and the editor has to show the client where their pin actually is - which is exactly how
    /// a client finds out that "Ha Noi" has been drawn in Yen Bai. Half a degree is about 55 km;
    /// further than that from every provincial seat is a point this list did not put there (or
    /// the 0,0 of a factory added a minute ago), and naming a province for it would be a guess.
    /// </summary>
    public static Place? Nearest(double lat, double lon)
    {
        Place? best = null;
        var bestD = double.MaxValue;
        foreach (var p in All)
        {
            var d = Math.Pow(p.Lat - lat, 2) + Math.Pow((p.Lon - lon) * Math.Cos(lat * Math.PI / 180), 2);
            if (d < bestD) { bestD = d; best = p; }
        }
        return bestD <= 0.5 * 0.5 ? best : null;
    }

}
