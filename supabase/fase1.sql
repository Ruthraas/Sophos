-- =============================================================
-- Fórum de Sophos — complemento da Fase 1
-- Cole no SQL Editor do Supabase e clique em Run (uma única vez).
-- =============================================================

-- Códigos de recuperação: cada pessoa gerencia apenas o próprio
-- registro, e só enxerga o hash (o código em claro nunca é salvo).
create policy "ver o próprio código"
  on public.recovery_codes for select to authenticated
  using (auth.uid() = user_id);
create policy "criar o próprio código"
  on public.recovery_codes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "trocar o próprio código"
  on public.recovery_codes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Avatares: bucket público para leitura; cada pessoa só escreve
-- na própria pasta ({uid}/...).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "avatares visíveis para todos"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "subir o próprio avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "atualizar o próprio avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
