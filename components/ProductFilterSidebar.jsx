'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/displayText';
import { getLocalizedCategoryName } from '@/lib/categoryLocalization';
import { getProductSalePrice } from '@/lib/productPriceFilter';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

function isValidCategoryLabel(cat) {
  return Boolean(
    cat
    && String(cat).length < 80
    && !/^[a-f0-9]{24}$/i.test(cat)
    && !/^[0-9a-f]{12,}$/i.test(cat),
  );
}

function formatPriceValue(value, locale = 'en') {
  return `AED ${Number(value || 0).toLocaleString(locale)}`;
}

function DualPriceSlider({
  minBound = 0,
  maxBound = 100000,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  isArabic = false,
}) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const lowRef = useRef(0);
  const highRef = useRef(0);

  const span = Math.max(1, maxBound - minBound);
  const safeMin = Math.min(Math.max(Number(minValue) || 0, minBound), maxBound);
  const safeMax = Math.min(Math.max(Number(maxValue) || maxBound, minBound), maxBound);
  const low = Math.min(safeMin, safeMax);
  const high = Math.max(safeMin, safeMax);
  lowRef.current = low;
  highRef.current = high;

  const left = ((low - minBound) / span) * 100;
  const width = ((high - low) / span) * 100;
  const locale = isArabic ? 'ar-AE' : 'en';
  const step = span > 20000 ? 50 : span > 5000 ? 10 : 1;

  const valueFromClientX = useCallback((clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect?.width) return minBound;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const visualRatio = isArabic ? 1 - ratio : ratio;
    const raw = minBound + visualRatio * span;
    return Math.min(maxBound, Math.max(minBound, Math.round(raw / step) * step));
  }, [isArabic, maxBound, minBound, span, step]);

  const applyDrag = useCallback((clientX, handle) => {
    const value = valueFromClientX(clientX);
    if (handle === 'min') onMinChange(Math.min(value, highRef.current));
    else onMaxChange(Math.max(value, lowRef.current));
  }, [onMinChange, onMaxChange, valueFromClientX]);

  useEffect(() => {
    const onMove = (event) => {
      if (!dragRef.current) return;
      event.preventDefault();
      applyDrag(event.clientX, dragRef.current);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [applyDrag]);

  const startDrag = (event, handle) => {
    event.preventDefault();
    event.stopPropagation();
    const nextHandle = handle || (
      Math.abs(valueFromClientX(event.clientX) - lowRef.current)
      <= Math.abs(valueFromClientX(event.clientX) - highRef.current)
        ? 'min'
        : 'max'
    );
    dragRef.current = nextHandle;
    applyDrag(event.clientX, nextHandle);
  };

  return (
    <div>
      <div
        ref={trackRef}
        className="dual-price-slider relative h-10 cursor-pointer touch-none px-1.5 lg:h-8 lg:px-0.5"
        onPointerDown={(event) => startDrag(event)}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-neutral-300" />
        <div
          className="pointer-events-none absolute top-1/2 h-[3px] -translate-y-1/2 bg-black"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
        <button
          type="button"
          aria-label="Minimum price"
          className="dual-price-thumb absolute top-1/2 z-[3] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full lg:h-4 lg:w-4"
          style={{ left: `${left}%` }}
          onPointerDown={(event) => startDrag(event, 'min')}
        />
        <button
          type="button"
          aria-label="Maximum price"
          className="dual-price-thumb absolute top-1/2 z-[4] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full lg:h-4 lg:w-4"
          style={{ left: `${left + width}%` }}
          onPointerDown={(event) => startDrag(event, 'max')}
        />
      </div>
      <div className={`mt-2 flex items-center justify-between text-xs font-medium text-black ${isArabic ? 'flex-row-reverse' : ''}`}>
        <span>{formatPriceValue(low, locale)}</span>
        <span>{formatPriceValue(high, locale)}</span>
      </div>
    </div>
  );
}

function normalizeAvailableCategory(category) {
  if (!category) return null;
  if (typeof category === 'string') {
    const label = category.trim();
    if (!isValidCategoryLabel(label)) return null;
    return { value: label, label, parentId: '' };
  }

  const slug = String(category.slug || '').trim();
  const name = String(category.name || '').trim();
  const value = slug || name || String(category._id || '').trim();
  if (!value || !isValidCategoryLabel(value)) return null;

  return {
    value,
    label: name || slug || value,
    nameAr: category.nameAr || '',
    parentId: String(category.parentId || '').trim(),
  };
}

export default function ProductFilterSidebar({
  products = [],
  onFilterChange = () => {},
  initialFilters = {},
  availableCategories = [],
  expandCategoryByDefault = false,
  subcategoryLinks = [],
  showCategoryFilter = true,
  showBestSellerFilter = false,
  showFastDeliveryFilter = false,
  bestSellerOnly = false,
  fastDeliveryOnly = false,
  onBestSellerChange = () => {},
  onFastDeliveryChange = () => {},
  hideSort = false,
  showPriceInputs = false,
  expandPriceByDefault = false,
  className = '',
}) {
  const { t, language } = useStorefrontI18n();
  const isArabic = language === 'ar';

  const [filters, setFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    inStock: false,
    ...initialFilters,
  });

  const [expandedSections, setExpandedSections] = useState({
    category: Boolean(expandCategoryByDefault),
    price: Boolean(expandPriceByDefault),
    rating: false,
    availability: false,
  });

  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'popularity');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [categorySearch, setCategorySearch] = useState('');

  const [availableFilters, setAvailableFilters] = useState({
    categories: [],
    maxPrice: 0,
  });
  const [categoryVisibleCount, setCategoryVisibleCount] = useState(6);
  const priceMinTouchedRef = useRef(false);
  const priceMaxTouchedRef = useRef(false);
  const onFilterChangeRef = useRef(onFilterChange);

  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  const localizeCategoryLabel = (name) => decodeHtmlEntities(
    getLocalizedCategoryName({ name }, language),
  );

  useEffect(() => {
    if (!sortOpen) return undefined;

    const handlePointerDown = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSortOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (products && products.length > 0) {
      const categories = new Set();
      let maxPrice = 0;

      products.forEach((product) => {
        if (product.category && isValidCategoryLabel(product.category)) {
          categories.add(product.category);
        }
        if (product.categories && Array.isArray(product.categories)) {
          product.categories.forEach((cat) => {
            if (isValidCategoryLabel(cat)) {
              categories.add(cat);
            }
          });
        }
        const priceValue = getProductSalePrice(product);
        if (priceValue > maxPrice) maxPrice = priceValue;
      });

      const discoveredMax = Math.max(1, Math.ceil(Number(maxPrice) || 0));

      setAvailableFilters((prev) => ({
        categories: Array.from(categories).sort(),
        maxPrice: Math.max(discoveredMax, prev.maxPrice || 0),
      }));
    }
  }, [products]);

  useEffect(() => {
    const bound = Number(availableFilters.maxPrice) || 0;
    if (!bound) return;
    setFilters((prev) => {
      const currentMax = Number(prev.priceRange?.max);
      if (priceMaxTouchedRef.current && Number.isFinite(currentMax) && currentMax <= bound) {
        return prev;
      }
      if (currentMax === bound) return prev;
      return {
        ...prev,
        priceRange: {
          ...prev.priceRange,
          max: bound,
        },
      };
    });
  }, [availableFilters.maxPrice]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const minRaw = filters.priceRange?.min;
      const maxRaw = filters.priceRange?.max;
      const bound = Number(availableFilters.maxPrice) || 0;
      const min = minRaw === '' || minRaw == null ? 0 : Number(minRaw) || 0;
      const max = maxRaw === '' || maxRaw == null
        ? (bound || 0)
        : Number(maxRaw) || 0;

      const nextMin = Math.max(0, bound > 0 ? Math.min(min, bound) : min);
      const nextMax = bound > 0
        ? Math.min(bound, Math.max(nextMin, max || bound))
        : Math.max(nextMin, max);

      const priceMinActive = priceMinTouchedRef.current && nextMin > 0;
      const priceMaxActive = priceMaxTouchedRef.current && (
        bound > 0 ? nextMax < bound : nextMax > 0
      );

      onFilterChangeRef.current({
        ...filters,
        priceRange: {
          min: nextMin,
          max: nextMax,
        },
        priceBound: bound,
        priceMinActive,
        priceMaxActive,
        ...(hideSort ? {} : { sortBy }),
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, sortBy, availableFilters.maxPrice, hideSort]);

  const toggleSection = (section) => {
    setSortOpen(false);
    setExpandedSections((prev) => {
      const nextOpen = !prev[section];
      return {
        category: false,
        price: false,
        rating: false,
        availability: false,
        [section]: nextOpen,
      };
    });
  };

  const handleCheckbox = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((v) => v !== value)
        : [...prev[filterType], value],
    }));
  };

  const handlePriceChange = useCallback((type, value) => {
    const bound = Number(availableFilters.maxPrice) || 0;
    const nextValue = value === '' ? '' : Math.max(0, Number.parseInt(value, 10) || 0);
    if (type === 'min') {
      priceMinTouchedRef.current = nextValue !== '' && Number(nextValue) > 0;
    }
    if (type === 'max') {
      priceMaxTouchedRef.current = nextValue !== '' && (
        bound <= 0 || Number(nextValue) < bound
      );
    }
    setFilters((prev) => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [type]: nextValue,
      },
    }));
  }, [availableFilters.maxPrice]);

  const handleMinPriceChange = useCallback((value) => handlePriceChange('min', value), [handlePriceChange]);
  const handleMaxPriceChange = useCallback((value) => handlePriceChange('max', value), [handlePriceChange]);

  const handlePriceBlur = (type) => {
    setFilters((prev) => {
      const current = prev.priceRange?.[type];
      if (current !== '' && current != null) return prev;

      const fallback = type === 'min' ? 0 : (availableFilters.maxPrice || 100000);
      return {
        ...prev,
        priceRange: {
          ...prev.priceRange,
          [type]: fallback,
        },
      };
    });
  };

  const handleRatingChange = (rating) => {
    setFilters((prev) => ({
      ...prev,
      rating: prev.rating === rating ? 0 : rating,
    }));
  };

  const clearAllFilters = () => {
    priceMinTouchedRef.current = false;
    priceMaxTouchedRef.current = false;
    setFilters({
      categories: [],
      priceRange: { min: 0, max: availableFilters.maxPrice },
      rating: 0,
      inStock: false,
    });
    setSortBy('popularity');
  };

  const hasActiveFilters = () => filters.categories.length > 0
    || filters.rating > 0
    || filters.inStock
    || sortBy !== 'popularity';

  const catalogCategories = (Array.isArray(availableCategories) ? availableCategories : [])
    .map(normalizeAvailableCategory)
    .filter(Boolean);

  const productCategories = availableFilters.categories.map((cat) => (
    { value: cat, label: cat, parentId: '' }
  ));

  const categoryOptions = catalogCategories.length ? catalogCategories : productCategories;

  const filteredCategories = categoryOptions.filter((category) => {
    const query = categorySearch.trim().toLowerCase();
    const isRoot = !category.parentId;
    if (!query) return isRoot || !catalogCategories.length;

    const label = localizeCategoryLabel(category.label).toLowerCase();
    const value = String(category.value || '').toLowerCase();
    const arabic = String(category.nameAr || '').toLowerCase();
    return label.includes(query) || value.includes(query) || arabic.includes(query);
  });

  const visibleCategories = filteredCategories.slice(0, categoryVisibleCount);
  const canShowMore = filteredCategories.length > categoryVisibleCount;

  useEffect(() => {
    setCategoryVisibleCount(6);
  }, [categorySearch]);

  const sortOptions = [
    { value: 'popularity', label: t('category.sort.popularity') },
    { value: 'price-low-high', label: t('category.sort.priceLowHigh') },
    { value: 'price-high-low', label: t('category.sort.priceHighLow') },
    { value: 'newest', label: t('category.sort.newest') },
    { value: 'rating', label: t('category.sort.rating') },
    { value: 'discount', label: t('category.sort.discount') },
  ];

  const activeSortLabel = sortOptions.find((option) => option.value === sortBy)?.label
    || sortOptions[0].label;

  const sectionButtonClass = `flex min-h-11 w-full items-center justify-between gap-3 text-[15px] font-medium leading-none text-gray-900 ${
    isArabic ? 'flex-row-reverse text-right' : 'text-left'
  }`;
  const optionRowClass = `flex min-h-11 items-center gap-3 rounded-lg px-1.5 py-1.5 ${
    isArabic ? 'flex-row-reverse text-right' : 'text-left'
  }`;

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`flex h-fit w-full flex-col overflow-visible bg-white max-lg:border-0 max-lg:shadow-none lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:rounded-lg lg:border lg:border-gray-200 lg:w-72 ${className}`.trim()}
    >
      {hideSort && subcategoryLinks.length === 0 ? null : (
      <div className="shrink-0 border-b border-gray-100 max-lg:px-0 max-lg:pb-3 lg:p-4 lg:pb-3">
        {subcategoryLinks.length > 0 ? (
          <div className="mb-4 border-b border-gray-200 pb-4">
            <h3 className={`mb-3 text-lg font-bold text-gray-900 ${isArabic ? 'text-right' : ''}`}>
              {t('category.filterByType')}
            </h3>
            <nav className="space-y-1">
              {subcategoryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700 ${isArabic ? 'text-right' : ''}`}
                >
                  {decodeHtmlEntities(link.name)}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}

        {hideSort ? null : (
        <div className="relative z-30" ref={sortRef}>
          <label className={`mb-2.5 block text-sm font-semibold text-gray-800 ${isArabic ? 'text-right' : ''}`}>
            {t('category.sortBy')}
          </label>
          <button
            type="button"
            onClick={() => {
              setExpandedSections({
                category: false,
                price: false,
                rating: false,
                availability: false,
              });
              setSortOpen((open) => !open);
            }}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium shadow-sm transition ${
              sortOpen
                ? 'border-orange-400 text-gray-900 ring-2 ring-orange-100'
                : 'border-gray-200 text-gray-800 hover:border-orange-300 hover:bg-orange-50/40'
            } ${isArabic ? 'flex-row-reverse text-right' : 'text-left'}`}
          >
            <span className="min-w-0 truncate">{activeSortLabel}</span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-gray-500 transition-transform duration-200 ${sortOpen ? 'rotate-180 text-orange-600' : ''}`}
            />
          </button>

          <div
            className={`absolute inset-x-0 top-[calc(100%+6px)] origin-top overflow-hidden rounded-xl border border-orange-100 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-[opacity,transform,visibility] duration-200 ease-out ${
              sortOpen
                ? 'visible translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0'
            }`}
            role="listbox"
            aria-label={t('category.sortBy')}
          >
            <ul className="max-h-64 overflow-y-auto py-1.5">
              {sortOptions.map((option) => {
                const active = sortBy === option.value;
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        setSortBy(option.value);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition ${
                        active
                          ? 'bg-orange-50 font-semibold text-orange-700'
                          : 'text-gray-700 hover:bg-slate-50 hover:text-gray-900'
                      } ${isArabic ? 'flex-row-reverse text-right' : 'text-left'}`}
                    >
                      <span className="min-w-0 truncate">{option.label}</span>
                      {active ? <Check size={15} className="shrink-0 text-orange-600" strokeWidth={2.5} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        )}
      </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto max-lg:px-0 max-lg:pt-3 lg:p-4 lg:pt-3">
      <div className={`mb-3 flex min-h-11 items-center justify-between border-b border-gray-200 pb-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
        <h3 className="text-base font-semibold tracking-wide text-gray-900">{t('category.filters')}</h3>
        {hasActiveFilters() ? (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-orange-600 hover:text-orange-700 font-semibold"
          >
            {t('category.clearAll')}
          </button>
        ) : null}
      </div>

      <div className="space-y-1">
        {showCategoryFilter && categoryOptions.length > 0 ? (
          <div className="border-b border-gray-200 py-1">
            <button
              type="button"
              onClick={() => toggleSection('category')}
              className={sectionButtonClass}
            >
              {t('category.category')}
              {expandedSections.category ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {expandedSections.category ? (
              <div className="pb-3">
                <div className="relative mb-3">
                  <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isArabic ? 'right-3' : 'left-3'}`} size={16} />
                  <input
                    type="text"
                    placeholder={t('category.searchCategories')}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className={`w-full py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${isArabic ? 'pr-9 pl-8 text-right' : 'pl-9 pr-8'}`}
                  />
                  {categorySearch ? (
                    <button
                      type="button"
                      onClick={() => setCategorySearch('')}
                      className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isArabic ? 'left-3' : 'right-3'}`}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {visibleCategories.map((category) => (
                    <label
                      key={category.value}
                      className={`${optionRowClass} cursor-pointer hover:bg-orange-50`}
                    >
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(category.value)}
                        onChange={() => handleCheckbox('categories', category.value)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className={`text-sm text-gray-700 ${isArabic ? 'text-right' : ''}`}>
                        {localizeCategoryLabel(category.label)}
                      </span>
                    </label>
                  ))}
                </div>

                {filteredCategories.length > 0 ? (
                  <div className={`mt-2 ${isArabic ? 'text-right' : ''}`}>
                    {canShowMore ? (
                      <button
                        type="button"
                        onClick={() => setCategoryVisibleCount((prev) => prev + 10)}
                        className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                      >
                        {t('category.showMore', { count: filteredCategories.length - visibleCategories.length })}
                      </button>
                    ) : (
                      filteredCategories.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setCategoryVisibleCount(6)}
                          className="text-sm font-semibold text-orange-600 hover:text-orange-700"
                        >
                          {t('category.showLess')}
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="border-b border-gray-200 py-1">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className={sectionButtonClass}
          >
            <span>
              {showPriceInputs ? t('category.priceRange') : t('category.price')}
              {(priceMinTouchedRef.current && Number(filters.priceRange.min) > 0)
                || (priceMaxTouchedRef.current && Number(availableFilters.maxPrice) > 0
                  && Number(filters.priceRange.max) < Number(availableFilters.maxPrice))
                ? ' (1)'
                : ''}
            </span>
            {expandedSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expandedSections.price ? (
            <div className="px-0.5 pb-4 pt-2">
              <DualPriceSlider
                minBound={0}
                maxBound={availableFilters.maxPrice || 100000}
                minValue={filters.priceRange.min === '' || filters.priceRange.min == null ? 0 : filters.priceRange.min}
                maxValue={filters.priceRange.max === '' || filters.priceRange.max == null ? (availableFilters.maxPrice || 100000) : filters.priceRange.max}
                onMinChange={handleMinPriceChange}
                onMaxChange={handleMaxPriceChange}
                isArabic={isArabic}
              />
              {showPriceInputs ? (
                <div className="mt-3 space-y-3">
                  <div className={`flex items-end gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-medium text-gray-500">{t('category.min')}</span>
                      <input
                        type="number"
                        min="0"
                        value={filters.priceRange.min === '' || filters.priceRange.min == null ? '' : filters.priceRange.min}
                        onChange={(event) => handleMinPriceChange(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900"
                      />
                    </label>
                    <span className="pb-2 text-gray-400">-</span>
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-medium text-gray-500">{t('category.max')}</span>
                      <input
                        type="number"
                        min="0"
                        value={filters.priceRange.max === '' || filters.priceRange.max == null ? '' : filters.priceRange.max}
                        onChange={(event) => handleMaxPriceChange(event.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900"
                      />
                    </label>
                  </div>
                  <div className={`flex items-center justify-between gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
                    >
                      {t('category.clearAll')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const bound = Number(availableFilters.maxPrice) || 0;
                        const min = Number(filters.priceRange?.min) || 0;
                        const max = Number(filters.priceRange?.max) || bound;
                        onFilterChangeRef.current({
                          ...filters,
                          priceRange: { min, max },
                          priceBound: bound,
                          priceMinActive: min > 0,
                          priceMaxActive: bound > 0 && max < bound,
                        });
                      }}
                      className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      {t('category.apply')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="border-b border-gray-200 py-1">
          <button
            type="button"
            onClick={() => toggleSection('rating')}
            className={sectionButtonClass}
          >
            {t('category.customerRating')}
            {expandedSections.rating ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.rating ? (
            <div className="space-y-0.5 pb-3">
              {[4, 3, 2, 1].map((rating) => (
                <label
                  key={rating}
                  className={`${optionRowClass} cursor-pointer hover:bg-orange-50`}
                >
                  <input
                    type="radio"
                    name="customer-rating-filter"
                    checked={filters.rating === rating}
                    onChange={() => handleRatingChange(rating)}
                    className="h-4 w-4 shrink-0 border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm leading-none text-gray-700">
                    {t('category.ratingAndAbove', { rating })}
                  </span>
                </label>
              ))}
              <label
                className={`${optionRowClass} cursor-pointer hover:bg-orange-50`}
              >
                <input
                  type="radio"
                  name="customer-rating-filter"
                  checked={filters.rating === 0}
                  onChange={() => handleRatingChange(0)}
                  className="h-4 w-4 shrink-0 border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm leading-none text-gray-700">
                  All ratings
                </span>
              </label>
            </div>
          ) : null}
        </div>

        <div className="py-1">
          <button
            type="button"
            onClick={() => toggleSection('availability')}
            className={sectionButtonClass}
          >
            {t('shop.stock')}
            {expandedSections.availability ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {expandedSections.availability ? (
            <div className="space-y-0.5 pb-2">
              <label className={`${optionRowClass} cursor-pointer hover:bg-orange-50`}>
                <input
                  type="radio"
                  name="stock-filter"
                  checked={!filters.inStock}
                  onChange={() => setFilters((prev) => ({ ...prev, inStock: false }))}
                  className="h-4 w-4 shrink-0 border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm leading-none text-gray-700">
                  All products
                </span>
              </label>
              <label className={`${optionRowClass} cursor-pointer hover:bg-orange-50`}>
                <input
                  type="radio"
                  name="stock-filter"
                  checked={filters.inStock}
                  onChange={(e) => setFilters((prev) => ({ ...prev, inStock: e.target.checked }))}
                  className="h-4 w-4 shrink-0 border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm leading-none text-gray-700">
                  {t('category.inStockOnly')}
                </span>
              </label>
            </div>
          ) : null}
        </div>

        {(showBestSellerFilter || showFastDeliveryFilter) && (
          <div className="border-t border-gray-200 pt-4">
            <p className={`mb-3 font-semibold text-gray-900 ${isArabic ? 'text-right' : ''}`}>
              {t('shop.shopFilters')}
            </p>
            {showBestSellerFilter ? (
              <label className={`mb-2 flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-orange-50 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={bestSellerOnly}
                  onChange={(event) => onBestSellerChange(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">{t('shop.bestSellerOnly')}</span>
              </label>
            ) : null}
            {showFastDeliveryFilter ? (
              <label className={`flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-orange-50 ${isArabic ? 'flex-row-reverse' : ''}`}>
                <input
                  type="checkbox"
                  checked={fastDeliveryOnly}
                  onChange={(event) => onFastDeliveryChange(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">{t('shop.fastDeliveryOnly')}</span>
              </label>
            ) : null}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
