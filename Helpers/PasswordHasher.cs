using System.Security.Cryptography;

namespace QlWeb2.Data;

/// <summary>
/// Password hashing for the admin sign-in.
///
/// PBKDF2-SHA256 from the framework rather than a package: this project carries two
/// dependencies and neither is an identity library, and adding one to hash a single password
/// would be a poor trade. 210,000 iterations is the current OWASP figure for PBKDF2-SHA256.
/// </summary>
public static class PasswordHasher
{
    private const int Iterations = 210_000;
    private const int SaltBytes = 16;
    private const int HashBytes = 32;

    public static (string Hash, string Salt) Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
        return (Convert.ToBase64String(hash), Convert.ToBase64String(salt));
    }

    public static bool Verify(string password, string hashBase64, string saltBase64)
    {
        if (string.IsNullOrEmpty(hashBase64) || string.IsNullOrEmpty(saltBase64)) return false;

        byte[] expected, salt;
        try
        {
            expected = Convert.FromBase64String(hashBase64);
            salt = Convert.FromBase64String(saltBase64);
        }
        catch (FormatException) { return false; }

        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, expected.Length);
        // Fixed-time compare: a length-or-content shortcut here leaks the hash one byte at a time.
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}
