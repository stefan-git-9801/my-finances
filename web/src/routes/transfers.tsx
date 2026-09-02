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
import {
  getGetTransfersQueryKey,
  useCreateTransfer,
  useDeleteTransfer,
  useGetTransfers,
  useUpdateTransfer,
} from '../api/generated/transfers/transfers'
import type { TransferResponse } from '../api/generated/model'
import { formatDate, formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'

export const Route = createFileRoute('/transfers')({ component: TransfersPage })

const useStyles = makeStyles({
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
  actions: { display: 'flex', gap: '8px' },
})

const today = () => new Date().toISOString().slice(0, 10)

type FormState = {
  fromAccountId: string
  toAccountId: string
  amount: string
  note: string
  bookedOn: string
}

const emptyForm = (): FormState => ({
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  note: '',
  bookedOn: today(),
})

function TransfersPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()

  const accounts = useGetAccounts()
  const transfers = useGetTransfers()

  const accountName = useMemo(() => {
    const map = new Map<string, string>()
    accounts.data?.forEach((a) => map.set(a.id, a.name))
    return map
  }, [accounts.data])

  const [editing, setEditing] = useState<TransferResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<TransferResponse | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetTransfersQueryKey() })

  const createTransfer = useCreateTransfer()
  const updateTransfer = useUpdateTransfer()
  const deleteTransfer = useDeleteTransfer()

  const saving = createTransfer.isPending || updateTransfer.isPending
  const saveError = createTransfer.error ?? updateTransfer.error

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    createTransfer.reset()
    updateTransfer.reset()
    setDialogOpen(true)
  }

  function openEdit(transfer: TransferResponse) {
    setEditing(transfer)
    setForm({
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: String(transfer.amount).replace('.', ','),
      note: transfer.note ?? '',
      bookedOn: transfer.bookedOn.slice(0, 10),
    })
    createTransfer.reset()
    updateTransfer.reset()
    setDialogOpen(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const data = {
      fromAccountId: form.fromAccountId,
      toAccountId: form.toAccountId,
      amount: parseAmount(form.amount),
      note: form.note.trim() === '' ? null : form.note.trim(),
      bookedOn: form.bookedOn,
    }
    try {
      if (editing) {
        await updateTransfer.mutateAsync({ id: editing.id, data })
      } else {
        await createTransfer.mutateAsync({ data })
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
      await deleteTransfer.mutateAsync({ id: toDelete.id })
      await invalidate()
      setToDelete(null)
    } catch {
      /* error surfaced in dialog */
    }
  }

  const columns: TableColumnDefinition<TransferResponse>[] = [
    createTableColumn({
      columnId: 'bookedOn',
      renderHeaderCell: () => 'Datum',
      renderCell: (t) => formatDate(t.bookedOn),
    }),
    createTableColumn({
      columnId: 'from',
      renderHeaderCell: () => 'Von',
      renderCell: (t) => accountName.get(t.fromAccountId) ?? '—',
    }),
    createTableColumn({
      columnId: 'to',
      renderHeaderCell: () => 'Nach',
      renderCell: (t) => accountName.get(t.toAccountId) ?? '—',
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

  const parsedAmount = parseAmount(form.amount)
  const canSubmit =
    form.fromAccountId !== '' &&
    form.toAccountId !== '' &&
    form.fromAccountId !== form.toAccountId &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0

  return (
    <>
      <PageHeader title="Umbuchungen">
        <Button
          appearance="primary"
          onClick={openCreate}
          disabled={(accounts.data?.length ?? 0) < 2}
        >
          Neue Umbuchung
        </Button>
      </PageHeader>

      {(accounts.data?.length ?? 0) < 2 && (
        <MessageBar intent="info">Für eine Umbuchung werden mindestens zwei Konten benötigt.</MessageBar>
      )}

      {transfers.isPending ? (
        <Spinner label="Umbuchungen werden geladen …" />
      ) : transfers.isError ? (
        <MessageBar intent="error">Umbuchungen konnten nicht geladen werden.</MessageBar>
      ) : transfers.data.length === 0 ? (
        <Body1>Noch keine Umbuchungen erfasst.</Body1>
      ) : (
        <DataGrid items={transfers.data} columns={columns} getRowId={(t) => t.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<TransferResponse>>
            {({ item, rowId }) => (
              <DataGridRow<TransferResponse> key={rowId}>
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
              <DialogTitle>{editing ? 'Umbuchung bearbeiten' : 'Neue Umbuchung'}</DialogTitle>
              <DialogContent className={styles.form}>
                <Field label="Von Konto" required>
                  <Dropdown
                    placeholder="Konto wählen"
                    selectedOptions={form.fromAccountId ? [form.fromAccountId] : []}
                    value={accountName.get(form.fromAccountId) ?? ''}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, fromAccountId: d.optionValue ?? '' }))
                    }
                  >
                    {accounts.data?.map((a) => (
                      <Option key={a.id} value={a.id}>
                        {a.name}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Nach Konto" required>
                  <Dropdown
                    placeholder="Konto wählen"
                    selectedOptions={form.toAccountId ? [form.toAccountId] : []}
                    value={accountName.get(form.toAccountId) ?? ''}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, toAccountId: d.optionValue ?? '' }))
                    }
                  >
                    {accounts.data?.map((a) => (
                      <Option key={a.id} value={a.id}>
                        {a.name}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Betrag" required>
                  <Input
                    value={form.amount}
                    onChange={(_, d) => setForm((f) => ({ ...f, amount: d.value }))}
                    placeholder="100,00"
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
                {form.fromAccountId !== '' && form.fromAccountId === form.toAccountId && (
                  <MessageBar intent="warning">Quell- und Zielkonto müssen unterschiedlich sein.</MessageBar>
                )}
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
        title="Umbuchung löschen"
        message="Diese Umbuchung wirklich löschen?"
        error={deleteTransfer.error ? errorMessage(deleteTransfer.error) : null}
        pending={deleteTransfer.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
            deleteTransfer.reset()
          }
        }}
      />
    </>
  )
}
