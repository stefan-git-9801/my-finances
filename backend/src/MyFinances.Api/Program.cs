using System.Reflection;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi;
using Microsoft.EntityFrameworkCore;
using MyFinances.Api.Balances;
using MyFinances.Api.Data;
using MyFinances.Api.Features.Accounts;
using MyFinances.Api.Features.Auth;
using MyFinances.Api.Features.Categories;
using MyFinances.Api.Features.Dashboard;
using MyFinances.Api.Features.Recurring;
using MyFinances.Api.Features.Reports;
using MyFinances.Api.Features.Transactions;
using MyFinances.Api.Features.Transfers;
using MyFinances.Api.Recurring;
using MyFinances.Data;
using MyFinances.Data.Auth;

var builder = WebApplication.CreateBuilder(args);

// --- Listen on $PORT when the host provides one (Railway, Fly, …) ---
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://+:{port}");

// --- Database ---
var rawConnectionString =
    builder.Configuration.GetConnectionString("AppDb")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrWhiteSpace(rawConnectionString))
{
    rawConnectionString = "Host=localhost;Port=5432;Database=myfinances;Username=myfinances;Password=myfinances";
    Console.WriteLine("[WARN] No ConnectionStrings__AppDb / DATABASE_URL configured – using localhost dev database.");
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(DatabaseConnectionString.Normalize(rawConnectionString)));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<BalanceService>();
builder.Services.AddScoped<RecurringMaterializer>();

// Serialize enums as strings so the generated TypeScript client gets string unions.
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// --- Identity: cookie auth for a same-origin SPA ---
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

builder.Services
    .AddIdentityCore<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "myfinances.auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;

    // API clients want status codes, not HTML login redirects.
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// Trust the X-Forwarded-* headers set by the PaaS/edge proxy (Railway, Fly, …)
// so request scheme is HTTPS and the auth cookie's Secure flag works.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddAuthorization();
builder.Services.AddOpenApi(options =>
{
    // .NET emits numeric types as `["<type>", "string"]` with a pattern (so big values can be
    // sent as strings). Collapse that to a plain number/integer so the generated TypeScript
    // client gets `amount: number` instead of `number | string` – keeping the null branch for
    // nullable types.
    options.AddSchemaTransformer((schema, context, _) =>
    {
        var type = Nullable.GetUnderlyingType(context.JsonTypeInfo.Type) ?? context.JsonTypeInfo.Type;
        var nullable = context.JsonTypeInfo.Type != type; // was Nullable<T>

        if (type == typeof(decimal))
        {
            schema.Type = nullable ? JsonSchemaType.Number | JsonSchemaType.Null : JsonSchemaType.Number;
            schema.Format = "decimal";
            schema.Pattern = null;
        }
        else if (type == typeof(int) || type == typeof(long) || type == typeof(short))
        {
            schema.Type = nullable ? JsonSchemaType.Integer | JsonSchemaType.Null : JsonSchemaType.Integer;
            schema.Pattern = null;
        }

        return Task.CompletedTask;
    });
});

var app = builder.Build();

// The build-time OpenAPI generator loads this assembly; skip runtime-only startup work then.
var isOpenApiDocumentBuild =
    Assembly.GetEntryAssembly()?.GetName().Name == "GetDocument.Insider";

// --- Schema migration on startup (disable with RUN_MIGRATIONS_ON_STARTUP=false) ---
if (!isOpenApiDocumentBuild && app.Configuration.GetValue("RUN_MIGRATIONS_ON_STARTUP", true))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    await DbSeeder.SeedCategoriesAsync(scope.ServiceProvider);
    await DbSeeder.SeedAdminUserAsync(scope.ServiceProvider);

    var materializer = scope.ServiceProvider.GetRequiredService<RecurringMaterializer>();
    await materializer.MaterializeDueAsync();
}

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapAccountsEndpoints();
app.MapCategoriesEndpoints();
app.MapTransactionsEndpoints();
app.MapTransfersEndpoints();
app.MapRecurringEndpoints();
app.MapDashboardEndpoints();
app.MapReportsEndpoints();

// SPA fallback: any non-API, non-file route serves index.html.
app.MapFallbackToFile("index.html");

app.Run();

// Exposed so integration tests can reference the entry point.
public partial class Program;
