using System.Text;
using ApiPlayground.Api.Features.Auth.Login;
using ApiPlayground.Api.Features.Auth.Register;
using ApiPlayground.Api.Features.RequestExecution.Execute;
using ApiPlayground.Api.Shared.Database;
using ApiPlayground.Api.Shared.Results;
using ApiPlayground.Api.Shared.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- JWT settings ---
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings are not configured.");
builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton<JwtService>();

// --- Authentication / JWT Bearer ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SigningKey)),
            ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// --- HTTP Client Factory (executor) ---
var timeoutSeconds = builder.Configuration.GetValue("Executor:TimeoutSeconds", 30);
builder.Services.AddHttpClient("executor", client =>
{
    client.Timeout = TimeSpan.FromSeconds(timeoutSeconds + 5); // slight buffer; handler uses CTS
});

// --- Feature handlers (registered via IRequestHandler<TRequest, TResponse>) ---
builder.Services.AddScoped<IRequestHandler<RegisterRequest, RegisterResponse>, RegisterHandler>();
builder.Services.AddScoped<IRequestHandler<LoginRequest, LoginResponse>, LoginHandler>();
builder.Services.AddScoped<IRequestHandler<ExecuteRequestRequest, ExecuteRequestResponse>, ExecuteRequestHandler>();

// --- CORS for development ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetValue("Frontend:BaseUrl", "http://localhost:5173")!)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// --- Apply EF Core migrations at startup (DEV convenience only).
// In production, run migrations out-of-band: dotnet ef database update
// See docs/handoff.md for the migration workflow.
// For tests using an in-memory provider, EnsureCreated() is used instead of Migrate().
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
        db.Database.Migrate();
    else
        db.Database.EnsureCreated();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// --- Global exception handler — never leak internal details ---
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            error = "internal_error",
            message = "An unexpected error occurred."
        });
    });
});

// --- Health check ---
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// --- Feature endpoints ---
RegisterEndpoint.Map(app);
LoginEndpoint.Map(app);
ExecuteRequestEndpoint.Map(app);

app.Run();

// Make Program visible to integration test project
public partial class Program { }
