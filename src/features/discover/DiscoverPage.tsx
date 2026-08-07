import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search, LibraryBig } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { coverUrl } from '../../lib/storage'
import { BOOK_CATEGORIES, type BookWithUploader } from '../../types/models'
import { groupCollections } from '../../lib/collections'
import BookCard from '../catalog/BookCard'
import CollectionCard from '@/components/CollectionCard'
import BookRow from '@/components/BookRow'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function DiscoverPage() {
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

  // Evita destacar "Título — Volume N": prefere um livro avulso no herói.
  const featured = books
    ? (books.find((b) => !b.collection_name) ?? books[0] ?? null)
    : null

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

  const isFiltering = search.trim() !== '' || category !== ''

  const rows = useMemo(() => {
    if (!books) return []
    return BOOK_CATEGORIES.map((c) => ({
      category: c,
      items: books.filter((b) => b.category === c),
    })).filter((row) => row.items.length > 0)
  }, [books])

  const featuredCover = featured ? coverUrl(featured.cover_path) : null

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* Hero */}
      <section className="relative flex min-h-[22rem] items-end overflow-hidden md:min-h-[26rem]">
        {featuredCover && (
          <img
            src={featuredCover}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-top opacity-40 blur-[2px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="relative flex w-full flex-col gap-4 px-4 pb-8 md:px-10 md:pb-12">
          <p className="text-xs uppercase tracking-[0.4em] text-primary/80">
            Descobrir
          </p>
          {featured ? (
            <>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">
                {featured.title}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground md:text-base">
                {featured.description || `por ${featured.author}`}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg">
                  <Link to={`/livro/${featured.id}`}>Ver detalhes</Link>
                </Button>
              </div>
            </>
          ) : (
            <h1 className="text-3xl font-semibold md:text-5xl">
              Livros da comunidade
            </h1>
          )}

          <div className="relative mt-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por título ou autor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar livros"
              className="h-11 rounded-full bg-background/80 pl-9 backdrop-blur"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-10 px-4 md:px-10">
        {/* Chips de categoria */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          <button
            onClick={() => setCategory('')}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
              category === '' && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
            )}
          >
            Todas
          </button>
          {BOOK_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
                category === c && 'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {books === null ? (
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="aspect-2/3 w-36 shrink-0 sm:w-40" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyLibrary />
        ) : isFiltering ? (
          filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum livro corresponde à busca.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {groupCollections(filtered).map((item) =>
                item.type === 'collection' ? (
                  <CollectionCard key={item.name} name={item.name} books={item.books} />
                ) : (
                  <BookCard key={item.book.id} book={item.book} />
                ),
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-10">
            {rows.map((row) => (
              <BookRow key={row.category} title={row.category}>
                {groupCollections(row.items).map((item) =>
                  item.type === 'collection' ? (
                    <CollectionCard key={item.name} name={item.name} books={item.books} />
                  ) : (
                    <BookCard key={item.book.id} book={item.book} />
                  ),
                )}
              </BookRow>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
      <LibraryBig className="size-10 text-primary/60" />
      <p className="max-w-sm text-sm text-muted-foreground">
        A biblioteca ainda está vazia. Seja a primeira pessoa a compartilhar um
        livro!
      </p>
      <Button asChild>
        <Link to="/enviar">Compartilhar o primeiro livro</Link>
      </Button>
    </div>
  )
}
