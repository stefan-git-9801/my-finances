using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using MiniValidation;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Entities;

namespace MyFinances.Api.Features.Recurring;

public static class RecurringEndpoints
{
    public static RouteGroupBuilder MapRecurringEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/recurring-templates")
            .WithTags("Recurring")
            .RequireAuthorization();

        group.MapGet("/", GetAll).WithName("GetRecurringTemplates");
        group.MapGet("/{id:guid}", GetById).WithName("GetRecurringTemplate");
        group.MapPost("/", Create).WithName("CreateRecurringTemplate");
        group.MapPut("/{id:guid}", Update).WithName("UpdateRecurringTemplate");
        group.MapDelete("/{id:guid}", Delete).WithName("DeleteRecurringTemplate");

        return group;
    }

    private static async Task<Ok<IReadOnlyList<RecurringTemplateResponse>>> GetAll(AppDbContext db, CancellationToken ct)
    {
        var templates = await db.RecurringTemplates
            .OrderByDescending(r => r.IsActive)
            .ThenBy(r => r.DayOfMonth)
            .Select(r => r.ToResponse())
            .ToListAsync(ct);

        return TypedResults.Ok<IReadOnlyList<RecurringTemplateResponse>>(templates);
    }

    private static async Task<Results<Ok<RecurringTemplateResponse>, NotFound>> GetById(
        Guid id, AppDbContext db, CancellationToken ct)
    {
        var template = await db.RecurringTemplates.FirstOrDefaultAsync(r => r.Id == id, ct);
        return template is null ? TypedResults.NotFound() : TypedResults.Ok(template.ToResponse());
    }

    private static async Task<Results<Created<RecurringTemplateResponse>, ValidationProblem>> Create(
        CreateRecurringTemplateRequest request, AppDbContext db, RecurringMaterializer materializer, CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        if (await Validate(db, request.AccountId, request.CategoryId, request.StartDate, request.EndDate, ct) is { } problem)
            return problem;

        var template = new RecurringTemplate
        {
            Id = Guid.NewGuid(),
            AccountId = request.AccountId,
            CategoryId = request.CategoryId,
            Type = request.Type,
            Amount = request.Amount,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            DayOfMonth = request.DayOfMonth,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.RecurringTemplates.Add(template);
        await db.SaveChangesAsync(ct);
        await materializer.MaterializeDueAsync(ct);

        return TypedResults.Created($"/api/recurring-templates/{template.Id}", template.ToResponse());
    }

    private static async Task<Results<Ok<RecurringTemplateResponse>, NotFound, ValidationProblem>> Update(
        Guid id, UpdateRecurringTemplateRequest request, AppDbContext db, RecurringMaterializer materializer,
        CancellationToken ct)
    {
        if (MiniValidator.TryValidate(request, out var errors) is false)
            return TypedResults.ValidationProblem(errors);

        var template = await db.RecurringTemplates.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (template is null)
            return TypedResults.NotFound();

        if (await Validate(db, request.AccountId, request.CategoryId, request.StartDate, request.EndDate, ct) is { } problem)
            return problem;

        template.AccountId = request.AccountId;
        template.CategoryId = request.CategoryId;
        template.Type = request.Type;
        template.Amount = request.Amount;
        template.Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        template.DayOfMonth = request.DayOfMonth;
        template.StartDate = request.StartDate;
        template.EndDate = request.EndDate;
        template.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        await materializer.MaterializeDueAsync(ct);

        return TypedResults.Ok(template.ToResponse());
    }

    private static async Task<Results<NoContent, NotFound>> Delete(Guid id, AppDbContext db, CancellationToken ct)
    {
        var template = await db.RecurringTemplates.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (template is null)
            return TypedResults.NotFound();

        // Already materialised bookings stay; their RecurringTemplateId is set to NULL by the FK.
        db.RecurringTemplates.Remove(template);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    private static async Task<ValidationProblem?> Validate(
        AppDbContext db, Guid accountId, Guid categoryId, DateOnly startDate, DateOnly? endDate, CancellationToken ct)
    {
        var problems = new Dictionary<string, string[]>();

        if (!await db.Accounts.AnyAsync(a => a.Id == accountId, ct))
            problems["accountId"] = ["Das Konto existiert nicht."];
        if (!await db.Categories.AnyAsync(c => c.Id == categoryId, ct))
            problems["categoryId"] = ["Die Kategorie existiert nicht."];
        if (endDate is { } end && end < startDate)
            problems["endDate"] = ["Das Enddatum darf nicht vor dem Startdatum liegen."];

        return problems.Count > 0 ? TypedResults.ValidationProblem(problems) : null;
    }
}
