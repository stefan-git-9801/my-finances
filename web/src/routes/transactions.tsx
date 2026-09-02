import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Body1,
  Button,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Input,
  MessageBar,
  Option,
  Spinner,
  Title2,
  createTableColumn,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import type { TableColumnDefinition } from '@fluentui/react-components'
import { useGetAccounts } from '../api/generated/accounts/accounts'
import {
  getGetTransactionsQueryKey,
  useCreateTransaction,
  useGetTransactions,
} from '../api/generated/transactions/transactions'
import type { TransactionResponse } from '../api/generated/model'

export const Route = createFileRoute('/transactions')({ component: TransactionsPage })

const useStyles = makeStyles({
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '12px',
  },
  income: { color: tokens.colorPaletteGreenForeground1 },
  expense: { color: tokens.colorPaletteRedForeground1 },
})

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })

function TransactionsPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()

  const accounts = useGetAccounts()
  const transactions = useGetTransactions()

  const accountName = useMemo(() => {
    const map = new Map<string, string>()
    accounts.data?.forEach((a) => map.set(a.id, a.name))
    return map
  }, [accounts.data])

  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [bookedOn, setBookedOn] = useState(() => new Date().toISOString().slice(0, 10))

  const createTransaction = useCreateTransaction({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() })
        setOpen(false)
        setAmount('')
        setDescription('')
      },
    },
  })

  const columns: TableColumnDefinition<TransactionResponse>[] = [
    createTableColumn<TransactionResponse>({
      columnId: 'bookedOn',
      renderHeaderCell: () => 'Datum',
      renderCell: (t) => dateFormat.format(new Date(t.bookedOn)),
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'description',
      renderHeaderCell: () => 'Beschreibung',
      renderCell: (t) => t.description,
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'account',
      renderHeaderCell: () => 'Konto',
      renderCell: (t) => accountName.get(t.accountId) ?? '—',
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'amount',
      renderHeaderCell: () => 'Betrag',
      renderCell: (t) => (
        <span className={t.amount < 0 ? styles.expense : styles.income}>
          {t.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </span>
      ),
    }),
  ]

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createTransaction.mutate({
      data: {
        accountId,
        amount: Number(amount.replace(',', '.')),
        description,
        bookedOn,
      },
    })
  }

  const canSubmit =
    accountId !== '' && description.trim() !== '' && amount.trim() !== '' && !Number.isNaN(Number(amount.replace(',', '.')))

  return (
    <>
      <div className={styles.head}>
        <Title2>Buchungen</Title2>
        <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary" disabled={(accounts.data?.length ?? 0) === 0}>
              Neue Buchung
            </Button>
          </DialogTrigger>
          <DialogSurface>
            <form onSubmit={onSubmit}>
              <DialogBody>
                <DialogTitle>Neue Buchung</DialogTitle>
                <DialogContent className={styles.form}>
                  <Field label="Konto" required>
                    <Dropdown
                      placeholder="Konto wählen"
                      selectedOptions={accountId ? [accountId] : []}
                      onOptionSelect={(_, d) => setAccountId(d.optionValue ?? '')}
                    >
                      {accounts.data?.map((a) => (
                        <Option key={a.id} value={a.id}>
                          {a.name}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <Field label="Betrag (negativ = Ausgabe)" required>
                    <Input value={amount} onChange={(_, d) => setAmount(d.value)} placeholder="-19,99" />
                  </Field>
                  <Field label="Beschreibung" required>
                    <Input value={description} onChange={(_, d) => setDescription(d.value)} />
                  </Field>
                  <Field label="Datum" required>
                    <Input type="date" value={bookedOn} onChange={(_, d) => setBookedOn(d.value)} />
                  </Field>
                  {createTransaction.isError && (
                    <MessageBar intent="error">Buchung konnte nicht gespeichert werden.</MessageBar>
                  )}
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary" type="button">
                      Abbrechen
                    </Button>
                  </DialogTrigger>
                  <Button
                    appearance="primary"
                    type="submit"
                    disabled={createTransaction.isPending || !canSubmit}
                  >
                    Speichern
                  </Button>
                </DialogActions>
              </DialogBody>
            </form>
          </DialogSurface>
        </Dialog>
      </div>

      {transactions.isPending ? (
        <Spinner label="Buchungen werden geladen …" />
      ) : transactions.isError ? (
        <MessageBar intent="error">Buchungen konnten nicht geladen werden.</MessageBar>
      ) : transactions.data.length === 0 ? (
        <Body1>Noch keine Buchungen erfasst.</Body1>
      ) : (
        <DataGrid items={transactions.data} columns={columns} getRowId={(t) => t.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<TransactionResponse>>
            {({ item, rowId }) => (
              <DataGridRow<TransactionResponse> key={rowId}>
                {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </>
  )
}
