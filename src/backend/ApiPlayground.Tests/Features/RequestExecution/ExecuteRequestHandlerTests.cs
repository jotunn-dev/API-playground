using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ApiPlayground.Api.Features.RequestExecution.Execute;
using ApiPlayground.Api.Shared.Results;
using ApiPlayground.Tests.Helpers;
using Microsoft.Extensions.Configuration;

namespace ApiPlayground.Tests.Features.RequestExecution;

/// <summary>
/// Unit tests for ExecuteRequestHandler that test directly without HTTP infrastructure.
/// Uses a mock HttpClient via IHttpClientFactory.
/// </summary>
public class ExecuteRequestHandlerTests
{
    private static ExecuteRequestHandler CreateHandler(
        HttpMessageHandler? messageHandler = null,
        int timeoutSeconds = 30,
        long maxResponseBytes = 5_242_880)
    {
        var httpHandler = messageHandler ?? new TestHttpMessageHandler(
            new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });

        var factory = new TestHttpClientFactory(httpHandler);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Executor:TimeoutSeconds"] = timeoutSeconds.ToString(),
                ["Executor:MaxResponseBytes"] = maxResponseBytes.ToString()
            })
            .Build();

        return new ExecuteRequestHandler(factory, config);
    }

    [Fact]
    public async Task ForbiddenScheme_File_ReturnsError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "file:///etc/passwd"
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("forbidden_scheme", result.Error);
    }

    [Fact]
    public async Task ForbiddenScheme_Ftp_ReturnsError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "ftp://example.com/file"
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("forbidden_scheme", result.Error);
    }

    [Fact]
    public async Task ForbiddenScheme_Gopher_ReturnsError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "gopher://example.com"
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("forbidden_scheme", result.Error);
    }

    [Fact]
    public async Task CrlfInHeaderValue_ReturnsError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com",
            Headers = new List<HeaderEntry>
            {
                new() { Key = "X-Custom", Value = "value\r\nX-Injected: injected" }
            }
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("invalid_header", result.Error);
    }

    [Fact]
    public async Task CrlfInHeaderKey_ReturnsError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com",
            Headers = new List<HeaderEntry>
            {
                new() { Key = "X-Bad\nKey", Value = "value" }
            }
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("invalid_header", result.Error);
    }

    [Fact]
    public async Task UrlTooLong_ReturnsInvalidUrlError()
    {
        var handler = CreateHandler();
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com/" + new string('a', 2048)
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("invalid_url", result.Error);
    }

    [Fact]
    public async Task TooManyHeaders_ReturnsError()
    {
        var handler = CreateHandler();
        var headers = Enumerable.Range(0, 51)
            .Select(i => new HeaderEntry { Key = $"X-Header-{i}", Value = "value" })
            .ToList();

        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com",
            Headers = headers
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.StatusCode);
        Assert.Equal("invalid_url", result.Error);
    }

    [Fact]
    public async Task HappyPath_ReturnsResponseWithStatusAndBody()
    {
        var fakeContent = new StringContent("{\"result\":\"ok\"}");
        fakeContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");

        var fakeResponse = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = fakeContent
        };

        var handler = CreateHandler(new TestHttpMessageHandler(fakeResponse));
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://httpbin.org/get"
        });

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(200, result.Value.Status);
        Assert.Equal("application/json", result.Value.ContentType);
        Assert.Contains("result", result.Value.Body);
        Assert.False(result.Value.Truncated);
        Assert.True(result.Value.DurationMs >= 0);
    }

    [Fact]
    public async Task ResponseExceedsMaxSize_SetsTruncatedTrue()
    {
        // Limit to 10 bytes; response is much larger
        const long maxBytes = 10;
        var largeBody = new string('x', 1000);
        var fakeResponse = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(largeBody)
        };

        var handler = CreateHandler(new TestHttpMessageHandler(fakeResponse), maxResponseBytes: maxBytes);
        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com"
        });

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.True(result.Value.Truncated);
        Assert.True(result.Value.Body.Length <= maxBytes);
    }

    [Fact]
    public async Task Timeout_ReturnsTimeoutError()
    {
        var handler = CreateHandler(
            new DelayedHttpMessageHandler(TimeSpan.FromSeconds(10)),
            timeoutSeconds: 1);

        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "https://example.com"
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(504, result.StatusCode);
        Assert.Equal("timeout", result.Error);
    }

    [Fact]
    public async Task ConnectionRefused_ReturnsConnectionRefusedError()
    {
        var handler = CreateHandler(new ThrowingHttpMessageHandler(
            new HttpRequestException("Connection refused", new System.Net.Sockets.SocketException(
                (int)System.Net.Sockets.SocketError.ConnectionRefused))));

        var result = await handler.HandleAsync(new ExecuteRequestRequest
        {
            Method = "GET",
            Url = "http://localhost:19999/unreachable"
        });

        Assert.False(result.IsSuccess);
        Assert.Equal(502, result.StatusCode);
        Assert.Equal("connection_refused", result.Error);
    }
}

// ---- Test doubles ----

public class TestHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpResponseMessage _response;

    public TestHttpMessageHandler(HttpResponseMessage response)
    {
        _response = response;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_response);
    }
}

public class DelayedHttpMessageHandler : HttpMessageHandler
{
    private readonly TimeSpan _delay;

    public DelayedHttpMessageHandler(TimeSpan delay)
    {
        _delay = delay;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        await Task.Delay(_delay, cancellationToken);
        return new HttpResponseMessage(HttpStatusCode.OK);
    }
}

public class ThrowingHttpMessageHandler : HttpMessageHandler
{
    private readonly Exception _exception;

    public ThrowingHttpMessageHandler(Exception exception)
    {
        _exception = exception;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        throw _exception;
    }
}

public class TestHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;

    public TestHttpClientFactory(HttpMessageHandler handler)
    {
        _handler = handler;
    }

    public HttpClient CreateClient(string name)
    {
        return new HttpClient(_handler, disposeHandler: false)
        {
            Timeout = TimeSpan.FromSeconds(60)
        };
    }
}
