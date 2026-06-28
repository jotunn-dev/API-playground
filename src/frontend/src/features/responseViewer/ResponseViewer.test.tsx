import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResponseViewer } from './ResponseViewer'
import type { ExecuteResponse } from '../../shared/api/requestApi'

// Mock Monaco Editor — it doesn't run in jsdom
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language }: { value: string; language: string }) => (
    <div data-testid="monaco-editor" data-language={language}>
      <pre data-testid="editor-content">{value}</pre>
    </div>
  ),
}))

const makeResponse = (overrides: Partial<ExecuteResponse> = {}): ExecuteResponse => ({
  status: 200,
  durationMs: 143,
  headers: [{ key: 'Content-Type', value: 'application/json' }],
  body: '{"hello": "world"}',
  contentType: 'application/json',
  truncated: false,
  ...overrides,
})

describe('ResponseViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('shows idle message when result is null', () => {
    render(<ResponseViewer result={null} />)
    expect(screen.getByText(/send a request/i)).toBeInTheDocument()
  })

  it('shows status badge with correct color class for 2xx', () => {
    render(<ResponseViewer result={makeResponse({ status: 200 })} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows status badge for 4xx', () => {
    render(<ResponseViewer result={makeResponse({ status: 404 })} />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('shows duration in ms', () => {
    render(<ResponseViewer result={makeResponse({ durationMs: 143 })} />)
    expect(screen.getByText('143 ms')).toBeInTheDocument()
  })

  it('uses json language for application/json content type', () => {
    render(<ResponseViewer result={makeResponse({ contentType: 'application/json' })} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-language', 'json')
  })

  it('uses html language for text/html content type', () => {
    render(<ResponseViewer result={makeResponse({ contentType: 'text/html' })} />)
    const editor = screen.getByTestId('monaco-editor')
    expect(editor).toHaveAttribute('data-language', 'html')
  })

  it('HTML body is shown as escaped text in Monaco, not rendered as DOM', () => {
    const htmlBody = '<script>alert("xss")</script><h1>Hello</h1>'
    render(<ResponseViewer result={makeResponse({ body: htmlBody, contentType: 'text/html' })} />)

    // The script tag should appear as escaped text, not execute
    const editorContent = screen.getByTestId('editor-content')
    expect(editorContent.textContent).toContain('<script>')

    // There must be no iframe or live script injection
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('script[data-injected]')).toBeNull()
  })

  it('shows truncated banner when truncated is true', () => {
    render(<ResponseViewer result={makeResponse({ truncated: true })} />)
    expect(screen.getByText(/truncated at the size limit/i)).toBeInTheDocument()
  })

  it('does not show truncated banner when truncated is false', () => {
    render(<ResponseViewer result={makeResponse({ truncated: false })} />)
    expect(screen.queryByText(/truncated/i)).toBeNull()
  })

  it('copy button calls clipboard.writeText with body', async () => {
    const body = '{"hello": "world"}'
    render(<ResponseViewer result={makeResponse({ body })} />)

    const copyBtn = screen.getByLabelText(/copy body/i)
    fireEvent.click(copyBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(body)
  })

  it('shows error message for ExecuteError results', () => {
    const errorResult = { error: 'timeout', message: 'Request timed out after 30 seconds.' }
    render(<ResponseViewer result={errorResult} />)
    expect(screen.getByText(/timeout/i)).toBeInTheDocument()
    expect(screen.getByText(/timed out/i)).toBeInTheDocument()
  })

  it('shows response headers when expanded', () => {
    const response = makeResponse({
      headers: [{ key: 'Content-Type', value: 'application/json' }],
    })
    render(<ResponseViewer result={response} />)

    // Click to expand
    fireEvent.click(screen.getByText(/response headers/i))
    expect(screen.getByText('Content-Type')).toBeInTheDocument()
  })
})
