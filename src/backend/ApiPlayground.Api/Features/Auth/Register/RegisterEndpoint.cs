using ApiPlayground.Api.Shared.Results;
using Microsoft.AspNetCore.Mvc;

namespace ApiPlayground.Api.Features.Auth.Register;

public static class RegisterEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/auth/register", async (
            [FromBody] RegisterRequest request,
            IRequestHandler<RegisterRequest, RegisterResponse> handler) =>
        {
            var result = await handler.HandleAsync(request);
            return result.ToHttpResult();
        });
    }
}
