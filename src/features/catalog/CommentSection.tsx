import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { BookCommentWithAuthor } from '../../types/models'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export default function CommentSection({ bookId }: { bookId: string }) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [comments, setComments] = useState<BookCommentWithAuthor[]>([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      const { data } = await supabase
        .from('book_comments')
        .select('*, profiles(username, display_name, avatar_url)')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
      if (active && data) setComments(data as unknown as BookCommentWithAuthor[])
    }
    void load()

    const channel = supabase
      .channel(`book-comments-${bookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_comments',
          filter: `book_id=eq.${bookId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [bookId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!uid || !body.trim()) return
    setPosting(true)
    const { error } = await supabase
      .from('book_comments')
      .insert({ book_id: bookId, user_id: uid, body: body.trim() })
    setPosting(false)
    if (!error) setBody('')
  }

  async function handleDelete(commentId: string) {
    await supabase.from('book_comments').delete().eq('id', commentId)
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">
        Comentários{comments.length > 0 && ` (${comments.length})`}
      </h2>

      {uid ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="O que você achou desse livro?"
            rows={2}
            maxLength={1000}
          />
          <Button
            type="submit"
            size="sm"
            className="self-end"
            disabled={posting || !body.trim()}
          >
            {posting ? 'Enviando…' : 'Comentar'}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link to="/entrar" className="text-primary hover:underline">
            Entre
          </Link>{' '}
          para comentar.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            {c.profiles?.avatar_url ? (
              <img
                src={c.profiles.avatar_url}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="size-9 shrink-0 rounded-full bg-secondary" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <Link
                  to={`/u/${c.profiles?.username}`}
                  className="text-sm font-medium hover:underline"
                >
                  {c.profiles?.display_name ?? 'alguém'}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </span>
                {uid === c.user_id && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    aria-label="Apagar comentário"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
