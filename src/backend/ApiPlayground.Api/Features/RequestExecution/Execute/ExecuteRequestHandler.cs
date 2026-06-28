using System.Diagnostics;
using System.Net.Sockets;
using System.Text;
using System.Web;
using ApiPlayground.Api.Shared.Results;
using Microsoft.Extensions.Configuration;

namespace ApiPlayground.Api.Features.RequestExecution.Execute;

public class ExecuteRequestHandler : IRequestHandler<ExecuteRequestRequest, ExecuteRequestResponse>
{
    private static readonly HashSet<string> AllowedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly int _timeoutSeconds;
    private readonly long _maxResponseBytes;

    public ExecuteRequestHandler(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _timeoutSeconds = configuration.GetValue("Executor:TimeoutSeconds", 30);
        _maxResponseBytes = configuration.GetValue("Executor:MaxResponseBytes", 5_242_880L);
    }

    public async Task<Result<ExecuteRequestResponse>> HandleAsync(ExecuteRequestRequest request)
    {
        // --- Input size bounds ---
        if (string.IsNullOrWhiteSpace(request.Url))
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, "URL is required.");

        if (request.Url.Length > 2048)
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, "URL exceeds maximum length of 2048 characters.");

        if (request.Headers.Count > 50)
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, "Too many headers (max 50).");

        if (request.Body is not null && Encoding.UTF8.GetByteCount(request.Body) > 10_485_760)
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, "Request body exceeds maximum size of 10MB.");

        // --- Protocol allow-list ---
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri))
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, "The URL is not valid.");

        if (uri.Scheme != "http" && uri.Scheme != "https")
            return Result.Fail<ExecuteRequestResponse>(
                "forbidden_scheme", 400,
                $"Protocol '{uri.Scheme}' is not allowed. Only http and https are permitted.");

        // --- Validate HTTP method ---
        if (!AllowedMethods.Contains(request.Method))
            return Result.Fail<ExecuteRequestResponse>("invalid_url", 400, $"HTTP method '{request.Method}' is not allowed.");

        // --- CRLF / header injection guard ---
        foreach (var header in request.Headers)
        {
            if (ContainsCrlf(header.Key) || ContainsCrlf(header.Value))
                return Result.Fail<ExecuteRequestResponse>(
                    "invalid_header", 400,
                    "Header key or value contains illegal characters (CR or LF).");
        }

        // --- Build URL with query params ---
        var urlBuilder = new UriBuilder(uri);
        if (request.QueryParams.Count > 0)
        {
            var query = HttpUtility.ParseQueryString(urlBuilder.Query);
            foreach (var param in request.QueryParams)
            {
                if (!string.IsNullOrWhiteSpace(param.Key))
                    query[param.Key] = param.Value;
            }
            urlBuilder.Query = query.ToString();
        }

        // --- Build the HttpRequestMessage ---
        var httpMethod = new HttpMethod(request.Method.ToUpperInvariant());
        var httpRequest = new HttpRequestMessage(httpMethod, urlBuilder.Uri);

        // Forward headers — skip Host (let HttpClient set it)
        foreach (var header in request.Headers)
        {
            if (string.IsNullOrWhiteSpace(header.Key)) continue;
            if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase)) continue;

            // Try request headers first, then content headers
            if (!httpRequest.Headers.TryAddWithoutValidation(header.Key, header.Value))
            {
                // Will be added to content headers after content is set
            }
        }

        // Body
        if (request.Body is not null && request.Method is not ("GET" or "HEAD" or "DELETE" or "OPTIONS"))
        {
            var contentTypeHeader = request.Headers
                .FirstOrDefault(h => h.Key.Equals("Content-Type", StringComparison.OrdinalIgnoreCase));
            var contentType = contentTypeHeader?.Value ?? "application/json";
            httpRequest.Content = new StringContent(request.Body, Encoding.UTF8, contentType);
        }

        // DEV MODE: private/loopback targets are intentionally allowed. Do not expose to untrusted users.

        // --- Execute with timeout ---
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_timeoutSeconds));
        var client = _httpClientFactory.CreateClient("executor");

        var stopwatch = Stopwatch.StartNew();
        try
        {
            using var httpResponse = await client.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cts.Token);

            stopwatch.Stop();

            // --- Collect response headers ---
            var responseHeaders = new List<HeaderEntry>();
            foreach (var header in httpResponse.Headers)
                foreach (var value in header.Value)
                    responseHeaders.Add(new HeaderEntry { Key = header.Key, Value = value });
            foreach (var header in httpResponse.Content.Headers)
                foreach (var value in header.Value)
                    responseHeaders.Add(new HeaderEntry { Key = header.Key, Value = value });

            var contentType = httpResponse.Content.Headers.ContentType?.MediaType ?? string.Empty;

            // --- Stream body with max size cap ---
            var (body, truncated) = await ReadBodyWithLimitAsync(
                httpResponse.Content, _maxResponseBytes, cts.Token);

            return Result.Success(new ExecuteRequestResponse
            {
                Status = (int)httpResponse.StatusCode,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Headers = responseHeaders,
                Body = body,
                ContentType = contentType,
                Truncated = truncated
            });
        }
        catch (OperationCanceledException) when (cts.IsCancellationRequested)
        {
            return Result.Fail<ExecuteRequestResponse>(
                "timeout", 504,
                $"The request timed out after {_timeoutSeconds} seconds.");
        }
        catch (HttpRequestException ex) when (ex.InnerException is SocketException socketEx)
        {
            var errorCode = socketEx.SocketErrorCode switch
            {
                SocketError.HostNotFound or SocketError.NoData => "dns_failure",
                SocketError.ConnectionRefused => "connection_refused",
                _ => "connection_refused"
            };
            return Result.Fail<ExecuteRequestResponse>(errorCode, 502, ex.Message);
        }
        catch (HttpRequestException ex)
        {
            return Result.Fail<ExecuteRequestResponse>("connection_refused", 502, ex.Message);
        }
    }

    private static async Task<(string body, bool truncated)> ReadBodyWithLimitAsync(
        HttpContent content, long maxBytes, CancellationToken ct)
    {
        await using var stream = await content.ReadAsStreamAsync(ct);
        var buffer = new byte[8192];
        var builder = new StringBuilder();
        long totalRead = 0;
        bool truncated = false;

        int bytesRead;
        while ((bytesRead = await stream.ReadAsync(buffer, ct)) > 0)
        {
            totalRead += bytesRead;
            if (totalRead > maxBytes)
            {
                // Write only up to the limit
                var allowed = (int)(maxBytes - (totalRead - bytesRead));
                if (allowed > 0)
                    builder.Append(Encoding.UTF8.GetString(buffer, 0, allowed));
                truncated = true;
                break;
            }
            builder.Append(Encoding.UTF8.GetString(buffer, 0, bytesRead));
        }

        return (builder.ToString(), truncated);
    }

    private static bool ContainsCrlf(string value) =>
        value.Contains('\r') || value.Contains('\n');
}
