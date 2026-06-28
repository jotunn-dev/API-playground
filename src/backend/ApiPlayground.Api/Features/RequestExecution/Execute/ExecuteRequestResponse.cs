namespace ApiPlayground.Api.Features.RequestExecution.Execute;

public class ExecuteRequestResponse
{
    public int Status { get; set; }
    public long DurationMs { get; set; }
    public List<HeaderEntry> Headers { get; set; } = new();
    public string Body { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public bool Truncated { get; set; }
}

public class ExecuteRequestError
{
    public string Error { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
