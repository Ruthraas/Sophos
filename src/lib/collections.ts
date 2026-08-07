import type { BookWithUploader } from '../types/models'

export type DisplayItem =
  | { type: 'book'; book: BookWithUploader }
  | { type: 'collection'; name: string; books: BookWithUploader[] }

/** Agrupa livros que compartilham collection_name em um único item visual. */
export function groupCollections(list: BookWithUploader[]): DisplayItem[] {
  const groups = new Map<string, Extract<DisplayItem, { type: 'collection' }>>()
  const result: DisplayItem[] = []
  for (const book of list) {
    if (book.collection_name) {
      let entry = groups.get(book.collection_name)
      if (!entry) {
        entry = { type: 'collection', name: book.collection_name, books: [] }
        groups.set(book.collection_name, entry)
        result.push(entry)
      }
      entry.books.push(book)
    } else {
      result.push({ type: 'book', book })
    }
  }
  return result
}
