using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using ApiPlayground.Tests.Helpers;

namespace ApiPlayground.Tests.Features.RequestExecution;

/// <summary>
/// Integration tests for POST /requests/execute — verifies correct HTTP status codes
/// are returned for different executor error types.
/// </summary>
public class ExecuteRequestEndpointTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly ApiWebApplicationFactory _factory;

    public ExecuteRequestEndpointTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var email = $"exec_{Guid.NewGuid()}@example.com";
        var token = await AuthHelper.RegisterAndLoginAsync(client, email, "Password123!");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Execute_NoAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/requests/execute", new
        {
            method = "GET",
            url = "https://example.com",
            headers = Array.Empty<object>(),
            queryParams = Array.Empty<object>(),
            body = (string?)null
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Execute_ForbiddenScheme_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/requests/execute", new
        {
            method = "GET",
            url = "file:///etc/passwd",
            headers = Array.Empty<object>(),
            queryParams = Array.Empty<object>(),
            body = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.Equal("forbidden_scheme", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Execute_InvalidUrl_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/requests/execute", new
        {
            method = "GET",
            url = "not-a-url-at-all",
            headers = Array.Empty<object>(),
            queryParams = Array.Empty<object>(),
            body = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.Equal("invalid_url", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Execute_InvalidHeader_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/requests/execute", new
        {
            method = "GET",
            url = "https://example.com",
            headers = new[] { new { key = "X-Bad\nHeader", value = "value" } },
            queryParams = Array.Empty<object>(),
            body = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.Equal("invalid_header", doc.RootElement.GetProperty("error").GetString());
    }

    [Fact]
    public async Task Execute_ErrorBody_ContainsBothErrorAndMessageFields()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/requests/execute", new
        {
            method = "GET",
            url = "ftp://example.com",
            headers = Array.Empty<object>(),
            queryParams = Array.Empty<object>(),
            body = (string?)null
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);
        Assert.True(doc.RootElement.TryGetProperty("error", out _), "error field missing");
        Assert.True(doc.RootElement.TryGetProperty("message", out _), "message field missing");
    }
}
