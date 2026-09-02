import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
} from '@fluentui/react-components'

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
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            {message}
            {error && (
              <MessageBar intent="error" style={{ marginTop: 12 }}>
                {error}
              </MessageBar>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button appearance="primary" onClick={onConfirm} disabled={pending}>
              {confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
