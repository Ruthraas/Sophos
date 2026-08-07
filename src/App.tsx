import { BrowserRouter, Link, NavLink, Outlet, Route, Routes } from 'react-router'
import { BookMarked, Compass, Home, LogIn, Shield, Upload, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import AuthPage from './features/auth/AuthPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import ProfilePage from './features/profile/ProfilePage'
import PublicProfilePage from './features/profile/PublicProfilePage'
import CatalogPage from './features/catalog/CatalogPage'
import BookPage from './features/catalog/BookPage'
import UploadPage from './features/upload/UploadPage'
import DiscoverPage from './features/discover/DiscoverPage'
import CollectionPage from './features/discover/CollectionPage'
import MyLibraryPage from './features/library/MyLibraryPage'
import ReaderPage from './features/reader/ReaderPage'
import AdminPage from './features/admin/AdminPage'
import RequireAuth from './components/RequireAuth'

interface NavItemProps {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
}

function SideNavItem({ to, icon: Icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          isActive && 'bg-accent text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function TabNavItem({ to, icon: Icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 rounded-md px-4 py-1.5 text-[11px] text-muted-foreground transition-colors',
          isActive && 'text-primary',
        )
      }
    >
      <Icon className="size-5" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function useNavItems(): NavItemProps[] {
  const { session, profile } = useAuth()
  return session
    ? [
        { to: '/', icon: Home, label: 'Início', end: true },
        { to: '/descobrir', icon: Compass, label: 'Descobrir' },
        { to: '/biblioteca', icon: BookMarked, label: 'Seus livros' },
        { to: '/enviar', icon: Upload, label: 'Compartilhar' },
        { to: '/perfil', icon: User, label: profile?.display_name ?? 'Perfil' },
        ...(profile?.is_admin
          ? [{ to: '/admin', icon: Shield, label: 'Admin' }]
          : []),
      ]
    : [
        { to: '/', icon: Home, label: 'Início', end: true },
        { to: '/descobrir', icon: Compass, label: 'Descobrir' },
        { to: '/entrar', icon: LogIn, label: 'Entrar' },
      ]
}

function Sidebar() {
  const items = useNavItems()
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r bg-background md:flex">
      <div className="px-6 py-6">
        <Link to="/" className="wordmark text-xl">
          SOPHOS
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {items.map((item) => (
          <SideNavItem key={item.to} {...item} />
        ))}
      </nav>
      <p className="mt-auto px-6 py-5 text-xs text-muted-foreground">
        Comunidade de leitura
      </p>
    </aside>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-center border-b bg-background/90 py-3 backdrop-blur md:hidden">
      <Link to="/" className="wordmark text-lg">
        SOPHOS
      </Link>
    </header>
  )
}

function MobileTabBar() {
  const items = useNavItems()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t bg-background/95 py-1.5 backdrop-blur md:hidden">
      {items.map((item) => (
        <TabNavItem key={item.to} {...item} />
      ))}
    </nav>
  )
}

// Páginas comuns compartilham o shell; o leitor abre em tela cheia, sem ele.
function SiteLayout() {
  return (
    <>
      <Sidebar />
      <MobileTopBar />
      <main className="pb-20 md:pb-0 md:pl-60">
        <Outlet />
      </main>
      <MobileTabBar />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<CatalogPage />} />
            <Route path="/entrar" element={<AuthPage />} />
            <Route path="/recuperar" element={<ResetPasswordPage />} />
            <Route path="/livro/:id" element={<BookPage />} />
            <Route path="/descobrir" element={<DiscoverPage />} />
            <Route path="/colecao/:name" element={<CollectionPage />} />
            <Route path="/u/:username" element={<PublicProfilePage />} />
            <Route
              path="/enviar"
              element={
                <RequireAuth>
                  <UploadPage />
                </RequireAuth>
              }
            />
            <Route
              path="/perfil"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/biblioteca"
              element={
                <RequireAuth>
                  <MyLibraryPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              }
            />
          </Route>
          <Route
            path="/ler/:id"
            element={
              <RequireAuth>
                <ReaderPage />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
