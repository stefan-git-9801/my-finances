import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getGetCurrentUserQueryKey, useGetCurrentUser } from '../api/generated/auth/auth'
import { logout as logoutRequest } from '../api/generated/auth/auth'

/**
 * Current signed-in user. `isError` (401) means "not authenticated".
 * We disable retry so a 401 resolves fast instead of retrying.
 */
export function useCurrentUser() {
  return useGetCurrentUser({
    query: {
      retry: false,
      staleTime: 60_000,
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return async () => {
    await logoutRequest()
    await queryClient.resetQueries({ queryKey: getGetCurrentUserQueryKey() })
    queryClient.clear()
    await navigate({ to: '/login' })
  }
}
