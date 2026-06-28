import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from './authApi'
import { useAuth } from './useAuth'

type Tab = 'login' | 'register'

interface AuthPageProps {
  onAuthenticated: (token: string) => void
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { storeToken } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (tab === 'login') {
        const result = await loginUser({ email, password })
        storeToken(result.token)
        onAuthenticated(result.token)
        navigate('/app')
      } else {
        await registerUser({ email, password })
        setTab('login')
        setError(null)
        setEmail('')
        setPassword('')
        setSuccess('Account created — please log in.')
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string }; status?: number } }
        setError(axiosErr.response?.data?.error ?? 'An error occurred. Please try again.')
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function switchTab(next: Tab) {
    setTab(next)
    setError(null)
    setSuccess(null)
  }

  const focusStyle: React.CSSProperties = {
    outline: '2px solid #4f46e5',
    outlineOffset: 2,
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>API Playground</h1>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(tab === 'login' ? styles.activeTab : {}) }}
            onClick={() => switchTab('login')}
          >
            Login
          </button>
          <button
            style={{ ...styles.tab, ...(tab === 'register' ? styles.activeTab : {}) }}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ ...styles.input, ...(focusedField === 'email' ? focusStyle : {}) }}
              autoComplete="email"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              minLength={8}
              style={{ ...styles.input, ...(focusedField === 'password' ? focusStyle : {}) }}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </div>

          {success && <div style={styles.successMessage}>{success}</div>}
          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f6fa',
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.75rem',
    color: '#111827',
    fontSize: '1.4rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  tabs: {
    display: 'flex',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
    flex: 1,
    padding: '0.6rem 0',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    color: '#6b7280',
    fontWeight: 500,
    marginBottom: -2,
  },
  activeTab: {
    color: '#4f46e5',
    borderBottom: '2px solid #4f46e5',
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.6rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '0.95rem',
    outline: 'none',
    color: '#111827',
    background: '#fff',
  },
  successMessage: {
    color: '#166534',
    fontSize: '0.875rem',
    padding: '0.4rem 0.6rem',
    background: '#dcfce7',
    borderRadius: 4,
  },
  error: {
    color: '#991b1b',
    fontSize: '0.875rem',
    padding: '0.4rem 0.6rem',
    background: '#fef2f2',
    borderRadius: 4,
    border: '1px solid #fca5a5',
  },
  submitButton: {
    padding: '0.65rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontWeight: 600,
    marginTop: '0.25rem',
    width: '100%',
  },
}
