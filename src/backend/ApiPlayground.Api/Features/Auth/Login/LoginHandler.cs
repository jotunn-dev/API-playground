using ApiPlayground.Api.Shared.Database;
using ApiPlayground.Api.Shared.Results;
using ApiPlayground.Api.Shared.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ApiPlayground.Api.Features.Auth.Login;

public class LoginHandler : IRequestHandler<LoginRequest, LoginResponse>
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;
    private readonly PasswordHasher<User> _hasher;

    public LoginHandler(AppDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
        _hasher = new PasswordHasher<User>();
    }

    public async Task<Result<LoginResponse>> HandleAsync(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return Result.Fail<LoginResponse>("Email and password are required.", 401);

        var emailLower = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == emailLower);

        if (user is null)
            return Result.Fail<LoginResponse>("Invalid credentials.", 401);

        var verifyResult = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
            return Result.Fail<LoginResponse>("Invalid credentials.", 401);

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Result.Success(new LoginResponse { Token = token, ExpiresAt = expiresAt });
    }
}
