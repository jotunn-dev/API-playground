import { describe, it, expect, beforeEach } from 'vitest'

// We test the interceptor behavior by inspecting config before the request goes out
describe('axiosInstance interceptor', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('attaches Bearer token when token is in localStorage', async () => {
    localStorage.setItem('token', 'test-bearer-token')

    // Dynamically import so the module re-reads localStorage at the time the interceptor runs
    const { axiosInstance } = await import('./axiosInstance')

    // Use axios adapter to intercept at config level
    let capturedConfig: Record<string, unknown> | null = null
    const adapter = (config: Record<string, unknown>) => {
      capturedConfig = config
      return Promise.resolve({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }

    await axiosInstance.get('/test', { adapter: adapter as never })

    expect(capturedConfig).not.toBeNull()
    const headers = capturedConfig!['headers'] as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-bearer-token')
  })

  it('does not attach Authorization when no token in localStorage', async () => {
    localStorage.removeItem('token')
    const { axiosInstance } = await import('./axiosInstance')

    let capturedConfig: Record<string, unknown> | null = null
    const adapter = (config: Record<string, unknown>) => {
      capturedConfig = config
      return Promise.resolve({
        data: {},
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      })
    }

    await axiosInstance.get('/test', { adapter: adapter as never })

    const headers = capturedConfig!['headers'] as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })
})
