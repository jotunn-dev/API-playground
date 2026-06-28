import { useState } from 'react'
import Editor from '@monaco-editor/react'
import type { ExecuteResponse, ExecuteError } from '../../shared/api/requestApi'

interface Props {
  result: ExecuteResponse | ExecuteError | null
}

function isExecuteError(r: ExecuteResponse | ExecuteError): r is ExecuteError {
  return 'error' in r && typeof (r as ExecuteError).error === 'string'
}

function getMonacoLanguage(contentType: string): string {
  if (contentType.includes('json')) return 'json'
  if (contentType.includes('html')) return 'html'
  if (contentType.includes('xml')) return 'xml'
  return 'plaintext'
}

function getStatusStyle(status: number): React.CSSProperties {
  if (status >= 200 && status < 300) return { background: '#dcfce7', color: '#166534' }
  if (status >= 300 && status < 400) return { background: '#dbeafe', color: '#1e40af' }
  if (status >= 400 && status < 500) return { background: '#fef9c3', color: '#854d0e' }
  return { background: '#fee2e2', color: '#991b1b' }
}

export function ResponseViewer({ result }: Props) {
  const [headersOpen, setHeadersOpen] = useState(false)

  if (!result) {
    return (
      <div style={styles.idle}>
        <p style={styles.idleText}>Send a request to see the response here.</p>
      </div>
    )
  }

  if (isExecuteError(result)) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBanner}>
          <strong>Error:</strong> {result.error} — {result.message}
        </div>
      </div>
    )
  }

  const language = getMonacoLanguage(result.contentType)

  return (
    <div style={styles.container}>
      {/* Status bar */}
      <div style={styles.statusBar}>
        <span style={{ ...styles.statusBadge, ...getStatusStyle(result.status) }}>
          {result.status}
        </span>
        <span style={styles.duration}>{result.durationMs} ms</span>
        <span style={styles.contentTypeTag}>{result.contentType || 'unknown'}</span>
      </div>

      {/* Truncated warning */}
      {result.truncated && (
        <div style={styles.truncatedBanner}>
          Response was truncated at the size limit. The body shown is partial.
        </div>
      )}

      {/* Response headers */}
      <div style={styles.section}>
        <button
          onClick={() => setHeadersOpen(o => !o)}
          style={styles.collapsible}
          aria-expanded={headersOpen}
        >
          Response Headers ({result.headers.length}) {headersOpen ? '▲' : '▼'}
        </button>
        {headersOpen && (
          <table style={styles.headersTable}>
            <tbody>
              {result.headers.map((h, i) => (
                <tr key={i} style={i % 2 === 0 ? styles.headerRowEven : styles.headerRowOdd}>
                  <td style={styles.headerKey}>{h.key}</td>
                  <td style={styles.headerValue}>{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Body */}
      <div style={styles.section}>
        <div style={styles.bodyHeader}>
          <span style={styles.sectionLabel}>Body</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.body)
            }}
            style={styles.copyBtn}
            aria-label="Copy body to clipboard"
          >
            Copy
          </button>
        </div>

        {/*
          SECURITY: HTML is displayed as escaped source text in Monaco, never as live DOM.
          Monaco uses language='html' only for syntax highlighting of the raw text.
          We never use innerHTML or dangerouslySetInnerHTML.
        */}
        <div style={styles.editorWrapper}>
          <Editor
            height="400px"
            language={language}
            value={result.body}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 13,
              lineNumbers: 'on',
            }}
          />
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '1.25rem',
  },
  idle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f9fafb',
    border: '1px dashed #e5e7eb',
    borderRadius: 8,
    padding: '3rem',
    minHeight: 200,
  },
  idleText: {
    color: '#9ca3af',
    fontSize: '0.9rem',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  duration: {
    color: '#6b7280',
    fontSize: '0.85rem',
  },
  contentTypeTag: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    background: '#f3f4f6',
    padding: '0.15rem 0.5rem',
    borderRadius: 4,
  },
  truncatedBanner: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    color: '#92400e',
    padding: '0.5rem 0.75rem',
    borderRadius: 6,
    fontSize: '0.875rem',
  },
  errorBanner: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    padding: '0.75rem',
    borderRadius: 6,
    fontSize: '0.9rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  sectionLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  collapsible: {
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    padding: '0.4rem 0.8rem',
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#374151',
    textAlign: 'left',
  },
  headersTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.85rem',
  },
  headerRowEven: {
    background: '#f9fafb',
  },
  headerRowOdd: {
    background: '#fff',
  },
  headerKey: {
    fontWeight: 600,
    color: '#374151',
    padding: '0.25rem 0.5rem',
    width: '35%',
    verticalAlign: 'top',
    wordBreak: 'break-all',
  },
  headerValue: {
    color: '#6b7280',
    padding: '0.25rem 0.5rem',
    wordBreak: 'break-all',
  },
  bodyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyBtn: {
    padding: '0.2rem 0.6rem',
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  editorWrapper: {
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
}
