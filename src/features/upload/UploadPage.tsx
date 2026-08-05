import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { BOOK_CATEGORIES, BOOK_LANGUAGES } from '../../types/models'

const MAX_PDF_MB = 25
const COVER_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('pt')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const uid = session?.user.id
    if (!uid) return

    if (!pdfFile || pdfFile.type !== 'application/pdf') {
      setError('Escolha um arquivo PDF.')
      return
    }
    if (pdfFile.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`O PDF pode ter no máximo ${MAX_PDF_MB} MB.`)
      return
    }
    if (coverFile && !COVER_TYPES[coverFile.type]) {
      setError('A capa deve ser uma imagem JPEG, PNG ou WebP.')
      return
    }
    if (!category) {
      setError('Escolha uma categoria.')
      return
    }

    try {
      setStatus('Lendo o PDF…')
      // Import dinâmico: o pdf.js (pesado) só baixa quando alguém envia um livro.
      const { openPdf, renderFirstPageToJpeg } = await import('../../lib/pdf')
      const { pdf, close } = await openPdf(await pdfFile.arrayBuffer())
      const pageCount = pdf.numPages

      setStatus('Preparando a capa…')
      const coverBlob = coverFile ?? (await renderFirstPageToJpeg(pdf))
      const coverExt = coverFile ? COVER_TYPES[coverFile.type] : 'jpg'
      const coverType = coverFile ? coverFile.type : 'image/jpeg'
      await close()

      const id = crypto.randomUUID()
      const pdfPath = `${uid}/${id}.pdf`
      const coverPath = `${uid}/${id}.${coverExt}`

      setStatus('Enviando o livro…')
      const { error: pdfError } = await supabase.storage
        .from('books')
        .upload(pdfPath, pdfFile, { contentType: 'application/pdf' })
      if (pdfError) throw pdfError

      const { error: coverError } = await supabase.storage
        .from('covers')
        .upload(coverPath, coverBlob, { contentType: coverType })
      if (coverError) throw coverError

      setStatus('Salvando no catálogo…')
      const { data: inserted, error: insertError } = await supabase
        .from('books')
        .insert({
          title: title.trim(),
          author: author.trim(),
          description: description.trim(),
          category,
          language,
          pdf_path: pdfPath,
          cover_path: coverPath,
          page_count: pageCount,
          uploaded_by: uid,
        })
        .select('id')
        .single()
      if (insertError || !inserted) throw insertError

      navigate(`/livro/${inserted.id}`)
    } catch {
      setError('Não foi possível enviar o livro. Tente novamente.')
      setStatus(null)
    }
  }

  const busy = status !== null

  return (
    <div className="container">
      <div className="card">
        <form className="stack" onSubmit={handleSubmit}>
          <h2>Compartilhar um livro</h2>
          <p className="help">
            O livro ficará disponível para toda a comunidade ler direto no
            navegador, com seu nome nos créditos.
          </p>

          <div className="field">
            <label className="label" htmlFor="title">Título</label>
            <input
              id="title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="author">Autor(a)</label>
            <input
              id="author"
              className="input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={80}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="description">Descrição curta</label>
            <textarea
              id="description"
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="category">Categoria</label>
            <select
              id="category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="" disabled>Escolha…</option>
              {BOOK_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="language">Idioma</label>
            <select
              id="language"
              className="input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {BOOK_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label" htmlFor="pdf">
              Arquivo PDF (máx. {MAX_PDF_MB} MB)
            </label>
            <input
              id="pdf"
              className="input"
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="cover">
              Capa (opcional — sem ela, usamos a primeira página do PDF)
            </label>
            <input
              id="cover"
              className="input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? status : 'Compartilhar com a comunidade'}
          </button>
        </form>
      </div>
    </div>
  )
}
