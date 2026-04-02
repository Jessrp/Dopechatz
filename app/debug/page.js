'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [info, setInfo] = useState({})

  useEffect(() => {
    async function check() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user) { setInfo({ error: 'No user session', userError }); return }

      const { data: prof, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setInfo({ userId: user.id, email: user.email, prof, profError: profError?.message })
    }
    check()
  }, [])

  return (
    <pre style={{ padding: 20, color: '#fff', background: '#000', minHeight: '100vh', fontSize: 12 }}>
      {JSON.stringify(info, null, 2)}
    </pre>
  )
}
