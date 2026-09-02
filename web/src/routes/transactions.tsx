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
import { useGetCategories } from '../api/generated/categories/categories'
import {
  getGetTransactionsQueryKey,
  useCreateTransaction,
  useGetTransactions,
} from '../api/generated/transactions/transactions'
import type { TransactionResponse } from '../api/generated/model'
import { TransactionType } from '../api/generated/model/transactionType'
import { transactionTypeLabel } from '../lib/labels'
import { formatDate, formatEuro, parseAmount } from '../lib/format'

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

function TransactionsPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()

  const accounts = useGetAccounts()
  const categories = useGetCategories()
  const transactions = useGetTransactions()

  const accountName = useMemo(() => {
    const map = new Map<string, string>()
    accounts.data?.forEach((a) => map.set(a.id, a.name))
    return map
  }, [accounts.data])

  const categoryName = useMemo(() => {
    const map = new Map<string, string>()
    categories.data?.forEach((c) => map.set(c.id, c.name))
    return map
  }, [categories.data])

  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState<TransactionType>(TransactionType.Expense)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [bookedOn, setBookedOn] = useState(() => new Date().toISOString().slice(0, 10))

  const createTransaction = useCreateTransaction({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() })
        setOpen(false)
        setAmount('')
        setNote('')
      },
    },
  })

  const columns: TableColumnDefinition<TransactionResponse>[] = [
    createTableColumn<TransactionResponse>({
      columnId: 'bookedOn',
      renderHeaderCell: () => 'Datum',
      renderCell: (t) => formatDate(t.bookedOn),
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'category',
      renderHeaderCell: () => 'Kategorie',
      renderCell: (t) => categoryName.get(t.categoryId) ?? '—',
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'account',
      renderHeaderCell: () => 'Konto',
      renderCell: (t) => accountName.get(t.accountId) ?? '—',
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'note',
      renderHeaderCell: () => 'Notiz',
      renderCell: (t) => t.note ?? '',
    }),
    createTableColumn<TransactionResponse>({
      columnId: 'amount',
      renderHeaderCell: () => 'Betrag',
      renderCell: (t) => (
        <span className={t.type === TransactionType.Expense ? styles.expense : styles.income}>
          {t.type === TransactionType.Expense ? '−' : '+'}
          {formatEuro(t.amount)}
        </span>
      ),
    }),
  ]

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createTransaction.mutate({
      data: {
        accountId,
        categoryId,
        type,
        amount: parseAmount(amount),
        note: note.trim() === '' ? null : note.trim(),
        bookedOn,
      },
    })
  }

  const parsedAmount = parseAmount(amount)
  const canSubmit =
    accountId !== '' &&
    categoryId !== '' &&
    amount.trim() !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  return (
    <>
      <div className={styles.head}>
        <Title2>Buchungen</Title2>
        <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Button
              appearance="primary"
              disabled={(accounts.data?.length ?? 0) === 0 || (categories.data?.length ?? 0) === 0}
            >
              Neue Buchung
            </Button>
          </DialogTrigger>
          <DialogSurface>
            <form onSubmit={onSubmit}>
              <DialogBody>
                <DialogTitle>Neue Buchung</DialogTitle>
                <DialogContent className={styles.form}>
                  <Field label="Art" required>
                    <Dropdown
                      selectedOptions={[type]}
                      value={transactionTypeLabel[type]}
                      onOptionSelect={(_, d) => setType(d.optionValue as TransactionType)}
                    >
                      {Object.values(TransactionType).map((t) => (
                        <Option key={t} value={t}>
                          {transactionTypeLabel[t]}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <Field label="Konto" required>
                    <Dropdown
                      placeholder="Konto wählen"
                      selectedOptions={accountId ? [accountId] : []}
                      value={accountName.get(accountId) ?? ''}
                      onOptionSelect={(_, d) => setAccountId(d.optionValue ?? '')}
                    >
                      {accounts.data?.map((a) => (
                        <Option key={a.id} value={a.id}>
                          {a.name}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <Field label="Kategorie" required>
                    <Dropdown
                      placeholder="Kategorie wählen"
                      selectedOptions={categoryId ? [categoryId] : []}
                      value={categoryName.get(categoryId) ?? ''}
                      onOptionSelect={(_, d) => setCategoryId(d.optionValue ?? '')}
                    >
                      {categories.data?.map((c) => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <Field label="Betrag" required>
                    <Input value={amount} onChange={(_, d) => setAmount(d.value)} placeholder="19,99" />
                  </Field>
                  <Field label="Notiz">
                    <Input value={note} onChange={(_, d) => setNote(d.value)} />
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
