'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Filter, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import ProductFilterSidebar from '@/components/ProductFilterSidebar';
import MobileFilterHost from '@/components/MobileFilterHost';
import { decodeHtmlEntities } from '@/lib/displayText';
import { PRODUCT_CARD_GRID_CLASS_5 } from '@/lib/storefrontCarousel';
import { productMatchesPriceRange } from '@/lib/productPriceFilter';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';

const CATEGORY_PRODUCTS_PAGE_SIZE = 100;
function applyProductFilters(products, activeFilters) {
  return products.filter((product) => {
    if (activeFilters.categories.length > 0) {
      const productCategories = [
        product.category,
        ...(Array.isArray(product.categories) ? product.categories : []),
      ].filter(Boolean);

      const hasMatchingCategory = productCategories.some((cat) =>
        activeFilters.categories.includes(cat)
      );
      if (!hasMatchingCategory) return false;
    }

    if (!productMatchesPriceRange(product, activeFilters)) {
      return false;
    }

    if (activeFilters.rating > 0) {
      const avgRating = product.averageRating || 0;
      if (avgRating < activeFilters.rating) return false;
    }

    if (activeFilters.inStock && product.inStock === false) {
      return false;
    }

    return true;
  });
}

function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low-high':
      return sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case 'price-high-low':
      return sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case 'rating':
      return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    case 'discount':
      return sorted.sort((a, b) => {
        const discountA = a.AED > a.price ? ((a.AED - a.price) / a.AED) * 100 : 0;
        const discountB = b.AED > b.price ? ((b.AED - b.price) / b.AED) * 100 : 0;
        return discountB - discountA;
      });
    case 'popularity':
      return sorted.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
    case 'newest':
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
  }
}

export default function CategoryProductsPanel({
  categoryId = '',
  products = [],
  subcategoryLinks = [],
  showSubcategoryLinks = false,
  totalCount = 0,
}) {
  const { t, language } = useStorefrontI18n();
  const isArabic = language === 'ar';
  const [pageProducts, setPageProducts] = useState(products);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(Number(totalCount) || products.length);
  const [loadingPage, setLoadingPage] = useState(false);
  const [loadError, setLoadError] = useState('');
  const gridTopRef = useRef(null);
  const [activeFilters, setActiveFilters] = useState({
    categories: [],
    priceRange: { min: 0, max: 100000 },
    rating: 0,
    inStock: false,
    sortBy: 'rating',
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setPageProducts(products);
    setPage(1);
    setTotal(Number(totalCount) || products.length);
    setLoadError('');
  }, [categoryId, products, totalCount]);

  const totalPages = Math.max(1, Math.ceil((total || pageProducts.length) / CATEGORY_PRODUCTS_PAGE_SIZE));

  const goToPage = useCallback(async (nextPage, { force = false } = {}) => {
    const safePage = Math.max(1, Math.min(nextPage, totalPages));
    if (!categoryId || loadingPage) return;
    if (!force && safePage === page) return;

    if (safePage === 1 && products.length) {
      setPageProducts(products);
      setPage(1);
      gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setLoadingPage(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        categoryId,
        page: String(safePage),
        limit: String(CATEGORY_PRODUCTS_PAGE_SIZE),
      });
      const res = await fetch(`/api/public/category-products?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load products');
      }
      setPageProducts(Array.isArray(data.products) ? data.products : []);
      setPage(Number(data.page) || safePage);
      if (Number.isFinite(Number(data.total))) {
        setTotal(Number(data.total));
      }
      gridTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      setLoadError(error?.message || 'Failed to load products');
    } finally {
      setLoadingPage(false);
    }
  }, [categoryId, loadingPage, page, products, totalPages]);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters((prev) => ({
      ...prev,
      ...filters,
      sortBy: filters.sortBy || prev.sortBy,
    }));
  }, []);

  const sortOptions = [
    { value: 'rating', label: t('category.sort.rating') },
    { value: 'popularity', label: t('category.sort.popularity') },
    { value: 'newest', label: t('category.sort.newest') },
    { value: 'price-low-high', label: t('category.sort.priceLowHigh') },
    { value: 'price-high-low', label: t('category.sort.priceHighLow') },
    { value: 'discount', label: t('category.sort.discount') },
  ];

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = applyProductFilters(pageProducts, activeFilters);
    return sortProducts(filtered, activeFilters.sortBy);
  }, [pageProducts, activeFilters]);

  const hasActiveFilters =
    activeFilters.categories.length > 0 ||
    activeFilters.rating > 0 ||
    activeFilters.inStock ||
    activeFilters.sortBy !== 'rating' ||
    activeFilters.priceMinActive ||
    activeFilters.priceMaxActive;

  const clearFilters = () => {
    setActiveFilters({
      categories: [],
      priceRange: { min: 0, max: 100000 },
      rating: 0,
      inStock: false,
      sortBy: 'rating',
    });
  };

  const showingFrom = total > 0 ? ((page - 1) * CATEGORY_PRODUCTS_PAGE_SIZE) + 1 : 0;
  const showingTo = total > 0 ? Math.min(page * CATEGORY_PRODUCTS_PAGE_SIZE, total) : 0;

  const sidebarProps = {
    products: pageProducts,
    onFilterChange: handleFilterChange,
    initialFilters: activeFilters,
    subcategoryLinks: [],
    showCategoryFilter: true,
    hideSort: true,
    showPriceInputs: true,
    expandPriceByDefault: true,
    expandCategoryByDefault: true,
  };

  const productsGrid =
    filteredAndSortedProducts.length > 0 ? (
      <div className={PRODUCT_CARD_GRID_CLASS_5}>
        {filteredAndSortedProducts.map((product) => (
          <ProductCard key={String(product._id || product.slug)} product={product} />
        ))}
      </div>
    ) : (
      <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
        <p className="text-lg text-gray-500">{t('category.noMatch')}</p>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 rounded-lg bg-orange-500 px-6 py-2 text-white transition hover:bg-orange-600"
          >
            {t('category.clearFilters')}
          </button>
        ) : null}
      </div>
    );

  return (
    <>
      <div className={`mb-4 flex items-center justify-between lg:hidden ${isArabic ? 'flex-row-reverse' : ''}`}>
        <p className="text-sm text-gray-600">
          {t('category.ofProducts', {
            shown: `${showingFrom.toLocaleString(isArabic ? 'ar-AE' : 'en')}-${showingTo.toLocaleString(isArabic ? 'ar-AE' : 'en')}`,
            total: (total || pageProducts.length).toLocaleString(isArabic ? 'ar-AE' : 'en'),
          })}
        </p>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className={`flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${isArabic ? 'flex-row-reverse' : ''}`}
        >
          <Filter size={16} />
          {t('category.filters')}
        </button>
      </div>

      <div className="flex items-start gap-6">
        <MobileFilterHost
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        >
          <ProductFilterSidebar {...sidebarProps} />
        </MobileFilterHost>

        <div className="min-w-0 flex-1">
          {showSubcategoryLinks && subcategoryLinks.length > 0 ? (
            <section className="mb-6" aria-label={t('category.shopBySubcategories')}>
              <h2 className={`mb-4 text-lg font-semibold text-gray-900 ${isArabic ? 'text-right' : ''}`}>
                {t('category.shopBySubcategories')}
              </h2>
              <div className={`flex gap-4 overflow-x-auto pb-1 ${isArabic ? 'flex-row-reverse' : ''}`}>
                {subcategoryLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex w-[5.5rem] shrink-0 flex-col items-center gap-2 sm:w-24"
                  >
                    <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white sm:h-[4.5rem] sm:w-[4.5rem]">
                      {link.image ? (
                        <img
                          src={link.image}
                          alt=""
                          className="m-0 h-full w-full object-cover p-0"
                        />
                      ) : (
                        <span className="px-1 text-center text-[10px] font-medium leading-tight text-gray-500">
                          {decodeHtmlEntities(link.name)}
                        </span>
                      )}
                    </span>
                    <span className="line-clamp-2 text-center text-xs font-medium text-gray-800">
                      {decodeHtmlEntities(link.name)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className={`mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${isArabic ? 'sm:flex-row-reverse' : ''}`}>
            <h2 className={`text-base text-gray-700 ${isArabic ? 'text-right' : ''}`}>
              {t('category.showingResultsFor')}{' '}
              <span className="font-semibold text-orange-600">
                {t('category.productCount', {
                  count: (filteredAndSortedProducts.length || total || 0).toLocaleString(isArabic ? 'ar-AE' : 'en'),
                })}
              </span>
            </h2>
            <label className={`flex items-center gap-2 text-sm text-gray-600 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <span className="shrink-0 font-medium">{t('category.sortBy')}</span>
              <span className="relative">
                <select
                  value={activeFilters.sortBy || 'newest'}
                  onChange={(event) => setActiveFilters((prev) => ({ ...prev, sortBy: event.target.value }))}
                  className={`min-h-10 appearance-none rounded-lg border border-gray-300 bg-white py-2 text-sm font-medium text-gray-800 ${isArabic ? 'pl-8 pr-3' : 'pl-3 pr-8'}`}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500 ${isArabic ? 'left-2' : 'right-2'}`} />
              </span>
            </label>
          </div>

          <div ref={gridTopRef} />
          {loadingPage ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t('category.loadingMore')}
            </div>
          ) : (
            productsGrid
          )}
          {loadError ? (
            <div className="mt-4 text-center">
              <p className="text-sm text-red-600">{loadError}</p>
              <button
                type="button"
                onClick={() => void goToPage(page, { force: true })}
                className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                {t('category.loadingMore')}
              </button>
            </div>
          ) : null}
          {totalPages > 1 ? (
            <div className={`mt-8 flex flex-wrap items-center justify-center gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => void goToPage(page - 1)}
                disabled={page <= 1 || loadingPage}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('shop.previous')}
              </button>
              <span className="px-3 text-sm text-gray-600">
                {t('shop.pageOf', { page, total: totalPages })}
              </span>
              <button
                type="button"
                onClick={() => void goToPage(page + 1)}
                disabled={page >= totalPages || loadingPage}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('shop.next')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}
