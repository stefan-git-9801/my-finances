import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Badge, Button, Checkbox, NumberInput, Select, Text, TextInput } from '@mantine/core'
import { useGetAccounts } from '../api/generated/accounts/accounts'
import { useGetCategories } from '../api/generated/categories/categories'
import {
  getGetRecurringTemplatesQueryKey,
  useCreateRecurringTemplate,
  useDeleteRecurringTemplate,
  useGetRecurringTemplates,
  useUpdateRecurringTemplate,
} from '../api/generated/recurring/recurring'
import { getGetTransactionsQueryKey } from '../api/generated/transactions/transactions'
import type { RecurringTemplateResponse } from '../api/generated/model'
import { TransactionType } from '../api/generated/model/transactionType'
import { transactionTypeLabel } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type Column } from '../components/DataTable'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { RowActions } from '../components/RowActions'

export const Route = createFileRoute('/recurring')({ component: RecurringPage })

const monthStart = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

type FormState = {
  accountId: string
  categoryId: string
  type: TransactionType
  amount: string
  note: string
  dayOfMonth: string
  startDate: string
  endDate: string
  isActive: boolean
}

const emptyForm = (): FormState => ({
  accountId: '',
  categoryId: '',
  type: TransactionType.Expense,
  amount: '',
  note: '',
  dayOfMonth: '1',
  startDate: monthStart(),
  endDate: '',
  isActive: true,
})

function RecurringPage() {
  const queryClient = useQueryClient()

  const accounts = useGetAccounts()
  const categories = useGetCategories()
  const templates = useGetRecurringTemplates()

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

  const [editing, setEditing] = useState<RecurringTemplateResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<RecurringTemplateResponse | null>(null)

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: getGetRecurringTemplatesQueryKey() })
    // New occurrences may have been materialised on save.
    await queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() })
  }

  const createTemplate = useCreateRecurringTemplate()
  const updateTemplate = useUpdateRecurringTemplate()
  const deleteTemplate = useDeleteRecurringTemplate()

  const saving = createTemplate.isPending || updateTemplate.isPending
  const saveError = createTemplate.error ?? updateTemplate.error

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    createTemplate.reset()
    updateTemplate.reset()
    setDialogOpen(true)
  }

  function openEdit(template: RecurringTemplateResponse) {
    setEditing(template)
    setForm({
      accountId: template.accountId,
      categoryId: template.categoryId,
      type: template.type,
      amount: String(template.amount).replace('.', ','),
      note: template.note ?? '',
      dayOfMonth: String(template.dayOfMonth),
      startDate: template.startDate.slice(0, 10),
      endDate: template.endDate ? template.endDate.slice(0, 10) : '',
      isActive: template.isActive,
    })
    createTemplate.reset()
    updateTemplate.reset()
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
      dayOfMonth: Number(form.dayOfMonth),
      startDate: form.startDate,
      endDate: form.endDate === '' ? null : form.endDate,
      isActive: form.isActive,
    }
    try {
      if (editing) {
        await updateTemplate.mutateAsync({ id: editing.id, data })
      } else {
        await createTemplate.mutateAsync({ data })
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
      await deleteTemplate.mutateAsync({ id: toDelete.id })
      await invalidate()
      setToDelete(null)
    } catch {
      /* error surfaced in dialog */
    }
  }

  const columns: Column<RecurringTemplateResponse>[] = [
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => (
        <Badge variant="light" color={t.isActive ? 'green' : 'gray'}>
          {t.isActive ? 'aktiv' : 'pausiert'}
        </Badge>
      ),
    },
    { key: 'dayOfMonth', header: 'Tag', render: (t) => `${t.dayOfMonth}.` },
    { key: 'type', header: 'Art', render: (t) => transactionTypeLabel[t.type] },
    { key: 'account', header: 'Konto', render: (t) => accountName.get(t.accountId) ?? '—' },
    { key: 'category', header: 'Kategorie', render: (t) => categoryName.get(t.categoryId) ?? '—' },
    { key: 'amount', header: 'Betrag', render: (t) => formatEuro(t.amount), align: 'right' },
    { key: 'note', header: 'Notiz', render: (t) => t.note ?? '' },
    {
      key: 'actions',
      header: '',
      render: (t) => <RowActions onEdit={() => openEdit(t)} onDelete={() => setToDelete(t)} />,
    },
  ]

  const typeOptions = Object.values(TransactionType).map((t) => ({
    value: t,
    label: transactionTypeLabel[t],
  }))
  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))
  const categoryOptions = (categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))

  const day = Number(form.dayOfMonth)
  const parsedAmount = parseAmount(form.amount)
  const canSubmit =
    form.accountId !== '' &&
    form.categoryId !== '' &&
    form.startDate !== '' &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 31 &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  const disabled = (accounts.data?.length ?? 0) === 0 || (categories.data?.length ?? 0) === 0

  return (
    <>
      <PageHeader title="Vorlagen">
        <Button onClick={openCreate} disabled={disabled}>
          Neue Vorlage
        </Button>
      </PageHeader>

      <Text mb="md">
        Wiederkehrende Buchungen (z. B. Miete, Gehalt, Abos) werden monatlich am gewählten Tag
        automatisch als echte Buchung angelegt.
      </Text>

      {templates.isPending ? (
        <Loading label="Vorlagen werden geladen …" />
      ) : templates.isError ? (
        <Alert color="red">Vorlagen konnten nicht geladen werden.</Alert>
      ) : templates.data.length === 0 ? (
        <Text>Noch keine Vorlagen.</Text>
      ) : (
        <DataTable rows={templates.data} columns={columns} getRowId={(t) => t.id} />
      )}

      <FormModal
        opened={dialogOpen}
        title={editing ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
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
          placeholder="800,00"
        />
        <NumberInput
          label="Tag im Monat (1–31)"
          required
          min={1}
          max={31}
          allowDecimal={false}
          value={form.dayOfMonth}
          onChange={(v) => setForm((f) => ({ ...f, dayOfMonth: String(v) }))}
        />
        <TextInput
          label="Startdatum"
          type="date"
          required
          value={form.startDate}
          onChange={(e) => {
            const startDate = e.currentTarget.value
            setForm((f) => ({ ...f, startDate }))
          }}
        />
        <TextInput
          label="Enddatum (optional)"
          type="date"
          value={form.endDate}
          onChange={(e) => {
            const endDate = e.currentTarget.value
            setForm((f) => ({ ...f, endDate }))
          }}
        />
        <TextInput
          label="Notiz"
          value={form.note}
          onChange={(e) => {
            const note = e.currentTarget.value
            setForm((f) => ({ ...f, note }))
          }}
        />
        <Checkbox
          label="Aktiv"
          checked={form.isActive}
          onChange={(e) => {
            const isActive = e.currentTarget.checked
            setForm((f) => ({ ...f, isActive }))
          }}
        />
      </FormModal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Vorlage löschen"
        message="Vorlage löschen? Bereits erzeugte Buchungen bleiben erhalten."
        error={deleteTemplate.error ? errorMessage(deleteTemplate.error) : null}
        pending={deleteTemplate.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
            deleteTemplate.reset()
          }
        }}
      />
    </>
  )
}
