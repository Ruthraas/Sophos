import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Library } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { BookWithUploader } from '../../types/models'
import BookCard from '../catalog/BookCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function CollectionPage() {
  const { name } = useParams<{ name: string }>()
  const [books, setBooks] = useState<BookWithUploader[] | null>(null)

  useEffect(() => {
    if (!name) return
    let active = true
    void supabase
      .from('books')
      .select('*, profiles(username, display_name)')
      .eq('collection_name', decodeURIComponent(name))
      .order('collection_position', { ascending: true })
      .then(({ data }) => {
        if (active) setBooks(data ?? [])
      })
    return () => {
      active = false
    }
  }, [name])

  const decoded = name ? decodeURIComponent(name) : ''

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:px-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <Library className="size-8 text-primary" />
        <h1 className="text-2xl font-semibold md:text-3xl">{decoded}</h1>
        {books && (
          <p className="text-sm text-muted-foreground">
            {books.length} volume{books.length === 1 ? '' : 's'}
            {books[0]?.author ? ` · ${books[0].author}` : ''}
          </p>
        )}
      </div>

      {books === null ? (
        <div className="flex flex-wrap justify-center gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-2/3 w-36 sm:w-40" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {books.map((book) => (
            <div key={book.id} className="flex flex-col items-center gap-1">
              <BookCard book={book} />
              {book.collection_position != null && (
                <span className="text-xs text-muted-foreground">
                  Volume {book.collection_position}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
