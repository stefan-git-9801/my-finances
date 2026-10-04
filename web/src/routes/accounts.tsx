import { type FormEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Select, Text, TextInput } from '@mantine/core'
import {
  getGetAccountsQueryKey,
  useCreateAccount,
  useDeleteAccount,
  useGetAccounts,
  useUpdateAccount,
} from '../api/generated/accounts/accounts'
import type { AccountResponse } from '../api/generated/model'
import { AccountType } from '../api/generated/model/accountType'
import { accountTypeLabel, accountTypeOptions } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable, type Column } from '../components/DataTable'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { RowActions } from '../components/RowActions'

export const Route = createFileRoute('/accounts')({ component: AccountsPage })

type FormState = { name: string; type: AccountType; startingBalance: string }

const emptyForm: FormState = { name: '', type: AccountType.Checking, startingBalance: '0' }

function AccountsPage() {
  const queryClient = useQueryClient()
  const accounts = useGetAccounts()

  const [editing, setEditing] = useState<AccountResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<AccountResponse | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() })

  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const deleteAccount = useDeleteAccount()

  const saving = createAccount.isPending || updateAccount.isPending
  const saveError = createAccount.error ?? updateAccount.error

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    createAccount.reset()
    updateAccount.reset()
    setDialogOpen(true)
  }

  function openEdit(account: AccountResponse) {
    setEditing(account)
    setForm({
      name: account.name,
      type: account.type,
      startingBalance: String(account.startingBalance).replace('.', ','),
    })
    createAccount.reset()
    updateAccount.reset()
    setDialogOpen(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const data = {
      name: form.name.trim(),
      type: form.type,
      startingBalance: parseAmount(form.startingBalance) || 0,
    }
    try {
      if (editing) {
        await updateAccount.mutateAsync({ id: editing.id, data })
      } else {
        await createAccount.mutateAsync({ data })
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
      await deleteAccount.mutateAsync({ id: toDelete.id })
      await invalidate()
      setToDelete(null)
    } catch {
      /* error surfaced in dialog */
    }
  }

  const columns: Column<AccountResponse>[] = [
    { key: 'name', header: 'Name', render: (a) => a.name },
    { key: 'type', header: 'Typ', render: (a) => accountTypeLabel[a.type] },
    {
      key: 'startingBalance',
      header: 'Startsaldo',
      render: (a) => formatEuro(a.startingBalance),
      align: 'right',
    },
    {
      key: 'currentBalance',
      header: 'Aktueller Saldo',
      render: (a) => formatEuro(a.currentBalance),
      align: 'right',
    },
    {
      key: 'actions',
      header: '',
      render: (a) => <RowActions onEdit={() => openEdit(a)} onDelete={() => setToDelete(a)} />,
    },
  ]

  return (
    <>
      <PageHeader title="Konten">
        <Button onClick={openCreate}>Neues Konto</Button>
      </PageHeader>

      {accounts.isPending ? (
        <Loading label="Konten werden geladen …" />
      ) : accounts.isError ? (
        <Alert color="red">Konten konnten nicht geladen werden.</Alert>
      ) : accounts.data.length === 0 ? (
        <Text>Noch keine Konten. Lege oben dein erstes Konto an.</Text>
      ) : (
        <DataTable rows={accounts.data} columns={columns} getRowId={(a) => a.id} />
      )}

      <FormModal
        opened={dialogOpen}
        title={editing ? 'Konto bearbeiten' : 'Neues Konto'}
        error={saveError ? errorMessage(saveError, 'Speichern fehlgeschlagen.') : null}
        saving={saving}
        canSubmit={form.name.trim() !== ''}
        onClose={() => setDialogOpen(false)}
        onSubmit={onSubmit}
      >
        <TextInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => {
            const name = e.currentTarget.value
            setForm((f) => ({ ...f, name }))
          }}
        />
        <Select
          label="Typ"
          required
          allowDeselect={false}
          data={accountTypeOptions.map((t) => ({ value: t, label: accountTypeLabel[t] }))}
          value={form.type}
          onChange={(v) => v && setForm((f) => ({ ...f, type: v as AccountType }))}
        />
        <TextInput
          label="Startsaldo"
          required
          value={form.startingBalance}
          onChange={(e) => {
            const startingBalance = e.currentTarget.value
            setForm((f) => ({ ...f, startingBalance }))
          }}
          placeholder="0,00"
        />
      </FormModal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Konto löschen"
        message={`Konto „${toDelete?.name}" wirklich löschen?`}
        error={deleteAccount.error ? errorMessage(deleteAccount.error) : null}
        pending={deleteAccount.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
            deleteAccount.reset()
          }
        }}
      />
    </>
  )
}
