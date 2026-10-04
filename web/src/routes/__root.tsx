import { Link, Navigate, Outlet, createRootRoute, useRouterState } from '@tanstack/react-router'
import { Anchor, Box, Button, Center, Group, Loader, Text, Title } from '@mantine/core'
import { useCurrentUser, useLogout } from '../lib/auth'
import classes from '../styles/layout.module.css'

export const Route = createRootRoute({ component: RootLayout })

const navItems = [
  { to: '/', label: 'Übersicht', exact: true },
  { to: '/accounts', label: 'Konten' },
  { to: '/transactions', label: 'Buchungen' },
  { to: '/transfers', label: 'Umbuchungen' },
  { to: '/categories', label: 'Kategorien' },
  { to: '/recurring', label: 'Vorlagen' },
  { to: '/reports', label: 'Auswertungen' },
] as const

function RootLayout() {
  const { data: user, isPending, isError } = useCurrentUser()
  const logout = useLogout()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onLoginPage = pathname === '/login'

  if (isPending) {
    return (
      <Center h="100%">
        <Group gap="sm">
          <Loader size="sm" />
          <Text>Lädt …</Text>
        </Group>
      </Center>
    )
  }

  if (isError && !onLoginPage) {
    return <Navigate to="/login" />
  }

  if (user && onLoginPage) {
    return <Navigate to="/" />
  }

  if (!user) {
    // Login page renders itself without the app shell.
    return <Outlet />
  }

  return (
    <Box mih="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <Group component="header" className={classes.header} justify="space-between" px="lg" py="sm">
        <Group gap="lg">
          <Title order={3}>my-finances</Title>
          {navItems.map((item) => (
            <Anchor
              key={item.to}
              component={Link}
              to={item.to}
              className={classes.link}
              activeProps={{ 'data-active': true }}
              activeOptions={'exact' in item && item.exact ? { exact: true } : undefined}
            >
              {item.label}
            </Anchor>
          ))}
        </Group>
        <Group gap="md">
          <Text size="sm">{user.email}</Text>
          <Button variant="subtle" onClick={() => void logout()}>
            Abmelden
          </Button>
        </Group>
      </Group>
      <main className={classes.main}>
        <Outlet />
      </main>
    </Box>
  )
}
