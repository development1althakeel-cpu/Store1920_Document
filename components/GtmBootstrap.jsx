'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { GTM_ID } from '@/lib/gtm';
import { isGtmInternalPath } from '@/lib/gtmEvents';

function loadStorefrontGtm() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.__store1920GtmLoaded = window.__store1920GtmLoaded || {};
  if (window.__store1920GtmLoaded[GTM_ID]) return;
  if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${GTM_ID}"]`)) {
    window.__store1920GtmLoaded[GTM_ID] = true;
    return;
  }

  window.__store1920GtmLoaded[GTM_ID] = true;
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  const firstScript = document.getElementsByTagName('script')[0];
  firstScript?.parentNode?.insertBefore(script, firstScript);
}

export default function GtmBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isGtmInternalPath(pathname)) return;
    loadStorefrontGtm();
  }, [pathname]);

  return null;
}
