'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

export default function MobileFilterHost({
  open = false,
  onClose = () => {},
  children,
}) {
  const { t, language } = useStorefrontI18n();
  const isArabic = language === 'ar';

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      className={
        open
          ? 'fixed inset-0 z-[60] flex items-end justify-center md:items-center lg:static lg:z-auto lg:block'
          : 'hidden lg:block'
      }
    >
      {open ? (
        <button
          type="button"
          className="absolute inset-0 bg-black/40 lg:hidden"
          aria-label={t('category.closeFilters')}
          onClick={onClose}
        />
      ) : null}

      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`relative z-10 flex w-full max-h-[min(92dvh,40rem)] flex-col bg-white shadow-[0_-8px_32px_rgba(15,23,42,0.16)] max-lg:rounded-t-2xl md:max-h-[min(85dvh,44rem)] md:w-[min(26rem,92vw)] md:rounded-2xl md:shadow-xl lg:max-h-none lg:w-72 lg:rounded-lg lg:shadow-none ${
          isArabic ? 'text-right' : 'text-left'
        }`}
      >
        <div className="flex justify-center pt-2 lg:hidden md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-200" aria-hidden="true" />
        </div>
        <div className={`flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 lg:hidden ${isArabic ? 'flex-row-reverse' : ''}`}>
          <h2 className="text-base font-semibold text-gray-900">{t('category.filtersAndSort')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label={t('category.closeFilters')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 lg:overflow-visible lg:p-0">
          {children}
        </div>
        <div className="border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#000000] py-3 text-sm font-semibold text-white hover:bg-[#111111]"
          >
            {language === 'ar' ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
