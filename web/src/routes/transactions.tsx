import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Select, SimpleGrid, Text, TextInput } from '@mantine/core'
import { NEGATIVE_TEXT, POSITIVE_TEXT } from '../lib/colors'
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
import { DataTable, type Column } from '../components/DataTable'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { RowActions } from '../components/RowActions'

export const Route = createFileRoute('/transactions')({ component: TransactionsPage })

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

  const typeOptions = Object.values(TransactionType).map((t) => ({
    value: t,
    label: transactionTypeLabel[t],
  }))
  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))
  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))

  const columns: Column<TransactionResponse>[] = [
    { key: 'bookedOn', header: 'Datum', render: (t) => formatDate(t.bookedOn) },
    {
      key: 'category',
      header: 'Kategorie',
      render: (t) => (
        <>
          {categoryName.get(t.categoryId) ?? '—'}
          {t.recurringTemplateId && (
            <Badge variant="light" ml={6}>
              Vorlage
            </Badge>
          )}
        </>
      ),
    },
    { key: 'account', header: 'Konto', render: (t) => accountName.get(t.accountId) ?? '—' },
    { key: 'note', header: 'Notiz', render: (t) => t.note ?? '' },
    {
      key: 'amount',
      header: 'Betrag',
      align: 'right',
      render: (t) => (
        <Text span inherit c={t.type === TransactionType.Expense ? NEGATIVE_TEXT : POSITIVE_TEXT}>
          {t.type === TransactionType.Expense ? '−' : '+'}
          {formatEuro(t.amount)}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => <RowActions onEdit={() => openEdit(t)} onDelete={() => setToDelete(t)} />,
    },
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
        <Button onClick={openCreate} disabled={noPrerequisites}>
          Neue Buchung
        </Button>
      </PageHeader>

      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} mb="md">
        <TextInput
          label="Von"
          type="date"
          value={filters.from}
          onChange={(e) => {
            const from = e.currentTarget.value
            setFilters((f) => ({ ...f, from }))
          }}
        />
        <TextInput
          label="Bis"
          type="date"
          value={filters.to}
          onChange={(e) => {
            const to = e.currentTarget.value
            setFilters((f) => ({ ...f, to }))
          }}
        />
        <Select
          label="Konto"
          allowDeselect={false}
          data={[{ value: ALL, label: 'Alle' }, ...accountOptions]}
          value={filters.accountId}
          onChange={(v) => setFilters((f) => ({ ...f, accountId: v ?? ALL }))}
        />
        <Select
          label="Kategorie"
          allowDeselect={false}
          data={[{ value: ALL, label: 'Alle' }, ...categoryOptions]}
          value={filters.categoryId}
          onChange={(v) => setFilters((f) => ({ ...f, categoryId: v ?? ALL }))}
        />
        <Select
          label="Art"
          allowDeselect={false}
          data={[{ value: ALL, label: 'Alle' }, ...typeOptions]}
          value={filters.type}
          onChange={(v) => setFilters((f) => ({ ...f, type: v ?? ALL }))}
        />
      </SimpleGrid>

      {transactions.isPending ? (
        <Loading label="Buchungen werden geladen …" />
      ) : transactions.isError ? (
        <Alert color="red">Buchungen konnten nicht geladen werden.</Alert>
      ) : transactions.data.length === 0 ? (
        <Text>Keine Buchungen für die aktuelle Auswahl.</Text>
      ) : (
        <DataTable rows={transactions.data} columns={columns} getRowId={(t) => t.id} />
      )}

      <FormModal
        opened={dialogOpen}
        title={editing ? 'Buchung bearbeiten' : 'Neue Buchung'}
        error={saveError ? errorMessage(saveError, 'Speichern fehlgeschlagen.') : null}
        saving={saving}
        canSubmit={canSubmit}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
      >
        <Select
          label="Art"
          required
          allowDeselect={false}
          data={typeOptions}
          value={form.type}
          onChange={(v) => v && setForm((f) => ({ ...f, type: v as TransactionType }))}
        />
        <Select
          label="Konto"
          required
          placeholder="Konto wählen"
          data={accountOptions}
          value={form.accountId || null}
          onChange={(v) => setForm((f) => ({ ...f, accountId: v ?? '' }))}
        />
        <Select
          label="Kategorie"
          required
          placeholder="Kategorie wählen"
          data={categoryOptions}
          value={form.categoryId || null}
          onChange={(v) => setForm((f) => ({ ...f, categoryId: v ?? '' }))}
        />
        <TextInput
          label="Betrag"
          required
          value={form.amount}
          onChange={(e) => {
            const amount = e.currentTarget.value
            setForm((f) => ({ ...f, amount }))
          }}
          placeholder="19,99"
        />
        <TextInput
          label="Notiz"
          value={form.note}
          onChange={(e) => {
            const note = e.currentTarget.value
            setForm((f) => ({ ...f, note }))
          }}
        />
        <TextInput
          label="Datum"
          type="date"
          required
          value={form.bookedOn}
          onChange={(e) => {
            const bookedOn = e.currentTarget.value
            setForm((f) => ({ ...f, bookedOn }))
          }}
        />
      </FormModal>

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
