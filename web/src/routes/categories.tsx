import { type FormEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Select, Text, TextInput } from '@mantine/core'
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
import { DataTable, type Column } from '../components/DataTable'
import { FormModal } from '../components/FormModal'
import { Loading } from '../components/Loading'
import { RowActions } from '../components/RowActions'

export const Route = createFileRoute('/categories')({ component: CategoriesPage })

type FormState = { name: string; kind: CategoryKind; monthlyBudget: string }

const emptyForm: FormState = { name: '', kind: CategoryKind.Expense, monthlyBudget: '' }
const kindOptions = [CategoryKind.Expense, CategoryKind.Income]

function CategoriesPage() {
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

  const columns: Column<CategoryResponse>[] = [
    { key: 'name', header: 'Name', render: (c) => c.name },
    { key: 'kind', header: 'Art', render: (c) => categoryKindLabel[c.kind] },
    {
      key: 'monthlyBudget',
      header: 'Monatsbudget',
      render: (c) => (c.monthlyBudget != null ? formatEuro(c.monthlyBudget) : '—'),
      align: 'right',
    },
    {
      key: 'actions',
      header: '',
      render: (c) => <RowActions onEdit={() => openEdit(c)} onDelete={() => setToDelete(c)} />,
    },
  ]

  return (
    <>
      <PageHeader title="Kategorien">
        <Button onClick={openCreate}>Neue Kategorie</Button>
      </PageHeader>

      {categories.isPending ? (
        <Loading label="Kategorien werden geladen …" />
      ) : categories.isError ? (
        <Alert color="red">Kategorien konnten nicht geladen werden.</Alert>
      ) : categories.data.length === 0 ? (
        <Text>Noch keine Kategorien.</Text>
      ) : (
        <DataTable rows={categories.data} columns={columns} getRowId={(c) => c.id} />
      )}

      <FormModal
        opened={dialogOpen}
        title={editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
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
          label="Art"
          required
          allowDeselect={false}
          data={kindOptions.map((k) => ({ value: k, label: categoryKindLabel[k] }))}
          value={form.kind}
          onChange={(v) => v && setForm((f) => ({ ...f, kind: v as CategoryKind }))}
        />
        <TextInput
          label="Monatsbudget (optional)"
          description="Leer lassen für kein Budget."
          value={form.monthlyBudget}
          onChange={(e) => {
            const monthlyBudget = e.currentTarget.value
            setForm((f) => ({ ...f, monthlyBudget }))
          }}
          placeholder="z. B. 300,00"
        />
      </FormModal>

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
