import { useEffect, useState } from 'react'
import { BookMarked, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CommunityStats() {
  const [books, setBooks] = useState<number | null>(null)
  const [members, setMembers] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (active) setBooks(count ?? 0)
      })
    void supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (active) setMembers(count ?? 0)
      })
    return () => {
      active = false
    }
  }, [])

  if (books === null || members === null) return null
  if (books === 0 && members <= 1) return null

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <BookMarked className="size-4 text-primary" />
        <strong className="text-foreground">{books}</strong> livro
        {books === 1 ? '' : 's'} na comunidade
      </span>
      <span className="flex items-center gap-2">
        <Users className="size-4 text-primary" />
        <strong className="text-foreground">{members}</strong> leitor
        {members === 1 ? '' : 'es'}
      </span>
    </div>
  )
}
