import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import type { BookWithUploader, Profile } from '../../types/models'
import BookCard from '../catalog/BookCard'

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<Profile | null | 'not-found'>(null)
  const [books, setBooks] = useState<BookWithUploader[]>([])

  useEffect(() => {
    if (!username) return
    let active = true
    async function load() {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle()
      if (!active) return
      if (!p) {
        setProfile('not-found')
        return
      }
      setProfile(p)
      const { data: b } = await supabase
        .from('books')
        .select('*, profiles(username, display_name)')
        .eq('uploaded_by', p.id)
        .order('created_at', { ascending: false })
      if (active && b) setBooks(b)
    }
    void load()
    return () => {
      active = false
    }
  }, [username])

  if (profile === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-10">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    )
  }

  if (profile === 'not-found') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-10">
        <h2 className="text-2xl font-semibold">Perfil não encontrado</h2>
        <Link to="/" className="text-sm text-primary hover:underline">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="size-18 rounded-full border-2 border-primary/50 object-cover"
          />
        ) : (
          <div className="size-18 rounded-full border-2 border-primary/50 bg-secondary" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      {profile.bio && <p className="max-w-2xl text-sm">{profile.bio}</p>}

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">
          {books.length === 0
            ? 'Ainda não compartilhou livros'
            : `Livros compartilhados (${books.length})`}
        </h3>
        {books.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
