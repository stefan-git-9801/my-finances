import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Body1,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
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
import { getGetDashboardQueryKey, useGetDashboard } from '../api/generated/dashboard/dashboard'
import { useGetExpensesByCategory } from '../api/generated/reports/reports'
import { useUpsertSavingsGoal } from '../api/generated/savings-goals/savings-goals'
import { accountTypeLabel } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
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
  budgetPanel: { padding: '18px', marginBottom: '20px' },
  budgetHead: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  budgetTiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '14px',
  },
  budgetHint: { marginTop: '10px', display: 'block', color: tokens.colorNeutralForeground3 },
  chartWrap: { width: '100%', minHeight: '260px' },
  positive: { color: tokens.colorPaletteGreenForeground1 },
  negative: { color: tokens.colorPaletteRedForeground1 },
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
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
  const queryClient = useQueryClient()
  const { from, to } = useMemo(() => monthBounds(), [])
  const currentMonth = useMemo(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }, [])

  const dashboard = useGetDashboard()
  const expenses = useGetExpensesByCategory({ from, to })

  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const upsertGoal = useUpsertSavingsGoal()

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

  const budget = d.dailyBudget
  const goalLabel = budget.savingsGoal == null ? 'Nicht gesetzt' : formatEuro(budget.savingsGoal)
  const perDayLabel = budget.perDay == null ? '–' : formatEuro(budget.perDay)
  const daysHint =
    budget.daysRemaining > 0
      ? `verteilt auf ${budget.daysRemaining} Tage (ab morgen)`
      : 'letzter Tag des Monats'
  const plannedHint =
    budget.plannedIncome > 0 || budget.plannedExpense > 0
      ? `Enthält geplante Vorlagen für den Restmonat: +${formatEuro(budget.plannedIncome)} Einnahmen, −${formatEuro(budget.plannedExpense)} Ausgaben.`
      : null

  function openGoalDialog() {
    setGoalInput(
      budget.savingsGoal != null ? String(budget.savingsGoal).replace('.', ',') : '',
    )
    upsertGoal.reset()
    setGoalDialogOpen(true)
  }

  const goalRaw = goalInput.trim()
  const goalInvalid = goalRaw !== '' && Number.isNaN(parseAmount(goalRaw))

  async function onGoalSubmit(event: FormEvent) {
    event.preventDefault()
    const raw = goalInput.trim()
    const amount = raw === '' ? 0 : parseAmount(raw)
    if (Number.isNaN(amount)) return
    try {
      await upsertGoal.mutateAsync({ ...currentMonth, data: { amount } })
      await queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() })
      setGoalDialogOpen(false)
    } catch {
      /* error surfaced via upsertGoal.error */
    }
  }

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

      <Card className={styles.budgetPanel}>
        <div className={styles.budgetHead}>
          <Subtitle2>Tagesbudget (Monat)</Subtitle2>
          <Button size="small" onClick={openGoalDialog}>
            Sparziel bearbeiten
          </Button>
        </div>
        <div className={styles.budgetTiles}>
          <StatTile label="Sparziel (Monat)" value={goalLabel} />
          <StatTile
            label="Frei verfügbar (Monat)"
            value={formatEuro(budget.available)}
            valueColor={
              budget.available < 0
                ? tokens.colorPaletteRedForeground1
                : tokens.colorPaletteGreenForeground1
            }
            hint="Einnahmen − Ausgaben − Sparziel"
          />
          <StatTile label="Täglich verfügbar" value={perDayLabel} hint={daysHint} />
        </div>
        {plannedHint != null && <Body1 className={styles.budgetHint}>{plannedHint}</Body1>}
      </Card>

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

      <Dialog open={goalDialogOpen} onOpenChange={(_, data) => setGoalDialogOpen(data.open)}>
        <DialogSurface>
          <form onSubmit={onGoalSubmit}>
            <DialogBody>
              <DialogTitle>Sparziel für diesen Monat</DialogTitle>
              <DialogContent className={styles.form}>
                <Body1>
                  Der Betrag wird vom frei verfügbaren Geld abgezogen. Leer oder 0 = kein Sparziel.
                </Body1>
                <Field
                  label="Sparziel (€)"
                  validationState={goalInvalid ? 'error' : 'none'}
                  validationMessage={goalInvalid ? 'Bitte einen gültigen Betrag eingeben.' : undefined}
                >
                  <Input
                    value={goalInput}
                    onChange={(_, data) => setGoalInput(data.value)}
                    inputMode="decimal"
                    placeholder="z. B. 300,00"
                  />
                </Field>
                {upsertGoal.isError && (
                  <MessageBar intent="error">{errorMessage(upsertGoal.error)}</MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" type="button" onClick={() => setGoalDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={upsertGoal.isPending || goalInvalid}
                >
                  Speichern
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </>
  )
}
