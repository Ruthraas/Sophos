import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Book } from '../../types/models'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const UI_HIDE_DELAY = 3000

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const uid = session?.user.id

  const [book, setBook] = useState<Book | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(0) // 0 = ainda carregando
  const [zoom, setZoom] = useState(1)
  const [viewWidth, setViewWidth] = useState(() => window.innerWidth)
  const [error, setError] = useState<string | null>(null)
  const [uiVisible, setUiVisible] = useState(true)
  const [pageReady, setPageReady] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const closeRef = useRef<(() => Promise<void>) | null>(null)
  const touchX = useRef<number | null>(null)
  const lastTouch = useRef(0)
  const hideTimer = useRef<number | null>(null)

  const showUi = useCallback(() => {
    setUiVisible(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(
      () => setUiVisible(false),
      UI_HIDE_DELAY,
    )
  }, [])

  const toggleUi = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    setUiVisible((visible) => {
      if (!visible) {
        hideTimer.current = window.setTimeout(
          () => setUiVisible(false),
          UI_HIDE_DELAY,
        )
      }
      return !visible
    })
  }, [])

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    },
    [],
  )

  // Carrega livro, progresso salvo e o PDF (com autenticação)
  useEffect(() => {
    if (!id || !uid) return
    let active = true
    void (async () => {
      try {
        const { data: b } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (!active) return
        if (!b) {
          setError('Livro não encontrado.')
          return
        }
        setBook(b)

        const { data: progress } = await supabase
          .from('reading_progress')
          .select('current_page')
          .eq('user_id', uid)
          .eq('book_id', id)
          .maybeSingle()

        const { data: blob, error: downloadError } = await supabase.storage
          .from('books')
          .download(b.pdf_path)
        if (downloadError || !blob) {
          if (active) setError('Não foi possível baixar o livro.')
          return
        }

        const { openPdf } = await import('../../lib/pdf')
        const opened = await openPdf(await blob.arrayBuffer())
        if (!active) {
          void opened.close()
          return
        }
        closeRef.current = opened.close
        setPdf(opened.pdf)
        setPageNum(Math.min(progress?.current_page ?? 1, opened.pdf.numPages))
      } catch {
        if (active) setError('Não foi possível abrir o livro.')
      }
    })()
    return () => {
      active = false
      if (closeRef.current) {
        void closeRef.current()
        closeRef.current = null
      }
    }
  }, [id, uid])

  // Com o livro pronto, mostra a UI e agenda o primeiro auto-esconder
  useEffect(() => {
    if (pdf) showUi()
  }, [pdf, showUi])

  // Desenha a página atual (cancelando desenhos anteriores em andamento)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!pdf || !canvas || pageNum < 1) return
    let disposed = false
    let cancelDraw: (() => void) | null = null
    void import('../../lib/pdf').then(({ drawPage }) => {
      if (disposed) return
      const cssWidth = Math.min(viewWidth - 32, 860) * zoom
      cancelDraw = drawPage(pdf, pageNum, canvas, cssWidth, () =>
        setPageReady(true),
      )
    })
    return () => {
      disposed = true
      cancelDraw?.()
    }
  }, [pdf, pageNum, zoom, viewWidth])

  // Salva o progresso a cada virada de página
  useEffect(() => {
    if (!uid || !id || pageNum < 1) return
    void supabase.from('reading_progress').upsert({
      user_id: uid,
      book_id: id,
      current_page: pageNum,
      last_read_at: new Date().toISOString(),
    })
  }, [pageNum, uid, id])

  useEffect(() => {
    const onResize = () => setViewWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const total = pdf?.numPages ?? 0
  const goPrev = useCallback(() => setPageNum((p) => Math.max(1, p - 1)), [])
  const goNext = useCallback(
    () => setPageNum((p) => (total > 0 ? Math.min(total, p + 1) : p)),
    [total],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // Zonas de toque: terço esquerdo volta, direito avança, centro alterna a UI
  function handleZoneClick(e: MouseEvent<HTMLDivElement>) {
    if (!pdf) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (x < 0.3) goPrev()
    else if (x > 0.7) goNext()
    else toggleUi()
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-16">
        <h2 className="text-xl font-semibold">Não deu para abrir</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative h-dvh overflow-hidden bg-[var(--reader-bg)]',
        !uiVisible && 'cursor-none',
      )}
      onMouseMove={() => {
        // toques geram eventos de mouse sintéticos — ignorá-los aqui
        if (Date.now() - lastTouch.current > 600) showUi()
      }}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 bg-background/85 px-4 py-3 text-sm backdrop-blur transition-all duration-300',
          !uiVisible && 'pointer-events-none -translate-y-full opacity-0',
        )}
      >
        <Link
          to={book ? `/livro/${book.id}` : '/'}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <span className="min-w-0 flex-1 truncate text-center text-muted-foreground">
          {book?.title ?? ''}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {pageNum > 0 && total > 0
            ? `${pageNum} / ${total} · ${Math.round((pageNum / total) * 100)}%`
            : ''}
        </span>
      </div>

      <div
        className="flex h-full items-start justify-center overflow-auto px-4 pb-16 pt-12"
        onClick={handleZoneClick}
        onTouchStart={(e) => {
          lastTouch.current = Date.now()
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          lastTouch.current = Date.now()
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 60) {
            if (dx > 0) goPrev()
            else goNext()
          }
        }}
      >
        {pdf && pageNum > 0 ? (
          <canvas
            ref={canvasRef}
            className={cn(
              'rounded-sm bg-[var(--reader-page)] opacity-0 shadow-2xl transition-opacity duration-300',
              pageReady && 'opacity-100',
            )}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Preparando o livro…</p>
        )}
      </div>

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-3 bg-background/85 px-4 pb-6 pt-3 backdrop-blur transition-all duration-300',
          !uiVisible && 'pointer-events-none translate-y-full opacity-0',
        )}
      >
        <Button variant="outline" onClick={goPrev} disabled={pageNum <= 1}>
          ← Anterior
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
          aria-label="Diminuir o tamanho da página"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setZoom(1)}
          aria-label="Tamanho padrão"
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
          aria-label="Aumentar o tamanho da página"
        >
          <Plus className="size-4" />
        </Button>
        <Button
          variant="outline"
          onClick={goNext}
          disabled={total > 0 && pageNum >= total}
        >
          Próxima →
        </Button>
      </div>

      {pageNum > 0 && total > 0 && (
        <div
          className="absolute bottom-0 left-0 z-20 h-0.5 bg-primary opacity-80 transition-all duration-300"
          style={{ width: `${(pageNum / total) * 100}%` }}
        />
      )}
    </div>
  )
}
