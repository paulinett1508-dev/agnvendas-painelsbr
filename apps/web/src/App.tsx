import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Vendedores from './pages/Vendedores'
import Positivacao from './pages/Positivacao'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
                    <Sidebar />
                    <main className="flex-1 min-w-0 p-5 lg:p-7">
                      <div className="lg:hidden" style={{ height: 56, marginTop: -20 }} />
                      <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/vendedores" element={<Vendedores />} />
                          <Route path="/positivacao" element={<Positivacao />} />
                        </Routes>
                      </div>
                    </main>
                  </div>
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
