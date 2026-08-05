-- =============================================================
-- Fórum de Sophos — exclusão de conta
-- Cole no SQL Editor do Supabase e clique em Run (uma única vez).
-- =============================================================

-- Cada pessoa pode apagar os próprios registros auxiliares
-- diretamente (útil, por exemplo, para zerar o progresso de leitura
-- sem excluir a conta inteira).
create policy "apagar o próprio código de recuperação"
  on public.recovery_codes for delete to authenticated
  using (auth.uid() = user_id);

create policy "apagar o próprio perfil"
  on public.profiles for delete to authenticated
  using (auth.uid() = id);

-- "progresso é privado" (fase1.sql) já cobre delete via for all,
-- então reading_progress não precisa de política nova.

-- Exclusão completa da conta: apaga o usuário em auth.users, o que
-- em cascata remove perfil, código de recuperação, progresso e
-- livros enviados (todas as referências já usam "on delete cascade"
-- no esquema). security definer: roda com o dono da função, não com
-- o papel da pessoa logada — auth.users não é acessível via RLS comum.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
