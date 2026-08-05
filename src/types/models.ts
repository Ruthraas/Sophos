export const BOOK_CATEGORIES = [
  'Ficção',
  'Não-ficção',
  'Filosofia',
  'Ciência',
  'Tecnologia',
  'Autoajuda',
  'História',
  'Poesia',
  'Religião/Espiritualidade',
  'Biografia',
  'Infantil',
  'Outros',
] as const

export type BookCategory = (typeof BOOK_CATEGORIES)[number]

export const BOOK_LANGUAGES = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'other', label: 'Outro' },
] as const

export function languageLabel(value: string): string {
  return BOOK_LANGUAGES.find((l) => l.value === value)?.label ?? value
}

/** public.profiles — perfil público de cada membro */
export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  created_at: string
}

/** public.books */
export interface Book {
  id: string
  title: string
  author: string
  description: string
  category: BookCategory
  language: string
  cover_path: string | null
  pdf_path: string
  page_count: number
  uploaded_by: string
  created_at: string
}

/** Livro com o perfil de quem enviou (join usado no catálogo). */
export interface BookWithUploader extends Book {
  profiles: Pick<Profile, 'username' | 'display_name'> | null
}

/** public.reading_progress — chave composta (user_id, book_id) */
export interface ReadingProgress {
  user_id: string
  book_id: string
  current_page: number
  last_read_at: string
}

/** public.follows — chave composta (follower_id, followee_id) */
export interface Follow {
  follower_id: string
  followee_id: string
  created_at: string
}

/** public.book_likes — chave composta (user_id, book_id) */
export interface BookLike {
  user_id: string
  book_id: string
  created_at: string
}

/** public.book_comments */
export interface BookComment {
  id: string
  book_id: string
  user_id: string
  body: string
  created_at: string
}

/** Comentário com o perfil de quem escreveu (join usado na página do livro). */
export interface BookCommentWithAuthor extends BookComment {
  profiles: Pick<Profile, 'username' | 'display_name' | 'avatar_url'> | null
}
