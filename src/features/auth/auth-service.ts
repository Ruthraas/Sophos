import { supabase } from '../../lib/supabase'

// As contas não usam e-mail real: o Supabase exige formato de e-mail
// como identificador, então derivamos um endereço interno do username.
// Esse endereço nunca recebe mensagem alguma.
const EMAIL_DOMAIN = 'membros.sophia.local'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/
export const PASSWORD_MIN_LENGTH = 8

function usernameToEmail(username: string) {
  return `${username}@${EMAIL_DOMAIN}`
}

export async function signUp(
  username: string,
  displayName: string,
  password: string,
) {
  const { data: taken } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (taken) throw new Error('Este nome de usuário já está em uso.')

  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username, display_name: displayName } },
  })
  if (error || !data.user) {
    throw new Error('Não foi possível criar a conta. Tente novamente.')
  }
  return data.user
}

export async function signIn(username: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  })
  if (error) throw new Error('Usuário ou senha incorretos.')
}

export async function signOut() {
  await supabase.auth.signOut()
}
