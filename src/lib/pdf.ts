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

/**
 * Extrai o texto de uma página e reconstrói parágrafos a partir da posição
 * dos fragmentos: uma quebra vertical maior que a linha vira novo parágrafo;
 * uma linha terminada em hífen é emendada com a próxima (quebra de palavra).
 * Heurística, não perfeita — PDFs digitalizados (imagem) retornam [].
 */
export async function extractPageText(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<string[]> {
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()

  interface Item {
    str: string
    x: number
    y: number
    height: number
  }
  const items: Item[] = []
  for (const raw of content.items) {
    const it = raw as { str?: string; transform: number[]; height?: number }
    if (!it.str) continue
    items.push({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      height: it.height || Math.abs(it.transform[3]) || 10,
    })
  }
  if (items.length === 0) return []

  // Agrupa fragmentos em linhas por proximidade vertical
  const lines: { y: number; height: number; items: Item[] }[] = []
  for (const item of items) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= 2)
    if (line) {
      line.items.push(item)
      line.height = Math.max(line.height, item.height)
    } else {
      lines.push({ y: item.y, height: item.height, items: [item] })
    }
  }
  // Coordenada y do PDF cresce de baixo para cima — ordena do topo para a base
  lines.sort((a, b) => b.y - a.y)
  for (const line of lines) line.items.sort((a, b) => a.x - b.x)

  const lineTexts = lines.map((l) =>
    l.items
      .map((it) => it.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )

  // Reconstrói parágrafos a partir das linhas
  const paragraphs: string[] = []
  let current = ''
  let prevY: number | null = null
  let prevHeight = 0
  for (let i = 0; i < lines.length; i++) {
    const text = lineTexts[i]
    if (!text) continue
    const y = lines[i].y
    const gap = prevY === null ? 0 : prevY - y
    const isNewParagraph = prevY !== null && gap > prevHeight * 1.5

    if (current && /-$/.test(current) && /^[a-zà-öø-ÿ]/.test(text)) {
      current = current.replace(/-$/, '') + text
    } else if (!current || isNewParagraph) {
      if (current) paragraphs.push(current.trim())
      current = text
    } else {
      current += ' ' + text
    }
    prevY = y
    prevHeight = lines[i].height
  }
  if (current) paragraphs.push(current.trim())

  return paragraphs.filter((p) => p.length > 0)
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
