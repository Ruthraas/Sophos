import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { BookMarked, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { signOut } from '../auth/auth-service'
import { hasRecoveryCode, saveNewRecoveryCode } from '../auth/recovery'
import { fetchBookDescription } from '../../lib/bookLookup'
import type { Book } from '../../types/models'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { session, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeActive, setCodeActive] = useState<boolean | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [myBooks, setMyBooks] = useState<Book[]>([])
  const [pagesRead, setPagesRead] = useState<number | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<string | null>(null)

  const userId = session?.user.id
  const booksWithoutDescription = myBooks.filter((b) => !b.description.trim())

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setBio(profile.bio)
    }
  }, [profile])

  useEffect(() => {
    if (userId) {
      void hasRecoveryCode(userId).then(setCodeActive)
      void supabase
        .from('books')
        .select('*')
        .eq('uploaded_by', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setMyBooks(data ?? []))
      void supabase
        .from('reading_progress')
        .select('current_page')
        .eq('user_id', userId)
        .then(({ data }) => {
          if (data) {
            setPagesRead(data.reduce((sum, r) => sum + r.current_page, 0))
          }
        })
    }
  }, [userId])

  if (!userId) return null

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || profile?.username, bio })
      .eq('id', userId)
    setSaving(false)
    if (updateError) {
      setError('Não foi possível salvar o perfil.')
      return
    }
    await refreshProfile()
    setSaved(true)
  }

  async function handleAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setError(null)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`${userId}/avatar`, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setError('Não foi possível enviar a imagem.')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar`)
    // cache-bust para o navegador buscar a imagem nova
    const url = `${data.publicUrl}?v=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    await refreshProfile()
  }

  async function handleNewCode() {
    if (!userId) return
    setError(null)
    try {
      const code = await saveNewRecoveryCode(userId)
      setNewCode(code)
      setCodeActive(true)
    } catch {
      setError('Não foi possível gerar o código.')
    }
  }

  async function handleBackfillDescriptions() {
    if (!userId || booksWithoutDescription.length === 0) return
    setBackfillResult(null)
    setBackfilling(true)
    let updated = 0
    for (const book of booksWithoutDescription) {
      const found = await fetchBookDescription(book.title, book.author)
      if (found) {
        const { error: updateError } = await supabase
          .from('books')
          .update({ description: found })
          .eq('id', book.id)
        if (!updateError) updated++
      }
    }
    setBackfilling(false)
    setBackfillResult(
      updated > 0
        ? `${updated} descrição${updated === 1 ? '' : 'ões'} preenchida${updated === 1 ? '' : 's'} automaticamente.`
        : 'Não encontramos sinopses para esses livros — tente preencher manualmente.',
    )
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
    setMyBooks(data ?? [])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  async function handleDeleteAccount() {
    setError(null)
    setDeleting(true)
    const { error: deleteError } = await supabase.rpc('delete_own_account')
    if (deleteError) {
      setError('Não foi possível excluir a conta. Tente novamente.')
      setDeleting(false)
      return
    }
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 md:px-10">
      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <h2 className="text-xl font-semibold">Seu perfil</h2>

          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Seu avatar"
                className="size-18 rounded-full border-2 border-primary/50 object-cover"
              />
            ) : (
              <div className="size-18 rounded-full border-2 border-primary/50 bg-secondary" />
            )}
            <Label className="cursor-pointer">
              <span className="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-accent">
                Trocar avatar
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatar}
                className="hidden"
              />
            </Label>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSave}>
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-muted-foreground">Perfil salvo.</p>}

            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar perfil'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h3 className="text-lg font-semibold">Código de recuperação</h3>
          {newCode ? (
            <>
              <p className="text-sm text-muted-foreground">
                Guarde o código novo em um lugar seguro — ele não será mostrado
                de novo e o anterior deixou de valer.
              </p>
              <p className="select-all rounded-md border border-dashed border-primary/50 bg-secondary/50 p-4 text-center font-mono text-lg tracking-wider">
                {newCode}
              </p>
            </>
          ) : codeActive === false ? (
            <p className="rounded-md border-l-2 border-destructive bg-destructive/10 p-4 text-sm">
              Você não tem código de recuperação ativo. Sem ele, se esquecer a
              senha, a conta não poderá ser recuperada. Gere um agora.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você tem um código ativo. Se o perdeu, gere um novo — o antigo
              deixa de valer na hora.
            </p>
          )}
          <Button variant="outline" onClick={handleNewCode} className="self-start">
            Gerar novo código
          </Button>
        </CardContent>
      </Card>

      {pagesRead !== null && pagesRead > 0 && (
        <p className="text-sm text-muted-foreground">
          Você já leu {pagesRead} página{pagesRead === 1 ? '' : 's'} por aqui.
          Boa leitura!
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <h3 className="text-lg font-semibold">Seus livros</h3>
          {myBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não compartilhou livros.{' '}
              <Link to="/enviar" className="text-primary hover:underline">
                Compartilhe o primeiro
              </Link>
              .
            </p>
          ) : (
            <>
              {booksWithoutDescription.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3 text-sm">
                  <span className="text-muted-foreground">
                    {booksWithoutDescription.length} livro
                    {booksWithoutDescription.length === 1 ? '' : 's'} sem
                    descrição.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleBackfillDescriptions}
                    disabled={backfilling}
                  >
                    <Sparkles className="size-3.5" />
                    {backfilling ? 'Buscando…' : 'Preencher automaticamente'}
                  </Button>
                </div>
              )}
              {backfillResult && (
                <p className="text-xs text-muted-foreground">{backfillResult}</p>
              )}
              <ul className="flex flex-col gap-2">
                {myBooks.map((book) => (
                  <li key={book.id} className="flex items-center gap-2 text-sm">
                    <BookMarked className="size-4 shrink-0 text-primary/70" />
                    <Link to={`/livro/${book.id}`} className="hover:underline">
                      {book.title}
                    </Link>
                    <span className="text-muted-foreground">— {book.author}</span>
                    {!book.description.trim() && (
                      <span className="text-xs text-muted-foreground/70">
                        (sem descrição)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleSignOut}>
          Sair da conta
        </Button>
        {!confirmingDelete && (
          <Button variant="destructive" onClick={() => setConfirmingDelete(true)}>
            Excluir conta
          </Button>
        )}
      </div>

      {confirmingDelete && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-4 pt-6">
            <h3 className="text-lg font-semibold text-destructive">
              Excluir sua conta para sempre?
            </h3>
            <p className="text-sm text-muted-foreground">
              Isso apaga seu perfil, seu código de recuperação, seu progresso
              de leitura e todos os livros que você compartilhou. Não tem como
              desfazer.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Excluindo…' : 'Sim, excluir minha conta'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
