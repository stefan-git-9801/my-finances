using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Api.Common;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Categories;

public static class CategoriesEndpoints
{
    public static RouteGroupBuilder MapCategoriesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories")
            .WithTags("Categories")
            .RequireAuthorization();

        group.MapGet("/", GetAll).WithName("GetCategories");
        group.MapPost("/", Create).WithName("CreateCategory");
        group.MapPut("/{id:guid}", Update).WithName("UpdateCategory");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteCategory");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<CategoryResponse>>> GetAll(AppDbContext db, CancellationToken ct)
    {
        var categories = await db.Categories
            .OrderBy(c => c.Kind)
            .ThenBy(c => c.Name)
            .Select(c => c.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<CategoryResponse>>(categories);
    }

    private static async Task<Results<Created<CategoryResponse>, ValidationProblem>> Create(
        CreateCategoryRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var name = request.Name.Trim();
        if (await db.Categories.AnyAsync(c => c.Name == name, ct))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Name)] = ["Es gibt bereits eine Kategorie mit diesem Namen."],
            });

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name,
            Kind = request.Kind,
            MonthlyBudget = request.MonthlyBudget,
            IsDefault = false,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return TypedResults.Created($"/api/categories/{category.Id}", category.ToResponse());
    }

    private static async Task<Results<Ok<CategoryResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateCategoryRequest request, AppDbContext db, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
            return TypedResults.NotFound();

        var name = request.Name.Trim();
        if (await db.Categories.AnyAsync(c => c.Id != id && c.Name == name, ct))
            return TypedResults.ValidationProblem(new Dictionary<string, string[]>
            {
                [nameof(request.Name)] = ["Es gibt bereits eine Kategorie mit diesem Namen."],
            });

        category.Name = name;
        category.Kind = request.Kind;
        category.MonthlyBudget = request.MonthlyBudget;
        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(category.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound, Conflict<ErrorResponse>>> Delete(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var category = await db.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (category is null)
            return TypedResults.NotFound();

        var referenced =
            await db.Transactions.AnyAsync(t => t.CategoryId == id, ct) ||
            await db.RecurringTemplates.AnyAsync(r => r.CategoryId == id, ct);

        if (referenced)
            return TypedResults.Conflict(new ErrorResponse(
                "Die Kategorie wird noch von Buchungen oder Vorlagen verwendet und kann nicht gelöscht werden."));

        db.Categories.Remove(category);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }
}
