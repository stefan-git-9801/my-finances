import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Card, Group, Table, Text, TextInput, Title } from '@mantine/core'
import { getGetDashboardQueryKey, useGetDashboard } from '../api/generated/dashboard/dashboard'
import { useGetExpensesByCategory } from '../api/generated/reports/reports'
import { useUpsertSavingsGoal } from '../api/generated/savings-goals/savings-goals'
import { accountTypeLabel } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { categoricalColor, otherColor } from '../lib/chartColors'
import { useIsDark } from '../theme'
import { StatTile } from '../components/StatTile'
import { ExpenseDonut } from '../components/ExpenseDonut'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { NEGATIVE_TEXT, POSITIVE_TEXT } from '../lib/colors'
import classes from '../styles/grids.module.css'

export const Route = createFileRoute('/')({ component: DashboardPage })

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
      name: r.categoryName,
      value: r.total,
      color: categoricalColor(i, isDark),
    }))
    if (restTotal > 0) {
      points.push({
        name: 'Weitere',
        value: restTotal,
        color: otherColor(isDark),
      })
    }
    return points
  }, [expenses.data, isDark])

  if (dashboard.isPending) {
    return <Loading label="Übersicht wird geladen …" />
  }
  if (dashboard.isError) {
    return <Alert color="red">Die Übersicht konnte nicht geladen werden.</Alert>
  }

  const d = dashboard.data
  const savings = d.savingsRate == null ? '–' : `${Math.round(d.savingsRate * 100)} %`

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
    setGoalInput(budget.savingsGoal != null ? String(budget.savingsGoal).replace('.', ',') : '')
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
      <div className={classes.tiles} style={{ marginBottom: 'var(--mantine-spacing-lg)' }}>
        <StatTile label="Nettovermögen" value={formatEuro(d.netWorth)} />
        <StatTile
          label="Einnahmen (Monat)"
          value={formatEuro(d.monthIncome)}
          valueColor={POSITIVE_TEXT}
        />
        <StatTile
          label="Ausgaben (Monat)"
          value={formatEuro(d.monthExpense)}
          valueColor={NEGATIVE_TEXT}
        />
        <StatTile
          label="Sparquote (Monat)"
          value={savings}
          hint="Anteil der Einnahmen, der übrig bleibt"
        />
      </div>

      <Card withBorder padding="lg" mb="lg">
        <Group justify="space-between" mb="md">
          <Title order={5}>Tagesbudget (Monat)</Title>
          <Button size="compact-sm" variant="default" onClick={openGoalDialog}>
            Sparziel bearbeiten
          </Button>
        </Group>
        <div className={classes.tiles}>
          <StatTile label="Sparziel (Monat)" value={goalLabel} />
          <StatTile
            label="Frei verfügbar (Monat)"
            value={formatEuro(budget.available)}
            valueColor={budget.available < 0 ? NEGATIVE_TEXT : POSITIVE_TEXT}
            hint="Einnahmen − Ausgaben − Sparziel"
          />
          <StatTile label="Täglich verfügbar" value={perDayLabel} hint={daysHint} />
        </div>
        {plannedHint != null && (
          <Text size="sm" c="dimmed" mt="sm">
            {plannedHint}
          </Text>
        )}
      </Card>

      <div className={classes.columns}>
        <Card withBorder padding="lg">
          <Title order={5} mb="md">
            Kontosalden
          </Title>
          {d.accounts.length === 0 ? (
            <Text>Noch keine Konten angelegt.</Text>
          ) : (
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Konto</Table.Th>
                  <Table.Th>Typ</Table.Th>
                  <Table.Th ta="right">Saldo</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {d.accounts.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td>{a.name}</Table.Td>
                    <Table.Td>{accountTypeLabel[a.type]}</Table.Td>
                    <Table.Td
                      className={classes.amount}
                      c={a.currentBalance < 0 ? NEGATIVE_TEXT : POSITIVE_TEXT}
                    >
                      {formatEuro(a.currentBalance)}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        <Card withBorder padding="lg">
          <Title order={5} mb="md">
            Ausgaben nach Kategorie (Monat)
          </Title>
          {expenses.isPending ? (
            <Loading label="Wird geladen …" />
          ) : donutData.length === 0 ? (
            <Text>Für diesen Monat sind keine Ausgaben erfasst.</Text>
          ) : (
            <ExpenseDonut data={donutData} />
          )}
        </Card>
      </div>

      <FormModal
        opened={goalDialogOpen}
        title="Sparziel für diesen Monat"
        error={upsertGoal.isError ? errorMessage(upsertGoal.error) : null}
        saving={upsertGoal.isPending}
        canSubmit={!goalInvalid}
        onClose={() => setGoalDialogOpen(false)}
        onSubmit={onGoalSubmit}
      >
        <Text>
          Der Betrag wird vom frei verfügbaren Geld abgezogen. Leer oder 0 = kein Sparziel.
        </Text>
        <TextInput
          label="Sparziel (€)"
          error={goalInvalid ? 'Bitte einen gültigen Betrag eingeben.' : undefined}
          value={goalInput}
          onChange={(e) => setGoalInput(e.currentTarget.value)}
          inputMode="decimal"
          placeholder="z. B. 300,00"
        />
      </FormModal>
    </>
  )
}
