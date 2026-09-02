using Microsoft.Extensions.DependencyInjection;

namespace MyFinances.Api.Recurring;

/// <summary>
/// Endpoint filter that materialises any due recurring bookings before the handler runs, so lists,
/// the dashboard and reports always reflect the current month. Attached to the read-heavy groups.
/// Resolves the (scoped) materialiser per request to avoid a captive dependency.
/// </summary>
public sealed class RecurringMaterializationFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var materializer = context.HttpContext.RequestServices.GetRequiredService<RecurringMaterializer>();
        await materializer.MaterializeDueAsync(context.HttpContext.RequestAborted);
        return await next(context);
    }
}
