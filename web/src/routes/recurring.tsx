import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Badge,
  Body1,
  Button,
  Checkbox,
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
} from '@fluentui/react-components'
import type { TableColumnDefinition } from '@fluentui/react-components'
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

export const Route = createFileRoute('/recurring')({ component: RecurringPage })

const useStyles = makeStyles({
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
  actions: { display: 'flex', gap: '8px' },
})

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
  const styles = useStyles()
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

  const columns: TableColumnDefinition<RecurringTemplateResponse>[] = [
    createTableColumn({
      columnId: 'isActive',
      renderHeaderCell: () => 'Status',
      renderCell: (t) => (
        <Badge appearance="tint" color={t.isActive ? 'success' : 'informative'}>
          {t.isActive ? 'aktiv' : 'pausiert'}
        </Badge>
      ),
    }),
    createTableColumn({
      columnId: 'dayOfMonth',
      renderHeaderCell: () => 'Tag',
      renderCell: (t) => `${t.dayOfMonth}.`,
    }),
    createTableColumn({
      columnId: 'type',
      renderHeaderCell: () => 'Art',
      renderCell: (t) => transactionTypeLabel[t.type],
    }),
    createTableColumn({
      columnId: 'account',
      renderHeaderCell: () => 'Konto',
      renderCell: (t) => accountName.get(t.accountId) ?? '—',
    }),
    createTableColumn({
      columnId: 'category',
      renderHeaderCell: () => 'Kategorie',
      renderCell: (t) => categoryName.get(t.categoryId) ?? '—',
    }),
    createTableColumn({
      columnId: 'amount',
      renderHeaderCell: () => 'Betrag',
      renderCell: (t) => formatEuro(t.amount),
    }),
    createTableColumn({
      columnId: 'note',
      renderHeaderCell: () => 'Notiz',
      renderCell: (t) => t.note ?? '',
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
        <Button appearance="primary" onClick={openCreate} disabled={disabled}>
          Neue Vorlage
        </Button>
      </PageHeader>

      <Body1 as="p" style={{ marginTop: 0 }}>
        Wiederkehrende Buchungen (z. B. Miete, Gehalt, Abos) werden monatlich am gewählten Tag
        automatisch als echte Buchung angelegt.
      </Body1>

      {templates.isPending ? (
        <Spinner label="Vorlagen werden geladen …" />
      ) : templates.isError ? (
        <MessageBar intent="error">Vorlagen konnten nicht geladen werden.</MessageBar>
      ) : templates.data.length === 0 ? (
        <Body1>Noch keine Vorlagen.</Body1>
      ) : (
        <DataGrid items={templates.data} columns={columns} getRowId={(t) => t.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<RecurringTemplateResponse>>
            {({ item, rowId }) => (
              <DataGridRow<RecurringTemplateResponse> key={rowId}>
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
              <DialogTitle>{editing ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</DialogTitle>
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
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, accountId: d.optionValue ?? '' }))
                    }
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
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, categoryId: d.optionValue ?? '' }))
                    }
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
                    placeholder="800,00"
                  />
                </Field>
                <Field label="Tag im Monat (1–31)" required>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(_, d) => setForm((f) => ({ ...f, dayOfMonth: d.value }))}
                  />
                </Field>
                <Field label="Startdatum" required>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(_, d) => setForm((f) => ({ ...f, startDate: d.value }))}
                  />
                </Field>
                <Field label="Enddatum (optional)">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(_, d) => setForm((f) => ({ ...f, endDate: d.value }))}
                  />
                </Field>
                <Field label="Notiz">
                  <Input
                    value={form.note}
                    onChange={(_, d) => setForm((f) => ({ ...f, note: d.value }))}
                  />
                </Field>
                <Checkbox
                  label="Aktiv"
                  checked={form.isActive}
                  onChange={(_, d) => setForm((f) => ({ ...f, isActive: Boolean(d.checked) }))}
                />
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
