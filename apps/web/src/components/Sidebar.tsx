import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  Flame,
  Menu,
  X,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { id: 'vendedores', label: 'Vendedores',  icon: <Users size={18} /> },
  { id: 'positivacao', label: 'Positivação', icon: <Target size={18} /> },
]

interface SidebarProps {
  active: string
  onChange: (id: string) => void
}

export default function Sidebar({ active, onChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useTheme()

  const content = (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{
            width: 34,
            height: 34,
            background: 'var(--orange)',
            boxShadow: '0 0 16px var(--orange-glow)',
          }}
        >
          <Flame size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p
              className="leading-none"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 15,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              SBR Painel
            </p>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'DM Mono, monospace',
                marginTop: 1,
              }}
            >
              Lab. Sobral
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              paddingLeft: 12,
              paddingBottom: 6,
              fontFamily: 'DM Mono, monospace',
            }}
          >
            Menu
          </p>
        )}
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item w-full ${active === item.id ? 'active' : ''}`}
            onClick={() => {
              onChange(item.id)
              setMobileOpen(false)
            }}
            title={collapsed ? item.label : undefined}
            style={{ justifyContent: collapsed ? 'center' : undefined }}
          >
            <span className="shrink-0" style={{ color: active === item.id ? 'var(--orange)' : 'var(--text-secondary)' }}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-2 py-3 space-y-1 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* Theme toggle */}
        <button
          className="sidebar-item w-full"
          onClick={toggle}
          style={{ justifyContent: collapsed ? 'center' : undefined }}
          title="Alternar tema"
        >
          <span className="shrink-0" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          {!collapsed && (
            <span style={{ color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            </span>
          )}
        </button>

        {/* Collapse toggle — desktop only */}
        <button
          className="sidebar-item w-full hidden lg:flex"
          onClick={() => setCollapsed((c) => !c)}
          style={{ justifyContent: collapsed ? 'center' : undefined }}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </span>
          {!collapsed && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Recolher</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-300"
        style={{ width: collapsed ? 64 : 'var(--sidebar-w)' }}
      >
        {content}
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)', height: 56 }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{ width: 30, height: 30, background: 'var(--orange)' }}
          >
            <Flame size={15} color="#fff" />
          </div>
          <span
            style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            SBR Painel
          </span>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="lg:hidden fixed top-0 left-0 bottom-0 z-40 flex flex-col"
            style={{ width: 'var(--sidebar-w)' }}
          >
            {content}
          </aside>
        </>
      )}
    </>
  )
}
