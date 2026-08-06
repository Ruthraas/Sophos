import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Check, Download, ExternalLink, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  createDuplicateChecker,
  reorderAuthorName,
  type DuplicateBook,
  type SharePrefill,
} from '@/lib/bookLookup'

interface GutendexAuthor {
  name: string
}

interface GutendexBook {
  id: number
  title: string
  authors: GutendexAuthor[]
  summaries: string[]
  subjects: string[]
  languages: string[]
  formats: Record<string, string>
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GutendexBook[] | null>(null)
  const [duplicates, setDuplicates] = useState<Map<number, DuplicateBook>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ search: query.trim(), languages: 'pt' })
      const [res, checkDuplicate] = await Promise.all([
        fetch(`https://gutendex.com/books/?${params}`),
        createDuplicateChecker(),
      ])
      if (!res.ok) throw new Error()
      const data = await res.json()
      const books: GutendexBook[] = data.results ?? []

      const dupMap = new Map<number, DuplicateBook>()
      for (const book of books) {
        const rawAuthor = book.authors[0]?.name ?? ''
        const match =
          checkDuplicate(book.title, rawAuthor) ??
          checkDuplicate(book.title, reorderAuthorName(rawAuthor))
        if (match) dupMap.set(book.id, match)
      }

      setResults(books)
      setDuplicates(dupMap)
    } catch {
      setError('Não foi possível buscar agora. Tente de novo em instantes.')
    } finally {
      setLoading(false)
    }
  }

  function handleShare(book: GutendexBook) {
    const rawAuthor = book.authors[0]?.name ?? ''
    const prefill: SharePrefill = {
      title: book.title.slice(0, 120),
      author: reorderAuthorName(rawAuthor).slice(0, 80),
      description: (book.summaries[0] ?? '').slice(0, 500),
      language: 'pt',
      pdfSourceUrl: book.formats['application/pdf'] ?? null,
    }
    navigate('/enviar', { state: prefill })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          Domínio público, em português
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Descubra clássicos gratuitos
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Busca no acervo do Project Gutenberg, filtrada pra mostrar só livros
          em português. Encontrou um clássico? Compartilhe com a comunidade
          sem sair daqui.
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título ou autor — ex: Machado de Assis"
          className="h-11 rounded-full pl-9"
        />
      </form>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {!loading && results !== null && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nada encontrado em português. Tente outro título ou autor.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {results?.map((book) => {
          const cover = book.formats['image/jpeg']
          const detailUrl = `https://www.gutenberg.org/ebooks/${book.id}`
          const author = reorderAuthorName(book.authors[0]?.name ?? '') || 'Autor desconhecido'
          const duplicate = duplicates.get(book.id)

          return (
            <div
              key={book.id}
              className="flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
            >
              <div className="flex flex-1 gap-4 p-4">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-28 w-20 shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-28 w-20 shrink-0 rounded bg-secondary" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h3 className="line-clamp-2 font-semibold leading-tight">
                    {book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{author}</p>
                  {book.subjects[0] && (
                    <Badge variant="secondary" className="w-fit">
                      {book.subjects[0]}
                    </Badge>
                  )}
                  {book.summaries[0] && (
                    <p className="line-clamp-3 text-xs text-muted-foreground">
                      {book.summaries[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t bg-secondary/30 px-4 py-3">
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <a href={detailUrl} target="_blank" rel="noopener noreferrer">
                    Ver mais sobre em outro site <ExternalLink className="size-3.5" />
                  </a>
                </Button>

                {duplicate ? (
                  <Button asChild size="sm" variant="secondary" className="gap-1.5">
                    <Link to={`/livro/${duplicate.id}`}>
                      <Check className="size-3.5" /> Já está na comunidade
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleShare(book)}
                  >
                    <Download className="size-3.5" /> Quero baixar e compartilhar na
                    comunidade
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
