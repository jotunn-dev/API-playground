using ApiPlayground.Api.Shared.Database;
using ApiPlayground.Api.Shared.Results;
using ApiPlayground.Api.Shared.Validation;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace ApiPlayground.Api.Features.Auth.Register;

public class RegisterHandler : IRequestHandler<RegisterRequest, RegisterResponse>
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<User> _hasher;

    public RegisterHandler(AppDbContext db)
    {
        _db = db;
        _hasher = new PasswordHasher<User>();
    }

    public async Task<Result<RegisterResponse>> HandleAsync(RegisterRequest request)
    {
        if (!ValidationHelper.IsValidEmail(request.Email))
            return Result.Fail<RegisterResponse>("Invalid email address.");

        if (!ValidationHelper.IsValidPassword(request.Password))
            return Result.Fail<RegisterResponse>("Password must be at least 8 characters.");

        var emailLower = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Email == emailLower);
        if (exists)
            return Result.Fail<RegisterResponse>("Email is already registered.", 409);

        var user = new User
        {
            Email = emailLower,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Result.Created(new RegisterResponse { UserId = user.Id, Email = user.Email });
    }
}
