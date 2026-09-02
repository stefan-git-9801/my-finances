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
  getGetCategoriesQueryKey,
  useCreateCategory,
  useDeleteCategory,
  useGetCategories,
  useUpdateCategory,
} from '../api/generated/categories/categories'
import type { CategoryResponse } from '../api/generated/model'
import { CategoryKind } from '../api/generated/model/categoryKind'
import { categoryKindLabel } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'
import { errorMessage } from '../lib/errors'
import { PageHeader } from '../components/PageHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'

export const Route = createFileRoute('/categories')({ component: CategoriesPage })

const useStyles = makeStyles({
  form: { display: 'flex', flexDirection: 'column', rowGap: '12px' },
  actions: { display: 'flex', gap: '8px' },
})

type FormState = { name: string; kind: CategoryKind; monthlyBudget: string }

const emptyForm: FormState = { name: '', kind: CategoryKind.Expense, monthlyBudget: '' }
const kindOptions = [CategoryKind.Expense, CategoryKind.Income]

function CategoriesPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()
  const categories = useGetCategories()

  const [editing, setEditing] = useState<CategoryResponse | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [toDelete, setToDelete] = useState<CategoryResponse | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() })

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const saving = createCategory.isPending || updateCategory.isPending
  const saveError = createCategory.error ?? updateCategory.error

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    createCategory.reset()
    updateCategory.reset()
    setDialogOpen(true)
  }

  function openEdit(category: CategoryResponse) {
    setEditing(category)
    setForm({
      name: category.name,
      kind: category.kind,
      monthlyBudget:
        category.monthlyBudget != null ? String(category.monthlyBudget).replace('.', ',') : '',
    })
    createCategory.reset()
    updateCategory.reset()
    setDialogOpen(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const budget = form.monthlyBudget.trim()
    const data = {
      name: form.name.trim(),
      kind: form.kind,
      monthlyBudget: budget === '' ? null : parseAmount(budget),
    }
    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, data })
      } else {
        await createCategory.mutateAsync({ data })
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
      await deleteCategory.mutateAsync({ id: toDelete.id })
      await invalidate()
      setToDelete(null)
    } catch {
      /* error surfaced in dialog */
    }
  }

  const columns: TableColumnDefinition<CategoryResponse>[] = [
    createTableColumn({
      columnId: 'name',
      renderHeaderCell: () => 'Name',
      renderCell: (c) => c.name,
    }),
    createTableColumn({
      columnId: 'kind',
      renderHeaderCell: () => 'Art',
      renderCell: (c) => categoryKindLabel[c.kind],
    }),
    createTableColumn({
      columnId: 'monthlyBudget',
      renderHeaderCell: () => 'Monatsbudget',
      renderCell: (c) => (c.monthlyBudget != null ? formatEuro(c.monthlyBudget) : '—'),
    }),
    createTableColumn({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (c) => (
        <div className={styles.actions}>
          <Button size="small" onClick={() => openEdit(c)}>
            Bearbeiten
          </Button>
          <Button size="small" onClick={() => setToDelete(c)}>
            Löschen
          </Button>
        </div>
      ),
    }),
  ]

  return (
    <>
      <PageHeader title="Kategorien">
        <Button appearance="primary" onClick={openCreate}>
          Neue Kategorie
        </Button>
      </PageHeader>

      {categories.isPending ? (
        <Spinner label="Kategorien werden geladen …" />
      ) : categories.isError ? (
        <MessageBar intent="error">Kategorien konnten nicht geladen werden.</MessageBar>
      ) : categories.data.length === 0 ? (
        <Body1>Noch keine Kategorien.</Body1>
      ) : (
        <DataGrid items={categories.data} columns={columns} getRowId={(c) => c.id}>
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<CategoryResponse>>
            {({ item, rowId }) => (
              <DataGridRow<CategoryResponse> key={rowId}>
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
              <DialogTitle>{editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</DialogTitle>
              <DialogContent className={styles.form}>
                <Field label="Name" required>
                  <Input
                    value={form.name}
                    onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))}
                  />
                </Field>
                <Field label="Art" required>
                  <Dropdown
                    selectedOptions={[form.kind]}
                    value={categoryKindLabel[form.kind]}
                    onOptionSelect={(_, d) =>
                      setForm((f) => ({ ...f, kind: d.optionValue as CategoryKind }))
                    }
                  >
                    {kindOptions.map((k) => (
                      <Option key={k} value={k}>
                        {categoryKindLabel[k]}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Monatsbudget (optional)" hint="Leer lassen für kein Budget.">
                  <Input
                    value={form.monthlyBudget}
                    onChange={(_, d) => setForm((f) => ({ ...f, monthlyBudget: d.value }))}
                    placeholder="z. B. 300,00"
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
        title="Kategorie löschen"
        message={`Kategorie „${toDelete?.name}" wirklich löschen?`}
        error={deleteCategory.error ? errorMessage(deleteCategory.error) : null}
        pending={deleteCategory.isPending}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null)
            deleteCategory.reset()
          }
        }}
      />
    </>
  )
}
