import { type FormEvent, useState } from 'react'
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

export const Route = createFileRoute('/accounts')({ component: AccountsPage })

const useStyles = makeStyles({
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
  actions: { display: 'flex', gap: '8px' },
})

type FormState = { name: string; type: AccountType; startingBalance: string }

const emptyForm: FormState = { name: '', type: AccountType.Checking, startingBalance: '0' }

function AccountsPage() {
  const styles = useStyles()
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

  const columns: TableColumnDefinition<AccountResponse>[] = [
    createTableColumn({
      columnId: 'name',
      renderHeaderCell: () => 'Name',
      renderCell: (a) => a.name,
    }),
    createTableColumn({
      columnId: 'type',
      renderHeaderCell: () => 'Typ',
      renderCell: (a) => accountTypeLabel[a.type],
    }),
    createTableColumn({
      columnId: 'startingBalance',
      renderHeaderCell: () => 'Startsaldo',
      renderCell: (a) => formatEuro(a.startingBalance),
    }),
    createTableColumn({
      columnId: 'currentBalance',
      renderHeaderCell: () => 'Aktueller Saldo',
      renderCell: (a) => formatEuro(a.currentBalance),
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (a) => (
        <div className={styles.actions}>
          <Button size="small" onClick={() => openEdit(a)}>
            Bearbeiten
          </Button>
          <Button size="small" onClick={() => setToDelete(a)}>
            Löschen
          </Button>
        </div>
      ),
    }),
  ]

  return (
    <>
      <PageHeader title="Konten">
        <Button appearance="primary" onClick={openCreate}>
          Neues Konto
        </Button>
      </PageHeader>

      {accounts.isPending ? (
        <Spinner label="Konten werden geladen …" />
      ) : accounts.isError ? (
        <MessageBar intent="error">Konten konnten nicht geladen werden.</MessageBar>
      ) : accounts.data.length === 0 ? (
        <Body1>Noch keine Konten. Lege oben dein erstes Konto an.</Body1>
      ) : (
        <DataGrid items={accounts.data} columns={columns} getRowId={(a) => a.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<AccountResponse>>
            {({ item, rowId }) => (
              <DataGridRow<AccountResponse> key={rowId}>
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
              <DialogTitle>{editing ? 'Konto bearbeiten' : 'Neues Konto'}</DialogTitle>
              <DialogContent className={styles.form}>
                <Field label="Name" required>
                  <Input
                    value={form.name}
                    onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))}
                  />
                </Field>
                <Field label="Typ" required>
                  <Dropdown
                    selectedOptions={[form.type]}
                    value={accountTypeLabel[form.type]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, type: d.optionValue as AccountType }))
                    }
                  >
                    {accountTypeOptions.map((t) => (
                      <Option key={t} value={t}>
                        {accountTypeLabel[t]}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Startsaldo" required>
                  <Input
                    value={form.startingBalance}
                    onChange={(_, d) => setForm((f) => ({ ...f, startingBalance: d.value }))}
                    placeholder="0,00"
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
                <Button appearance="primary" type="submit" disabled={saving || form.name.trim() === ''}>
                  Speichern
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

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
