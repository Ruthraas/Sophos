import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { coverUrl } from '../../lib/storage'
import { useAuth } from '../auth/AuthContext'
import type { Book } from '../../types/models'
import BookRow from '@/components/BookRow'

interface ContinueItem {
  current_page: number
  last_read_at: string
  books: Book | null
}

export default function ContinueReading() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [items, setItems] = useState<ContinueItem[]>([])

  useEffect(() => {
    if (!uid) {
      setItems([])
      return
    }
    let active = true
    void supabase
      .from('reading_progress')
      .select('current_page, last_read_at, books(*)')
      .eq('user_id', uid)
      .order('last_read_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (active && data) setItems(data as unknown as ContinueItem[])
      })
    return () => {
      active = false
    }
  }, [uid])

  const valid = items.filter((item) => item.books !== null)
  if (valid.length === 0) return null

  return (
    <BookRow title="Continue lendo">
      {valid.map((item) => {
        const book = item.books as Book
        const cover = coverUrl(book.cover_path)
        const pct = Math.min(
          100,
          Math.round((item.current_page / book.page_count) * 100),
        )
        return (
          <Link
            key={book.id}
            to={`/ler/${book.id}`}
            className="flex w-64 shrink-0 items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/60"
          >
            {cover ? (
              <img
                src={cover}
                alt=""
                aria-hidden
                className="h-16 w-11 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-16 w-11 shrink-0 rounded bg-secondary" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{book.title}</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                página {item.current_page} de {book.page_count} · {pct}%
              </p>
            </div>
          </Link>
        )
      })}
    </BookRow>
  )
}
