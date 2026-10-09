'use client';

import { GripVertical } from 'lucide-react';
import {
  defaultNavbarItemOrder,
  getNavbarArrangeItems,
} from '@/lib/navbarLayoutSettings';
import useNavbarItemReorder from '@/components/store/useNavbarItemReorder';

export default function NavbarItemArrange({
  layout,
  visibility = { orders: true, wishlist: true, cart: true },
  onChange,
}) {
  const items = getNavbarArrangeItems(layout, visibility);
  const { dragId, point, offset, start } = useNavbarItemReorder({
    enabled: true,
    itemOrder: layout.itemOrder,
    extraButtons: layout.extraButtons,
    onChange,
  });
  const dragging = items.find((item) => item.id === dragId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Arrange navbar items</h2>
          <p className="mt-1 text-xs text-slate-500">
            Drag items left or right. The preview and live navbar follow this order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(defaultNavbarItemOrder(layout.extraButtons))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset order
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {items.map((item) => {
          const isDragging = dragId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-navbar-arrange-id={item.id}
              onPointerDown={(event) => start(event, item.id)}
              className={`inline-flex select-none items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition duration-150 ease-out ${
                isDragging
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 opacity-40'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/60'
              }`}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              <GripVertical size={13} className="text-slate-400" />
              {item.label}
            </button>
          );
        })}
      </div>

      {dragging ? (
        <div
          className="pointer-events-none fixed z-[80] inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"
          style={{
            left: point.x - offset.x,
            top: point.y - offset.y,
            width: 'max-content',
          }}
        >
          <GripVertical size={13} className="text-indigo-400" />
          {dragging.label}
        </div>
      ) : null}
    </div>
  );
}
