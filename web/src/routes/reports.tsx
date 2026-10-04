import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { BarChart, LineChart } from '@mantine/charts'
import { Card, Group, Progress, Select, Stack, Text, Title } from '@mantine/core'
import { useGetAccounts } from '../api/generated/accounts/accounts'
import {
  useGetAccountBalanceSeries,
  useGetBudgetReport,
  useGetCashflow,
  useGetExpensesByCategory,
} from '../api/generated/reports/reports'
import { formatDate, formatEuro, formatPercent } from '../lib/format'
import { categoricalColor, expenseColor, incomeColor, otherColor } from '../lib/chartColors'
import { DIMMED_TEXT, NEGATIVE_TEXT } from '../lib/colors'
import { useIsDark } from '../theme'
import { PageHeader } from '../components/PageHeader'
import { ExpenseDonut } from '../components/ExpenseDonut'
import { Loading } from '../components/Loading'
import classes from '../styles/grids.module.css'

export const Route = createFileRoute('/reports')({ component: ReportsPage })

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

type PeriodKey = 'month' | 'quarter' | 'year' | 'all'
const periodOptions: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'Dieser Monat' },
  { key: 'quarter', label: 'Letzte 3 Monate' },
  { key: 'year', label: 'Dieses Jahr' },
  { key: 'all', label: 'Gesamt' },
]

function periodRange(key: PeriodKey): { from?: string; to?: string } {
  const now = new Date()
  const to = iso(now)
  switch (key) {
    case 'month':
      return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to }
    case 'quarter':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to }
    case 'all':
      return {}
  }
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const MAX_SLICES = 8

type BudgetColor = 'green' | 'yellow' | 'red'

function budgetColor(ratio: number): BudgetColor {
  if (ratio > 1) return 'red'
  if (ratio >= 0.8) return 'yellow'
  return 'green'
}

function PeriodField({
  value,
  onChange,
}: {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
}) {
  return (
    <Select
      label="Zeitraum"
      allowDeselect={false}
      data={periodOptions.map((o) => ({ value: o.key, label: o.label }))}
      value={value}
      onChange={(v) => onChange((v as PeriodKey | null) ?? value)}
    />
  )
}

function BudgetsCard() {
  const [period, setPeriod] = useState<PeriodKey>('month')
  const range = useMemo(() => periodRange(period), [period])
  const report = useGetBudgetReport(range)

  const months = report.data?.months ?? 1
  const rows = useMemo(() => {
    // The API already normalises monthlyBudget to null for a 0/unset budget.
    return (report.data?.lines ?? []).map((l) => {
      const budget = l.monthlyBudget != null ? l.monthlyBudget * months : null
      const ratio = budget != null ? l.actual / budget : null
      return { ...l, budget, ratio }
    })
  }, [report.data, months])

  const totals = useMemo(() => {
    const budgeted = rows.filter((r) => r.budget != null)
    const budget = budgeted.reduce((s, r) => s + (r.budget ?? 0), 0)
    const actual = budgeted.reduce((s, r) => s + r.actual, 0)
    return { budget, actual, ratio: budget > 0 ? actual / budget : null }
  }, [rows])

  return (
    <Card withBorder padding="lg">
      <Stack gap="sm">
        <Title order={5}>Budgets</Title>
        <PeriodField value={period} onChange={setPeriod} />
        {months > 1 && (
          <Text size="xs" c="dimmed">
            Monatsbudget × {months} Monate für den gewählten Zeitraum
          </Text>
        )}
        {report.isPending ? (
          <Loading label="Wird geladen …" />
        ) : rows.length === 0 ? (
          <Text>Keine Ausgaben-Kategorien mit Budget oder Ausgaben im Zeitraum.</Text>
        ) : (
          <Stack gap="md">
            {rows.map((r) => (
              <Stack key={r.categoryId} gap={4}>
                <Group justify="space-between" gap="sm">
                  <Text fw={600}>{r.categoryName}</Text>
                  {r.budget != null && r.ratio != null ? (
                    <Text c={r.ratio > 1 ? NEGATIVE_TEXT : undefined}>
                      {formatEuro(r.actual)} von {formatEuro(r.budget)} · {formatPercent(r.ratio)}
                    </Text>
                  ) : (
                    <Text c={DIMMED_TEXT}>{formatEuro(r.actual)} · kein Budget</Text>
                  )}
                </Group>
                {r.budget != null && r.ratio != null && (
                  <>
                    <Progress
                      size="lg"
                      value={Math.min(r.ratio, 1) * 100}
                      color={budgetColor(r.ratio)}
                      aria-label={`${r.categoryName}: ${formatPercent(r.ratio)} des Budgets ausgeschöpft`}
                    />
                    {r.ratio > 1 && (
                      <Text size="xs" c={NEGATIVE_TEXT}>
                        Budget überschritten
                      </Text>
                    )}
                  </>
                )}
              </Stack>
            ))}
            {totals.budget > 0 && totals.ratio != null && (
              <Group
                justify="space-between"
                gap="sm"
                pt="sm"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <Text fw={600}>Gesamt</Text>
                <Text c={totals.ratio > 1 ? NEGATIVE_TEXT : undefined}>
                  {formatEuro(totals.actual)} von {formatEuro(totals.budget)} ·{' '}
                  {formatPercent(totals.ratio)}
                </Text>
              </Group>
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  )
}

function ReportsPage() {
  const isDark = useIsDark()

  const [period, setPeriod] = useState<PeriodKey>('quarter')
  const [accountId, setAccountId] = useState('')

  const accounts = useGetAccounts()
  const range = useMemo(() => periodRange(period), [period])
  const expenses = useGetExpensesByCategory(range)
  const cashflow = useGetCashflow({ months: 12 })
  const balanceSeries = useGetAccountBalanceSeries(
    { accountId, months: 12 },
    { query: { enabled: accountId !== '' } },
  )

  const donutData = useMemo(() => {
    const rows = expenses.data ?? []
    const head = rows.slice(0, MAX_SLICES)
    const rest = rows.slice(MAX_SLICES).reduce((s, r) => s + r.total, 0)
    const points = head.map((r, i) => ({
      name: r.categoryName,
      value: r.total,
      color: categoricalColor(i, isDark),
    }))
    if (rest > 0) points.push({ name: 'Weitere', value: rest, color: otherColor(isDark) })
    return points
  }, [expenses.data, isDark])

  const cashflowData = useMemo(
    () =>
      (cashflow.data ?? []).map((p) => ({
        month: `${MONTHS[p.month - 1]} ${String(p.year).slice(2)}`,
        Einnahmen: p.income,
        Ausgaben: p.expense,
      })),
    [cashflow.data],
  )

  const lineData = useMemo(() => {
    const series = balanceSeries.data ?? []
    if (series.length === 0) return null
    return series.map((p) => ({ date: formatDate(p.date), Kontostand: p.balance }))
  }, [balanceSeries.data])

  return (
    <>
      <PageHeader title="Auswertungen" />

      <div className={classes.columns}>
        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={5}>Ausgaben nach Kategorie</Title>
            <PeriodField value={period} onChange={setPeriod} />
            {expenses.isPending ? (
              <Loading label="Wird geladen …" />
            ) : donutData.length === 0 ? (
              <Text>Keine Ausgaben im gewählten Zeitraum.</Text>
            ) : (
              <ExpenseDonut data={donutData} />
            )}
          </Stack>
        </Card>

        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={5}>Einnahmen &amp; Ausgaben (12 Monate)</Title>
            {cashflow.isPending ? (
              <Loading label="Wird geladen …" />
            ) : cashflowData.length === 0 ? (
              <Text>Noch keine Daten.</Text>
            ) : (
              <BarChart
                h={300}
                data={cashflowData}
                dataKey="month"
                series={[
                  { name: 'Einnahmen', color: incomeColor(isDark) },
                  { name: 'Ausgaben', color: expenseColor(isDark) },
                ]}
                withLegend
                valueFormatter={formatEuro}
                tickLine="y"
              />
            )}
          </Stack>
        </Card>

        <BudgetsCard />

        <Card withBorder padding="lg">
          <Stack gap="sm">
            <Title order={5}>Kontostand-Verlauf</Title>
            <Select
              label="Konto"
              placeholder="Konto wählen"
              data={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
              value={accountId || null}
              onChange={(v) => setAccountId(v ?? '')}
            />
            {accountId === '' ? (
              <Text>Wähle ein Konto, um seinen Verlauf zu sehen.</Text>
            ) : balanceSeries.isPending ? (
              <Loading label="Wird geladen …" />
            ) : !lineData ? (
              <Text>Keine Daten für dieses Konto.</Text>
            ) : (
              <LineChart
                h={300}
                data={lineData}
                dataKey="date"
                series={[{ name: 'Kontostand', color: categoricalColor(0, isDark) }]}
                valueFormatter={formatEuro}
                curveType="linear"
                withDots={false}
              />
            )}
          </Stack>
        </Card>
      </div>
    </>
  )
}
