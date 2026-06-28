import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthPage } from './AuthPage'
import * as authApi from './authApi'

// Mock the API module
vi.mock('./authApi', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}))

// Mock useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

function renderAuthPage(onAuthenticated = vi.fn()) {
  return render(
    <MemoryRouter>
      <AuthPage onAuthenticated={onAuthenticated} />
    </MemoryRouter>
  )
}

// Helper to get the submit button (type=submit), not the tab button
function getSubmitButton() {
  return document.querySelector('button[type="submit"]') as HTMLButtonElement
}

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders login tab by default with email and password fields', () => {
    renderAuthPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(getSubmitButton()).toBeInTheDocument()
    expect(getSubmitButton().textContent).toMatch(/login/i)
  })

  it('submits login form with email and password', async () => {
    const mockLogin = vi.mocked(authApi.loginUser)
    mockLogin.mockResolvedValueOnce({ token: 'test-token-123', expiresAt: '2099-01-01T00:00:00Z' })

    const onAuthenticated = vi.fn()
    renderAuthPage(onAuthenticated)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })
    fireEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'Password123!',
      })
    })
  })

  it('stores token in localStorage on successful login', async () => {
    const mockLogin = vi.mocked(authApi.loginUser)
    mockLogin.mockResolvedValueOnce({ token: 'my-jwt-token', expiresAt: '2099-01-01T00:00:00Z' })

    renderAuthPage()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password123!' } })
    fireEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('my-jwt-token')
    })
  })

  it('shows error message on failed login', async () => {
    const mockLogin = vi.mocked(authApi.loginUser)
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials.' }, status: 401 },
    })

    renderAuthPage()

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@example.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } })
    fireEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('switches to register tab when Register button is clicked', () => {
    renderAuthPage()
    // Register tab button
    const registerTabBtn = screen.getAllByRole('button').find(b => b.textContent === 'Register')
    expect(registerTabBtn).toBeTruthy()
    fireEvent.click(registerTabBtn!)
    expect(getSubmitButton().textContent).toMatch(/create account/i)
  })
})
