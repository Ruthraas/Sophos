import { Link } from 'react-router'
import { BookMarked } from 'lucide-react'
import { coverUrl } from '../lib/storage'
import type { BookWithUploader } from '../types/models'
import { Badge } from '@/components/ui/badge'

export default function CollectionCard({
  name,
  books,
}: {
  name: string
  books: BookWithUploader[]
}) {
  const sorted = [...books].sort(
    (a, b) => (a.collection_position ?? 0) - (b.collection_position ?? 0),
  )
  const stack = sorted.slice(0, 3)
  const first = sorted[0]

  return (
    <div className="w-36 shrink-0 sm:w-40">
      <Link
        to={`/colecao/${encodeURIComponent(name)}`}
        className="group relative block aspect-2/3 overflow-visible"
      >
        <div className="relative h-full w-full">
          {stack.map((book, i) => {
            const depth = stack.length - 1 - i
            const cover = coverUrl(book.cover_path)
            return (
              <div
                key={book.id}
                className="absolute inset-0 overflow-hidden rounded-lg border bg-secondary shadow-md transition-transform duration-300 group-hover:-translate-y-1"
                style={{
                  transform: `translate(${depth * 7}px, ${-depth * 7}px)`,
                  zIndex: 10 + i,
                }}
              >
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-accent">
                    <BookMarked className="size-8 text-primary/50" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <Badge className="absolute -right-1 -top-1 z-20 bg-primary text-[10px] text-primary-foreground">
          {books.length} volumes
        </Badge>
      </Link>
      <p className="mt-1.5 truncate px-0.5 text-xs font-medium">{name}</p>
      {first && (
        <p className="truncate px-0.5 text-xs text-muted-foreground">
          {first.author}
        </p>
      )}
    </div>
  )
}
