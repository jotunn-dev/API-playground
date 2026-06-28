import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RequestBuilder } from './RequestBuilder'
import * as requestApi from '../../shared/api/requestApi'

vi.mock('../../shared/api/requestApi', () => ({
  executeRequest: vi.fn(),
}))

const mockResponse = {
  status: 200,
  durationMs: 100,
  headers: [],
  body: '{"ok":true}',
  contentType: 'application/json',
  truncated: false,
}

const mockBackendUnavailableError = {
  error: 'backend_unavailable',
  message: 'Could not connect to API Playground backend.',
}

const mockUnauthorizedError = {
  error: 'unauthorized',
  message: 'Not authenticated. Please log in again.',
}

describe('RequestBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders method dropdown and URL input', () => {
    render(<RequestBuilder onResponse={vi.fn()} />)
    expect(screen.getByLabelText(/http method/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/request url/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/send request/i)).toBeInTheDocument()
  })

  it('calls executeRequest with correct payload on Send', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockResolvedValueOnce(mockResponse)

    const onResponse = vi.fn()
    render(<RequestBuilder onResponse={onResponse} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://api.example.com/test' },
    })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: [],
        queryParams: [],
        body: null,
      })
    })
  })

  it('passes response to onResponse callback', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockResolvedValueOnce(mockResponse)

    const onResponse = vi.fn()
    render(<RequestBuilder onResponse={onResponse} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://example.com' },
    })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith(mockResponse)
    })
  })

  it('includes header rows in payload', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockResolvedValueOnce(mockResponse)

    render(<RequestBuilder onResponse={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://example.com' },
    })

    // Add a header
    fireEvent.click(screen.getByText('+ Add Header'))
    const keyInputs = screen.getAllByPlaceholderText('Key')
    const valueInputs = screen.getAllByPlaceholderText('Value')
    fireEvent.change(keyInputs[0], { target: { value: 'Accept' } })
    fireEvent.change(valueInputs[0], { target: { value: 'application/json' } })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: [{ key: 'Accept', value: 'application/json' }],
        })
      )
    })
  })

  it('passes backend_unavailable error to onResponse when backend is down', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockResolvedValueOnce(mockBackendUnavailableError)

    const onResponse = vi.fn()
    render(<RequestBuilder onResponse={onResponse} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://example.com' },
    })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith(mockBackendUnavailableError)
    })
  })

  it('passes unauthorized error to onResponse when 401 is returned', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockResolvedValueOnce(mockUnauthorizedError)

    const onResponse = vi.fn()
    render(<RequestBuilder onResponse={onResponse} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://example.com' },
    })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith(mockUnauthorizedError)
    })
  })

  it('catches synchronous throw and passes unknown_error to onResponse', async () => {
    const mockExecute = vi.mocked(requestApi.executeRequest)
    mockExecute.mockRejectedValueOnce(new Error('Unexpected failure'))

    const onResponse = vi.fn()
    render(<RequestBuilder onResponse={onResponse} />)

    fireEvent.change(screen.getByLabelText(/request url/i), {
      target: { value: 'https://example.com' },
    })

    fireEvent.click(screen.getByLabelText(/send request/i))

    await waitFor(() => {
      expect(onResponse).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'unknown_error' })
      )
    })
  })
})
