import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../lib/supabase'
import { coverUrl } from '../../lib/storage'
import { useAuth } from '../auth/AuthContext'
import type { Book } from '../../types/models'

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
    <section className="stack" style={{ gap: 'var(--space-6)' }}>
      <h2 className="section-title">Continue lendo</h2>
      <div className="scroll-row">
        {valid.map((item) => {
          const book = item.books as Book
          const cover = coverUrl(book.cover_path)
          const pct = Math.min(
            100,
            Math.round((item.current_page / book.page_count) * 100),
          )
          return (
            <Link key={book.id} to={`/ler/${book.id}`} className="continue-card">
              {cover ? (
                <img
                  className="continue-cover"
                  src={cover}
                  alt=""
                  aria-hidden
                />
              ) : (
                <div className="continue-cover" aria-hidden />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="book-title">{book.title}</p>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <p className="help">
                  página {item.current_page} de {book.page_count} · {pct}%
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
