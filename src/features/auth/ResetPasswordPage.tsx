import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { PASSWORD_MIN_LENGTH } from './auth-service'

export default function ResetPasswordPage() {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`A nova senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }
    setBusy(true)
    try {
      const { error: fnError } = await supabase.functions.invoke(
        'reset-password',
        {
          body: {
            username: username.trim().toLowerCase(),
            code: code.trim().toUpperCase(),
            new_password: newPassword,
          },
        },
      )
      if (fnError) {
        setError('Usuário ou código de recuperação incorretos.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="container">
        <div className="card stack">
          <h2>Senha redefinida</h2>
          <p>
            O código de recuperação usado foi invalidado. Depois de entrar,
            visite seu perfil para gerar um código novo.
          </p>
          <Link className="btn btn-primary" to="/entrar">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <form className="stack" onSubmit={handleSubmit}>
          <h2>Recuperar senha</h2>
          <p className="help">
            Informe seu nome de usuário e o código de recuperação que você
            guardou ao criar a conta (formato SOPHOS-XXXX-XXXX-XXXX-XXXX).
          </p>

          <div className="field">
            <label className="label" htmlFor="username">
              Nome de usuário
            </label>
            <input
              id="username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="code">
              Código de recuperação
            </label>
            <input
              id="code"
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SOPHOS-…"
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="newPassword">
              Nova senha
            </label>
            <input
              id="newPassword"
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Aguarde…' : 'Redefinir senha'}
          </button>

          <p className="help">
            <Link to="/entrar">Voltar para o login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
