import { supabase } from './supabase'

/** URL pública de uma capa (bucket 'covers' é público). */
export function coverUrl(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}
