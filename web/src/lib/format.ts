const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const mediumDate = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })

/** Formats a number as an amount in euros, e.g. `1.234,50 €`. */
export function formatEuro(value: number): string {
  return euro.format(value)
}

/** Formats an ISO date string (`yyyy-mm-dd`) as a medium German date. */
export function formatDate(isoDate: string): string {
  return mediumDate.format(new Date(isoDate))
}

/** Parses a user-entered amount that may use a comma as the decimal separator. */
export function parseAmount(input: string): number {
  return Number(input.replace(/\./g, '').replace(',', '.'))
}
