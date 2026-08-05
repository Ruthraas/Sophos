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
      <div className="container">
        <p className="help">Carregando…</p>
      </div>
    )
  }

  if (profile === 'not-found') {
    return (
      <div className="container stack">
        <h2>Perfil não encontrado</h2>
        <p className="help">
          <Link to="/">Voltar ao catálogo</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="container-wide stack" style={{ gap: 'var(--space-8)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        {profile.avatar_url ? (
          <img className="avatar" src={profile.avatar_url} alt="" />
        ) : (
          <div className="avatar" aria-hidden />
        )}
        <div>
          <h1>{profile.display_name}</h1>
          <p className="help">@{profile.username}</p>
        </div>
      </div>

      {profile.bio && <p>{profile.bio}</p>}

      <div className="stack">
        <h3>
          {books.length === 0
            ? 'Ainda não compartilhou livros'
            : `Livros compartilhados (${books.length})`}
        </h3>
        {books.length > 0 && (
          <div className="book-grid">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
