import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  // The dashboard lands here in a later phase; for now go straight to the accounts overview.
  beforeLoad: () => {
    throw redirect({ to: '/accounts' })
  },
})
