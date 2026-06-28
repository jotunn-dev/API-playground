import { useState } from 'react'
import { RequestBuilder } from './RequestBuilder'
import { ResponseViewer } from '../responseViewer/ResponseViewer'
import type { ExecuteResponse, ExecuteError } from '../../shared/api/requestApi'

interface Props {
  onLogout: () => void
}

export function AppPage({ onLogout }: Props) {
  const [response, setResponse] = useState<ExecuteResponse | ExecuteError | null>(null)

  return (
    <div style={styles.layout}>
      <header style={styles.header}>
        <span style={styles.brand}>API Playground</span>
        <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
      </header>

      <main style={styles.main}>
        <RequestBuilder onResponse={setResponse} />
        <ResponseViewer result={response} />
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: '100vh',
    background: '#f5f6fa',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  header: {
    background: '#18181b',
    color: '#f4f4f5',
    padding: '0.8rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '0.01em',
    color: '#f4f4f5',
  },
  logoutBtn: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#f4f4f5',
    padding: '0.3rem 0.8rem',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  main: {
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
}
