import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { CreatePage } from './pages/CreatePage'
import { ListPage } from './pages/ListPage'
import { ManagePage } from './pages/ManagePage'
import { AnalyticsPage } from './pages/AnalyticsPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
          <Routes>
            <Route path="/" element={<CreatePage />} />
            <Route path="/qr" element={<ListPage />} />
            <Route path="/qr/:token" element={<ManagePage />} />
            <Route path="/qr/:token/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-4xl px-4 py-4 text-xs text-slate-500">
            QR Code Generator — built on FastAPI + React.
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="text-lg font-semibold text-slate-900">
          QR<span className="text-indigo-600">.gen</span>
        </NavLink>
        <nav className="flex gap-1">
          <NavItem to="/" end>
            Create
          </NavItem>
          <NavItem to="/qr">My QR codes</NavItem>
        </nav>
      </div>
    </header>
  )
}

function NavItem({
  to,
  end,
  children,
}: {
  to: string
  end?: boolean
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function NotFound() {
  return (
    <div className="text-center py-16">
      <h1 className="text-3xl font-semibold text-slate-900">404</h1>
      <p className="text-slate-600 mt-2">Page not found.</p>
    </div>
  )
}

export default App
