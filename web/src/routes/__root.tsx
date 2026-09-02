import {
  Link,
  Navigate,
  Outlet,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'
import {
  Body1,
  Button,
  Spinner,
  Title3,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { useCurrentUser, useLogout } from '../lib/auth'

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

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    ...shorthands.padding('12px', '24px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
    flexWrap: 'wrap',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '18px',
    rowGap: '8px',
    flexWrap: 'wrap',
  },
  link: {
    color: tokens.colorNeutralForeground2,
    textDecorationLine: 'none',
    fontWeight: tokens.fontWeightSemibold,
  },
  activeLink: {
    color: tokens.colorBrandForeground1,
  },
  main: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '960px',
    marginInline: 'auto',
    ...shorthands.padding('24px'),
  },
  center: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '100%',
  },
})

function RootLayout() {
  const styles = useStyles()
  const { data: user, isPending, isError } = useCurrentUser()
  const logout = useLogout()

  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onLoginPage = pathname === '/login'

  if (isPending) {
    return (
      <div className={styles.center}>
        <Spinner label="Lädt …" />
      </div>
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
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.nav}>
          <Title3>my-finances</Title3>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={styles.link}
              activeProps={{ className: `${styles.link} ${styles.activeLink}` }}
              activeOptions={'exact' in item && item.exact ? { exact: true } : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className={styles.nav}>
          <Body1>{user.email}</Body1>
          <Button appearance="subtle" onClick={() => void logout()}>
            Abmelden
          </Button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
