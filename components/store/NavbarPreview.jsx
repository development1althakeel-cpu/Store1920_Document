'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Heart, Menu, Search, ShoppingCart, Package, User } from 'lucide-react';
import OffersNavLabel from '@/components/OffersNavLabel';
import { buildParentCategoryNavMenuItems } from '@/lib/categoryNavigation';
import { STORE1920_LOGO_PATH } from '@/lib/brandLogo';
import {
  DEFAULT_OFFERS_NAV_LABEL,
  DEFAULT_OFFERS_NAV_STYLE,
  expandOffersNavShortcodes,
  getOffersNavButtonAppearance,
  normalizeNavGifUrl,
  normalizeOffersNavStyle,
  splitOffersNavLabel,
} from '@/lib/offersPageSettings';
import { getNavbarArrangeItems, getNavbarCategoriesButtonAppearance, getNavbarCategoriesButtonLabel, getNavbarSearchAppearance, visibleNavbarExtraButtons } from '@/lib/navbarLayoutSettings';

const DEFAULT_BG = '#9f4b1d';
const NAVBAR_MAX_WIDTH_LIMIT = 1400;

function getContrastColor(hexColor) {
  const hex = String(hexColor || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.65 ? '#111827' : '#ffffff';
}

export default function NavbarPreview({
  backgroundColor = DEFAULT_BG,
  logoUrl = '',
  logoWidth = 120,
  logoHeight = 40,
  navMenuEnabled = true,
  navMenuItems = [],
  navMenuUseParentCategories = false,
  categoryOptions = [],
  navActionsVisibility = { orders: true, wishlist: true, cart: true },
  searchPlaceholder = 'Search products...',
  dealsLabel = '',
  extraButtons = [],
  searchMaxWidth = 600,
  searchStyle,
  navbarMaxWidth = 1400,
  showCategoriesButton = true,
  categoriesButtonLabel = '',
  categoriesButtonStyle,
  itemOrder,
  itemGap = 12,
  mobileItemGap = 4,
  device = 'desktop',
  showMenuBar = true,
}) {
  const bg = backgroundColor || DEFAULT_BG;
  const textColor = getContrastColor(bg);
  const searchAccentColor = bg || '#0f172a';
  const menuItems = useMemo(() => {
    const items = navMenuUseParentCategories
      ? buildParentCategoryNavMenuItems(categoryOptions)
      : (navMenuItems || []);
    return items.filter((item) => String(item?.name || '').trim());
  }, [navMenuUseParentCategories, categoryOptions, navMenuItems]);
  const resolvedLogoUrl = String(logoUrl || '').trim() || STORE1920_LOGO_PATH;
  const logoW = Number(logoWidth) > 0 ? Number(logoWidth) : 120;
  const logoH = Number(logoHeight) > 0 ? Number(logoHeight) : 40;
  const [offersNav, setOffersNav] = useState({
    label: String(dealsLabel || '').trim(),
    gifUrl: '',
    style: DEFAULT_OFFERS_NAV_STYLE,
  });

  useEffect(() => {
    if (dealsLabel) {
      setOffersNav((prev) => ({ ...prev, label: String(dealsLabel).trim() }));
    }
  }, [dealsLabel]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadOffersNav = async () => {
      try {
        const response = await fetch(`/api/store/appearance/sections/public?t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        const label = expandOffersNavShortcodes(
          String(data?.offersPage?.navLabel || DEFAULT_OFFERS_NAV_LABEL).trim() || DEFAULT_OFFERS_NAV_LABEL
        );
        if (!active) return;
        setOffersNav({
          label: dealsLabel || label,
          gifUrl: normalizeNavGifUrl(data?.offersPage?.navGifUrl),
          style: normalizeOffersNavStyle(data?.offersPage?.navStyle),
        });
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    };

    loadOffersNav();
    return () => {
      active = false;
      controller.abort();
    };
  }, [dealsLabel]);

  const resolvedDealsLabel = offersNav.label || DEFAULT_OFFERS_NAV_LABEL;
  const dealsAppearance = getOffersNavButtonAppearance(offersNav.style || DEFAULT_OFFERS_NAV_STYLE, 'desktop');
  const categoriesAppearance = getNavbarCategoriesButtonAppearance({ categoriesButtonStyle }, 'desktop');
  const desktopSearchAppearance = getNavbarSearchAppearance({ searchStyle }, 'desktop');
  const mobileSearchAppearance = getNavbarSearchAppearance({ searchStyle }, 'mobile');
  const dealsParts = splitOffersNavLabel(resolvedDealsLabel);
  const previewExtraButtons = visibleNavbarExtraButtons(extraButtons, 'en');
  const previewLayout = {
    extraButtons,
    showCategoriesButton,
    categoriesButtonLabel,
    categoriesButtonStyle,
    itemOrder,
  };
  const previewItems = getNavbarArrangeItems(previewLayout, navActionsVisibility);
  const resolvedNavbarMaxWidth = Math.min(NAVBAR_MAX_WIDTH_LIMIT, Number(navbarMaxWidth) || NAVBAR_MAX_WIDTH_LIMIT);

  const renderPreviewAction = (Icon, label, badge) => (
    <span className="relative inline-flex shrink-0 items-center gap-2 px-1 py-1 text-white transition">
      <span className="relative inline-flex shrink-0 items-center justify-center">
        <Icon size={22} strokeWidth={1.5} />
        {badge ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap text-[14px] font-normal leading-none">{label}</span>
    </span>
  );

  const renderPreviewItem = (itemId) => {
    if (itemId === 'logo') {
      return (
        <img
          src={resolvedLogoUrl}
          alt="Store logo"
          width={logoW}
          height={logoH}
          className="h-auto w-auto max-w-[88px] shrink-0 object-contain xl:max-w-[180px]"
          style={{ maxHeight: '50px' }}
        />
      );
    }
    if (itemId === 'deals') {
      return (
        <span
          className={`navbar-deals-btn inline-flex shrink-0 items-center font-extrabold leading-none tracking-[0.04em] ${dealsAppearance.animationClass || ''}`}
          data-font={dealsAppearance.fontId || 'inherit'}
          style={dealsAppearance.style}
        >
          <span className="flex items-center leading-[1.05]">
            <OffersNavLabel
              label={resolvedDealsLabel}
              gifUrl={offersNav.gifUrl}
              shineClass={dealsAppearance.useShine ? 'navbar-deals-text-shine' : ''}
              gifSize={18}
              top={dealsParts.top}
              bottom={dealsParts.bottom}
            />
          </span>
        </span>
      );
    }
    if (itemId === 'categories') {
      return (
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 font-medium leading-none ${categoriesAppearance.animationClass || ''}`}
          data-font={categoriesAppearance.fontId || 'inherit'}
          style={{
            ...categoriesAppearance.style,
            minHeight: 44,
            height: 44,
          }}
        >
          <span>{getNavbarCategoriesButtonLabel({ categoriesButtonLabel }, 'en', 'Categories')}</span>
          <ChevronDown
            size={categoriesAppearance.chevronSize || 13}
            strokeWidth={2.4}
            className="shrink-0"
            style={{ color: categoriesAppearance.textColor || 'currentColor' }}
            aria-hidden="true"
          />
        </span>
      );
    }
    if (itemId === 'search') {
      return (
        <div className="min-w-0 w-full">
          <div className="w-full" style={{ maxWidth: Number(searchMaxWidth) || 600 }}>
            <div
              className="flex h-[44px] w-full min-w-0 items-center overflow-hidden px-2 shadow-sm xl:px-3"
              data-font={desktopSearchAppearance.fontId || 'inherit'}
              style={desktopSearchAppearance.boxStyle}
            >
              <span
                className="min-w-0 flex-1 truncate leading-none opacity-70"
                style={desktopSearchAppearance.inputStyle}
              >
                {searchPlaceholder}
              </span>
              <span
                className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ color: desktopSearchAppearance.textColor || searchAccentColor }}
              >
                <Search size={15} />
              </span>
            </div>
          </div>
        </div>
      );
    }
    if (itemId === 'account') {
      return (
        <span className="inline-flex max-w-[148px] items-center gap-2 rounded-md px-1 py-1 text-left text-white xl:max-w-[168px] xl:gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <User size={22} strokeWidth={1.85} />
          </span>
          <span className="flex min-w-0 flex-col leading-[1.15]">
            <span className="truncate text-[13px] font-bold leading-none text-white xl:text-[14px]">
              Sign In / Register
            </span>
            <span className="mt-1 truncate text-[11px] font-normal leading-none text-white/85">
              Orders &amp; Account
            </span>
          </span>
        </span>
      );
    }
    if (itemId === 'orders') return renderPreviewAction(Package, 'Orders');
    if (itemId === 'wishlist') return renderPreviewAction(Heart, 'Wishlist', '1');
    if (itemId === 'cart') return renderPreviewAction(ShoppingCart, 'Cart', '2');

    const extraButton = previewExtraButtons.find((button) => button.id === itemId);
    if (!extraButton) return null;
    const extraAppearance = getOffersNavButtonAppearance(extraButton.style, 'desktop');
    return (
      <span
        className={`inline-flex shrink-0 items-center leading-none tracking-[0.04em] ${extraAppearance.animationClass || ''}`}
        data-font={extraAppearance.fontId || 'inherit'}
        style={extraAppearance.style}
      >
        {extraButton.displayLabel}
      </span>
    );
  };

  if (device === 'mobile') {
    const iconClass = textColor === '#111827' ? 'text-gray-900' : 'text-white/95';
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-[390px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
          <div className="flex items-center justify-center bg-slate-200/80 py-1.5">
            <span className="h-1 w-16 rounded-full bg-slate-400/70" />
          </div>
          <nav
            className="border-b shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            style={{
              backgroundColor: bg,
              borderColor: 'rgba(15, 23, 42, 0.12)',
            }}
          >
            <div
              className="flex min-w-0 items-center overflow-visible px-2 py-2"
              style={{ gap: `${Number(mobileItemGap) || 0}px` }}
            >
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
                <Menu size={20} />
              </span>
              <img
                src={resolvedLogoUrl}
                alt="Store logo"
                width={logoW}
                height={logoH}
                className="h-7 w-auto max-w-[72px] shrink-0 object-contain"
                style={{ maxHeight: '32px' }}
              />
              <div className="relative min-w-0 flex-1">
                <div
                  className="relative flex h-9 min-w-0 items-center overflow-hidden pl-2.5 pr-1 shadow-[0_2px_10px_rgba(15,23,42,0.12)]"
                  data-font={mobileSearchAppearance.fontId || 'inherit'}
                  style={mobileSearchAppearance.boxStyle}
                >
                  <span
                    className="min-w-0 flex-1 truncate opacity-70"
                    style={mobileSearchAppearance.inputStyle}
                  >
                    {searchPlaceholder}
                  </span>
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: searchAccentColor }}
                  >
                    <Search size={14} strokeWidth={2.5} />
                  </span>
                </div>
              </div>
              {navActionsVisibility.wishlist !== false ? (
                <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center ${iconClass}`}>
                  <Heart size={20} strokeWidth={1.6} />
                  <span className="absolute right-0.5 top-0.5 inline-flex min-h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                    1
                  </span>
                </span>
              ) : null}
            </div>
          </nav>
          <div className="h-16 bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto rounded-xl border border-slate-200/80 shadow-sm">
      <div className="min-w-[1100px]">
        <div
          className="overflow-visible border-b text-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          style={{
            backgroundColor: bg,
            borderColor: 'rgba(15, 23, 42, 0.18)',
            color: textColor,
          }}
        >
          <div className="mx-auto w-full px-4 sm:px-6" style={{ maxWidth: resolvedNavbarMaxWidth }}>
            <div
              className="flex min-w-0 items-center py-2.5"
              style={{ gap: `${Number(itemGap) || 0}px` }}
            >
              {previewItems.map((item) => {
                const node = renderPreviewItem(item.id);
                if (!node) return null;
                return (
                  <div
                    key={item.id}
                    className={item.id === 'search' ? 'min-w-0 flex-1 basis-0' : 'shrink-0'}
                  >
                    {node}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {showMenuBar ? (
          navMenuEnabled && menuItems.length > 0 ? (
            <div
              className="relative w-full"
              style={{
                backgroundColor: bg,
                boxShadow: `inset 0 1px 0 ${textColor === '#111827' ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.14)'}`,
              }}
            >
              <div className="mx-auto w-full overflow-hidden px-4 sm:px-6" style={{ maxWidth: resolvedNavbarMaxWidth }}>
                <div className="relative flex items-center whitespace-nowrap py-2">
                  {menuItems.map((item, index) => (
                    <span key={`${item.name}-${index}`} className="inline-flex items-center">
                      {index > 0 ? (
                        <span className="select-none px-2 text-xs opacity-40" style={{ color: textColor }}>|</span>
                      ) : null}
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold uppercase tracking-wide"
                        style={{ color: textColor }}
                      >
                        {item.icon ? (
                          <img src={item.icon} alt="" className="h-4 w-4 object-contain" />
                        ) : null}
                        <span>{item.name}</span>
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : navMenuEnabled ? (
            <div
              className="border-t px-4 py-2 text-xs text-white/70 sm:px-6"
              style={{ backgroundColor: bg, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              Add menu items to show navigation links
            </div>
          ) : (
            <div
              className="border-t px-4 py-2 text-xs text-white/70 sm:px-6"
              style={{ backgroundColor: bg, borderColor: 'rgba(255,255,255,0.14)' }}
            >
              Desktop menu disabled
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
