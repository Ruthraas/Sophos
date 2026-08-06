import { useEffect, useMemo, useState } from 'react'
import { Compass, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { BookWithUploader } from '../../types/models'
import BookCard from '../catalog/BookCard'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

export default function DiscoverPage() {
  const [books, setBooks] = useState<BookWithUploader[] | null>(null)
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

    const channel = supabase
      .channel('discover-books')
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
    if (!term) return books
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.author.toLowerCase().includes(term),
    )
  }, [books, search])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          Explorar
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Descubra o que a comunidade compartilhou
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Navegue pelo catálogo e salve os livros que quiser ler depois — eles
          ficam guardados em <span className="text-foreground">Seus livros</span>.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou autor…"
          className="h-11 rounded-full pl-9"
        />
      </div>

      {books === null ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 w-36 sm:w-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Compass className="size-10 text-primary/60" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {books.length === 0
              ? 'A comunidade ainda não compartilhou nenhum livro.'
              : 'Nenhum livro corresponde à busca.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
