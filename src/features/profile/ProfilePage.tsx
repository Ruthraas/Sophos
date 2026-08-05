import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { signOut } from '../auth/auth-service'
import { hasRecoveryCode, saveNewRecoveryCode } from '../auth/recovery'
import type { Book } from '../../types/models'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { session, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeActive, setCodeActive] = useState<boolean | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [myBooks, setMyBooks] = useState<Book[]>([])
  const [pagesRead, setPagesRead] = useState<number | null>(null)

  const userId = session?.user.id

  
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      setBio(profile.bio)
    }
  }, [profile])

  useEffect(() => {
    if (userId) {
      void hasRecoveryCode(userId).then(setCodeActive)
      void supabase
        .from('books')
        .select('*')
        .eq('uploaded_by', userId)
        .order('created_at', { ascending: false })
        .then(({ data }) => setMyBooks(data ?? []))
      void supabase
        .from('reading_progress')
        .select('current_page')
        .eq('user_id', userId)
        .then(({ data }) => {
          if (data) {
            setPagesRead(data.reduce((sum, r) => sum + r.current_page, 0))
          }
        })
    }
  }, [userId])

  if (!userId) return null

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || profile?.username, bio })
      .eq('id', userId)
    setSaving(false)
    if (updateError) {
      setError('Não foi possível salvar o perfil.')
      return
    }
    await refreshProfile()
    setSaved(true)
  }

  async function handleAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setError(null)
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`${userId}/avatar`, file, { upsert: true, contentType: file.type })
    if (uploadError) {
      setError('Não foi possível enviar a imagem.')
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar`)
    // cache-bust para o navegador buscar a imagem nova
    const url = `${data.publicUrl}?v=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
    await refreshProfile()
  }

  async function handleNewCode() {
    if (!userId) return
    setError(null)
    try {
      const code = await saveNewRecoveryCode(userId)
      setNewCode(code)
      setCodeActive(true)
    } catch {
      setError('Não foi possível gerar o código.')
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="container stack" style={{ gap: 'var(--space-6)' }}>
      <div className="card stack">
        <h2>Seu perfil</h2>

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          {profile?.avatar_url ? (
            <img className="avatar" src={profile.avatar_url} alt="Seu avatar" />
          ) : (
            <div className="avatar" aria-hidden />
          )}
          <label className="btn" style={{ cursor: 'pointer' }}>
            Trocar avatar
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatar}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <form className="stack" onSubmit={handleSave}>
          <div className="field">
            <label className="label" htmlFor="displayName">
              Nome de exibição
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
            />
          </div>

          {error && <p className="error">{error}</p>}
          {saved && <p className="help">Perfil salvo.</p>}

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </form>
      </div>

      <div className="card stack">
        <h3>Código de recuperação</h3>
        {newCode ? (
          <>
            <p>
              Guarde o código novo em um lugar seguro — ele não será mostrado
              de novo e o anterior deixou de valer.
            </p>
            <p className="code-box">{newCode}</p>
          </>
        ) : codeActive === false ? (
          <p className="notice">
            Você não tem código de recuperação ativo. Sem ele, se esquecer a
            senha, a conta não poderá ser recuperada. Gere um agora.
          </p>
        ) : (
          <p className="help">
            Você tem um código ativo. Se o perdeu, gere um novo — o antigo
            deixa de valer na hora.
          </p>
        )}
        <button className="btn" onClick={handleNewCode}>
          Gerar novo código
        </button>
      </div>

      {pagesRead !== null && pagesRead > 0 && (
        <p className="help">
          Você já leu {pagesRead} página{pagesRead === 1 ? '' : 's'} por aqui.
          Boa leitura!
        </p>
      )}

      <div className="card stack">
        <h3>Seus livros</h3>
        {myBooks.length === 0 ? (
          <p className="help">
            Você ainda não compartilhou livros.{' '}
            <Link to="/enviar">Compartilhe o primeiro</Link>.
          </p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {myBooks.map((book) => (
              <li key={book.id}>
                <Link to={`/livro/${book.id}`}>{book.title}</Link>
                <span className="help"> — {book.author}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button className="btn" onClick={handleSignOut}>
        Sair da conta
      </button>
    </div>
  )
}
