'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useNavbarColor } from '@/lib/useNavbarColor';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { DEFAULT_SCROLL_TO_TOP, normalizeScrollToTop } from '@/lib/scrollToTopSettings';

const SHOW_AFTER_PX = 280;
const SIZE = 48;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function readScrollProgress() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return {
    y,
    progress: Math.min(1, Math.max(0, y / max)),
  };
}

function isOverFooter() {
  const footer = document.getElementById('storefront-footer');
  if (!footer) return false;
  const top = footer.getBoundingClientRect().top;
  return top < window.innerHeight - 72;
}

export default function ScrollToTopButton() {
  const navbarColor = useNavbarColor();
  const { t } = useStorefrontI18n();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [overFooter, setOverFooter] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SCROLL_TO_TOP);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/store/appearance/sections/public', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.scrollToTop) setSettings(normalizeScrollToTop(data.scrollToTop));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!settings.enabled) {
      setVisible(false);
      return undefined;
    }

    const onScroll = () => {
      const next = readScrollProgress();
      setProgress(next.progress);
      setVisible(next.y > SHOW_AFTER_PX);
      setOverFooter(isOverFooter());
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [settings.enabled]);

  if (!settings.enabled) return null;

  const isLeft = settings.position === 'left';
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const fillColor = overFooter ? '#ffffff' : navbarColor;
  const arrowColor = overFooter ? '#111111' : '#ffffff';
  const ringColor = overFooter ? '#111111' : '#ffffff';

  return (
    <button
      type="button"
      aria-label={t('common.backToTop')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed z-[90] inline-flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        isLeft
          ? 'bottom-6 start-4 lg:bottom-8 lg:start-8'
          : 'bottom-[6.5rem] end-4 lg:bottom-[6.75rem] lg:end-8'
      } ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'}`}
      style={{
        width: SIZE,
        height: SIZE,
        backgroundColor: fillColor,
      }}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 120ms linear, stroke 160ms ease' }}
        />
      </svg>
      <ArrowUp
        size={18}
        strokeWidth={2.4}
        className="relative z-[1]"
        style={{ color: arrowColor }}
      />
    </button>
  );
}
