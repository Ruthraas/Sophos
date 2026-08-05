import { Link } from 'react-router'
import { coverUrl } from '../../lib/storage'
import type { BookWithUploader } from '../../types/models'

export default function BookCard({ book }: { book: BookWithUploader }) {
  const cover = coverUrl(book.cover_path)
  return (
    <div className="shelf-item">
      <Link to={`/livro/${book.id}`} className="shelf-card">
        {cover ? (
          <img className="shelf-cover" src={cover} alt={`Capa de ${book.title}`} />
        ) : (
          <span className="cover-fallback" aria-hidden />
        )}
        <span className="shelf-chip">{book.category}</span>
        <span className="shelf-overlay">
          <span className="shelf-title">{book.title}</span>
          <span className="shelf-author">{book.author}</span>
        </span>
      </Link>
      {book.profiles && (
        <p className="shelf-meta">
          por{' '}
          <Link to={`/u/${book.profiles.username}`}>
            {book.profiles.display_name}
          </Link>
        </p>
      )}
    </div>
  )
}
