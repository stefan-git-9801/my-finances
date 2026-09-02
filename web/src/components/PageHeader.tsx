import type { ReactNode } from 'react'
import { Title2, makeStyles } from '@fluentui/react-components'

const useStyles = makeStyles({
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
})

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  const styles = useStyles()
  return (
    <div className={styles.head}>
      <Title2>{title}</Title2>
      {children}
    </div>
  )
}
