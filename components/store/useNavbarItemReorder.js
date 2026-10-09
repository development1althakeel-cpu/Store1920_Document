'use client';

import { useEffect, useRef, useState } from 'react';
import { moveNavbarItem } from '@/lib/navbarLayoutSettings';

export default function useNavbarItemReorder({
  enabled = false,
  itemOrder = [],
  extraButtons = [],
  onChange,
}) {
  const [dragId, setDragId] = useState(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const offsetRef = useRef({ x: 0, y: 0 });
  const orderRef = useRef(itemOrder);
  const extraRef = useRef(extraButtons);
  const changeRef = useRef(onChange);

  orderRef.current = itemOrder;
  extraRef.current = extraButtons;
  changeRef.current = onChange;

  const start = (event, id) => {
    if (!enabled || event.button !== 0) return;
    if (event.target.closest?.('input, textarea, select, a, button[data-no-drag]')) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setDragId(id);
    setPoint({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    if (!enabled || !dragId) return undefined;

    const onMove = (event) => {
      event.preventDefault();
      setPoint({ x: event.clientX, y: event.clientY });
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const overId = under?.closest?.('[data-navbar-arrange-id]')?.getAttribute('data-navbar-arrange-id');
      if (!overId || overId === dragId || !changeRef.current) return;
      const next = moveNavbarItem(orderRef.current, dragId, overId, extraRef.current);
      if (next.join('|') !== (orderRef.current || []).join('|')) {
        changeRef.current(next);
      }
    };

    const onUp = () => setDragId(null);

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragId, enabled]);

  return {
    dragId,
    point,
    offset: offsetRef.current,
    start,
  };
}
