import { Button, Group } from '@mantine/core'

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <Group gap="xs" wrap="nowrap" justify="flex-end">
      <Button size="compact-sm" variant="default" onClick={onEdit}>
        Bearbeiten
      </Button>
      <Button size="compact-sm" variant="default" onClick={onDelete}>
        Löschen
      </Button>
    </Group>
  )
}
