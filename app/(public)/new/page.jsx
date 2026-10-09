'use client'

import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import axios from 'axios'
import ProductCard from '@/components/ProductCard'
import ProductFilterSidebar from '@/components/ProductFilterSidebar'
import { PRODUCT_CARD_GRID_CLASS_5 } from '@/lib/storefrontCarousel'

const NEW_ARRIVALS_LIMIT = 50
const PAGE_SIZE = 25

const DEFAULT_FILTERS = {
  categories: [],
  priceRange: { min: 0, max: 100000 },
  rating: 0,
  inStock: false,
  sortBy: 'newest',
}

function NewArrivalsGridSkeleton({ count = PAGE_SIZE }) {
  return (
    <div className={PRODUCT_CARD_GRID_CLASS_5}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="aspect-[3/4] animate-pulse rounded-lg border border-gray-200 bg-white"
        />
      ))}
    </div>
  )
}

export default function NewProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [activeFilters, setActiveFilters] = useState(DEFAULT_FILTERS)
  const sentinelRef = useRef(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const loadLatestProducts = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const params = new URLSearchParams({
          sortBy: 'newest',
          limit: String(NEW_ARRIVALS_LIMIT),
          slim: 'true',
          includeOutOfStock: 'true',
        })
        const { data } = await axios.get(`/api/products?${params.toString()}`)
        const list = Array.isArray(data?.products)
          ? data.products
          : (Array.isArray(data) ? data : [])

        if (!cancelled) {
          setProducts(list.slice(0, NEW_ARRIVALS_LIMIT))
        }
      } catch (error) {
        if (!cancelled) {
          setProducts([])
          setLoadError(error?.response?.data?.error || 'Failed to load new arrivals')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLatestProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const newProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0)
      const dateB = new Date(b.createdAt || 0)
      return dateB - dateA
    })
  }, [products])

  const applyFilters = useCallback((productsToFilter) => {
    return productsToFilter.filter((product) => {
      if (activeFilters.categories.length > 0) {
        const productCategories = [
          product.category,
          ...(Array.isArray(product.categories) ? product.categories : []),
        ].filter(Boolean)

        const hasMatchingCategory = productCategories.some((cat) =>
          activeFilters.categories.includes(cat),
        )
        if (!hasMatchingCategory) return false
      }

      if (product.price < activeFilters.priceRange.min || product.price > activeFilters.priceRange.max) {
        return false
      }

      if (activeFilters.rating > 0) {
        const avgRating = product.averageRating || 0
        if (avgRating < activeFilters.rating) return false
      }

      if (activeFilters.inStock && product.inStock === false) {
        return false
      }

      return true
    })
  }, [activeFilters])

  const sortProducts = useCallback((productsToSort) => {
    const sorted = [...productsToSort]

    switch (activeFilters.sortBy) {
      case 'price-low-high':
        return sorted.sort((a, b) => a.price - b.price)
      case 'price-high-low':
        return sorted.sort((a, b) => b.price - a.price)
      case 'rating':
        return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
      case 'discount':
        return sorted.sort((a, b) => {
          const discountA = a.AED > a.price ? ((a.AED - a.price) / a.AED * 100) : 0
          const discountB = b.AED > b.price ? ((b.AED - b.price) / b.AED * 100) : 0
          return discountB - discountA
        })
      case 'newest':
      default:
        return sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0)
          const dateB = new Date(b.createdAt || 0)
          return dateB - dateA
        })
    }
  }, [activeFilters.sortBy])

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = applyFilters(newProducts)
    return sortProducts(filtered).slice(0, NEW_ARRIVALS_LIMIT)
  }, [newProducts, applyFilters, sortProducts])

  const totalProducts = filteredAndSortedProducts.length
  const safeVisibleCount = Math.min(visibleCount, totalProducts)
  const visibleProducts = useMemo(
    () => filteredAndSortedProducts.slice(0, safeVisibleCount || PAGE_SIZE),
    [filteredAndSortedProducts, safeVisibleCount]
  )
  const hasMore = safeVisibleCount < totalProducts

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [activeFilters])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || loading || !hasMore) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || loadingMoreRef.current) return
        loadingMoreRef.current = true
        setVisibleCount((current) => current + PAGE_SIZE)
        window.setTimeout(() => {
          loadingMoreRef.current = false
        }, 80)
      },
      { root: null, rootMargin: '400px 0px', threshold: 0 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [loading, hasMore, safeVisibleCount])

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">New Arrivals</h1>
          <p className="text-gray-600">
            Check out our latest products just added to the store
          </p>
        </div>

        <div className="flex gap-6">
          <div className="hidden flex-shrink-0 lg:block">
            <ProductFilterSidebar
              products={newProducts}
              onFilterChange={handleFilterChange}
              initialFilters={activeFilters}
            />
          </div>

          <div className="flex-1">
            {loading ? (
              <NewArrivalsGridSkeleton />
            ) : loadError ? (
              <div className="rounded-lg border border-red-200 bg-white py-16 text-center">
                <p className="text-lg text-red-600">{loadError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg bg-[#000000] px-6 py-2 text-white transition hover:bg-[#111111]"
                >
                  Retry
                </button>
              </div>
            ) : totalProducts === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
                <p className="text-lg text-gray-500">No products match your filters.</p>
                <button
                  type="button"
                  onClick={() => setActiveFilters(DEFAULT_FILTERS)}
                  className="mt-4 rounded-lg bg-[#000000] px-6 py-2 text-white transition hover:bg-[#111111]"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className={PRODUCT_CARD_GRID_CLASS_5}>
                  {visibleProducts.map((product, idx) => (
                    <ProductCard
                      key={product._id || product.id || product.slug || idx}
                      product={product}
                      priorityImages={idx < 5}
                    />
                  ))}
                </div>

                <div ref={sentinelRef} className="h-8 w-full" aria-hidden="true" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
