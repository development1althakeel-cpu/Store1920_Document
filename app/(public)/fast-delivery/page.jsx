'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import PageTitle from '@/components/PageTitle';
import Loading from '@/components/Loading';
import FastDeliveryPageHeader from '@/components/FastDeliveryPageHeader';
import ProductCard from '@/components/ProductCard';
import ProductFilterSidebar from '@/components/ProductFilterSidebar';
import MobileFilterHost from '@/components/MobileFilterHost';
import { DEFAULT_FAST_DELIVERY_PAGE, normalizeFastDeliveryPage } from '@/lib/fastDeliveryPageSettings';
import { productMatchesPriceRange } from '@/lib/productPriceFilter';
import { PRODUCT_CARD_GRID_CLASS_5 } from '@/lib/storefrontCarousel';
import { Truck, Zap, SlidersHorizontal } from 'lucide-react';

function mergeUniqueProducts(...lists) {
  const seen = new Set();
  const merged = [];
  lists.flat().forEach((product) => {
    const id = String(product?._id || product?.id || product?.sku || product?.slug || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    merged.push(product);
  });
  return merged;
}

export default function FastDeliveryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSettings, setPageSettings] = useState(DEFAULT_FAST_DELIVERY_PAGE);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [priceFilters, setPriceFilters] = useState({
    priceRange: { min: 0, max: 0 },
    priceBound: 0,
    priceMinActive: false,
    priceMaxActive: false,
  });

  const visibleProducts = useMemo(
    () => products.filter((product) => {
      if (Number(minRating) > 0 && Number(product?.averageRating || 0) < Number(minRating)) {
        return false;
      }
      return productMatchesPriceRange(product, priceFilters);
    }),
    [products, minRating, priceFilters],
  );

  const handleFilterChange = (filters) => {
    setMinRating(filters.rating || 0);
    setPriceFilters({
      priceRange: filters.priceRange || { min: 0, max: 0 },
      priceBound: filters.priceBound || 0,
      priceMinActive: Boolean(filters.priceMinActive),
      priceMaxActive: Boolean(filters.priceMaxActive),
    });
  };

  useEffect(() => {
    fetchFastDeliveryData();
  }, []);

  const fetchFastDeliveryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fastRes, topRes] = await Promise.all([
        axios.get('/api/products', {
          params: { fastDelivery: true, all: true, slim: false, inStockOnly: true },
        }),
        axios.get('/api/products', {
          params: { bestSeller: true, all: true, slim: false, inStockOnly: true },
        }).catch(() => ({ data: { products: [] } })),
      ]);

      const merged = mergeUniqueProducts(
        fastRes.data?.products || [],
        topRes.data?.products || [],
      );
      setProducts(merged);

      try {
        const settingsRes = await axios.get('/api/store/appearance/sections/public', {
          headers: { 'Cache-Control': 'no-cache' },
        });
        setPageSettings(normalizeFastDeliveryPage({
          ...DEFAULT_FAST_DELIVERY_PAGE,
          ...(settingsRes.data?.fastDeliveryPage || {}),
        }));
      } catch (_) {
        setPageSettings(DEFAULT_FAST_DELIVERY_PAGE);
      }
    } catch (fetchError) {
      console.error('Error fetching fast delivery products:', fetchError);
      setError('Failed to load fast delivery products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <PageTitle title={pageSettings.headerTitle || 'Fast Delivery & Top Sellers'} />
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef7f5_42%,#ffffff_100%)] -mt-12">
        <FastDeliveryPageHeader
          settings={{
            ...pageSettings,
            headerTitle: pageSettings.headerTitle || 'Fast Delivery',
            headerSubtitle: pageSettings.headerSubtitle
              || 'Express shipping picks and top sellers.',
          }}
        />

        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-12">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mb-4 text-lg text-red-500">{error}</div>
              <button
                type="button"
                onClick={fetchFastDeliveryData}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Try Again
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div
              className="rounded-2xl px-6 py-16 text-center"
              style={{ backgroundColor: pageSettings.emptyStateBgColor }}
            >
              <Truck size={72} className="mx-auto mb-6 text-slate-300" />
              <h2 className="mb-3 text-2xl font-bold text-slate-800">
                {pageSettings.emptyStateTitle}
              </h2>
              <p className="mb-6 text-slate-600">{pageSettings.emptyStateMessage}</p>
              <Link
                href="/shop"
                className="inline-block rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800"
              >
                Browse All Products
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-teal-200/70 bg-white/80 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
                    <Zap size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      Fast selling & express delivery
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      All top sellers and fast-delivery products in one place —
                      {' '}
                      <span className="font-semibold text-teal-800">{visibleProducts.length}</span>
                      {' '}
                      picks in one place.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold shadow-sm"
                >
                  <SlidersHorizontal size={16} />
                  Filters & Sort
                </button>
              </div>
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
                <MobileFilterHost
                  open={mobileFiltersOpen}
                  onClose={() => setMobileFiltersOpen(false)}
                >
                  <ProductFilterSidebar
                    products={products}
                    onFilterChange={handleFilterChange}
                    initialFilters={{ rating: minRating, sortBy: 'newest', inStock: true }}
                  />
                </MobileFilterHost>
                <div className={PRODUCT_CARD_GRID_CLASS_5}>
                  {visibleProducts.map((product, index) => (
                    <ProductCard
                      key={product._id || product.id || product.slug}
                      product={product}
                      priorityImages={index < 6}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
