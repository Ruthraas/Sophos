import { useEffect, useMemo, useState } from 'react'
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
    <div className="container-wide stack" style={{ gap: 'var(--space-8)' }}>
      <div>
        <h1>Fórum de Sophos</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
          Livros compartilhados pela comunidade, para ler direto no navegador.
        </p>
      </div>

      <ContinueReading />

      <div className="filters">
        <input
          className="input"
          type="search"
          placeholder="Buscar por título ou autor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar livros"
        />
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {BOOK_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {books === null ? (
        <p className="help">Carregando…</p>
      ) : filtered.length === 0 ? (
        <p className="help">
          {books.length === 0
            ? 'Ainda não há livros por aqui. Seja a primeira pessoa a compartilhar um!'
            : 'Nenhum livro corresponde à busca.'}
        </p>
      ) : (
        <div className="book-grid">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
