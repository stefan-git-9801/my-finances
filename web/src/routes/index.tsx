import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Body1,
  Card,
  Spinner,
  Subtitle2,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  MessageBar,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { DonutChart, ResponsiveContainer } from '@fluentui/react-charts'
import { useGetDashboard } from '../api/generated/dashboard/dashboard'
import { useGetExpensesByCategory } from '../api/generated/reports/reports'
import { accountTypeLabel } from '../lib/labels'
import { formatEuro } from '../lib/format'
import { categoricalColor } from '../lib/chartColors'
import { useIsDark } from '../theme'
import { StatTile } from '../components/StatTile'

export const Route = createFileRoute('/')({ component: DashboardPage })

const useStyles = makeStyles({
  tiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
    marginBottom: '20px',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    alignItems: 'start',
  },
  panel: { padding: '18px' },
  panelHead: { marginBottom: '12px', display: 'block' },
  chartWrap: { width: '100%', minHeight: '260px' },
  positive: { color: tokens.colorPaletteGreenForeground1 },
  negative: { color: tokens.colorPaletteRedForeground1 },
})

const pad = (n: number) => String(n).padStart(2, '0')
function monthBounds() {
  const now = new Date()
  const from = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const to = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-${pad(nextMonth.getDate())}`
  return { from, to }
}

const MAX_SLICES = 8

function DashboardPage() {
  const styles = useStyles()
  const isDark = useIsDark()
  const { from, to } = useMemo(() => monthBounds(), [])

  const dashboard = useGetDashboard()
  const expenses = useGetExpensesByCategory({ from, to })

  const donutData = useMemo(() => {
    const rows = expenses.data ?? []
    if (rows.length === 0) return []
    const head = rows.slice(0, MAX_SLICES)
    const restTotal = rows.slice(MAX_SLICES).reduce((sum, r) => sum + r.total, 0)
    const points = head.map((r, i) => ({
      legend: r.categoryName,
      data: r.total,
      color: categoricalColor(i, isDark),
    }))
    if (restTotal > 0) {
      points.push({ legend: 'Weitere', data: restTotal, color: categoricalColor(MAX_SLICES, isDark) })
    }
    return points
  }, [expenses.data, isDark])

  if (dashboard.isPending) {
    return <Spinner label="Übersicht wird geladen …" />
  }
  if (dashboard.isError) {
    return <MessageBar intent="error">Die Übersicht konnte nicht geladen werden.</MessageBar>
  }

  const d = dashboard.data
  const savings = d.savingsRate == null ? '–' : `${Math.round(d.savingsRate * 100)} %`
  const totalExpenses = donutData.reduce((s, p) => s + p.data, 0)

  return (
    <>
      <div className={styles.tiles}>
        <StatTile label="Nettovermögen" value={formatEuro(d.netWorth)} />
        <StatTile
          label="Einnahmen (Monat)"
          value={formatEuro(d.monthIncome)}
          valueColor={tokens.colorPaletteGreenForeground1}
        />
        <StatTile
          label="Ausgaben (Monat)"
          value={formatEuro(d.monthExpense)}
          valueColor={tokens.colorPaletteRedForeground1}
        />
        <StatTile label="Sparquote (Monat)" value={savings} hint="Anteil der Einnahmen, der übrig bleibt" />
      </div>

      <div className={styles.columns}>
        <Card className={styles.panel}>
          <Subtitle2 className={styles.panelHead}>Kontosalden</Subtitle2>
          {d.accounts.length === 0 ? (
            <Body1>Noch keine Konten angelegt.</Body1>
          ) : (
            <Table size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Konto</TableHeaderCell>
                  <TableHeaderCell>Typ</TableHeaderCell>
                  <TableHeaderCell>Saldo</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{accountTypeLabel[a.type]}</TableCell>
                    <TableCell className={a.currentBalance < 0 ? styles.negative : styles.positive}>
                      {formatEuro(a.currentBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className={styles.panel}>
          <Subtitle2 className={styles.panelHead}>Ausgaben nach Kategorie (Monat)</Subtitle2>
          {expenses.isPending ? (
            <Spinner label="Wird geladen …" />
          ) : donutData.length === 0 ? (
            <Body1>Für diesen Monat sind keine Ausgaben erfasst.</Body1>
          ) : (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height={280}>
                <DonutChart
                  data={{ chartTitle: 'Ausgaben nach Kategorie', chartData: donutData }}
                  innerRadius={55}
                  valueInsideDonut={formatEuro(totalExpenses)}
                  hideLegend={false}
                  culture="de-DE"
                />
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
