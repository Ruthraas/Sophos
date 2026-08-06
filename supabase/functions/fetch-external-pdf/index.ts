// Edge Function: fetch-external-pdf
// Baixa, no servidor, um PDF de uma fonte pública de domínio público (hoje
// só Project Gutenberg) e devolve os bytes para o navegador. Existe porque
// gutenberg.org não libera CORS — o navegador não consegue buscar o arquivo
// direto. A allowlist de domínio evita virar um proxy aberto.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_HOSTS = ['www.gutenberg.org', 'gutenberg.org']
const MAX_BYTES = 60 * 1024 * 1024

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Requisição inválida.' }, 400)
  }

  const { url } = body as Record<string, unknown>
  if (typeof url !== 'string') {
    return json({ error: 'URL inválida.' }, 400)
  }

  let target: URL
  try {
    target = new URL(url)
  } catch {
    return json({ error: 'URL inválida.' }, 400)
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.includes(target.hostname)) {
    return json({ error: 'Fonte não permitida.' }, 400)
  }

  let upstream: Response
  try {
    upstream = await fetch(target)
  } catch {
    return json({ error: 'Não foi possível baixar o arquivo.' }, 502)
  }
  if (!upstream.ok || !upstream.body) {
    return json({ error: 'Não foi possível baixar o arquivo.' }, 502)
  }

  const contentLength = Number(upstream.headers.get('Content-Length') ?? '0')
  if (contentLength > MAX_BYTES) {
    return json({ error: 'Arquivo grande demais.' }, 413)
  }

  const bytes = await upstream.arrayBuffer()
  if (bytes.byteLength > MAX_BYTES) {
    return json({ error: 'Arquivo grande demais.' }, 413)
  }

  return new Response(bytes, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
  })
})
