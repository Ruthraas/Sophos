import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type { PDFDocumentProxy }

export interface OpenedPdf {
  pdf: PDFDocumentProxy
  /** Libera o documento e o worker — chamar ao terminar de usar. */
  close: () => Promise<void>
}

export async function openPdf(data: ArrayBuffer): Promise<OpenedPdf> {
  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise
  return { pdf, close: () => task.destroy() }
}

/**
 * Desenha uma página no canvas com nitidez de tela retina (devicePixelRatio).
 * Retorna uma função de cancelamento — chamá-la interrompe um desenho em
 * andamento (o pdf.js não aceita duas renderizações simultâneas no mesmo canvas).
 */
export function drawPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  cssWidth: number,
  onDone?: () => void,
): () => void {
  let cancelled = false
  let task: { cancel: () => void } | null = null

  void (async () => {
    try {
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const dpr = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })

      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      canvas.style.width = `${Math.round(cssWidth)}px`
      canvas.style.height = `${Math.round(viewport.height / dpr)}px`

      const canvasContext = canvas.getContext('2d')
      if (!canvasContext) return
      task = page.render({ canvas, canvasContext, viewport })
      await (task as { promise: Promise<void> } & typeof task).promise
      if (!cancelled) onDone?.()
    } catch {
      // renderização cancelada — esperado ao virar páginas rapidamente
    }
  })()

  return () => {
    cancelled = true
    task?.cancel()
  }
}

/** Renderiza a primeira página como JPEG — usada como capa padrão do livro. */
export async function renderFirstPageToJpeg(
  pdf: PDFDocumentProxy,
  targetWidth = 480,
): Promise<Blob> {
  const page = await pdf.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: targetWidth / base.width })

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const canvasContext = canvas.getContext('2d')
  if (!canvasContext) throw new Error('Canvas indisponível.')

  await page.render({ canvas, canvasContext, viewport }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Falha ao gerar a capa.')),
      'image/jpeg',
      0.82,
    )
  })
}
