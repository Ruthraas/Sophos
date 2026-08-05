import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react'
import { Link, useParams } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Book } from '../../types/models'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import './reader.css'

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
      <div className="container stack">
        <h2>Não deu para abrir</h2>
        <p className="help">{error}</p>
        <Link to="/">Voltar ao catálogo</Link>
      </div>
    )
  }

  return (
    <div
      className={`reader${uiVisible ? '' : ' ui-hidden'}`}
      onMouseMove={() => {
        // toques geram eventos de mouse sintéticos — ignorá-los aqui
        if (Date.now() - lastTouch.current > 600) showUi()
      }}
    >
      <div className="reader-bar">
        <Link to={book ? `/livro/${book.id}` : '/'}>← Voltar</Link>
        <span className="reader-title">{book?.title ?? ''}</span>
        <span className="help">
          {pageNum > 0 && total > 0
            ? `${pageNum} / ${total} · ${Math.round((pageNum / total) * 100)}%`
            : ''}
        </span>
      </div>

      <div
        className="reader-main"
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
            className={`reader-canvas${pageReady ? ' ready' : ''}`}
          />
        ) : (
          <p className="help">Preparando o livro…</p>
        )}
      </div>

      <div className="reader-controls">
        <button className="btn" onClick={goPrev} disabled={pageNum <= 1}>
          ← Anterior
        </button>
        <button
          className="btn"
          onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
          aria-label="Diminuir o tamanho da página"
        >
          −
        </button>
        <button
          className="btn"
          onClick={() => setZoom(1)}
          aria-label="Tamanho padrão"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="btn"
          onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(2)))}
          aria-label="Aumentar o tamanho da página"
        >
          +
        </button>
        <button
          className="btn"
          onClick={goNext}
          disabled={total > 0 && pageNum >= total}
        >
          Próxima →
        </button>
      </div>

      {pageNum > 0 && total > 0 && (
        <div
          className="reader-progress"
          style={{ width: `${(pageNum / total) * 100}%` }}
        />
      )}
    </div>
  )
}
