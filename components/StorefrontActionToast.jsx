'use client';

import Link from 'next/link';
import { AlertCircle, Check, Heart, Package, ShoppingCart, X } from 'lucide-react';
import { STORE1920_BRAND_PURPLE } from '@/lib/brandLogo';

const VARIANTS = {
  cart: { icon: ShoppingCart },
  wishlist: { icon: Heart, filled: true },
  'wishlist-removed': { icon: Heart },
  'empty-cart': { icon: ShoppingCart },
  orders: { icon: Package },
  success: { icon: Check },
  error: { icon: AlertCircle },
};

export default function StorefrontActionToast({
  visible = true,
  variant = 'cart',
  title,
  subtitle,
  actionLabel,
  actionHref,
  onDismiss,
  floating = false,
}) {
  const config = VARIANTS[variant] || VARIANTS.cart;
  const Icon = config.icon;

  const card = (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-max max-w-[min(92vw,340px)] items-center gap-2.5 rounded-full border border-slate-200/80 bg-white py-2 pl-2 pr-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)] ${
        visible ? '' : 'opacity-0 transition-opacity duration-200'
      }`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: STORE1920_BRAND_PURPLE }}
      >
        <Icon
          size={18}
          className="text-white"
          fill={config.filled ? 'currentColor' : 'none'}
          strokeWidth={2}
        />
      </div>

      <div className="min-w-0 flex-1 pe-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">{title}</p>
        {actionLabel && actionHref ? (
          <Link
            href={actionHref}
            onClick={onDismiss}
            className="mt-0.5 inline-block text-xs text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
          >
            {actionLabel}
          </Link>
        ) : subtitle ? (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );

  if (!floating) return card;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[2147483000] flex justify-center px-4 md:inset-x-auto md:bottom-8 md:end-8 md:start-auto md:justify-end">
      <div className="pointer-events-auto animate-[storefrontToastIn_0.25s_ease-out]">{card}</div>
    </div>
  );
}
