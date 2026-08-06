import { useEffect, useState, type MouseEvent } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { cn } from '@/lib/utils'

interface SaveButtonProps {
  bookId: string
  /** Botão redondo só com ícone, pra sobrepor a capa nos cards. */
  compact?: boolean
}

export default function SaveButton({ bookId, compact = false }: SaveButtonProps) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid) {
      setSaved(false)
      return
    }
    let active = true
    void supabase
      .from('saved_books')
      .select('book_id')
      .eq('user_id', uid)
      .eq('book_id', bookId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setSaved(data !== null)
      })
    return () => {
      active = false
    }
  }, [uid, bookId])

  if (!uid) return null

  async function toggle(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!uid || busy) return
    setBusy(true)
    if (saved) {
      await supabase.from('saved_books').delete().eq('user_id', uid).eq('book_id', bookId)
      setSaved(false)
    } else {
      await supabase.from('saved_books').insert({ user_id: uid, book_id: bookId })
      setSaved(true)
    }
    setBusy(false)
  }

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={saved ? 'Remover dos seus livros' : 'Salvar pra ler depois'}
        className={cn(
          'absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-background/70 backdrop-blur transition-colors',
          saved ? 'text-primary' : 'text-white/90 hover:text-primary',
        )}
      >
        {saved ? (
          <BookmarkCheck className="size-4 fill-primary" />
        ) : (
          <Bookmark className="size-4" />
        )}
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
        saved
          ? 'border-primary bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {saved ? 'Salvo' : 'Salvar pra ler depois'}
    </button>
  )
}
