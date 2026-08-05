import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { Button } from '@/components/ui/button'

export default function FollowButton({ profileId }: { profileId: string }) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [following, setFollowing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!uid || uid === profileId) return
    let active = true
    void supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', uid)
      .eq('followee_id', profileId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setFollowing(data !== null)
      })
    return () => {
      active = false
    }
  }, [uid, profileId])

  if (!uid || uid === profileId) return null

  async function toggle() {
    if (!uid) return
    setBusy(true)
    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', uid)
        .eq('followee_id', profileId)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: uid, followee_id: profileId })
      setFollowing(true)
    }
    setBusy(false)
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      onClick={toggle}
      disabled={busy}
      size="sm"
    >
      {following ? 'Seguindo' : 'Seguir'}
    </Button>
  )
}
