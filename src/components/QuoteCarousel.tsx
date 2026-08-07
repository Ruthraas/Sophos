import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { coverUrl } from '../lib/storage'
import { cn } from '@/lib/utils'

interface QuoteBook {
  id: string
  title: string
  author: string
  description: string
  cover_path: string | null
}

const INTERVAL_MS = 6000

export default function QuoteCarousel() {
  const [books, setBooks] = useState<QuoteBook[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let active = true
    void supabase
      .from('books')
      .select('id, title, author, description, cover_path')
      .not('description', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active && data) setBooks(data)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (books.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % books.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [books.length])

  if (books.length === 0) return null

  const book = books[index]
  const cover = coverUrl(book.cover_path)

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      {cover && (
        <img
          key={book.id}
          src={cover}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-15 blur-2xl"
        />
      )}
      <div
        key={book.id}
        className="relative flex flex-col items-center gap-6 px-6 py-12 text-center animate-fade-in md:flex-row md:gap-10 md:px-14 md:py-16 md:text-left"
      >
        <Link to={`/livro/${book.id}`} className="shrink-0">
          {cover ? (
            <img
              src={cover}
              alt={`Capa de ${book.title}`}
              className="w-28 rounded-lg border-2 border-primary/40 object-cover shadow-xl sm:w-36"
            />
          ) : (
            <div className="flex aspect-2/3 w-28 items-center justify-center rounded-lg border bg-secondary sm:w-36">
              <span className="font-serif text-3xl text-primary/50">“”</span>
            </div>
          )}
        </Link>

        <div className="flex flex-col gap-4">
          <p className="text-3xl leading-none text-primary/60">“</p>
          <p className="line-clamp-5 -mt-6 max-w-xl font-serif text-lg italic leading-relaxed text-foreground/90 md:text-xl">
            {book.description}
          </p>
          <Link
            to={`/livro/${book.id}`}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            — <span className="font-medium text-foreground">{book.title}</span>,{' '}
            {book.author}
          </Link>
        </div>
      </div>

      {books.length > 1 && (
        <div className="relative flex justify-center gap-1.5 pb-4 md:justify-start md:pl-14">
          {books.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`Ver citação de ${b.title}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground',
              )}
            />
          ))}
        </div>
      )}
    </section>
  )
}
