import { BrowserRouter, Link, Outlet, Route, Routes } from 'react-router'
import { AuthProvider, useAuth } from './features/auth/AuthContext'
import AuthPage from './features/auth/AuthPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import ProfilePage from './features/profile/ProfilePage'
import PublicProfilePage from './features/profile/PublicProfilePage'
import CatalogPage from './features/catalog/CatalogPage'
import BookPage from './features/catalog/BookPage'
import UploadPage from './features/upload/UploadPage'
import ReaderPage from './features/reader/ReaderPage'
import RequireAuth from './components/RequireAuth'

function Header() {
  const { session, profile } = useAuth()
  return (
    <header className="site-header">
      <Link to="/" className="brand">
        Fórum de Sophos
      </Link>
      <nav style={{ display: 'flex', gap: 'var(--space-4)' }}>
        {session ? (
          <>
            <Link to="/enviar">Compartilhar livro</Link>
            <Link to="/perfil">{profile?.display_name ?? 'Perfil'}</Link>
          </>
        ) : (
          <Link to="/entrar">Entrar</Link>
        )}
      </nav>
    </header>
  )
}

// Páginas comuns compartilham o cabeçalho; o leitor abre em tela cheia, sem ele.
function SiteLayout() {
  return (
    <>
      <Header />
      <Outlet />
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
