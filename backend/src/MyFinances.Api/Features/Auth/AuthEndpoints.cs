using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using MiniValidation;
using MyFinances.Data.Auth;

namespace MyFinances.Api.Features.Auth;

public record RegisterRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required, MinLength(8)] string Password);

public record LoginRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Password);

public record CurrentUserResponse(string Id, string Email);

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", Register).WithName("Register");
        group.MapPost("/login", Login).WithName("Login");
        group.MapPost("/logout", Logout).WithName("Logout").RequireAuthorization();
        group.MapGet("/me", Me).WithName("GetCurrentUser").RequireAuthorization();

        return group;
    }

    private static async Task<Results<Ok, ValidationProblem>> Register(
        RegisterRequest request, UserManager<AppUser> userManager)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var user = new AppUser { UserName = request.Email, Email = request.Email };
        var result = await userManager.CreateAsync(user, request.Password);

        return result.Succeeded
            ? TypedResults.Ok()
            : TypedResults.ValidationProblem(result.Errors
                .GroupBy(e => e.Code)
                .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));
    }

    private static async Task<Results<Ok, ValidationProblem>> Login(
        LoginRequest request, SignInManager<AppUser> signInManager)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var result = await signInManager.PasswordSignInAsync(
            request.Email, request.Password, isPersistent: true, lockoutOnFailure: true);

        return result.Succeeded
            ? TypedResults.Ok()
            : TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                ["credentials"] = ["E-Mail oder Passwort ist falsch."],
            });
    }

    private static async Task<Ok> Logout(SignInManager<AppUser> signInManager)
    {
        await signInManager.SignOutAsync();
        return TypedResults.Ok();
    }

    private static Results<Ok<CurrentUserResponse>, UnauthorizedHttpResult> Me(ClaimsPrincipal principal)
    {
        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id is null)
            return TypedResults.Unauthorized();

        var email = principal.FindFirstValue(ClaimTypes.Email)
                    ?? principal.Identity?.Name
                    ?? string.Empty;

        return TypedResults.Ok(new CurrentUserResponse(id, email));
    }
}
