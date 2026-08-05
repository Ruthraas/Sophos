import { useState, type FormEvent } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

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
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GutendexBook[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ search: query.trim() })
      const res = await fetch(`https://gutendex.com/books/?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setError('Não foi possível buscar agora. Tente de novo em instantes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
          Domínio público
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          Descubra clássicos gratuitos
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Busca no acervo do Project Gutenberg — mais de 70 mil livros de
          domínio público, gratuitos pra sempre. Encontrou um clássico? Baixe
          e compartilhe com a comunidade em{' '}
          <span className="text-foreground">Compartilhar livro</span>.
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
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {!loading && results !== null && results.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Nada encontrado. Tente outro título ou autor.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {results?.map((book) => {
          const cover = book.formats['image/jpeg']
          const readUrl =
            book.formats['text/html'] ?? `https://www.gutenberg.org/ebooks/${book.id}`
          return (
            <div key={book.id} className="flex gap-4 rounded-lg border bg-card p-4">
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
                <h3 className="font-semibold leading-tight">{book.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {book.authors.map((a) => a.name).join(', ') || 'Autor desconhecido'}
                </p>
                {book.subjects[0] && (
                  <Badge variant="secondary" className="w-fit">
                    {book.subjects[0]}
                  </Badge>
                )}
                {book.summaries[0] && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {book.summaries[0]}
                  </p>
                )}
                <Button asChild size="sm" variant="outline" className="mt-1 w-fit gap-1.5">
                  <a href={readUrl} target="_blank" rel="noopener noreferrer">
                    Ler no Project Gutenberg <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
