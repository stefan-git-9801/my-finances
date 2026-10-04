import type { FormEvent, ReactNode } from 'react'
import { Alert, Button, Group, Modal, Stack } from '@mantine/core'

type Props = {
  opened: boolean
  title: string
  error?: string | null
  saving?: boolean
  canSubmit?: boolean
  onClose: () => void
  onSubmit: (event: FormEvent) => void
  children: ReactNode
}

/** Modal wrapping a form with the standard Abbrechen / Speichern footer. */
export function FormModal({
  opened,
  title,
  error,
  saving,
  canSubmit = true,
  onClose,
  onSubmit,
  children,
}: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          {children}
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end" mt="xs">
            <Button variant="default" type="button" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" loading={saving} disabled={!canSubmit}>
              Speichern
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
