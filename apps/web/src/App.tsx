import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Vendedores from './pages/Vendedores'
import Positivacao from './pages/Positivacao'

type Page = 'dashboard' | 'vendedores' | 'positivacao'

function AppInner() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar active={page} onChange={(id) => setPage(id as Page)} />

      <main className="flex-1 min-w-0 p-5 lg:p-7" style={{ paddingTop: undefined }}>
        {/* Mobile: spacer for fixed top bar */}
        <div className="lg:hidden" style={{ height: 56, marginTop: -20 }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
          {page === 'dashboard'   && <Dashboard />}
          {page === 'vendedores'  && <Vendedores />}
          {page === 'positivacao' && <Positivacao />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
