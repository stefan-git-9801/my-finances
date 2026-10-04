import type { ReactNode } from 'react'
import { Card, Stack, Text } from '@mantine/core'

export function StatTile({
  label,
  value,
  hint,
  valueColor,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  valueColor?: string
}) {
  return (
    <Card withBorder padding="md" miw={0}>
      <Stack gap={4}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text fz={28} fw={600} lh={1.2} c={valueColor}>
          {value}
        </Text>
        {hint != null && (
          <Text size="xs" c="dimmed">
            {hint}
          </Text>
        )}
      </Stack>
    </Card>
  )
}
