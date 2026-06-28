namespace ApiPlayground.Api.Features.RequestExecution.Execute;

public class ExecuteRequestRequest
{
    public string Method { get; set; } = "GET";
    public string Url { get; set; } = string.Empty;
    public List<HeaderEntry> Headers { get; set; } = new();
    public List<QueryParamEntry> QueryParams { get; set; } = new();
    public string? Body { get; set; }
}

public class HeaderEntry
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class QueryParamEntry
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
