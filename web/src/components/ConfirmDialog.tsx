import { Alert, Button, Group, Modal, Text } from '@mantine/core'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  error?: string | null
  pending?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/** Small yes/no dialog used for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Löschen',
  error,
  pending,
  onConfirm,
  onOpenChange,
}: Props) {
  return (
    <Modal opened={open} onClose={() => onOpenChange(false)} title={title} centered>
      <Text>{message}</Text>
      {error && (
        <Alert color="red" mt="md">
          {error}
        </Alert>
      )}
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={() => onOpenChange(false)}>
          Abbrechen
        </Button>
        <Button color="red" onClick={onConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </Group>
    </Modal>
  )
}
