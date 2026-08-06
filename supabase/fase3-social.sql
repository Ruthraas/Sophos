-- =============================================================
-- Fórum de Sophos — recursos sociais (seguir, curtir, comentar,
-- conquistas de leitura, biblioteca pessoal)
-- Cole no SQL Editor do Supabase e clique em Run (uma única vez).
-- =============================================================

-- ---------- Seguir pessoas ----------
create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.follows enable row level security;

create policy "seguidores visíveis para todos"
  on public.follows for select using (true);
create policy "seguir alguém"
  on public.follows for insert to authenticated
  with check (auth.uid() = follower_id);
create policy "deixar de seguir"
  on public.follows for delete to authenticated
  using (auth.uid() = follower_id);

-- ---------- Curtidas em livros ----------
create table public.book_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.book_likes enable row level security;

create policy "curtidas visíveis para todos"
  on public.book_likes for select using (true);
create policy "curtir livro"
  on public.book_likes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "descurtir livro"
  on public.book_likes for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- Comentários em livros ----------
create table public.book_comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (
    char_length(trim(body)) > 0 and char_length(body) <= 1000
  ),
  created_at timestamptz not null default now()
);
alter table public.book_comments enable row level security;

create policy "comentários visíveis para todos"
  on public.book_comments for select using (true);
create policy "comentar exige login"
  on public.book_comments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "apagar o próprio comentário"
  on public.book_comments for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- Conquistas: progresso de livro concluído é público ----------
-- "progresso é privado" (fase1.sql) continua valendo para leituras em
-- andamento; esta política adicional libera a leitura de linhas já
-- concluídas (current_page >= total de páginas do livro), pra dar pra
-- mostrar "livros concluídos" no perfil de qualquer pessoa. Políticas
-- de select se combinam com OU, então nada muda pro que já era privado.
create policy "progresso concluído é público"
  on public.reading_progress for select
  using (
    current_page >= (
      select page_count from public.books where id = book_id
    )
  );

-- ---------- Biblioteca pessoal: livros salvos pra ler depois ----------
-- Privado — só a própria pessoa vê o que guardou (não é uma curtida pública).
create table public.saved_books (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.saved_books enable row level security;

create policy "ver os próprios livros salvos"
  on public.saved_books for select to authenticated
  using (auth.uid() = user_id);
create policy "salvar um livro"
  on public.saved_books for insert to authenticated
  with check (auth.uid() = user_id);
create policy "remover um livro salvo"
  on public.saved_books for delete to authenticated
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.saved_books;

-- ---------- Tempo real ----------
alter publication supabase_realtime add table public.book_comments;
alter publication supabase_realtime add table public.book_likes;
