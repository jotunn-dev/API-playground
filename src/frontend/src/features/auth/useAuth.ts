import { useState } from 'react'

const TOKEN_KEY = 'token'

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  )

  function storeToken(newToken: string) {
    localStorage.setItem(TOKEN_KEY, newToken)
    setTokenState(newToken)
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setTokenState(null)
  }

  function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  return { token, storeToken, logout, getToken, isAuthenticated: token !== null }
}
