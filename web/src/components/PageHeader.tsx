import type { ReactNode } from 'react'
import { Group, Title } from '@mantine/core'

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Group justify="space-between" mb="lg">
      <Title order={2}>{title}</Title>
      {children}
    </Group>
  )
}
