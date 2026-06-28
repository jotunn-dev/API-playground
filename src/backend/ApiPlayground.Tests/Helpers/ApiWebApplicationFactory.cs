using ApiPlayground.Api.Shared.Database;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ApiPlayground.Tests.Helpers;

public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    // Use a fixed DB name so all tests in one factory share state — or per-factory for isolation.
    private readonly string _dbName = "TestDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            // Override settings for testing
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "test-signing-key-that-is-at-least-32-chars-long!",
                ["Jwt:Issuer"] = "ApiPlayground",
                ["Jwt:Audience"] = "ApiPlayground",
                ["Jwt:ExpiryHours"] = "24",
                ["Executor:TimeoutSeconds"] = "30",
                ["Executor:MaxResponseBytes"] = "5242880",
                ["Frontend:BaseUrl"] = "http://localhost:5173"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace SQL Server with in-memory DB for tests
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));
        });

        builder.UseEnvironment("Testing");
    }
}
