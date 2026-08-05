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
