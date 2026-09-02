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
  Dropdown,
  Field,
  Input,
  MessageBar,
  Option,
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
import { AccountType } from '../api/generated/model/accountType'
import { accountTypeLabel, accountTypeOptions } from '../lib/labels'
import { formatEuro, parseAmount } from '../lib/format'

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
  type: {
    color: tokens.colorNeutralForeground3,
  },
  balance: {
    marginTop: '8px',
    fontWeight: tokens.fontWeightSemibold,
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
  const [type, setType] = useState<AccountType>(AccountType.Checking)
  const [startingBalance, setStartingBalance] = useState('0')

  const createAccount = useCreateAccount({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetAccountsQueryKey() })
        setOpen(false)
        setName('')
        setType(AccountType.Checking)
        setStartingBalance('0')
      },
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createAccount.mutate({
      data: { name, type, startingBalance: parseAmount(startingBalance) || 0 },
    })
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
                  <Field label="Typ" required>
                    <Dropdown
                      selectedOptions={[type]}
                      value={accountTypeLabel[type]}
                      onOptionSelect={(_, d) => setType(d.optionValue as AccountType)}
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
                      value={startingBalance}
                      onChange={(_, d) => setStartingBalance(d.value)}
                      placeholder="0,00"
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
                    disabled={createAccount.isPending || name.trim() === ''}
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
              <Body1 className={styles.type}>{accountTypeLabel[account.type]}</Body1>
              <Body1 className={styles.balance}>{formatEuro(account.currentBalance)}</Body1>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
