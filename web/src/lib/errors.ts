import { AxiosError } from 'axios'
import type { ErrorResponse, HttpValidationProblemDetails } from '../api/generated/model'

/**
 * Turns an API error into a single German sentence for display.
 * Handles 409 `ErrorResponse` bodies and 400 validation-problem bodies.
 */
export function errorMessage(error: unknown, fallback = 'Es ist ein Fehler aufgetreten.'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | (Partial<ErrorResponse> & Partial<HttpValidationProblemDetails>)
      | undefined

    if (data?.message) return data.message

    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (Array.isArray(first) && first.length > 0) return first[0]
    }
  }
  return fallback
}
