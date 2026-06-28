namespace ApiPlayground.Api.Shared.Results;

public interface IRequestHandler<TRequest, TResponse>
{
    Task<Result<TResponse>> HandleAsync(TRequest request);
}
