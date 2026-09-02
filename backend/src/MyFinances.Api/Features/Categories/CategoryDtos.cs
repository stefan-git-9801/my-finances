using System.ComponentModel.DataAnnotations;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Categories;

public record CategoryResponse(
    Guid Id,
    string Name,
    CategoryKind Kind,
    decimal? MonthlyBudget,
    bool IsDefault,
    DateTimeOffset CreatedAt);

public record CreateCategoryRequest(
    [property: Required, MaxLength(100)] string Name,
    CategoryKind Kind,
    [property: Range(0, 9_999_999)] decimal? MonthlyBudget);

public record UpdateCategoryRequest(
    [property: Required, MaxLength(100)] string Name,
    CategoryKind Kind,
    [property: Range(0, 9_999_999)] decimal? MonthlyBudget);

public static class CategoryMapping
{
    public static CategoryResponse ToResponse(this Category c) =>
        new(c.Id, c.Name, c.Kind, c.MonthlyBudget, c.IsDefault, c.CreatedAt);
}
