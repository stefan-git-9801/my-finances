const euro = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const mediumDate = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })
const percent = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 0 })

/** Formats a number as an amount in euros, e.g. `1.234,50 €`. */
export function formatEuro(value: number): string {
  return euro.format(value)
}

/** Formats a ratio (`0.42`) as a whole-number percentage, e.g. `42 %`. */
export function formatPercent(ratio: number): string {
  return percent.format(ratio)
}

/** Formats an ISO date string (`yyyy-mm-dd`) as a medium German date. */
export function formatDate(isoDate: string): string {
  return mediumDate.format(new Date(isoDate))
}

/** Parses a user-entered amount that may use a comma as the decimal separator. */
export function parseAmount(input: string): number {
  return Number(input.replace(/\./g, '').replace(',', '.'))
}
