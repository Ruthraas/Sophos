import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_PATTERN,
  signIn,
  signUp,
} from './auth-service'
import { saveNewRecoveryCode } from './recovery'
import { useAuth } from './AuthContext'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Preenchido após o cadastro: o código é exibido uma única vez.
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const name = username.trim().toLowerCase()
    if (!USERNAME_PATTERN.test(name)) {
      setError(
        'O nome de usuário deve ter de 3 a 24 caracteres, usando apenas letras minúsculas, números e _.',
      )
      return
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(name, password)
        navigate('/')
      } else {
        const display = displayName.trim() || name
        const user = await signUp(name, display, password)
        const code = await saveNewRecoveryCode(user.id)
        await refreshProfile()
        setRecoveryCode(code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.')
    } finally {
      setBusy(false)
    }
  }

  if (recoveryCode) {
    return (
      <div className="container">
        <div className="card stack">
          <h2>Guarde seu código de recuperação</h2>
          <p>
            Sua conta não usa e-mail. Se você esquecer a senha, este código é a{' '}
            <strong>única</strong> forma de recuperá-la. Anote em um lugar
            seguro — ele não será mostrado de novo.
          </p>
          <p className="code-box">{recoveryCode}</p>
          <p className="help">
            Perdeu a senha e o código? A conta não pode ser recuperada. Você
            pode gerar um código novo a qualquer momento no seu perfil.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Já guardei meu código
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <form className="stack" onSubmit={handleSubmit}>
          <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>

          <div className="field">
            <label className="label" htmlFor="username">
              Nome de usuário
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="field">
              <label className="label" htmlFor="displayName">
                Nome de exibição (opcional)
              </label>
              <input
                id="displayName"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
            </div>
          )}

          <div className="field">
            <label className="label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          {mode === 'login' ? (
            <p className="help">
              Não tem conta?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => setMode('signup')}
              >
                Criar conta
              </button>
              {' · '}
              <Link to="/recuperar">Esqueci a senha</Link>
            </p>
          ) : (
            <p className="help">
              Já tem conta?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => setMode('login')}
              >
                Entrar
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
