import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Body1,
  Caption1,
  Card,
  Dropdown,
  Field,
  Option,
  ProgressBar,
  Spinner,
  Subtitle2,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import {
  DonutChart,
  GroupedVerticalBarChart,
  LineChart,
  ResponsiveContainer,
} from '@fluentui/react-charts'
import { useGetAccounts } from '../api/generated/accounts/accounts'
import {
  useGetAccountBalanceSeries,
  useGetBudgetReport,
  useGetCashflow,
  useGetExpensesByCategory,
} from '../api/generated/reports/reports'
import { formatEuro, formatPercent } from '../lib/format'
import { categoricalColor, expenseColor, incomeColor } from '../lib/chartColors'
import { useIsDark } from '../theme'
import { PageHeader } from '../components/PageHeader'

export const Route = createFileRoute('/reports')({ component: ReportsPage })

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    alignItems: 'start',
  },
  panel: { padding: '18px', display: 'flex', flexDirection: 'column', rowGap: '12px' },
  chartWrap: { width: '100%', minHeight: '300px' },
  budgetList: { display: 'flex', flexDirection: 'column', rowGap: '14px' },
  budgetRow: { display: 'flex', flexDirection: 'column', rowGap: '4px' },
  budgetHead: { display: 'flex', justifyContent: 'space-between', columnGap: '12px' },
  budgetFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    columnGap: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingTop: '10px',
  },
  muted: { color: tokens.colorNeutralForeground3 },
  over: { color: tokens.colorPaletteRedForeground1 },
})

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

type BudgetColor = 'success' | 'warning' | 'error'

function budgetColor(ratio: number): BudgetColor {
  if (ratio > 1) return 'error'
  if (ratio >= 0.8) return 'warning'
  return 'success'
}

function PeriodField({
  value,
  onChange,
}: {
  value: PeriodKey
  onChange: (key: PeriodKey) => void
}) {
  return (
    <Field label="Zeitraum">
      <Dropdown
        selectedOptions={[value]}
        value={periodOptions.find((o) => o.key === value)?.label ?? ''}
        onOptionSelect={(_, d) => onChange((d.optionValue as PeriodKey | undefined) ?? value)}
      >
        {periodOptions.map((o) => (
          <Option key={o.key} value={o.key}>
            {o.label}
          </Option>
        ))}
      </Dropdown>
    </Field>
  )
}

function BudgetsCard() {
  const styles = useStyles()
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
    <Card className={styles.panel}>
      <Subtitle2>Budgets</Subtitle2>
      <PeriodField value={period} onChange={setPeriod} />
      {months > 1 && (
        <Caption1 className={styles.muted}>
          Monatsbudget × {months} Monate für den gewählten Zeitraum
        </Caption1>
      )}
      {report.isPending ? (
        <Spinner label="Wird geladen …" />
      ) : rows.length === 0 ? (
        <Body1>Keine Ausgaben-Kategorien mit Budget oder Ausgaben im Zeitraum.</Body1>
      ) : (
        <div className={styles.budgetList}>
          {rows.map((r) => (
            <div key={r.categoryId} className={styles.budgetRow}>
              <div className={styles.budgetHead}>
                <Text weight="semibold">{r.categoryName}</Text>
                {r.budget != null && r.ratio != null ? (
                  <Text className={r.ratio > 1 ? styles.over : undefined}>
                    {formatEuro(r.actual)} von {formatEuro(r.budget)} · {formatPercent(r.ratio)}
                  </Text>
                ) : (
                  <Text className={styles.muted}>{formatEuro(r.actual)} · kein Budget</Text>
                )}
              </div>
              {r.budget != null && r.ratio != null && (
                <>
                  <ProgressBar
                    thickness="large"
                    value={Math.min(r.ratio, 1)}
                    color={budgetColor(r.ratio)}
                    aria-label={`${r.categoryName}: ${formatPercent(r.ratio)} des Budgets ausgeschöpft`}
                  />
                  {r.ratio > 1 && <Caption1 className={styles.over}>Budget überschritten</Caption1>}
                </>
              )}
            </div>
          ))}
          {totals.budget > 0 && totals.ratio != null && (
            <div className={styles.budgetFoot}>
              <Text weight="semibold">Gesamt</Text>
              <Text className={totals.ratio > 1 ? styles.over : undefined}>
                {formatEuro(totals.actual)} von {formatEuro(totals.budget)} ·{' '}
                {formatPercent(totals.ratio)}
              </Text>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function ReportsPage() {
  const styles = useStyles()
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

  const selectedAccount = accounts.data?.find((a) => a.id === accountId)

  const donutData = useMemo(() => {
    const rows = expenses.data ?? []
    const head = rows.slice(0, MAX_SLICES)
    const rest = rows.slice(MAX_SLICES).reduce((s, r) => s + r.total, 0)
    const points = head.map((r, i) => ({
      legend: r.categoryName,
      data: r.total,
      color: categoricalColor(i, isDark),
    }))
    if (rest > 0)
      points.push({ legend: 'Weitere', data: rest, color: categoricalColor(MAX_SLICES, isDark) })
    return points
  }, [expenses.data, isDark])

  const cashflowData = useMemo(
    () =>
      (cashflow.data ?? []).map((p) => ({
        name: `${MONTHS[p.month - 1]} ${String(p.year).slice(2)}`,
        series: [
          { key: 'income', data: p.income, color: incomeColor(isDark), legend: 'Einnahmen' },
          { key: 'expense', data: p.expense, color: expenseColor(isDark), legend: 'Ausgaben' },
        ],
      })),
    [cashflow.data, isDark],
  )

  const lineData = useMemo(() => {
    const series = balanceSeries.data ?? []
    if (series.length === 0 || !selectedAccount) return null
    return {
      chartTitle: 'Kontostand',
      lineChartData: [
        {
          legend: selectedAccount.name,
          color: categoricalColor(0, isDark),
          data: series.map((p) => ({ x: new Date(p.date), y: p.balance })),
        },
      ],
    }
  }, [balanceSeries.data, selectedAccount, isDark])

  const donutTotal = donutData.reduce((s, p) => s + p.data, 0)

  return (
    <>
      <PageHeader title="Auswertungen" />

      <div className={styles.grid}>
        <Card className={styles.panel}>
          <Subtitle2>Ausgaben nach Kategorie</Subtitle2>
          <PeriodField value={period} onChange={setPeriod} />
          {expenses.isPending ? (
            <Spinner label="Wird geladen …" />
          ) : donutData.length === 0 ? (
            <Body1>Keine Ausgaben im gewählten Zeitraum.</Body1>
          ) : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={300}>
                <DonutChart
                  data={{ chartTitle: 'Ausgaben nach Kategorie', chartData: donutData }}
                  innerRadius={55}
                  valueInsideDonut={formatEuro(donutTotal)}
                  culture="de-DE"
                />
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className={styles.panel}>
          <Subtitle2>Einnahmen &amp; Ausgaben (12 Monate)</Subtitle2>
          {cashflow.isPending ? (
            <Spinner label="Wird geladen …" />
          ) : cashflowData.length === 0 ? (
            <Body1>Noch keine Daten.</Body1>
          ) : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={300}>
                <GroupedVerticalBarChart
                  data={cashflowData}
                  barWidth={14}
                  roundCorners
                  culture="de-DE"
                />
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <BudgetsCard />

        <Card className={styles.panel}>
          <Subtitle2>Kontostand-Verlauf</Subtitle2>
          <Field label="Konto">
            <Dropdown
              placeholder="Konto wählen"
              selectedOptions={accountId ? [accountId] : []}
              value={selectedAccount?.name ?? ''}
              onOptionSelect={(_, d) => setAccountId(d.optionValue ?? '')}
            >
              {accounts.data?.map((a) => (
                <Option key={a.id} value={a.id}>
                  {a.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
          {accountId === '' ? (
            <Body1>Wähle ein Konto, um seinen Verlauf zu sehen.</Body1>
          ) : balanceSeries.isPending ? (
            <Spinner label="Wird geladen …" />
          ) : !lineData ? (
            <Body1>Keine Daten für dieses Konto.</Body1>
          ) : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} culture="de-DE" />
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
