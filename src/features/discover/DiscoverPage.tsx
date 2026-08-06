import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Check, Download, ExternalLink, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
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

const LANGUAGE_OPTIONS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: '', label: 'Todos os idiomas' },
]

const LANGUAGE_LABELS: Record<string, string> = {
  pt: 'Português',
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
}

export default function DiscoverPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('pt')
  const [results, setResults] = useState<GutendexBook[] | null>(null)
  const [duplicates, setDuplicates] = useState<Map<number, DuplicateBook>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(q: string, lang: string) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setResults(null)
    try {
      const params = new URLSearchParams({ search: q.trim() })
      if (lang) params.set('languages', lang)
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

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    void runSearch(query, language)
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    if (query.trim()) void runSearch(query, lang)
  }

  function handleShare(book: GutendexBook) {
    const rawAuthor = book.authors[0]?.name ?? ''
    const prefill: SharePrefill = {
      title: book.title.slice(0, 120),
      author: reorderAuthorName(rawAuthor).slice(0, 80),
      description: (book.summaries[0] ?? '').slice(0, 500),
      language: book.languages[0] || language || 'pt',
      pdfSourceUrl: book.formats['application/pdf'] ?? null,
    }
    navigate('/enviar', { state: prefill })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          Domínio público
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Descubra clássicos gratuitos
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Busca no acervo do Project Gutenberg — mais de 70 mil livros de
          domínio público, gratuitos pra sempre. Encontrou um clássico?
          Compartilhe com a comunidade sem sair daqui.
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Título ou autor — ex: Machado de Assis"
            className="h-11 rounded-full pl-9"
          />
        </form>
        <div className="flex flex-wrap justify-center gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLanguageChange(opt.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
                language === opt.value &&
                  'border-primary bg-primary text-primary-foreground hover:text-primary-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

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
          Nada encontrado. Tente outro título, autor ou idioma.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {results?.map((book) => {
          const cover = book.formats['image/jpeg']
          const detailUrl = `https://www.gutenberg.org/ebooks/${book.id}`
          const author =
            reorderAuthorName(book.authors[0]?.name ?? '') || 'Autor desconhecido'
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
                  <div className="flex flex-wrap gap-1.5">
                    {book.languages[0] && (
                      <Badge className="w-fit">
                        {LANGUAGE_LABELS[book.languages[0]] ?? book.languages[0]}
                      </Badge>
                    )}
                    {book.subjects[0] && (
                      <Badge variant="secondary" className="w-fit">
                        {book.subjects[0]}
                      </Badge>
                    )}
                  </div>
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
                    Ver mais <ExternalLink className="size-3.5" />
                  </a>
                </Button>

                {duplicate ? (
                  <Button asChild size="sm" variant="secondary" className="gap-1.5">
                    <Link to={`/livro/${duplicate.id}`}>
                      <Check className="size-3.5" /> Já está na comunidade
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1.5" onClick={() => handleShare(book)}>
                    <Download className="size-3.5" /> Baixar e compartilhar
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
