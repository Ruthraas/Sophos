import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BookMarked } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { BookWithUploader } from '../../types/models'
import BookCard from '../catalog/BookCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface SavedRow {
  books: BookWithUploader | null
}

export default function MyLibraryPage() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [books, setBooks] = useState<BookWithUploader[] | null>(null)

  useEffect(() => {
    if (!uid) return
    let active = true
    async function load() {
      const { data } = await supabase
        .from('saved_books')
        .select('created_at, books(*, profiles(username, display_name))')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (!active) return
      setBooks(
        (data as unknown as SavedRow[] | null ?? [])
          .filter((r): r is SavedRow & { books: BookWithUploader } => r.books !== null)
          .map((r) => r.books),
      )
    }
    void load()

    const channel = supabase
      .channel(`saved-books-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_books',
          filter: `user_id=eq.${uid}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [uid])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold md:text-4xl">Seus livros</h1>
        <p className="text-sm text-muted-foreground">
          Os livros que você salvou em{' '}
          <Link to="/descobrir" className="text-primary hover:underline">
            Descobrir
          </Link>{' '}
          pra ler quando der.
        </p>
      </div>

      {books === null ? (
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 w-36 sm:w-40" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <BookMarked className="size-10 text-primary/60" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Você ainda não salvou nenhum livro. Vá em Descobrir e guarde os
            que quiser ler depois.
          </p>
          <Button asChild>
            <Link to="/descobrir">Ir para Descobrir</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
