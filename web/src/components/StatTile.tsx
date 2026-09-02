import type { ReactNode } from 'react'
import { Card, makeStyles, tokens } from '@fluentui/react-components'

const useStyles = makeStyles({
  card: {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: '4px',
    minWidth: 0,
  },
  label: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  value: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  hint: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
})

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
  const styles = useStyles()
  return (
    <Card className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </span>
      {hint != null && <span className={styles.hint}>{hint}</span>}
    </Card>
  )
}
