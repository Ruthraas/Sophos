// Edge Function: reset-password
// Redefine a senha de uma conta a partir do nome de usuário + código
// de recuperação. Roda no servidor com a service role key (nunca
// exposta ao navegador). O código usado é invalidado após o sucesso.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Mensagem única para usuário inexistente, sem código ou código errado:
// não revelar qual parte falhou dificulta tentativas de adivinhação.
function rejected() {
  return json({ error: 'Usuário ou código de recuperação incorretos.' }, 400)
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
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

  const { username, code, new_password } = body as Record<string, unknown>
  if (
    typeof username !== 'string' ||
    typeof code !== 'string' ||
    typeof new_password !== 'string' ||
    new_password.length < 8
  ) {
    return json({ error: 'Dados inválidos.' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('username', username.trim().toLowerCase())
    .maybeSingle()
  if (!profile) return rejected()

  const { data: rc } = await admin
    .from('recovery_codes')
    .select('code_hash')
    .eq('user_id', profile.id)
    .maybeSingle()
  if (!rc) return rejected()

  const hash = await sha256Hex(code.trim().toUpperCase())
  if (hash !== rc.code_hash) return rejected()

  const { error: updateError } = await admin.auth.admin.updateUserById(
    profile.id,
    { password: new_password },
  )
  if (updateError) {
    return json({ error: 'Não foi possível redefinir a senha.' }, 500)
  }

  await admin.from('recovery_codes').delete().eq('user_id', profile.id)

  return json({ ok: true }, 200)
})
