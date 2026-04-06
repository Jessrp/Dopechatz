'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/chat')
      } else {
        router.push('/landing')
      }
    })
  }, [])

  return (
    <main style={{ background: '#000', height: '100vh' }} />
  )
}
