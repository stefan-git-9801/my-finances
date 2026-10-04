import { Group, Loader, Text } from '@mantine/core'

export function Loading({ label }: { label: string }) {
  return (
    <Group gap="sm">
      <Loader size="sm" />
      <Text size="sm">{label}</Text>
    </Group>
  )
}
