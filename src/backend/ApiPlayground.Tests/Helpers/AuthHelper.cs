using System.Net.Http.Json;
using System.Text.Json;

namespace ApiPlayground.Tests.Helpers;

public static class AuthHelper
{
    public static async Task<string> RegisterAndLoginAsync(
        HttpClient client,
        string email = "test@example.com",
        string password = "Password123!")
    {
        // Register
        await client.PostAsJsonAsync("/auth/register", new { email, password });

        // Login
        var loginResponse = await client.PostAsJsonAsync("/auth/login", new { email, password });
        loginResponse.EnsureSuccessStatusCode();

        var body = await loginResponse.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("token").GetString()!;
    }
}
