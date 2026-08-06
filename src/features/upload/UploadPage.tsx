import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
  fetchBookDescription,
  findDuplicateBook,
  type DuplicateBook,
} from '../../lib/bookLookup'
import { BOOK_CATEGORIES, BOOK_LANGUAGES } from '../../types/models'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
  const [descLoading, setDescLoading] = useState(false)
  const [descAuto, setDescAuto] = useState(false)
  const [descNotFound, setDescNotFound] = useState(false)
  const [duplicate, setDuplicate] = useState<DuplicateBook | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)

  async function handleFetchDescription() {
    if (!title.trim() || !author.trim()) return
    setDescLoading(true)
    setDescNotFound(false)
    try {
      const found = await fetchBookDescription(title.trim(), author.trim())
      if (found) {
        setDescription(found)
        setDescAuto(true)
      } else {
        setDescNotFound(true)
      }
    } finally {
      setDescLoading(false)
    }
  }

  async function handleCheckDuplicate() {
    if (!title.trim() || !author.trim()) {
      setDuplicate(null)
      return
    }
    setCheckingDuplicate(true)
    const match = await findDuplicateBook(title.trim(), author.trim())
    setCheckingDuplicate(false)
    setDuplicate(match)
  }

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
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-10">
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-xl font-semibold">Compartilhar um livro</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O livro ficará disponível para toda a comunidade ler direto no
                navegador, com seu nome nos créditos.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setDuplicate(null)
                  setDescNotFound(false)
                }}
                onBlur={handleCheckDuplicate}
                maxLength={120}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="author">Autor(a)</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value)
                  setDuplicate(null)
                  setDescNotFound(false)
                }}
                onBlur={() => {
                  if (!description.trim()) void handleFetchDescription()
                  void handleCheckDuplicate()
                }}
                maxLength={80}
                required
              />
            </div>

            {/* Sempre montado (mesmo vazio) — evita que o texto aparecer/sumir
                desloque o botão de enviar bem no instante de um clique. */}
            <p className="min-h-[1rem] text-xs text-muted-foreground">
              {checkingDuplicate
                ? 'Verificando se este livro já está no catálogo…'
                : ' '}
            </p>
            {duplicate && (
              <div className="flex flex-col gap-1 rounded-md border-l-2 border-primary bg-primary/10 p-3 text-sm">
                <p>
                  Um livro parecido já está no catálogo:{' '}
                  <Link
                    to={`/livro/${duplicate.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {duplicate.title}
                  </Link>{' '}
                  — {duplicate.author}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pode ser a mesma obra. Se for uma edição diferente, pode
                  enviar mesmo assim.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="description">Descrição curta</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto gap-1.5 px-2 py-1 text-xs text-primary hover:text-primary"
                  onClick={handleFetchDescription}
                  disabled={descLoading || !title.trim() || !author.trim()}
                >
                  <Sparkles className="size-3.5" />
                  {descLoading
                    ? 'Buscando…'
                    : description
                      ? 'Buscar novamente'
                      : 'Buscar automaticamente'}
                </Button>
              </div>
              <Textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setDescAuto(false)
                }}
                maxLength={500}
                placeholder="Preencha título e autor para buscar a sinopse automaticamente, ou escreva a sua."
              />
              {/* Sempre montado — mesma razão do aviso de duplicata acima. */}
              <p className="min-h-[1rem] text-xs text-muted-foreground">
                {descAuto
                  ? 'Sinopse encontrada automaticamente — sinta-se à vontade para editar.'
                  : descNotFound
                    ? 'Não encontramos uma sinopse automática pra esse título e autor — escreva a sua aqui embaixo.'
                    : ' '}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border bg-secondary/50 px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value="" disabled>Escolha…</option>
                  {BOOK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="language">Idioma</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-secondary/50 px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {BOOK_LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pdf">Arquivo PDF (máx. {MAX_PDF_MB} MB)</Label>
              <Input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cover">
                Capa (opcional — sem ela, usamos a primeira página do PDF)
              </Label>
              <Input
                id="cover"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={busy} size="lg">
              {busy ? status : 'Compartilhar com a comunidade'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
