/**
 * Busca a sinopse de um livro. Tenta a Open Library primeiro (título +
 * autor); como boa parte dos "works" de lá não tem descrição nenhuma —
 * e edições traduzidas quase nunca batem com o título em português —,
 * cai pra Wikipédia em português como reserva, buscando só pelo título
 * (funciona melhor: incluir o autor na busca costuma trazer a página do
 * autor em vez da do livro).
 */
export async function fetchBookDescription(
  title: string,
  author: string,
): Promise<string | null> {
  const fromOpenLibrary = await fetchFromOpenLibrary(title, author)
  if (fromOpenLibrary) return fromOpenLibrary
  return fetchFromWikipedia(title)
}

async function fetchFromOpenLibrary(
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

// Só aceita a página se a descrição curta da Wikipédia (ex: "romance de
// Machado de Assis") deixar claro que é sobre um livro — é melhor não achar
// nada do que trazer a sinopse de uma pessoa, banda ou tecnologia com nome
// parecido (já vi as duas coisas acontecerem na prática).
const BOOK_HINT =
  /\blivro\b|\bromance\b|\bnovela\b|\bconto\b|\bcontos\b|obra literária|\bensaio\b|\bpoema\b|\bpoesia\b|coletânea|autobiografia|\bbiografia\b|peça de teatro|\bmangá\b|\bquadrinh|história em quadrinhos/i

async function fetchFromWikipedia(title: string): Promise<string | null> {
  const found = await searchWikipediaBook(title)
  if (found) return found
  // Título digitado com espaço onde a Wikipédia junta a palavra (ex: "Anti
  // Frágil" vs "Antifrágil") é comum o bastante pra valer uma segunda
  // tentativa.
  const joined = title.replace(/\s+/g, '')
  if (joined !== title && joined.length > 3) {
    return searchWikipediaBook(joined)
  }
  return null
}

async function searchWikipediaBook(query: string): Promise<string | null> {
  try {
    const searchUrl =
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*` +
      `&srlimit=3&srsearch=${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl)
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const candidates: string[] =
      searchData.query?.search?.map((r: { title: string }) => r.title) ?? []

    for (const pageTitle of candidates) {
      const summaryRes = await fetch(
        `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
      )
      if (!summaryRes.ok) continue
      const summary = await summaryRes.json()
      if (summary.type === 'disambiguation') continue
      const extract = summary.extract as string | undefined
      // Aceita se a descrição curta OU o começo do texto deixar claro que é
      // sobre um livro — a descrição curta nem sempre existe na Wikipédia,
      // mas o texto quase sempre começa dizendo o que a página é.
      const looksLikeBook =
        (typeof summary.description === 'string' && BOOK_HINT.test(summary.description)) ||
        (extract && BOOK_HINT.test(extract.slice(0, 150)))
      if (!looksLikeBook) continue
      if (extract && extract.length > 40) return extract.trim().slice(0, 500)
    }
    return null
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
