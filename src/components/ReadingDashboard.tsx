import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { coverUrl } from '../lib/storage'
import type { Book } from '../types/models'

interface ProgressRow {
  current_page: number
  last_read_at: string
  books: Book | null
}

const OLD_GENERATION_WEEKLY_BOOKS = 7

export default function ReadingDashboard({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ProgressRow[] | null>(null)

  useEffect(() => {
    let active = true
    void supabase
      .from('reading_progress')
      .select('current_page, last_read_at, books(*)')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false })
      .then(({ data }) => {
        if (active) setRows((data as unknown as ProgressRow[] | null) ?? [])
      })
    return () => {
      active = false
    }
  }, [userId])

  if (rows === null) {
    return <div className="h-32 animate-pulse rounded-xl border bg-card" />
  }

  const withBook = rows.filter(
    (r): r is ProgressRow & { books: Book } => r.books !== null,
  )
  const completed = withBook.filter((r) => r.current_page >= r.books.page_count)
  const inProgress = withBook
    .filter((r) => r.current_page < r.books.page_count)
    .slice(0, 5)
  const totalPages = withBook.reduce((sum, r) => sum + r.current_page, 0)

  if (withBook.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          Comece a ler alguma coisa em{' '}
          <Link to="/descobrir" className="text-primary hover:underline">
            Descobrir
          </Link>{' '}
          pra ver suas estatísticas aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="páginas lidas" value={totalPages} />
        <StatTile label="concluídos" value={completed.length} />
        <StatTile label="em andamento" value={inProgress.length} />
      </div>

      <p className="rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm italic text-muted-foreground">
        Dizem que a geração dos seus avós lia, em média,{' '}
        {OLD_GENERATION_WEEKLY_BOOKS} livros por semana — quem sabe seja lenda.
        O que a gente sabe de verdade é que você já leu {totalPages} página
        {totalPages === 1 ? '' : 's'} por aqui. Continue assim.
      </p>

      {completed.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Trophy className="size-4 text-primary" />
            {completed.length} livro{completed.length === 1 ? '' : 's'} concluído
            {completed.length === 1 ? '' : 's'}
          </h3>
          <div className="flex flex-wrap gap-3">
            {completed.map((r) => {
              const cover = coverUrl(r.books.cover_path)
              return (
                <Link
                  key={r.books.id}
                  to={`/livro/${r.books.id}`}
                  title={r.books.title}
                  className="w-16 shrink-0 overflow-hidden rounded-md border-2 border-primary/50 shadow-sm transition-transform hover:-translate-y-1"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={r.books.title}
                      className="aspect-2/3 w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-2/3 w-full bg-secondary" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progresso de leitura
          </h3>
          <div className="flex flex-col gap-3">
            {inProgress.map((r) => {
              const pct = Math.round((r.current_page / r.books.page_count) * 100)
              return (
                <Link
                  key={r.books.id}
                  to={`/ler/${r.books.id}`}
                  className="group flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate group-hover:text-primary">
                      {r.books.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-secondary-foreground/20 to-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border bg-card py-4 text-center">
      <span className="text-2xl font-semibold text-primary">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
