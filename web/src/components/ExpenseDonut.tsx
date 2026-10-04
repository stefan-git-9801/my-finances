import { DonutChart } from '@mantine/charts'
import { ColorSwatch, Group, Stack, Text } from '@mantine/core'
import { formatEuro } from '../lib/format'

export type DonutPoint = { name: string; value: number; color: string }

/** Donut with the total in the centre and a legend listing every slice with its amount. */
export function ExpenseDonut({ data }: { data: DonutPoint[] }) {
  const total = data.reduce((s, p) => s + p.value, 0)
  return (
    <Stack align="center" gap="md">
      <DonutChart
        data={data}
        size={200}
        thickness={34}
        chartLabel={formatEuro(total)}
        tooltipDataSource="segment"
        valueFormatter={formatEuro}
      />
      <Stack gap={4} w="100%">
        {data.map((p) => (
          <Group key={p.name} justify="space-between" wrap="nowrap" gap="sm">
            <Group gap="xs" wrap="nowrap" miw={0}>
              <ColorSwatch color={p.color} size={12} withShadow={false} />
              <Text size="sm" truncate>
                {p.name}
              </Text>
            </Group>
            <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatEuro(p.value)}
            </Text>
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}
