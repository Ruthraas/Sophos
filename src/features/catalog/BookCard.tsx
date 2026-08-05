import { Link } from 'react-router'
import { BookMarked } from 'lucide-react'
import { coverUrl } from '../../lib/storage'
import type { BookWithUploader } from '../../types/models'
import { Badge } from '@/components/ui/badge'

export default function BookCard({ book }: { book: BookWithUploader }) {
  const cover = coverUrl(book.cover_path)
  return (
    <div className="w-36 shrink-0 sm:w-40">
      <Link
        to={`/livro/${book.id}`}
        className="group relative block aspect-2/3 overflow-hidden rounded-lg border bg-secondary shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/70"
      >
        {cover ? (
          <img
            src={cover}
            alt={`Capa de ${book.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-accent">
            <BookMarked className="size-8 text-primary/50" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 bg-background/70 text-[10px] text-primary backdrop-blur">
          {book.category}
        </Badge>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-2.5 pb-2.5 pt-8 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <p className="line-clamp-2 text-sm font-semibold text-white">
            {book.title}
          </p>
          <p className="truncate text-xs text-white/70">{book.author}</p>
        </div>
      </Link>
      {book.profiles && (
        <p className="mt-1.5 truncate px-0.5 text-xs text-muted-foreground">
          por{' '}
          <Link
            to={`/u/${book.profiles.username}`}
            className="hover:text-primary"
          >
            {book.profiles.display_name}
          </Link>
        </p>
      )}
    </div>
  )
}
