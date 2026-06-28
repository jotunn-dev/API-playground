import { useState } from 'react'
import type { ExecuteRequest, ExecuteResponse, ExecuteError, HeaderEntry, QueryParamEntry } from '../../shared/api/requestApi'
import { executeRequest } from '../../shared/api/requestApi'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

type BodyAllowedMethod = 'POST' | 'PUT' | 'PATCH'
const BODY_ALLOWED: BodyAllowedMethod[] = ['POST', 'PUT', 'PATCH']

type ActiveTab = 'headers' | 'params' | 'body'

interface Props {
  onResponse: (result: ExecuteResponse | ExecuteError) => void
}

function KeyValueEditor({
  rows,
  onChange,
  label,
}: {
  rows: { key: string; value: string }[]
  onChange: (rows: { key: string; value: string }[]) => void
  label: string
}) {
  function addRow() {
    onChange([...rows, { key: '', value: '' }])
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index))
  }

  function updateRow(index: number, field: 'key' | 'value', val: string) {
    const updated = rows.map((r, i) => (i === index ? { ...r, [field]: val } : r))
    onChange(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            aria-label={`${label} key ${i}`}
            value={row.key}
            onChange={e => updateRow(i, 'key', e.target.value)}
            placeholder="Key"
            style={styles.input}
          />
          <input
            aria-label={`${label} value ${i}`}
            value={row.value}
            onChange={e => updateRow(i, 'value', e.target.value)}
            placeholder="Value"
            style={styles.input}
          />
          <button onClick={() => removeRow(i)} style={styles.removeBtn} aria-label="Remove row">
            &times;
          </button>
        </div>
      ))}
      <button onClick={addRow} style={styles.addBtn}>
        + Add {label}
      </button>
    </div>
  )
}

export function RequestBuilder({ onResponse }: Props) {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<HeaderEntry[]>([])
  const [queryParams, setQueryParams] = useState<QueryParamEntry[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>('headers')

  const showBody = BODY_ALLOWED.includes(method as BodyAllowedMethod)

  async function handleSend() {
    if (!url.trim()) return
    setLoading(true)
    try {
      const req: ExecuteRequest = {
        method,
        url: url.trim(),
        headers: headers.filter(h => h.key.trim()),
        queryParams: queryParams.filter(p => p.key.trim()),
        body: showBody && body.trim() ? body : null,
      }
      const result = await executeRequest(req)
      onResponse(result)
    } catch (err) {
      onResponse({ error: 'unknown_error', message: String(err) })
    } finally {
      setLoading(false)
    }
  }

  const sendBtnStyle: React.CSSProperties = {
    ...styles.sendBtn,
    ...(loading || !url.trim() ? styles.sendBtnDisabled : {}),
  }

  return (
    <div style={styles.container}>
      {/* Method + URL + Send */}
      <div style={styles.urlBar}>
        <select
          value={method}
          onChange={e => setMethod(e.target.value)}
          style={styles.methodSelect}
          aria-label="HTTP method"
        >
          {HTTP_METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          style={{ ...styles.input, flex: 1 }}
          aria-label="Request URL"
          onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
        />

        <button
          onClick={handleSend}
          disabled={loading || !url.trim()}
          style={sendBtnStyle}
          aria-label="Send request"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['headers', 'params', ...(showBody ? ['body'] : [])] as ActiveTab[]).map(tabName => (
          <button
            key={tabName}
            onClick={() => setActiveTab(tabName)}
            style={{ ...styles.tab, ...(activeTab === tabName ? styles.activeTab : {}) }}
          >
            {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.tabContent}>
        {activeTab === 'headers' && (
          <KeyValueEditor rows={headers} onChange={setHeaders} label="Header" />
        )}
        {activeTab === 'params' && (
          <KeyValueEditor rows={queryParams} onChange={setQueryParams} label="Param" />
        )}
        {activeTab === 'body' && showBody && (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            style={styles.bodyEditor}
            aria-label="Request body"
            rows={10}
          />
        )}
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
  urlBar: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  methodSelect: {
    padding: '0.55rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '0.875rem',
    fontWeight: 600,
    background: '#f5f6fa',
    cursor: 'pointer',
    color: '#111827',
    minWidth: 110,
  },
  input: {
    padding: '0.55rem 0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '0.9rem',
    outline: 'none',
    color: '#374151',
    background: '#fff',
  },
  sendBtn: {
    padding: '0.55rem 1.25rem',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  sendBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    gap: '0.25rem',
  },
  tab: {
    padding: '0.4rem 0.9rem',
    borderTop: 'none',
    borderRight: 'none',
    borderLeft: 'none',
    borderBottom: '2px solid transparent',
    background: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: -1,
  },
  activeTab: {
    color: '#4f46e5',
    borderBottom: '2px solid #4f46e5',
    fontWeight: 600,
  },
  tabContent: {
    paddingTop: '0.5rem',
  },
  addBtn: {
    padding: '0.35rem 0.75rem',
    background: 'none',
    border: '1px dashed #d1d5db',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.85rem',
    color: '#6b7280',
    alignSelf: 'flex-start',
  },
  removeBtn: {
    padding: '0.5rem 0.6rem',
    background: 'none',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    cursor: 'pointer',
    color: '#9ca3af',
    fontSize: '1rem',
    lineHeight: 1,
  },
  bodyEditor: {
    width: '100%',
    fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', Consolas, monospace",
    fontSize: '0.9rem',
    padding: '0.5rem',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#374151',
  },
}
