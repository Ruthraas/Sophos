import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BookMarked, Library } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { coverUrl } from '../../lib/storage'
import { useAuth } from '../auth/AuthContext'
import { languageLabel, type Book, type BookWithUploader } from '../../types/models'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import LikeButton from './LikeButton'
import SaveButton from './SaveButton'
import CommentSection from './CommentSection'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const [book, setBook] = useState<BookWithUploader | null | 'not-found'>(null)
  const [resumePage, setResumePage] = useState<number | null>(null)
  const [siblings, setSiblings] = useState<Book[]>([])

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

  useEffect(() => {
    if (!book || book === 'not-found' || !book.collection_name) {
      setSiblings([])
      return
    }
    let active = true
    void supabase
      .from('books')
      .select('*')
      .eq('collection_name', book.collection_name)
      .order('collection_position', { ascending: true })
      .then(({ data }) => {
        if (active) setSiblings(data ?? [])
      })
    return () => {
      active = false
    }
  }, [book])

  if (book === null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <Skeleton className="aspect-2/3 w-48 sm:w-56" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (book === 'not-found') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h2 className="text-2xl font-semibold">Livro não encontrado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ele pode ter sido removido.{' '}
          <Link to="/" className="text-primary hover:underline">
            Voltar ao catálogo
          </Link>
        </p>
      </div>
    )
  }

  const cover = coverUrl(book.cover_path)

  return (
    <div className="relative overflow-hidden">
      {cover && (
        <>
          <img
            src={cover}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-20 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </>
      )}

      <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center md:px-10">
        {cover ? (
          <img
            src={cover}
            alt={`Capa de ${book.title}`}
            className="w-48 shrink-0 rounded-lg border-2 border-primary/40 object-cover shadow-xl sm:w-56"
          />
        ) : (
          <div className="flex aspect-2/3 w-48 shrink-0 items-center justify-center rounded-lg border bg-secondary sm:w-56">
            <BookMarked className="size-10 text-primary/50" />
          </div>
        )}

        <h1 className="text-3xl font-semibold md:text-4xl">{book.title}</h1>
        <p className="font-serif text-lg italic text-muted-foreground">
          {book.author}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <Badge>{book.category}</Badge>
          <Badge variant="secondary">{languageLabel(book.language)}</Badge>
          <Badge variant="secondary">{book.page_count} páginas</Badge>
        </div>

        {book.description && (
          <p className="max-w-xl text-sm leading-relaxed text-foreground/90">
            {book.description}
          </p>
        )}

        {book.profiles && (
          <p className="text-sm text-muted-foreground">
            Compartilhado por{' '}
            <Link
              to={`/u/${book.profiles.username}`}
              className="text-primary hover:underline"
            >
              {book.profiles.display_name}
            </Link>
          </p>
        )}

        <div className="flex flex-col items-center gap-3 pt-2">
          {session ? (
            <Button asChild size="lg">
              <Link to={`/ler/${book.id}`}>
                {resumePage
                  ? `Continuar da página ${resumePage}`
                  : 'Começar a ler'}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link to="/entrar">Entrar para ler</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                A leitura é gratuita — basta ter uma conta.
              </p>
            </>
          )}
          <div className="flex items-center gap-2">
            <LikeButton bookId={book.id} />
            <SaveButton bookId={book.id} />
          </div>
        </div>
      </div>

      {siblings.length > 1 && (
        <div className="relative mx-auto max-w-2xl px-4 pb-4 md:px-10">
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Library className="size-3.5" /> Parte da coleção "{book.collection_name}"
            </p>
            <div className="flex flex-wrap gap-2">
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  to={`/livro/${s.id}`}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent ${
                    s.id === book.id
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  Volume {s.collection_position}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-2xl px-4 pb-16 md:px-10">
        <CommentSection bookId={book.id} />
      </div>
    </div>
  )
}
