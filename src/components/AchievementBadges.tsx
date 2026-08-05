import { Link } from 'react-router'
import { Trophy } from 'lucide-react'
import { coverUrl } from '../lib/storage'
import type { CompletedBook } from '../lib/social'

export default function AchievementBadges({
  completed,
}: {
  completed: CompletedBook[]
}) {
  if (completed.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Trophy className="size-4 text-primary" />
        {completed.length} livro{completed.length === 1 ? '' : 's'} concluído
        {completed.length === 1 ? '' : 's'}
      </h3>
      <div className="flex flex-wrap gap-3">
        {completed.map(({ book }) => {
          const cover = coverUrl(book.cover_path)
          return (
            <Link
              key={book.id}
              to={`/livro/${book.id}`}
              title={book.title}
              className="w-16 shrink-0 overflow-hidden rounded-md border-2 border-primary/50 shadow-sm transition-transform hover:-translate-y-1"
            >
              {cover ? (
                <img
                  src={cover}
                  alt={book.title}
                  className="aspect-2/3 w-full object-cover"
                />
              ) : (
                <div className="aspect-2/3 w-full bg-secondary" />
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
