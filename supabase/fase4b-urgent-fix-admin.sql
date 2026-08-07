-- =============================================================
-- URGENTE: rode isto AGORA no SQL Editor do Supabase.
-- A coluna is_admin já existe no banco (fase4 parece ter sido
-- aplicada), mas sem este gatilho qualquer pessoa logada consegue
-- se autopromover a admin direto pelo navegador — já confirmado
-- que isso funciona no banco em produção agora mesmo.
-- =============================================================

create or replace function public.protect_is_admin()
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

drop trigger if exists protect_is_admin_trigger on public.profiles;
create trigger protect_is_admin_trigger
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- Depois disso, vire admin da sua própria conta (troque 'seu_usuario'):
--   update public.profiles set is_admin = true where username = 'seu_usuario';
-- (Este UPDATE só funciona rodado aqui no SQL Editor, com privilégios de
-- dono do banco — o gatilho acima bloqueia a mesma tentativa vinda do site.)
