import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { coverUrl } from '../../lib/storage'
import { useAuth } from '../auth/AuthContext'
import { languageLabel, type BookWithUploader } from '../../types/models'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [book, setBook] = useState<BookWithUploader | null | 'not-found'>(null)
  const [resumePage, setResumePage] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    supabase
      .from('books')
      .select('*, profiles(username, display_name)')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setBook(data ?? 'not-found')
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    const uid = session?.user.id
    if (!id || !uid) return
    let active = true
    void supabase
      .from('reading_progress')
      .select('current_page')
      .eq('user_id', uid)
      .eq('book_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data && data.current_page > 1) {
          setResumePage(data.current_page)
        }
      })
    return () => {
      active = false
    }
  }, [id, session?.user.id])

  if (book === null) {
    return (
      <div className="container">
        <p className="help">Carregando…</p>
      </div>
    )
  }

  if (book === 'not-found') {
    return (
      <div className="container stack">
        <h2>Livro não encontrado</h2>
        <p className="help">
          Ele pode ter sido removido. <Link to="/">Voltar ao catálogo</Link>
        </p>
      </div>
    )
  }

  const cover = coverUrl(book.cover_path)

  return (
    <div className="container-wide">
      <div className="book-hero-panel">
        {cover && <img className="book-backdrop" src={cover} alt="" aria-hidden />}
        <div className="book-hero">
          {cover ? (
            <img
              className="book-cover cover-frame"
              style={{ maxWidth: '14rem' }}
              src={cover}
              alt={`Capa de ${book.title}`}
            />
          ) : (
            <div className="book-cover" style={{ maxWidth: '14rem' }} aria-hidden />
          )}

          <div className="stack" style={{ flex: '1 1 20rem', alignContent: 'start' }}>
            <h1>{book.title}</h1>
            <p className="book-author">{book.author}</p>
          <p className="help">
            <span className="tag">{book.category}</span>{' '}
            <span className="tag">{languageLabel(book.language)}</span>{' '}
            <span className="tag">{book.page_count} páginas</span>
          </p>
          {book.description && <p>{book.description}</p>}
          {book.profiles && (
            <p className="help">
              Compartilhado por{' '}
              <Link to={`/u/${book.profiles.username}`}>
                {book.profiles.display_name}
              </Link>
            </p>
          )}
          <div>
            {session ? (
              <Link className="btn btn-primary" to={`/ler/${book.id}`}>
                {resumePage
                  ? `Continuar da página ${resumePage}`
                  : 'Começar a ler'}
              </Link>
            ) : (
              <>
                <Link className="btn btn-primary" to="/entrar">
                  Entrar para ler
                </Link>
                <p className="help" style={{ marginTop: 'var(--space-2)' }}>
                  A leitura é gratuita — basta ter uma conta.
                </p>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
