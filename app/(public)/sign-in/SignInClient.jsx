'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SignInModal from '@/components/SignInModal'

export default function SignInClient() {
  const params = useSearchParams()
  const router = useRouter()
  const [redirect, setRedirect] = useState('/')
  const [defaultMode, setDefaultMode] = useState('login')

  useEffect(() => {
    setRedirect(params.get('redirect_to') || '/')
    if (params.get('mode') === 'register') {
      const next = new URLSearchParams(params.toString())
      next.delete('mode')
      const qs = next.toString()
      router.replace(qs ? `/sign-up?${qs}` : '/sign-up')
      return
    }
    setDefaultMode('login')
  }, [params, router])

  return (
    <SignInModal
      open
      variant="page"
      defaultMode={defaultMode}
      onClose={() => router.push(redirect)}
    />
  )
}
