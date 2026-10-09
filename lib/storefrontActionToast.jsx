'use client';

const EVENT_NAME = 'storefront-action-toast';
const DEFAULT_DURATION = 4500;

export function showStorefrontActionToast({
  variant = 'cart',
  title,
  subtitle = '',
  actionLabel,
  actionHref,
  duration = DEFAULT_DURATION,
} = {}) {
  if (typeof window === 'undefined' || !title) return;

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: {
        variant,
        title,
        subtitle,
        actionLabel,
        actionHref,
        duration,
      },
    }),
  );
}

export function subscribeStorefrontActionToast(handler) {
  if (typeof window === 'undefined') return () => {};

  const listener = (event) => handler(event.detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

export function showWishlistStorefrontToast(type, t, { href = '/wishlist' } = {}) {
  if (type === 'added') {
    showStorefrontActionToast({
      variant: 'wishlist',
      title: t('product.addedToWishlistToast'),
      subtitle: t('product.addedToWishlistSubtitle'),
      actionLabel: t('product.viewWishlist'),
      actionHref: href,
    });
    return;
  }

  if (type === 'removed') {
    showStorefrontActionToast({
      variant: 'wishlist-removed',
      title: t('product.removedFromWishlistToast'),
    });
    return;
  }

  showStorefrontActionToast({
    variant: 'error',
    title: t('common.wishlistUpdateFailed'),
  });
}
