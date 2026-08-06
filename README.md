# Fórum de Sophos

Comunidade de leitura: qualquer pessoa pode compartilhar um livro (PDF) e
outras podem descobri-lo e lê-lo **direto no navegador**, página por página —
como um leitor digital comunitário, gratuito e desenhado para não cansar a
vista. Sem anúncios, sem paywall, sem monetização.

## Stack

- **Frontend:** Vite + React + TypeScript (PWA instalável via `vite-plugin-pwa`)
- **Backend:** [Supabase](https://supabase.com) — autenticação, Postgres com
  tempo real e Storage
- **Leitura:** [pdf.js](https://mozilla.github.io/pdf.js/) renderizando cada
  página em `<canvas>` (o PDF nunca é exposto para download na interface)

O login usa **nome de usuário + senha**, sem e-mail: a recuperação de conta é
feita por um **código de recuperação** exibido uma única vez e guardado pela
pessoa (apenas o hash vai ao banco).

## Rodando localmente

1. Crie um projeto no Supabase e rode, no SQL Editor, os arquivos
   `supabase/schema.sql` e depois `supabase/fase1.sql`.
2. Em Authentication → Sign In / Providers → Email: deixe o provedor **ativado**
   e desmarque apenas **"Confirm email"**.
3. Publique as Edge Functions `reset-password` e `fetch-external-pdf` com o
   conteúdo de `supabase/functions/reset-password/index.ts` e
   `supabase/functions/fetch-external-pdf/index.ts` (essa segunda baixa, no
   servidor, o PDF de um livro achado em **Descobrir** — sem ela o botão
   "quero baixar e compartilhar" ainda funciona, só pede pra anexar o
   arquivo manualmente).
4. Copie `.env.example` para `.env` e preencha com a URL e a chave anon do
   projeto (Project Settings → API).
5. Instale e rode:

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build   # typecheck + bundle + service worker em dist/
npm run preview
```

No deploy (Vercel), configure as variáveis `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` — o `vercel.json` já cuida do fallback de SPA.
