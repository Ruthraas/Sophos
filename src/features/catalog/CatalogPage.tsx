import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { BOOK_CATEGORIES, type BookWithUploader } from '../../types/models'
import BookCard from './BookCard'
import ContinueReading from './ContinueReading'

export default function CatalogPage() {
  const [books, setBooks] = useState<BookWithUploader[] | null>(null)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('books')
        .select('*, profiles(username, display_name)')
        .order('created_at', { ascending: false })
      if (active && data) setBooks(data)
    }
    void load()

    // Catálogo em tempo real: qualquer mudança na tabela recarrega a lista.
    const channel = supabase
      .channel('books-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'books' },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    if (!books) return []
    const term = search.trim().toLowerCase()
    return books.filter((b) => {
      if (category && b.category !== category) return false
      if (!term) return true
      return (
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term)
      )
    })
  }, [books, category, search])

  return (
    <div className="container-wide stack" style={{ gap: 'var(--space-12)' }}>
      <section className="hero">
        <p className="hero-kicker">ΒΙΒΛΙΟΘΗΚΗ</p>
        <h1 className="hero-title text-gold">Fórum de Sophos</h1>
        <p className="hero-sub">
          Livros compartilhados pela comunidade, para ler direto no navegador.
        </p>
        <div className="ornament" aria-hidden>
          ◆
        </div>
        <input
          className="input hero-search"
          type="search"
          placeholder="Buscar por título ou autor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar livros"
        />
      </section>

      <ContinueReading />

      <section className="stack" style={{ gap: 'var(--space-6)' }}>
        <h2 className="section-title">Biblioteca</h2>

        <div className="chip-row" role="group" aria-label="Filtrar por categoria">
          <button
            className={category === '' ? 'chip active' : 'chip'}
            onClick={() => setCategory('')}
          >
            Todas
          </button>
          {BOOK_CATEGORIES.map((c) => (
            <button
              key={c}
              className={category === c ? 'chip active' : 'chip'}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {books === null ? (
          <div className="shelf-grid" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton skeleton-cover" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-glyph" aria-hidden>
              🏛️
            </div>
            <p className="help">
              {books.length === 0
                ? 'A biblioteca ainda está vazia. Seja a primeira pessoa a compartilhar um livro!'
                : 'Nenhum livro corresponde à busca.'}
            </p>
            {books.length === 0 && (
              <Link className="btn btn-primary" to="/enviar">
                Compartilhar o primeiro livro
              </Link>
            )}
          </div>
        ) : (
          <div className="shelf-grid">
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
