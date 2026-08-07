import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BOOK_CATEGORIES, type BookWithUploader, type Profile } from '../../types/models'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  )
}

export default function AdminPage() {
  const { profile, loading } = useAuth()

  if (loading) return null
  if (!profile?.is_admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é só para administradores.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-10 md:px-10">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Admin</p>
        <h1 className="text-2xl font-semibold md:text-3xl">Administração</h1>
      </div>
      <BooksAdmin />
      <ProfilesAdmin />
    </div>
  )
}

function BooksAdmin() {
  const [books, setBooks] = useState<BookWithUploader[] | null>(null)

  async function load() {
    const { data } = await supabase
      .from('books')
      .select('*, profiles(username, display_name)')
      .order('created_at', { ascending: false })
    setBooks(data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function updateCategory(id: string, category: string) {
    setBooks((prev) => prev?.map((b) => (b.id === id ? { ...b, category: category as never } : b)) ?? null)
    await supabase.from('books').update({ category }).eq('id', id)
  }

  async function removeBook(id: string, title: string) {
    if (!confirm(`Remover "${title}" do catálogo? Isso não pode ser desfeito.`)) return
    await supabase.from('books').delete().eq('id', id)
    setBooks((prev) => prev?.filter((b) => b.id !== id) ?? null)
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Livros ({books?.length ?? '…'})</SectionTitle>
      <div className="flex flex-col divide-y rounded-md border">
        {books === null ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : books.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum livro ainda.</p>
        ) : (
          books.map((book) => (
            <div
              key={book.id}
              className="flex flex-wrap items-center gap-3 p-3 text-sm"
            >
              <Link
                to={`/livro/${book.id}`}
                className="min-w-0 flex-1 truncate font-medium hover:text-primary"
              >
                {book.title}
              </Link>
              <span className="shrink-0 truncate text-xs text-muted-foreground">
                {book.author} · {book.profiles?.display_name ?? '—'}
              </span>
              <select
                value={book.category}
                onChange={(e) => void updateCategory(book.id, e.target.value)}
                className="h-8 shrink-0 rounded-md border bg-secondary/50 px-2 text-xs outline-none"
              >
                {BOOK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-destructive hover:text-destructive"
                onClick={() => void removeBook(book.id, book.title)}
                aria-label={`Remover ${book.title}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ProfilesAdmin() {
  const [profiles, setProfiles] = useState<Profile[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ display_name: string; bio: string }>({
    display_name: '',
    bio: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProfiles(data ?? []))
  }, [])

  function startEdit(p: Profile) {
    setEditing(p.id)
    setDraft({ display_name: p.display_name, bio: p.bio })
  }

  async function save(id: string) {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ display_name: draft.display_name.trim(), bio: draft.bio.trim() })
      .eq('id', id)
    setProfiles(
      (prev) =>
        prev?.map((p) =>
          p.id === id ? { ...p, display_name: draft.display_name.trim(), bio: draft.bio.trim() } : p,
        ) ?? null,
    )
    setSaving(false)
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>Perfis ({profiles?.length ?? '…'})</SectionTitle>
      <div className="flex flex-col divide-y rounded-md border">
        {profiles === null ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          profiles.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/u/${p.username}`} className="font-medium hover:text-primary">
                  @{p.username}
                </Link>
                {p.is_admin && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                    admin
                  </span>
                )}
                {editing !== p.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-auto px-2 py-1 text-xs"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </Button>
                )}
              </div>
              {editing === p.id ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={draft.display_name}
                    onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                    placeholder="Nome de exibição"
                    maxLength={40}
                  />
                  <Textarea
                    value={draft.bio}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    placeholder="Bio"
                    rows={2}
                    maxLength={280}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={saving} onClick={() => void save(p.id)}>
                      {saving ? 'Salvando…' : 'Salvar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {p.display_name}
                  {p.bio ? ` — ${p.bio}` : ''}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
