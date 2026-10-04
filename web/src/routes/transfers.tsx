import { type FormEvent, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Select, Text, TextInput } from '@mantine/core'
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
import { DataTable, type Column } from '../components/DataTable'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { RowActions } from '../components/RowActions'

export const Route = createFileRoute('/transfers')({ component: TransfersPage })

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

  const columns: Column<TransferResponse>[] = [
    { key: 'bookedOn', header: 'Datum', render: (t) => formatDate(t.bookedOn) },
    { key: 'from', header: 'Von', render: (t) => accountName.get(t.fromAccountId) ?? '—' },
    { key: 'to', header: 'Nach', render: (t) => accountName.get(t.toAccountId) ?? '—' },
    { key: 'amount', header: 'Betrag', render: (t) => formatEuro(t.amount), align: 'right' },
    { key: 'note', header: 'Notiz', render: (t) => t.note ?? '' },
    {
      key: 'actions',
      header: '',
      render: (t) => <RowActions onEdit={() => openEdit(t)} onDelete={() => setToDelete(t)} />,
    },
  ]

  const accountOptions = (accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))
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
        <Button onClick={openCreate} disabled={(accounts.data?.length ?? 0) < 2}>
          Neue Umbuchung
        </Button>
      </PageHeader>

      {(accounts.data?.length ?? 0) < 2 && (
        <Alert color="blue" mb="md">
          Für eine Umbuchung werden mindestens zwei Konten benötigt.
        </Alert>
      )}

      {transfers.isPending ? (
        <Loading label="Umbuchungen werden geladen …" />
      ) : transfers.isError ? (
        <Alert color="red">Umbuchungen konnten nicht geladen werden.</Alert>
      ) : transfers.data.length === 0 ? (
        <Text>Noch keine Umbuchungen erfasst.</Text>
      ) : (
        <DataTable rows={transfers.data} columns={columns} getRowId={(t) => t.id} />
      )}

      <FormModal
        opened={dialogOpen}
        title={editing ? 'Umbuchung bearbeiten' : 'Neue Umbuchung'}
        error={saveError ? errorMessage(saveError, 'Speichern fehlgeschlagen.') : null}
        saving={saving}
        canSubmit={canSubmit}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
      >
        <Select
          label="Von Konto"
          required
          placeholder="Konto wählen"
          data={accountOptions}
          value={form.fromAccountId || null}
          onChange={(v) => setForm((f) => ({ ...f, fromAccountId: v ?? '' }))}
        />
        <Select
          label="Nach Konto"
          required
          placeholder="Konto wählen"
          data={accountOptions}
          value={form.toAccountId || null}
          onChange={(v) => setForm((f) => ({ ...f, toAccountId: v ?? '' }))}
        />
        <TextInput
          label="Betrag"
          required
          value={form.amount}
          onChange={(e) => {
            const amount = e.currentTarget.value
            setForm((f) => ({ ...f, amount }))
          }}
          placeholder="100,00"
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
        {form.fromAccountId !== '' && form.fromAccountId === form.toAccountId && (
          <Alert color="yellow">Quell- und Zielkonto müssen unterschiedlich sein.</Alert>
        )}
      </FormModal>

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
