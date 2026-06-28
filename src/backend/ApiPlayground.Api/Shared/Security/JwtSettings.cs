namespace ApiPlayground.Api.Shared.Security;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string SigningKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = "ApiPlayground";
    public string Audience { get; set; } = "ApiPlayground";
    public int ExpiryHours { get; set; } = 24;
}
