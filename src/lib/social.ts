import { supabase } from './supabase'
import type { Book } from '../types/models'

export interface CompletedBook {
  book: Book
  completedAt: string
}

interface ProgressRow {
  current_page: number
  last_read_at: string
  books: Book | null
}

/** Livros que a pessoa terminou (página atual >= total de páginas). */
export async function fetchCompletedBooks(userId: string): Promise<CompletedBook[]> {
  const { data } = await supabase
    .from('reading_progress')
    .select('current_page, last_read_at, books(*)')
    .eq('user_id', userId)
  if (!data) return []
  return (data as unknown as ProgressRow[])
    .filter((r): r is ProgressRow & { books: Book } => {
      return r.books !== null && r.current_page >= r.books.page_count
    })
    .map((r) => ({ book: r.books, completedAt: r.last_read_at }))
}

export interface FollowCounts {
  followers: number
  following: number
}

export async function fetchFollowCounts(userId: string): Promise<FollowCounts> {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followee_id', userId),
    supabase
      .from('follows')
      .select('followee_id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ])
  return { followers: followers ?? 0, following: following ?? 0 }
}
