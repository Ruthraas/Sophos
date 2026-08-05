import { supabase } from '../../lib/supabase'

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L, U/V)
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTWXYZ23456789'

export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  const groups: string[] = []
  for (let i = 0; i < chars.length; i += 4) {
    groups.push(chars.slice(i, i + 4).join(''))
  }
  return `SOPHOS-${groups.join('-')}`
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.trim().toUpperCase())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

/** Gera um código novo, salva o hash e devolve o código em claro (única vez que ele existe legível). */
export async function saveNewRecoveryCode(userId: string): Promise<string> {
  const code = generateRecoveryCode()
  const code_hash = await hashRecoveryCode(code)
  const { error } = await supabase.from('recovery_codes').upsert({
    user_id: userId,
    code_hash,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error('Não foi possível salvar o código de recuperação.')
  return code
}

export async function hasRecoveryCode(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('recovery_codes')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return data !== null
}
