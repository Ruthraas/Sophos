/** Busca a sinopse oficial de um livro na Open Library (API pública, sem chave). */
export async function fetchBookDescription(
  title: string,
  author: string,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, author, limit: '1', fields: 'key' })
    const searchRes = await fetch(`https://openlibrary.org/search.json?${params}`)
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const key = searchData.docs?.[0]?.key as string | undefined
    if (!key) return null

    const workRes = await fetch(`https://openlibrary.org${key}.json`)
    if (!workRes.ok) return null
    const work = await workRes.json()
    const raw = work.description as string | { value?: string } | undefined
    const text = typeof raw === 'string' ? raw : raw?.value
    if (!text) return null
    return stripHtml(text).trim().slice(0, 500)
  } catch {
    return null
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

export interface DuplicateBook {
  id: string
  title: string
  author: string
}

const DIACRITICS_PATTERN = '\\u0300-\\u036f'
const DIACRITICS_RE = new RegExp('[' + DIACRITICS_PATTERN + ']', 'g')

/** Normaliza título/autor pra comparação: sem acento, minúsculo, sem pontuação. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Varre o catálogo inteiro (título/autor são públicos) atrás de um livro já
 * cadastrado com o mesmo título e autor — ajuda a evitar duplicatas antes do
 * envio. Comparação exata após normalização, então edições com títulos bem
 * diferentes não são pegas (evita alarme falso).
 */
export async function findDuplicateBook(
  title: string,
  author: string,
): Promise<DuplicateBook | null> {
  const normTitle = normalize(title)
  const normAuthor = normalize(author)
  if (!normTitle || !normAuthor) return null

  const { supabase } = await import('./supabase')
  const { data } = await supabase.from('books').select('id, title, author')
  if (!data) return null

  const match = data.find(
    (b) => normalize(b.title) === normTitle && normalize(b.author) === normAuthor,
  )
  return match ?? null
}
