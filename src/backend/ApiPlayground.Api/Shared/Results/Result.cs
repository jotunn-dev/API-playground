namespace ApiPlayground.Api.Shared.Results;

public class Result<T>
{
    public bool IsSuccess { get; private init; }
    public T? Value { get; private init; }
    public string? Error { get; private init; }
    public string? Message { get; private init; }
    public int StatusCode { get; private init; }

    public static Result<T> Success(T value) =>
        new() { IsSuccess = true, Value = value, StatusCode = 200 };

    public static Result<T> Created(T value) =>
        new() { IsSuccess = true, Value = value, StatusCode = 201 };

    public static Result<T> Fail(string error, int statusCode = 400, string? message = null) =>
        new() { IsSuccess = false, Error = error, Message = message, StatusCode = statusCode };
}

public static class Result
{
    public static Result<T> Success<T>(T value) => Result<T>.Success(value);
    public static Result<T> Created<T>(T value) => Result<T>.Created(value);
    public static Result<T> Fail<T>(string error, int statusCode = 400, string? message = null)
        => Result<T>.Fail(error, statusCode, message);
}
