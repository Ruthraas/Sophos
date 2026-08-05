import { Link } from 'react-router'
import { coverUrl } from '../../lib/storage'
import type { BookWithUploader } from '../../types/models'

export default function BookCard({ book }: { book: BookWithUploader }) {
  const cover = coverUrl(book.cover_path)
  return (
    <div className="book-card">
      <Link to={`/livro/${book.id}`}>
        {cover ? (
          <img className="book-cover" src={cover} alt={`Capa de ${book.title}`} />
        ) : (
          <div className="book-cover" aria-hidden />
        )}
      </Link>
      <div>
        <Link to={`/livro/${book.id}`} className="book-title">
          {book.title}
        </Link>
        <p className="help">{book.author}</p>
        <p className="help">
          <span className="tag">{book.category}</span>
        </p>
        {book.profiles && (
          <p className="help">
            por{' '}
            <Link to={`/u/${book.profiles.username}`}>
              {book.profiles.display_name}
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
