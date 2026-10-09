'use client'

import Script from 'next/script'
import { getStorefrontLanguageInitScript } from '@/lib/storefrontLanguage'

export default function StorefrontLanguageInitScript() {
  return (
    <Script
      id="document-direction-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: getStorefrontLanguageInitScript() }}
    />
  )
}
