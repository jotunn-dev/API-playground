using ApiPlayground.Api.Shared.Results;
using Microsoft.AspNetCore.Mvc;

namespace ApiPlayground.Api.Features.RequestExecution.Execute;

public static class ExecuteRequestEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/requests/execute", async (
            [FromBody] ExecuteRequestRequest request,
            IRequestHandler<ExecuteRequestRequest, ExecuteRequestResponse> handler) =>
        {
            var result = await handler.HandleAsync(request);
            return result.ToHttpResult();
        }).RequireAuthorization();
    }
}
