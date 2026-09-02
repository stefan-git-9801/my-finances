namespace MyFinances.Api.Common;

/// <summary>Simple error payload for non-validation failures (e.g. 409 Conflict).</summary>
public record ErrorResponse(string Message);
