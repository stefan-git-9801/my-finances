import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Body1,
  Card,
  Dropdown,
  Field,
  Option,
  Spinner,
  Subtitle2,
  makeStyles,
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
  useGetCashflow,
  useGetExpensesByCategory,
} from '../api/generated/reports/reports'
import { formatEuro } from '../lib/format'
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
          <Field label="Zeitraum">
            <Dropdown
              selectedOptions={[period]}
              value={periodOptions.find((o) => o.key === period)?.label ?? ''}
              onOptionSelect={(_, d) => setPeriod((d.optionValue as PeriodKey) ?? 'quarter')}
            >
              {periodOptions.map((o) => (
                <Option key={o.key} value={o.key}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
          </Field>
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
