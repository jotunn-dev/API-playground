import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AuthPage } from './features/auth/AuthPage'
import { AppPage } from './features/requestBuilder/AppPage'

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  function handleAuthenticated(newToken: string) {
    setToken(newToken)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            token
              ? <Navigate to="/app" replace />
              : <AuthPage onAuthenticated={handleAuthenticated} />
          }
        />
        <Route
          path="/app"
          element={
            token
              ? <AppPage onLogout={handleLogout} />
              : <Navigate to="/auth" replace />
          }
        />
        <Route path="*" element={<Navigate to={token ? '/app' : '/auth'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
