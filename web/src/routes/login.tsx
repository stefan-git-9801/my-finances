import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Body1,
  Button,
  Card,
  Field,
  Input,
  Link as FluentLink,
  Title2,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import {
  getGetCurrentUserQueryKey,
  useLogin,
  useRegister,
} from '../api/generated/auth/auth'

export const Route = createFileRoute('/login')({ component: LoginPage })

const useStyles = makeStyles({
  wrap: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '100%',
    ...shorthands.padding('24px'),
  },
  card: {
    width: '360px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '16px',
    ...shorthands.padding('28px'),
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    rowGap: '12px',
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
  },
})

function LoginPage() {
  const styles = useStyles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const login = useLogin()
  const register = useRegister()
  const pending = login.isPending || register.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      if (mode === 'register') {
        await register.mutateAsync({ data: { email, password } })
      }
      await login.mutateAsync({ data: { email, password } })
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() })
      await navigate({ to: '/' })
    } catch {
      setError(
        mode === 'register'
          ? 'Registrierung fehlgeschlagen. Passwort mind. 8 Zeichen, E-Mail evtl. schon vergeben.'
          : 'Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.',
      )
    }
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.card}>
        <Title2>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</Title2>

        <form className={styles.form} onSubmit={onSubmit}>
          <Field label="E-Mail" required>
            <Input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(_, d) => setEmail(d.value)}
            />
          </Field>
          <Field label="Passwort" required>
            <Input
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(_, d) => setPassword(d.value)}
            />
          </Field>

          {error && <Body1 className={styles.error}>{error}</Body1>}

          <Button appearance="primary" type="submit" disabled={pending}>
            {mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </Button>
        </form>

        <Body1>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Schon registriert? '}
          <FluentLink
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </FluentLink>
        </Body1>
      </Card>
    </div>
  )
}
