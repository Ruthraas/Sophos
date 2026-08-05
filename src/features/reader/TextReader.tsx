import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface TextReaderHandle {
  goToPage: (page: number) => void
}

interface TextReaderProps {
  pdf: PDFDocumentProxy
  totalPages: number
  startPage: number
  fontScale: number
  onPageChange: (page: number) => void
}

const WINDOW_BEFORE = 2
const WINDOW_AFTER = 2
const BATCH = 3

const TextReader = forwardRef<TextReaderHandle, TextReaderProps>(
  function TextReader({ pdf, totalPages, startPage, fontScale, onPageChange }, ref) {
    const [pages, setPages] = useState<Map<number, string[]>>(new Map())
    const [minLoaded, setMinLoaded] = useState(startPage)
    const [maxLoaded, setMaxLoaded] = useState(startPage)
    const [loadingMore, setLoadingMore] = useState(false)
    const [loadingPrev, setLoadingPrev] = useState(false)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
    const pageRefs = useRef(new Map<number, HTMLDivElement>())
    const initializedFor = useRef<PDFDocumentProxy | null>(null)
    const scrolledInitial = useRef(false)

    async function loadRange(from: number, to: number) {
      const { extractPageText } = await import('../../lib/pdf')
      const entries = await Promise.all(
        Array.from({ length: to - from + 1 }, (_, i) => from + i).map(
          async (n) => [n, await extractPageText(pdf, n)] as const,
        ),
      )
      setPages((prev) => {
        const next = new Map(prev)
        for (const [n, paragraphs] of entries) next.set(n, paragraphs)
        return next
      })
    }

    // Carga inicial: uma janela de páginas ao redor do ponto de retomada
    useEffect(() => {
      if (initializedFor.current === pdf) return
      initializedFor.current = pdf
      const from = Math.max(1, startPage - WINDOW_BEFORE)
      const to = Math.min(totalPages, startPage + WINDOW_AFTER)
      setMinLoaded(from)
      setMaxLoaded(to)
      void loadRange(from, to)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdf])

    // Assim que a página inicial estiver no DOM, rola até ela
    useEffect(() => {
      if (scrolledInitial.current) return
      const el = pageRefs.current.get(startPage)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        scrolledInitial.current = true
      }
    }, [pages, startPage])

    // Observa qual página está mais visível para reportar o progresso
    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
          if (visible) {
            const page = Number((visible.target as HTMLElement).dataset.page)
            if (page) onPageChange(page)
          }
        },
        { root: container, threshold: [0.5] },
      )
      for (const el of pageRefs.current.values()) observer.observe(el)
      return () => observer.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages])

    // Carrega mais páginas ao chegar perto do fim (scroll infinito)
    useEffect(() => {
      const sentinel = bottomSentinelRef.current
      const container = containerRef.current
      if (!sentinel || !container || maxLoaded >= totalPages) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !loadingMore) {
            setLoadingMore(true)
            const from = maxLoaded + 1
            const to = Math.min(totalPages, maxLoaded + BATCH)
            void loadRange(from, to).then(() => {
              setMaxLoaded(to)
              setLoadingMore(false)
            })
          }
        },
        { root: container, rootMargin: '600px' },
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxLoaded, totalPages, loadingMore])

    // Carrega páginas anteriores preservando a posição visual de rolagem
    function handleLoadPrevious() {
      const container = containerRef.current
      if (!container || minLoaded <= 1 || loadingPrev) return
      setLoadingPrev(true)
      const from = Math.max(1, minLoaded - BATCH)
      const to = minLoaded - 1
      const prevScrollHeight = container.scrollHeight
      const prevScrollTop = container.scrollTop
      void loadRange(from, to).then(() => {
        setMinLoaded(from)
        setLoadingPrev(false)
        requestAnimationFrame(() => {
          container.scrollTop =
            prevScrollTop + (container.scrollHeight - prevScrollHeight)
        })
      })
    }

    useImperativeHandle(ref, () => ({
      goToPage(page: number) {
        const clamped = Math.max(1, Math.min(totalPages, page))
        const existing = pageRefs.current.get(clamped)
        if (existing) {
          existing.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
        const from = Math.max(1, clamped - WINDOW_BEFORE)
        const to = Math.min(totalPages, clamped + WINDOW_AFTER)
        void loadRange(from, to).then(() => {
          setMinLoaded((m) => Math.min(m, from))
          setMaxLoaded((m) => Math.max(m, to))
          requestAnimationFrame(() => {
            pageRefs.current.get(clamped)?.scrollIntoView({ block: 'start' })
          })
        })
      },
    }))

    const orderedPages = Array.from(pages.keys()).sort((a, b) => a - b)

    return (
      <div
        ref={containerRef}
        className="h-full overflow-y-auto overscroll-contain bg-[var(--reader-bg)] px-4 pb-24 pt-16 md:px-8"
      >
        <div
          className="mx-auto flex max-w-[42rem] flex-col gap-8 text-foreground/90"
          style={{ fontSize: `${1.15 * fontScale}rem`, lineHeight: 1.85 }}
        >
          {minLoaded > 1 && (
            <button
              onClick={handleLoadPrevious}
              disabled={loadingPrev}
              className="mx-auto rounded-full border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {loadingPrev ? 'Carregando…' : '↑ Carregar páginas anteriores'}
            </button>
          )}

          {orderedPages.map((pageNumber) => {
            const paragraphs = pages.get(pageNumber) ?? []
            return (
              <div
                key={pageNumber}
                data-page={pageNumber}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNumber, el)
                  else pageRefs.current.delete(pageNumber)
                }}
                className="flex flex-col gap-5"
              >
                {paragraphs.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    (Esta página não tem texto reconhecível — pode ser uma
                    imagem digitalizada.)
                  </p>
                ) : (
                  paragraphs.map((paragraph, i) => (
                    <p key={i} className="text-pretty">
                      {paragraph}
                    </p>
                  ))
                )}
                <span className="self-center font-sans text-xs tracking-wide text-muted-foreground/60">
                  — {pageNumber} —
                </span>
              </div>
            )
          })}

          <div ref={bottomSentinelRef} className="h-1" />
          {loadingMore && (
            <p className="text-center font-sans text-sm text-muted-foreground">
              Carregando mais páginas…
            </p>
          )}
        </div>
      </div>
    )
  },
)

export default TextReader
