/**
 * Fixed categorical chart palette. Values come from the `dataviz` skill's reference palette
 * and are validated with `scripts/validate_palette.js` against the Fluent card surfaces
 * (#ffffff light / #292929 dark): all hard checks pass, worst adjacent CVD ΔE 9.1 light /
 * 8.4 dark. Assign hues in fixed order by entity index — never cycle a 9th generated hue.
 *
 * The contrast-vs-surface check WARNs for a few slots → charts must carry a legend or a
 * table view (the Fluent chart components show a legend by default; the reports page also
 * lists the numbers), which satisfies the "relief" requirement.
 */
const CATEGORICAL_LIGHT = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

const CATEGORICAL_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
]

/** Semantic income/expense colours (green = income, red = expense). */
export const SEMANTIC = {
  income: { light: '#008300', dark: '#008300' },
  expense: { light: '#e34948', dark: '#e66767' },
}

export function categoricalPalette(isDark: boolean): string[] {
  return isDark ? CATEGORICAL_DARK : CATEGORICAL_LIGHT
}

/** Colour for the entity at a given fixed index (wraps only as a last resort). */
export function categoricalColor(index: number, isDark: boolean): string {
  const palette = categoricalPalette(isDark)
  return palette[index % palette.length]
}

export function incomeColor(isDark: boolean): string {
  return isDark ? SEMANTIC.income.dark : SEMANTIC.income.light
}

export function expenseColor(isDark: boolean): string {
  return isDark ? SEMANTIC.expense.dark : SEMANTIC.expense.light
}
