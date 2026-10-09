'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import ProductCard from '@/components/ProductCard'
import { HOME_PRODUCT_GRID_CLASS, HOME_SECTION_CLASS, HOME_SECTION_GRID_INNER_CLASS, HOME_SECTION_TITLE_CLASS } from '@/lib/storefrontCarousel'
import { localizeField } from '@/lib/storefrontLanguage'
import { useStorefrontI18n } from '@/lib/useStorefrontI18n'
import { findTopDealsSection, isTopDealsVisibleOnWebsite } from '@/lib/homeTopDeals'

function TopDealsSkeleton() {
  return (
    <div className={HOME_PRODUCT_GRID_CLASS}>
      {[...Array(6)].map((_, index) => (
        <div
          key={`top-deals-skeleton-${index}`}
          className="animate-pulse overflow-hidden rounded-none border-0 bg-white"
        >
          <div className="aspect-square w-full bg-gray-100" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-1/2 rounded bg-gray-100" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TopDeals({
  homeSections = [],
  sectionsLoading = false,
  initialProducts = null,
  initialTitle = '',
}) {
  const { language } = useStorefrontI18n()
  const configuredSection = findTopDealsSection(homeSections)
  const hasInitialProducts = Array.isArray(initialProducts) && initialProducts.length > 0
  const [products, setProducts] = useState(hasInitialProducts ? initialProducts : [])
  const [loading, setLoading] = useState(!hasInitialProducts)
  const [title, setTitle] = useState(initialTitle || configuredSection?.title || '')
  const [titleAr, setTitleAr] = useState(configuredSection?.titleAr || '')

  useEffect(() => {
    if (hasInitialProducts) {
      setProducts(initialProducts)
      setTitle(initialTitle || configuredSection?.title || '')
      setTitleAr(configuredSection?.titleAr || '')
      setLoading(false)
      return undefined
    }

    if (sectionsLoading) {
      setLoading(true)
      return undefined
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)

      try {
        const section = findTopDealsSection(homeSections)
        setTitle(section?.title || '')
        setTitleAr(section?.titleAr || '')

        if (!isTopDealsVisibleOnWebsite(section)) {
          if (!cancelled) setProducts([])
          return
        }

        if (section.sectionType === 'manual' && Array.isArray(section.productIds) && section.productIds.length > 0) {
          const { data } = await axios.post('/api/products/batch', {
            productIds: section.productIds.slice(0, 12),
          })
          if (!cancelled) setProducts(data.products || [])
          return
        }

        if (section.category) {
          const { data } = await axios.get('/api/products', {
            params: { category: section.category, limit: 12 },
          })
          if (!cancelled) setProducts(data.products || [])
          return
        }

        if (!cancelled) setProducts([])
      } catch {
        if (!cancelled) {
          setProducts([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [configuredSection?.title, configuredSection?.titleAr, hasInitialProducts, homeSections, sectionsLoading, initialProducts, initialTitle])

  const displayTitle = localizeField(configuredSection, 'title', language)
    || localizeField({ title, titleAr }, 'title', language)

  if (!isTopDealsVisibleOnWebsite(configuredSection)) {
    return null
  }

  if (!loading && products.length === 0) {
    return null
  }

  return (
    <section className={HOME_SECTION_CLASS}>
      <div className={HOME_SECTION_GRID_INNER_CLASS}>
        {displayTitle ? (
          <h2 className={HOME_SECTION_TITLE_CLASS}>{displayTitle}</h2>
        ) : null}

        {loading ? (
          <TopDealsSkeleton />
        ) : (
          <div className={HOME_PRODUCT_GRID_CLASS}>
            {products.slice(0, 12).map((product, index) => (
              <ProductCard key={product._id || product.id || index} product={product} priorityImages={index < 6} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
