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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Guarde seu código de recuperação</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Sua conta não usa e-mail. Se você esquecer a senha, este código é
              a <strong className="text-foreground">única</strong> forma de
              recuperá-la. Anote em um lugar seguro — ele não será mostrado de
              novo.
            </p>
            <p className="select-all rounded-md border border-dashed border-primary/50 bg-secondary/50 p-4 text-center font-mono text-lg tracking-wider">
              {recoveryCode}
            </p>
            <p className="text-sm text-muted-foreground">
              Perdeu a senha e o código? A conta não pode ser recuperada. Você
              pode gerar um código novo a qualquer momento no seu perfil.
            </p>
            <Button onClick={() => navigate('/')}>Já guardei meu código</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold">
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </h2>

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            {mode === 'signup' && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="displayName">Nome de exibição (opcional)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={busy} size="lg">
              {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>

            {mode === 'login' ? (
              <p className="text-sm text-muted-foreground">
                Não tem conta?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Criar conta
                </button>
                {' · '}
                <Link to="/recuperar" className="hover:underline">
                  Esqueci a senha
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Já tem conta?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode('login')}
                >
                  Entrar
                </button>
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
