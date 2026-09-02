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
    ...shorthands.padding('12px', '24px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '20px',
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
    maxWidth: '920px',
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
          <Link
            to="/"
            className={styles.link}
            activeProps={{ className: `${styles.link} ${styles.activeLink}` }}
            activeOptions={{ exact: true }}
          >
            Konten
          </Link>
          <Link
            to="/transactions"
            className={styles.link}
            activeProps={{ className: `${styles.link} ${styles.activeLink}` }}
          >
            Buchungen
          </Link>
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
