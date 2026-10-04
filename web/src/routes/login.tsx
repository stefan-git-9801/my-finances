import { type FormEvent, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card, Center, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { getGetCurrentUserQueryKey, useLogin } from '../api/generated/auth/auth'
import { NEGATIVE_TEXT } from '../lib/colors'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
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
    <Center mih="100%" p="lg">
      <Card withBorder padding="xl" w={360} maw="100%">
        <Stack gap="md">
          <Title order={2}>Anmelden</Title>

          <form onSubmit={onSubmit}>
            <Stack gap="sm">
              <TextInput
                label="E-Mail"
                type="email"
                required
                value={email}
                autoComplete="email"
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <PasswordInput
                label="Passwort"
                required
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.currentTarget.value)}
              />

              {error && <Text c={NEGATIVE_TEXT}>{error}</Text>}

              <Button type="submit" loading={login.isPending}>
                Anmelden
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Center>
  )
}
