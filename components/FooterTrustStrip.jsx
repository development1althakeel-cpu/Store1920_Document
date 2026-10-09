'use client';

import { CreditCard, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import { HOME_SECTION_INNER_CLASS } from '@/lib/storefrontCarousel';

export default function FooterTrustStrip() {
  const { t, isArabic } = useStorefrontI18n();

  const items = [
    { icon: ShieldCheck, label: t('category.trust.warranty') },
    { icon: Truck, label: t('category.trust.freeDelivery') },
    { icon: Wallet, label: t('category.trust.cod') },
    { icon: CreditCard, label: t('category.trust.instalments') },
  ];

  return (
    <section
      className="w-full bg-transparent"
      aria-label={t('footer.trustAria')}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className={`${HOME_SECTION_INNER_CLASS} grid grid-cols-2 gap-2 py-3 sm:gap-3 sm:py-4 lg:grid-cols-4`}>
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 sm:min-h-[3.5rem] sm:gap-3 sm:px-4 ${
              isArabic ? 'flex-row-reverse text-right' : 'text-left'
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-500 sm:h-9 sm:w-9">
              <Icon size={16} strokeWidth={1.8} />
            </span>
            <span className="text-sm font-medium leading-snug text-slate-800">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
