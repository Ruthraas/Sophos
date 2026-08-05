import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { ExtractedParagraph } from '../../lib/pdf'

export interface TextReaderHandle {
  goNext: () => void
  goPrev: () => void
}

interface TextReaderProps {
  pdf: PDFDocumentProxy
  totalPages: number
  startPage: number
  fontScale: number
  onPageChange: (page: number) => void
}

const WINDOW_BEFORE = 3
const WINDOW_AFTER = 3
const BATCH = 4

const TextReader = forwardRef<TextReaderHandle, TextReaderProps>(
  function TextReader({ pdf, totalPages, startPage, fontScale, onPageChange }, ref) {
    const [pages, setPages] = useState<Map<number, ExtractedParagraph[]>>(new Map())
    const [minLoaded, setMinLoaded] = useState(startPage)
    const [maxLoaded, setMaxLoaded] = useState(startPage)
    const [loadingMore, setLoadingMore] = useState(false)
    const [loadingPrev, setLoadingPrev] = useState(false)
    const [activePage, setActivePage] = useState(startPage)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const rightSentinelRef = useRef<HTMLDivElement | null>(null)
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

    // Só contam como "página" de verdade as que têm texto — imagens/capas
    // digitalizadas não aparecem na leitura em texto.
    const orderedPages = Array.from(pages.entries())
      .filter(([, paragraphs]) => paragraphs.length > 0)
      .map(([n]) => n)
      .sort((a, b) => a - b)

    // Assim que a janela inicial carregar, rola até a primeira página com
    // texto a partir do ponto de retomada (ele mesmo pode ser só a capa).
    useEffect(() => {
      if (scrolledInitial.current || orderedPages.length === 0) return
      const target = orderedPages.find((p) => p >= startPage) ?? orderedPages[0]
      const el = pageRefs.current.get(target)
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'start' })
        setActivePage(target)
        onPageChange(target)
        scrolledInitial.current = true
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderedPages.join(',')])

    // Observa qual página está mais visível horizontalmente
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
            if (page) {
              setActivePage(page)
              onPageChange(page)
            }
          }
        },
        { root: container, threshold: [0.6] },
      )
      for (const el of pageRefs.current.values()) observer.observe(el)
      return () => observer.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pages])

    // Carrega mais páginas ao chegar perto do fim (a "borda" vai crescendo)
    useEffect(() => {
      const sentinel = rightSentinelRef.current
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
        { root: container, rootMargin: '0px 800px 0px 0px' },
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [maxLoaded, totalPages, loadingMore])

    function handleLoadPrevious() {
      if (minLoaded <= 1 || loadingPrev) return
      setLoadingPrev(true)
      const from = Math.max(1, minLoaded - BATCH)
      const to = minLoaded - 1
      void loadRange(from, to).then(() => {
        setMinLoaded(from)
        setLoadingPrev(false)
      })
    }

    function scrollToPage(page: number) {
      pageRefs.current.get(page)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      })
    }

    useImperativeHandle(ref, () => ({
      goNext() {
        const idx = orderedPages.indexOf(activePage)
        if (idx >= 0 && idx < orderedPages.length - 1) {
          scrollToPage(orderedPages[idx + 1])
        } else if (maxLoaded < totalPages && !loadingMore) {
          setLoadingMore(true)
          const from = maxLoaded + 1
          const to = Math.min(totalPages, maxLoaded + BATCH)
          void loadRange(from, to).then(() => {
            setMaxLoaded(to)
            setLoadingMore(false)
          })
        }
      },
      goPrev() {
        const idx = orderedPages.indexOf(activePage)
        if (idx > 0) {
          scrollToPage(orderedPages[idx - 1])
        }
      },
    }))

    return (
      <div
        ref={containerRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain scroll-smooth"
      >
        {minLoaded > 1 && (
          <div className="flex h-full w-full shrink-0 snap-start items-center justify-center">
            <button
              onClick={handleLoadPrevious}
              disabled={loadingPrev}
              className="rounded-full border px-5 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {loadingPrev ? 'Carregando…' : '← Carregar páginas anteriores'}
            </button>
          </div>
        )}

        {orderedPages.map((pageNumber) => {
          const paragraphs = pages.get(pageNumber) ?? []
          const isActive = pageNumber === activePage
          return (
            <div
              key={pageNumber}
              data-page={pageNumber}
              ref={(el) => {
                if (el) pageRefs.current.set(pageNumber, el)
                else pageRefs.current.delete(pageNumber)
              }}
              className="h-full w-full shrink-0 snap-start overflow-y-auto px-6 pb-20 pt-6 transition-opacity duration-500 md:px-16"
              style={{ opacity: isActive ? 1 : 0.55 }}
            >
              <div
                className="mx-auto flex min-h-full max-w-[38rem] flex-col justify-center gap-5 py-10 text-foreground/90"
                style={{ fontSize: `${1.1 * fontScale}rem`, lineHeight: 1.85 }}
              >
                {paragraphs.map((p, i) =>
                  p.heading ? (
                    <p key={i} className="text-[1.2em] font-semibold text-foreground">
                      {p.text}
                    </p>
                  ) : (
                    <p key={i} className="text-pretty">
                      {p.text}
                    </p>
                  ),
                )}
              </div>
            </div>
          )
        })}

        <div ref={rightSentinelRef} className="h-full w-px shrink-0" />
        {loadingMore && (
          <div className="flex h-full w-full shrink-0 snap-start items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Carregando mais páginas…
            </p>
          </div>
        )}
      </div>
    )
  },
)

export default TextReader
