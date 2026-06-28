import axios from 'axios'
import { axiosInstance } from './axiosInstance'

export interface HeaderEntry {
  key: string
  value: string
}

export interface QueryParamEntry {
  key: string
  value: string
}

export interface ExecuteRequest {
  method: string
  url: string
  headers: HeaderEntry[]
  queryParams: QueryParamEntry[]
  body: string | null
}

export interface ExecuteResponse {
  status: number
  durationMs: number
  headers: HeaderEntry[]
  body: string
  contentType: string
  truncated: boolean
}

export interface ExecuteError {
  error: string
  message: string
}

/**
 * Execute a request through the API Playground backend.
 *
 * Always resolves — never throws. Network failures, auth errors, and
 * backend executor errors are returned as ExecuteError so the caller
 * can always pass the result to onResponse without a try/catch.
 */
export async function executeRequest(req: ExecuteRequest): Promise<ExecuteResponse | ExecuteError> {
  try {
    const response = await axiosInstance.post<ExecuteResponse>('/requests/execute', req)
    return response.data
  } catch (err) {
    if (axios.isAxiosError(err)) {
      // No response at all — backend is down or network error
      if (!err.response) {
        return {
          error: 'backend_unavailable',
          message: 'Could not connect to API Playground backend.',
        }
      }

      const status = err.response.status

      if (status === 401) {
        return {
          error: 'unauthorized',
          message: 'Not authenticated. Please log in again.',
        }
      }

      if (status === 403) {
        return {
          error: 'forbidden',
          message: 'Not allowed.',
        }
      }

      // Backend returned a structured error body — propagate it
      const data = err.response.data as { error?: string; message?: string } | undefined
      if (data && typeof data.error === 'string') {
        return {
          error: data.error,
          message: data.message ?? `Request failed with status ${status}.`,
        }
      }

      if (status === 502) {
        return {
          error: 'request_failed',
          message: 'The target server was unreachable.',
        }
      }

      if (status === 504) {
        return {
          error: 'request_failed',
          message: 'The request timed out.',
        }
      }

      return {
        error: 'request_failed',
        message: `Request failed with status ${status}.`,
      }
    }

    // Non-axios error (shouldn't normally happen)
    const message = err instanceof Error ? err.message : String(err)
    return {
      error: 'unknown_error',
      message,
    }
  }
}
