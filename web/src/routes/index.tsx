import { type FormEvent, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Body1,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  MessageBar,
  Spinner,
  Subtitle1,
  Title2,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import {
  getGetAccountsQueryKey,
  useCreateAccount,
  useGetAccounts,
} from '../api/generated/accounts/accounts'

export const Route = createFileRoute('/')({ component: AccountsPage })

const useStyles = makeStyles({
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    ...shorthands.padding('20px'),
    rowGap: '4px',
  },
  currency: {
    color: tokens.colorNeutralForeground3,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '12px',
  },
})

function AccountsPage() {
  const styles = useStyles()
  const queryClient = useQueryClient()
  const accounts = useGetAccounts()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('EUR')

  const createAccount = useCreateAccount({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() })
        setOpen(false)
        setName('')
        setCurrency('EUR')
      },
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createAccount.mutate({ data: { name, currency } })
  }

  return (
    <>
      <div className={styles.head}>
        <Title2>Konten</Title2>
        <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="primary">Neues Konto</Button>
          </DialogTrigger>
          <DialogSurface>
            <form onSubmit={onSubmit}>
              <DialogBody>
                <DialogTitle>Neues Konto</DialogTitle>
                <DialogContent className={styles.form}>
                  <Field label="Name" required>
                    <Input value={name} onChange={(_, d) => setName(d.value)} />
                  </Field>
                  <Field label="Währung (3 Buchstaben)" required>
                    <Input
                      value={currency}
                      maxLength={3}
                      onChange={(_, d) => setCurrency(d.value.toUpperCase())}
                    />
                  </Field>
                  {createAccount.isError && (
                    <MessageBar intent="error">Konto konnte nicht angelegt werden.</MessageBar>
                  )}
                </DialogContent>
                <DialogActions>
                  <DialogTrigger disableButtonEnhancement>
                    <Button appearance="secondary" type="button">
                      Abbrechen
                    </Button>
                  </DialogTrigger>
                  <Button
                    appearance="primary"
                    type="submit"
                    disabled={createAccount.isPending || name.trim() === '' || currency.length !== 3}
                  >
                    Anlegen
                  </Button>
                </DialogActions>
              </DialogBody>
            </form>
          </DialogSurface>
        </Dialog>
      </div>

      {accounts.isPending ? (
        <Spinner label="Konten werden geladen …" />
      ) : accounts.isError ? (
        <MessageBar intent="error">Konten konnten nicht geladen werden.</MessageBar>
      ) : accounts.data.length === 0 ? (
        <Body1>Noch keine Konten. Lege oben dein erstes Konto an.</Body1>
      ) : (
        <div className={styles.grid}>
          {accounts.data.map((account) => (
            <Card key={account.id} className={styles.card}>
              <Subtitle1>{account.name}</Subtitle1>
              <Body1 className={styles.currency}>{account.currency}</Body1>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
