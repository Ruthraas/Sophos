import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { PASSWORD_MIN_LENGTH } from './auth-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Senha redefinida</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              O código de recuperação usado foi invalidado. Depois de entrar,
              visite seu perfil para gerar um código novo.
            </p>
            <Button asChild>
              <Link to="/entrar">Ir para o login</Link>
            </Button>
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
            <h2 className="text-xl font-semibold">Recuperar senha</h2>
            <p className="text-sm text-muted-foreground">
              Informe seu nome de usuário e o código de recuperação que você
              guardou ao criar a conta (formato SOPHOS-XXXX-XXXX-XXXX-XXXX).
            </p>

            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Código de recuperação</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SOPHOS-…"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={busy} size="lg">
              {busy ? 'Aguarde…' : 'Redefinir senha'}
            </Button>

            <p className="text-sm text-muted-foreground">
              <Link to="/entrar" className="hover:underline">
                Voltar para o login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
