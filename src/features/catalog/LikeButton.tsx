import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { cn } from '@/lib/utils'

export default function LikeButton({ bookId }: { bookId: string }) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { count: total } = await supabase
        .from('book_likes')
        .select('user_id', { count: 'exact', head: true })
        .eq('book_id', bookId)
      if (active) setCount(total ?? 0)
      if (uid) {
        const { data } = await supabase
          .from('book_likes')
          .select('user_id')
          .eq('book_id', bookId)
          .eq('user_id', uid)
          .maybeSingle()
        if (active) setLiked(data !== null)
      }
    }
    void load()

    const channel = supabase
      .channel(`book-likes-${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_likes',
          filter: `book_id=eq.${bookId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [bookId, uid])

  async function toggle() {
    if (!uid || busy) return
    setBusy(true)
    if (liked) {
      await supabase
        .from('book_likes')
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', uid)
    } else {
      await supabase.from('book_likes').insert({ book_id: bookId, user_id: uid })
    }
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={!uid || busy}
      title={uid ? undefined : 'Entre para curtir'}
      className={cn(
        'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
        liked
          ? 'border-primary bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground',
        !uid && 'cursor-not-allowed opacity-60',
      )}
    >
      <Heart className={cn('size-4', liked && 'fill-primary')} />
      {count === null ? '···' : count}
    </button>
  )
}
