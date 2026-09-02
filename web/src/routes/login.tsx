import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Body1,
  Button,
  Card,
  Field,
  Input,
  Title2,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { getGetCurrentUserQueryKey, useLogin } from '../api/generated/auth/auth'

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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const login = useLogin()

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      await login.mutateAsync({ data: { email, password } })
      await queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() })
      await navigate({ to: '/' })
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.')
    }
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.card}>
        <Title2>Anmelden</Title2>

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
              autoComplete="current-password"
              onChange={(_, d) => setPassword(d.value)}
            />
          </Field>

          {error && <Body1 className={styles.error}>{error}</Body1>}

          <Button appearance="primary" type="submit" disabled={login.isPending}>
            Anmelden
          </Button>
        </form>
      </Card>
    </div>
  )
}
