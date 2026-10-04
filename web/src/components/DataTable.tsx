import type { ReactNode } from 'react'
import { Table } from '@mantine/core'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
}

type Props<T> = {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
}

/** Plain responsive table; scrolls horizontally on narrow screens. */
export function DataTable<T>({ rows, columns, getRowId }: Props<T>) {
  return (
    <Table.ScrollContainer minWidth={560}>
      <Table highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            {columns.map((c) => (
              <Table.Th key={c.key} ta={c.align}>
                {c.header}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={getRowId(row)}>
              {columns.map((c) => (
                <Table.Td key={c.key} ta={c.align}>
                  {c.render(row)}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
