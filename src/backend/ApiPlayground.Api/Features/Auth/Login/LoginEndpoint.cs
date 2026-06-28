using ApiPlayground.Api.Shared.Results;
using Microsoft.AspNetCore.Mvc;

namespace ApiPlayground.Api.Features.Auth.Login;

public static class LoginEndpoint
{
    public static void Map(WebApplication app)
    {
        app.MapPost("/auth/login", async (
            [FromBody] LoginRequest request,
            IRequestHandler<LoginRequest, LoginResponse> handler) =>
        {
            var result = await handler.HandleAsync(request);
            return result.ToHttpResult();
        });

        app.MapGet("/auth/me", (System.Security.Claims.ClaimsPrincipal user) =>
        {
            var userId = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
                      ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = user.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Email)?.Value
                     ?? user.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

            return Results.Ok(new { userId, email });
        }).RequireAuthorization();
    }
}
