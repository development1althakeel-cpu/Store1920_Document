'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Loader2, Save, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { serializeShowcaseImageFields } from '@/lib/showcaseBannerImages'
import { inferShowcaseLinkType } from '@/lib/showcaseBannerLinks'
import {
  AccordionRow,
  ShowcaseLinkAccordion,
  ShowcaseLocaleImageGroups,
} from '@/components/store/preferences/bannerEditorShared'

const sanitizeImageUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const withoutPathTransform = raw.replace(/\/tr:[^/]+\//i, '/')
  try {
    const url = new URL(withoutPathTransform)
    if (url.searchParams.has('tr')) {
      url.searchParams.delete('tr')
    }
    return url.toString()
  } catch {
    return withoutPathTransform
  }
}

function sanitizeImageFields(item = {}) {
  return {
    image: sanitizeImageUrl(item.image || ''),
    tabletImage: sanitizeImageUrl(item.tabletImage || ''),
    mobileImage: sanitizeImageUrl(item.mobileImage || ''),
    imageAr: sanitizeImageUrl(item.imageAr || ''),
    tabletImageAr: sanitizeImageUrl(item.tabletImageAr || ''),
    mobileImageAr: sanitizeImageUrl(item.mobileImageAr || ''),
  }
}

const BANNER2_IMAGE_SIZES = {
  image: { width: 1600, height: 500 },
  tabletImage: { width: 1100, height: 400 },
  mobileImage: { width: 750, height: 420 },
  imageAr: { width: 1600, height: 500 },
  tabletImageAr: { width: 1100, height: 400 },
  mobileImageAr: { width: 750, height: 420 },
}

const createBannerSliderItem = (overrides = {}) => ({
  id: overrides.id || `banner-2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ...serializeShowcaseImageFields(sanitizeImageFields(overrides)),
  link: overrides.link || '/shop',
  linkType: ['category', 'product', 'custom'].includes(overrides.linkType)
    ? overrides.linkType
    : inferShowcaseLinkType(overrides.link || '/shop').type,
  targetBlank: Boolean(overrides.targetBlank),
  alt: overrides.alt || '',
})

const DEFAULT_FORM = {
  enabled: true,
  desktopInterval: 4000,
  mobileInterval: 3000,
  desktopHeight: 220,
  mobileHeight: 120,
  items: [
    createBannerSliderItem({ id: 'banner-2-slide-1', alt: 'Banner 2 Slide 1' }),
    createBannerSliderItem({ id: 'banner-2-slide-2', alt: 'Banner 2 Slide 2' }),
  ],
}

function getSlideImageCount(item) {
  return ['image', 'tabletImage', 'mobileImage', 'imageAr', 'tabletImageAr', 'mobileImageAr']
    .filter((key) => String(item?.[key] || '').trim())
    .length
}

export default function Banner2SectionEditor({ embedded = false }) {
  const { user, loading: authLoading, getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loadedShowcase, setLoadedShowcase] = useState({})
  const [categoryOptions, setCategoryOptions] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [openSlideId, setOpenSlideId] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const savedItems = Array.isArray(res.data?.shopShowcase?.secondaryBannerSliderItems)
        ? res.data.shopShowcase.secondaryBannerSliderItems
        : []

      setLoadedShowcase(res.data?.shopShowcase || {})
      setForm({
        enabled: typeof res.data?.shopShowcase?.secondaryBannerSliderEnabled === 'boolean'
          ? res.data.shopShowcase.secondaryBannerSliderEnabled
          : true,
        desktopInterval: Number(res.data?.shopShowcase?.secondaryBannerSliderDesktopInterval || 4000),
        mobileInterval: Number(res.data?.shopShowcase?.secondaryBannerSliderMobileInterval || 3000),
        desktopHeight: Number(res.data?.shopShowcase?.secondaryBannerSliderDesktopHeight || 220),
        mobileHeight: Number(res.data?.shopShowcase?.secondaryBannerSliderMobileHeight || 120),
        items: Array.from({ length: Math.max(1, savedItems.length || 2) }, (_, index) => {
          const current = savedItems[index] || {}
          return createBannerSliderItem({
            ...current,
            id: current.id || `banner-2-slide-${index + 1}`,
            alt: current.alt || `Banner 2 Slide ${index + 1}`,
          })
        }),
      })
    } catch (error) {
      toast.error('Failed to load Banner 2 Section settings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }
    loadData()
  }, [authLoading, user])

  useEffect(() => {
    let active = true

    const loadLinkTargets = async () => {
      try {
        const token = await getToken()
        const [categoriesRes, productsRes] = await Promise.all([
          axios.get('/api/store/categories', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => ({ data: { categories: [] } })),
          fetch('/api/products?limit=400&slim=true', { cache: 'no-store' }),
        ])
        const categoriesData = categoriesRes?.data || {}
        const productsData = productsRes.ok ? await productsRes.json() : { products: [] }
        if (!active) return
        setCategoryOptions(Array.isArray(categoriesData?.categories) ? categoriesData.categories : [])
        setProductOptions(Array.isArray(productsData?.products) ? productsData.products : [])
      } catch {
        if (!active) return
        setCategoryOptions([])
        setProductOptions([])
      }
    }

    loadLinkTargets()
    return () => {
      active = false
    }
  }, [])

  const updateItem = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [key]: value } : item
      )),
    }))
  }

  const uploadImage = async (file, token) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadContext', 'showcase-banner')

    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data.url
  }

  const uploadItemField = async (index, field, file) => {
    if (!file) return

    try {
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to upload the banner')
        return
      }

      const url = sanitizeImageUrl(await uploadImage(file, token))
      updateItem(index, field, url)
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Banner upload failed')
      console.error(error)
    }
  }

  const addItem = () => {
    setForm((prev) => {
      if (prev.items.length >= 6) return prev
      const nextItem = createBannerSliderItem({ alt: `Banner 2 Slide ${prev.items.length + 1}` })
      setOpenSlideId(nextItem.id)
      return {
        ...prev,
        items: [...prev.items, nextItem],
      }
    })
  }

  const removeItem = (index) => {
    setForm((prev) => {
      const removed = prev.items[index]
      const items = prev.items.filter((_, itemIndex) => itemIndex !== index)
      if (removed?.id && openSlideId === removed.id) {
        setOpenSlideId(null)
      }
      return { ...prev, items }
    })
  }

  const save = async () => {
    if (!user) {
      toast.error('Please sign in first')
      return
    }

    try {
      setSaving(true)
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again to save Banner 2 Section')
        return
      }

      const secondaryBannerSliderItems = form.items.map((item, index) => {
        const images = serializeShowcaseImageFields(sanitizeImageFields(item))
        return {
          id: item.id,
          ...images,
          link: String(item.link || '/shop').trim(),
          linkType: ['category', 'product', 'custom'].includes(item.linkType)
            ? item.linkType
            : inferShowcaseLinkType(item.link).type,
          targetBlank: Boolean(item.targetBlank),
          alt: String(item.alt || `Banner 2 Slide ${index + 1}`).trim(),
        }
      })

      const response = await axios.put('/api/store/preferences/shop-showcase', {
        ...loadedShowcase,
        secondaryBannerSliderEnabled: !!form.enabled,
        secondaryBannerSliderDesktopInterval: Number(form.desktopInterval || 4000),
        secondaryBannerSliderMobileInterval: Number(form.mobileInterval || 3000),
        secondaryBannerSliderDesktopHeight: Number(form.desktopHeight || 220),
        secondaryBannerSliderMobileHeight: Number(form.mobileHeight || 120),
        secondaryBannerSliderPlacement: 'below_top_deals',
        secondaryBannerSliderItems,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setLoadedShowcase(response.data?.shopShowcase || loadedShowcase)
      toast.success('Banner 2 Section saved')
      await loadData()
    } catch (error) {
      toast.error('Failed to save Banner 2 Section')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5" />
            <div>
              <h1 className="text-xl font-semibold">Sign in required</h1>
              <p className="mt-2 text-sm text-amber-900/80">Please sign in with your store account to edit Banner 2 Section.</p>
              <Link
                href="/store/login"
                className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Go to Store Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
      {!embedded && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Banner 2 Section</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload rotating banner slides shown on the homepage below Top Deals.
            </p>
          </div>
          <Link href="/store/customize" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to Customize
          </Link>
        </div>
      )}

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Banner slider</h2>
            <p className="mt-1 text-sm text-slate-600">
              This section appears directly below Top Deals on the homepage. Each slide can have English and Arabic images for desktop, tablet, and mobile, plus a category, product, or custom link.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.enabled}
              onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-slate-700">Enable Banner 2 Section</span>
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Banner size</h3>
          <p className="mt-1 text-sm text-slate-600">
            Width matches the navbar and homepage sections (max 1400px). Adjust only the banner height below.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Width</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Same as navbar (1400px max)
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                The banner uses the same centered max width and side padding as the rest of the storefront.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div
                className="w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                style={{ height: `${Math.min(120, Math.max(40, form.mobileHeight / 2))}px` }}
              >
                <div className="flex h-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Height preview
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Preview scale is reduced. Actual mobile height: {form.mobileHeight}px
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Desktop height</span>
                <span className="text-sm font-semibold text-slate-900">{form.desktopHeight}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="600"
                step="10"
                className="w-full accent-emerald-600"
                value={form.desktopHeight}
                onChange={(event) => setForm((prev) => ({ ...prev, desktopHeight: Number(event.target.value) || 220 }))}
              />
              <input
                type="number"
                min="80"
                max="600"
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.desktopHeight}
                onChange={(event) => setForm((prev) => ({ ...prev, desktopHeight: Number(event.target.value) || 220 }))}
              />
            </label>

            <label className="block rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Mobile height</span>
                <span className="text-sm font-semibold text-slate-900">{form.mobileHeight}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="600"
                step="10"
                className="w-full accent-emerald-600"
                value={form.mobileHeight}
                onChange={(event) => setForm((prev) => ({ ...prev, mobileHeight: Number(event.target.value) || 120 }))}
              />
              <input
                type="number"
                min="80"
                max="600"
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.mobileHeight}
                onChange={(event) => setForm((prev) => ({ ...prev, mobileHeight: Number(event.target.value) || 120 }))}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Desktop slide interval (ms)</span>
            <input
              type="number"
              min="1500"
              max="15000"
              step="500"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              value={form.desktopInterval}
              onChange={(event) => setForm((prev) => ({ ...prev, desktopInterval: Number(event.target.value) || 4000 }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mobile slide interval (ms)</span>
            <input
              type="number"
              min="1500"
              max="15000"
              step="500"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              value={form.mobileInterval}
              onChange={(event) => setForm((prev) => ({ ...prev, mobileInterval: Number(event.target.value) || 3000 }))}
            />
          </label>
        </div>

        <div className="space-y-3">
          {form.items.map((item, index) => {
            const slideId = item.id || `banner-2-slide-${index}`
            const isOpen = openSlideId === slideId
            const imageCount = getSlideImageCount(item)
            const linkLabel = item.link || '/shop'

            return (
              <AccordionRow
                key={slideId}
                title={`Slide ${index + 1}`}
                summary={`${imageCount} of 6 images · ${linkLabel}${item.targetBlank ? ' · new window' : ''} · click to ${isOpen ? 'hide' : 'edit'}`}
                open={isOpen}
                onToggle={() => setOpenSlideId((current) => (current === slideId ? null : slideId))}
                actions={(
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              >
                <div className="space-y-3">
                  <ShowcaseLocaleImageGroups
                    item={item}
                    recommendedSizes={BANNER2_IMAGE_SIZES}
                    onUpload={(field, file) => uploadItemField(index, field, file)}
                    onChange={(field, value) => updateItem(index, field, value)}
                  />

                  <ShowcaseLinkAccordion
                    link={item.link}
                    linkType={item.linkType}
                    targetBlank={item.targetBlank}
                    categories={categoryOptions}
                    products={productOptions}
                    onLinkChange={(value) => updateItem(index, 'link', value)}
                    onLinkTypeChange={(value) => updateItem(index, 'linkType', value)}
                    onTargetBlankChange={(value) => updateItem(index, 'targetBlank', value)}
                  />

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Alt text</span>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={item.alt}
                      onChange={(event) => updateItem(index, 'alt', event.target.value)}
                    />
                  </label>
                </div>
              </AccordionRow>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={form.items.length >= 6}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add Slide
        </button>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Banner 2 Section
          </button>
        </div>
      </div>
    </div>
  )
}
