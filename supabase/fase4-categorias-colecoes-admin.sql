-- =============================================================
-- Fórum de Sophos — Fase 4: mais categorias, coleções e admin
-- Cole este arquivo inteiro no SQL Editor do Supabase e rode.
-- =============================================================

-- ---------- Mais categorias ----------
alter table public.books drop constraint books_category_check;
alter table public.books add constraint books_category_check check (category in (
  'Ficção', 'Romance', 'Fantasia', 'Ficção Científica', 'Terror/Suspense',
  'Policial/Thriller', 'Aventura', 'Quadrinhos/Mangá', 'Jovem Adulto',
  'Não-ficção', 'Filosofia', 'Ciência', 'Tecnologia', 'Negócios/Economia',
  'Autoajuda', 'Psicologia', 'História', 'Política', 'Direito',
  'Saúde/Medicina', 'Poesia', 'Religião/Espiritualidade', 'Biografia',
  'Arte/Design', 'Culinária', 'Viagem', 'Infantil', 'Educação/Didático',
  'Outros'
));

-- ---------- Coleções ----------
-- Um livro pertence a uma coleção quando collection_name é preenchido
-- (mesmo nome usado por todos os volumes). collection_position ordena
-- os volumes dentro dela. Cada volume continua sendo um livro comum,
-- com seu próprio pdf/capa/progresso de leitura — a coleção é só um
-- agrupamento visual no catálogo.
alter table public.books add column collection_name text;
alter table public.books add column collection_position int;

create index books_collection_idx on public.books (collection_name)
  where collection_name is not null;

-- ---------- Conta admin ----------
alter table public.profiles add column is_admin boolean not null default false;

-- IMPORTANTE: a política "editar o próprio perfil" (já existente) deixa
-- qualquer pessoa logada atualizar sua própria linha em profiles — sem
-- este gatilho, isso incluiria a coluna is_admin, e qualquer usuário
-- poderia se autopromover a admin direto pelo navegador. O gatilho
-- abaixo reverte silenciosamente qualquer mudança em is_admin feita
-- por quem ainda não é admin.
create function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin
    ) then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

create trigger protect_is_admin_trigger
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- Admins editam/removem qualquer livro (além do dono, via política já existente).
create policy "admin edita qualquer livro"
  on public.books for update to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ));
create policy "admin remove qualquer livro"
  on public.books for delete to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ));

-- Admins editam qualquer perfil (moderação: bio, nome de exibição etc).
create policy "admin edita qualquer perfil"
  on public.profiles for update to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ));

-- Admins também podem apagar os arquivos (PDF/capa) de um livro removido.
create policy "admin remove qualquer arquivo"
  on storage.objects for delete to authenticated
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  ));

-- Depois de rodar isto, vire admin da sua própria conta com (troque
-- 'seu_usuario' pelo seu nome de usuário no site):
--
--   update public.profiles set is_admin = true where username = 'seu_usuario';
