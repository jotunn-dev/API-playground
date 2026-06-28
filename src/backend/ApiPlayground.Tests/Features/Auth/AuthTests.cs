using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ApiPlayground.Tests.Helpers;

namespace ApiPlayground.Tests.Features.Auth;

public class AuthTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ---- Register ----

    [Fact]
    public async Task Register_Success_Returns201WithUserIdAndEmail()
    {
        var email = $"reg_success_{Guid.NewGuid()}@example.com";

        var response = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("userId", out var userId));
        Assert.True(userId.GetInt32() > 0);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var email = $"dup_{Guid.NewGuid()}@example.com";
        // First registration
        var first = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        // Second registration with same email
        var response = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Register_InvalidEmail_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/auth/register", new
        {
            email = "not-an-email",
            password = "Password123!"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_ShortPassword_Returns400()
    {
        var response = await _client.PostAsJsonAsync("/auth/register", new
        {
            email = $"shortpw_{Guid.NewGuid()}@example.com",
            password = "ab"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ---- Login ----

    [Fact]
    public async Task Login_Success_ReturnsTokenAndExpiry()
    {
        var email = $"login_ok_{Guid.NewGuid()}@example.com";
        var reg = await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);

        var response = await _client.PostAsJsonAsync("/auth/login", new { email, password = "Password123!" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("token", out var token));
        Assert.False(string.IsNullOrWhiteSpace(token.GetString()));
        Assert.True(doc.RootElement.TryGetProperty("expiresAt", out _));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var email = $"wrongpw_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/auth/register", new { email, password = "Password123!" });

        var response = await _client.PostAsJsonAsync("/auth/login", new { email, password = "WrongPassword!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/auth/login", new
        {
            email = $"nobody_{Guid.NewGuid()}@nowhere.com",
            password = "Password123!"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ---- /auth/me ----

    [Fact]
    public async Task AuthMe_ValidToken_Returns200WithUserInfo()
    {
        var email = $"me_{Guid.NewGuid()}@example.com";
        var client = _factory.CreateClient();
        var token = await AuthHelper.RegisterAndLoginAsync(client, email, "Password123!");

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.GetAsync("/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("email", out var emailProp));
        Assert.Equal(email.ToLowerInvariant(), emailProp.GetString());
    }

    [Fact]
    public async Task AuthMe_NoToken_Returns401()
    {
        // Create a fresh client with no auth header
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AuthMe_InvalidToken_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "totally.invalid.token");

        var response = await client.GetAsync("/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
