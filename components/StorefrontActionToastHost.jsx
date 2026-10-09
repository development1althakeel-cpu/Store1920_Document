'use client';

import { useEffect, useRef, useState } from 'react';
import StorefrontActionToast from '@/components/StorefrontActionToast';
import { subscribeStorefrontActionToast } from '@/lib/storefrontActionToast';

const EXIT_MS = 280;
const MIN_VISIBLE_MS = 700;
const MAX_QUEUE = 5;
let toastSeq = 0;

export default function StorefrontActionToastHost() {
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState('idle');
  const dismissRef = useRef(() => {});

  useEffect(() => {
    const state = {
      current: null,
      phase: 'idle',
      queue: [],
    };
    let durationTimer = null;
    let exitTimer = null;
    let shownAt = 0;

    const clearTimers = () => {
      if (durationTimer) {
        clearTimeout(durationTimer);
        durationTimer = null;
      }
      if (exitTimer) {
        clearTimeout(exitTimer);
        exitTimer = null;
      }
    };

    const present = (toast) => {
      clearTimers();
      state.current = toast;
      state.phase = 'in';
      shownAt = Date.now();
      setCurrent(toast);
      setPhase('in');
      durationTimer = setTimeout(() => beginExit(), toast.duration || 4500);
    };

    const presentNext = () => {
      const next = state.queue.shift();
      if (!next) {
        state.current = null;
        state.phase = 'idle';
        setCurrent(null);
        setPhase('idle');
        return;
      }
      present(next);
    };

    const beginExit = (force = false) => {
      if (!state.current || state.phase === 'out') return;

      if (!force && state.queue.length > 0) {
        const remainingVisible = MIN_VISIBLE_MS - (Date.now() - shownAt);
        if (remainingVisible > 0) {
          if (durationTimer) clearTimeout(durationTimer);
          durationTimer = setTimeout(() => beginExit(true), remainingVisible);
          return;
        }
      }

      clearTimers();
      state.phase = 'out';
      setPhase('out');
      exitTimer = setTimeout(presentNext, EXIT_MS);
    };

    dismissRef.current = beginExit;

    const unsubscribe = subscribeStorefrontActionToast((detail) => {
      const toast = {
        ...detail,
        id: `storefront-toast-${++toastSeq}`,
      };

      if (state.phase === 'idle' || !state.current) {
        present(toast);
        return;
      }

      state.queue = state.queue.filter((item) => item.variant !== toast.variant);
      state.queue.push(toast);
      if (state.queue.length > MAX_QUEUE) {
        state.queue = state.queue.slice(-MAX_QUEUE);
      }

      if (state.phase !== 'out') {
        beginExit();
      }
    });

    return () => {
      unsubscribe();
      clearTimers();
    };
  }, []);

  if (!current) return null;

  return (
    <div className="storefront-toast-host">
      <div
        key={current.id}
        className={phase === 'out' ? 'storefront-toast-motion-out' : 'storefront-toast-motion-in'}
      >
        <StorefrontActionToast
          visible
          variant={current.variant}
          title={current.title}
          subtitle={current.subtitle}
          actionLabel={current.actionLabel}
          actionHref={current.actionHref}
          onDismiss={() => dismissRef.current()}
        />
      </div>
    </div>
  );
}
