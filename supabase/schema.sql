-- =============================================================
-- Fórum de Sophos — esquema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do painel do Supabase
-- e clique em Run. Pode ser executado uma única vez.
-- =============================================================

-- ---------- Perfis ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário se cadastra.
-- O username chega via metadata do cadastro (Fase 1).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Códigos de recuperação ----------
-- Guarda apenas o hash do código. RLS ligada SEM políticas:
-- nenhum navegador acessa esta tabela; só a Edge Function de
-- recuperação (service role) consegue ler/escrever.
create table public.recovery_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null,
  updated_at timestamptz not null default now()
);

-- ---------- Livros ----------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  description text not null default '',
  category text not null check (category in (
    'Ficção', 'Não-ficção', 'Filosofia', 'Ciência', 'Tecnologia',
    'Autoajuda', 'História', 'Poesia', 'Religião/Espiritualidade',
    'Biografia', 'Infantil', 'Outros'
  )),
  language text not null default 'pt',
  cover_path text,
  pdf_path text not null,
  page_count int not null check (page_count > 0),
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- Progresso de leitura ----------
create table public.reading_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  current_page int not null default 1 check (current_page > 0),
  last_read_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- ---------- Segurança (Row Level Security) ----------
alter table public.profiles enable row level security;
alter table public.recovery_codes enable row level security;
alter table public.books enable row level security;
alter table public.reading_progress enable row level security;

-- Perfis: leitura pública (crédito a quem contribui), edição só do dono.
create policy "perfis visíveis para todos"
  on public.profiles for select using (true);
create policy "editar o próprio perfil"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Livros: catálogo público; subir/editar/remover só logado e só os seus.
create policy "catálogo visível para todos"
  on public.books for select using (true);
create policy "subir livro exige login"
  on public.books for insert to authenticated
  with check (auth.uid() = uploaded_by);
create policy "editar o próprio livro"
  on public.books for update to authenticated
  using (auth.uid() = uploaded_by) with check (auth.uid() = uploaded_by);
create policy "remover o próprio livro"
  on public.books for delete to authenticated
  using (auth.uid() = uploaded_by);

-- Progresso: cada pessoa só vê e altera o próprio.
create policy "progresso é privado"
  on public.reading_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Tempo real ----------
-- O catálogo atualiza ao vivo assinando mudanças na tabela books.
alter publication supabase_realtime add table public.books;

-- ---------- Storage ----------
-- 'covers': capas, leitura pública. 'books': PDFs, só para logados.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true), ('books', 'books', false);

create policy "capas visíveis para todos"
  on storage.objects for select using (bucket_id = 'covers');
create policy "upload de capa exige login"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'covers');
create policy "ler pdf exige login"
  on storage.objects for select to authenticated
  using (bucket_id = 'books');
create policy "upload de pdf exige login"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'books');
