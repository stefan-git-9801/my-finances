import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Badge,
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
  Dropdown,
  Field,
  Input,
  MessageBar,
  Option,
  Spinner,
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
  useDeleteTransaction,
  useGetTransactions,
  useUpdateTransaction,
} from '../api/generated/transactions/transactions'
import { getGetAccountsQueryKey } from '../api/generated/accounts/accounts'
import type { GetTransactionsParams, TransactionResponse } from '../api/generated/model'
import { TransactionType } from '../api/generated/model/transactionType'
import { transactionTypeLabel } from '../lib/labels'
import { formatDate, formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'

export const Route = createFileRoute('/transactions')({ component: TransactionsPage })

const useStyles = makeStyles({
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '16px',
  },
  filter: { minWidth: '150px' },
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
  actions: { display: 'flex', gap: '8px' },
  income: { color: tokens.colorPaletteGreenForeground1 },
  expense: { color: tokens.colorPaletteRedForeground1 },
})

const today = () => new Date().toISOString().slice(0, 10)
const ALL = '__all__'

type FormState = {
  accountId: string
  categoryId: string
  type: TransactionType
  amount: string
  note: string
  bookedOn: string
}

const emptyForm = (): FormState => ({
  accountId: '',
  categoryId: '',
  type: TransactionType.Expense,
  amount: '',
  note: '',
  bookedOn: today(),
})

function TransactionsPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()

  const accounts = useGetAccounts()
  const categories = useGetCategories()

  const [filters, setFilters] = useState<{
    from: string
    to: string
    accountId: string
    categoryId: string
    type: string
  }>({ from: '', to: '', accountId: ALL, categoryId: ALL, type: ALL })

  const params: GetTransactionsParams = useMemo(() => {
    const p: GetTransactionsParams = {}
    if (filters.from) p.from = filters.from
    if (filters.to) p.to = filters.to
    if (filters.accountId !== ALL) p.accountId = filters.accountId
    if (filters.categoryId !== ALL) p.categoryId = filters.categoryId
    if (filters.type !== ALL) p.type = filters.type as TransactionType
    return p
  }, [filters])

  const transactions = useGetTransactions(params)

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

  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<TransactionResponse | null>(null)

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() })
    await queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() })
  }

  const createTransaction = useCreateTransaction()
  const updateTransaction = useUpdateTransaction()
  const deleteTransaction = useDeleteTransaction()

  const saving = createTransaction.isPending || updateTransaction.isPending
  const saveError = createTransaction.error ?? updateTransaction.error

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    createTransaction.reset()
    updateTransaction.reset()
    setDialogOpen(true)
  }

  function openEdit(t: TransactionResponse) {
    setEditing(t)
    setForm({
      accountId: t.accountId,
      categoryId: t.categoryId,
      type: t.type,
      amount: String(t.amount).replace('.', ','),
      note: t.note ?? '',
      bookedOn: t.bookedOn.slice(0, 10),
    })
    createTransaction.reset()
    updateTransaction.reset()
    setDialogOpen(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const data = {
      accountId: form.accountId,
      categoryId: form.categoryId,
      type: form.type,
      amount: parseAmount(form.amount),
      note: form.note.trim() === '' ? null : form.note.trim(),
      bookedOn: form.bookedOn,
    }
    try {
      if (editing) {
        await updateTransaction.mutateAsync({ id: editing.id, data })
      } else {
        await createTransaction.mutateAsync({ data })
      }
      await invalidate()
      setDialogOpen(false)
    } catch {
      /* error surfaced via saveError */
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await deleteTransaction.mutateAsync({ id: toDelete.id })
      await invalidate()
      setToDelete(null)
    } catch {
      /* error surfaced in dialog */
    }
  }

  const columns: TableColumnDefinition<TransactionResponse>[] = [
    createTableColumn({
      columnId: 'bookedOn',
      renderHeaderCell: () => 'Datum',
      renderCell: (t) => formatDate(t.bookedOn),
    }),
    createTableColumn({
      columnId: 'category',
      renderHeaderCell: () => 'Kategorie',
      renderCell: (t) => (
        <>
          {categoryName.get(t.categoryId) ?? '—'}
          {t.recurringTemplateId && (
            <Badge appearance="tint" color="brand" style={{ marginLeft: 6 }}>
              Vorlage
            </Badge>
          )}
        </>
      ),
    }),
    createTableColumn({
      columnId: 'account',
      renderHeaderCell: () => 'Konto',
      renderCell: (t) => accountName.get(t.accountId) ?? '—',
    }),
    createTableColumn({
      columnId: 'note',
      renderHeaderCell: () => 'Notiz',
      renderCell: (t) => t.note ?? '',
    }),
    createTableColumn({
      columnId: 'amount',
      renderHeaderCell: () => 'Betrag',
      renderCell: (t) => (
        <span className={t.type === TransactionType.Expense ? styles.expense : styles.income}>
          {t.type === TransactionType.Expense ? '−' : '+'}
          {formatEuro(t.amount)}
        </span>
      ),
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (t) => (
        <div className={styles.actions}>
          <Button size="small" onClick={() => openEdit(t)}>
            Bearbeiten
          </Button>
          <Button size="small" onClick={() => setToDelete(t)}>
            Löschen
          </Button>
        </div>
      ),
    }),
  ]

  const parsedAmount = parseAmount(form.amount)
  const canSubmit =
    form.accountId !== '' &&
    form.categoryId !== '' &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  const noPrerequisites = (accounts.data?.length ?? 0) === 0 || (categories.data?.length ?? 0) === 0

  return (
    <>
      <PageHeader title="Buchungen">
        <Button appearance="primary" onClick={openCreate} disabled={noPrerequisites}>
          Neue Buchung
        </Button>
      </PageHeader>

      <div className={styles.filters}>
        <Field label="Von" className={styles.filter}>
          <Input
            type="date"
            value={filters.from}
            onChange={(_, d) => setFilters((f) => ({ ...f, from: d.value }))}
          />
        </Field>
        <Field label="Bis" className={styles.filter}>
          <Input
            type="date"
            value={filters.to}
            onChange={(_, d) => setFilters((f) => ({ ...f, to: d.value }))}
          />
        </Field>
        <Field label="Konto" className={styles.filter}>
          <Dropdown
            selectedOptions={[filters.accountId]}
            value={filters.accountId === ALL ? 'Alle' : (accountName.get(filters.accountId) ?? '')}
            onOptionSelect={(_, d) => setFilters((f) => ({ ...f, accountId: d.optionValue ?? ALL }))}
          >
            <Option value={ALL}>Alle</Option>
            {accounts.data?.map((a) => (
              <Option key={a.id} value={a.id}>
                {a.name}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Kategorie" className={styles.filter}>
          <Dropdown
            selectedOptions={[filters.categoryId]}
            value={filters.categoryId === ALL ? 'Alle' : (categoryName.get(filters.categoryId) ?? '')}
            onOptionSelect={(_, d) => setFilters((f) => ({ ...f, categoryId: d.optionValue ?? ALL }))}
          >
            <Option value={ALL}>Alle</Option>
            {categories.data?.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.name}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Art" className={styles.filter}>
          <Dropdown
            selectedOptions={[filters.type]}
            value={filters.type === ALL ? 'Alle' : transactionTypeLabel[filters.type as TransactionType]}
            onOptionSelect={(_, d) => setFilters((f) => ({ ...f, type: d.optionValue ?? ALL }))}
          >
            <Option value={ALL}>Alle</Option>
            {Object.values(TransactionType).map((t) => (
              <Option key={t} value={t}>
                {transactionTypeLabel[t]}
              </Option>
            ))}
          </Dropdown>
        </Field>
      </div>

      {transactions.isPending ? (
        <Spinner label="Buchungen werden geladen …" />
      ) : transactions.isError ? (
        <MessageBar intent="error">Buchungen konnten nicht geladen werden.</MessageBar>
      ) : transactions.data.length === 0 ? (
        <Body1>Keine Buchungen für die aktuelle Auswahl.</Body1>
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

      <Dialog open={dialogOpen} onOpenChange={(_, d) => setDialogOpen(d.open)}>
        <DialogSurface>
          <form onSubmit={onSubmit}>
            <DialogBody>
              <DialogTitle>{editing ? 'Buchung bearbeiten' : 'Neue Buchung'}</DialogTitle>
              <DialogContent className={styles.form}>
                <Field label="Art" required>
                  <Dropdown
                    selectedOptions={[form.type]}
                    value={transactionTypeLabel[form.type]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, type: d.optionValue as TransactionType }))
                    }
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
                    selectedOptions={form.accountId ? [form.accountId] : []}
                    value={accountName.get(form.accountId) ?? ''}
                    onOptionSelect={(_, d) => setForm((f) => ({ ...f, accountId: d.optionValue ?? '' }))}
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
                    selectedOptions={form.categoryId ? [form.categoryId] : []}
                    value={categoryName.get(form.categoryId) ?? ''}
                    onOptionSelect={(_, d) => setForm((f) => ({ ...f, categoryId: d.optionValue ?? '' }))}
                  >
                    {categories.data?.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.name}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Betrag" required>
                  <Input
                    value={form.amount}
                    onChange={(_, d) => setForm((f) => ({ ...f, amount: d.value }))}
                    placeholder="19,99"
                  />
                </Field>
                <Field label="Notiz">
                  <Input
                    value={form.note}
                    onChange={(_, d) => setForm((f) => ({ ...f, note: d.value }))}
                  />
                </Field>
                <Field label="Datum" required>
                  <Input
                    type="date"
                    value={form.bookedOn}
                    onChange={(_, d) => setForm((f) => ({ ...f, bookedOn: d.value }))}
                  />
                </Field>
                {saveError && (
                  <MessageBar intent="error">{errorMessage(saveError, 'Speichern fehlgeschlagen.')}</MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button appearance="secondary" type="button" onClick={() => setDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button appearance="primary" type="submit" disabled={saving || !canSubmit}>
                  Speichern
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        title="Buchung löschen"
        message="Diese Buchung wirklich löschen?"
        error={deleteTransaction.error ? errorMessage(deleteTransaction.error) : null}
        pending={deleteTransaction.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
            deleteTransaction.reset()
          }
        }}
      />
    </>
  )
}
