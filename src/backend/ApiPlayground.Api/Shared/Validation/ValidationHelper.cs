using System.Text.RegularExpressions;

namespace ApiPlayground.Api.Shared.Validation;

public static class ValidationHelper
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && EmailRegex.IsMatch(email);

    public static bool IsValidPassword(string password, int minLength = 8) =>
        !string.IsNullOrWhiteSpace(password) && password.Length >= minLength;
}
