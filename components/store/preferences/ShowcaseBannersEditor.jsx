'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Save, Search, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/lib/useAuth'
import { createLargeBannerSlide, normalizeLargeBannerSliderItemsForEditor } from '@/lib/shopShowcaseLargeBanners'
import { hasShowcaseBannerImage, serializeShowcaseImageFields } from '@/lib/showcaseBannerImages'
import {
  createShowcaseLinkFromChoice,
  flattenShowcaseCategories,
  inferShowcaseLinkType,
  readShowcaseLinkChoice,
} from '@/lib/showcaseBannerLinks'

const createBanner = (overrides = {}) => ({
  image: '',
  tabletImage: '',
  mobileImage: '',
  imageAr: '',
  tabletImageAr: '',
  mobileImageAr: '',
  title: '',
  subtitle: '',
  buttonText: '',
  link: '',
  linkType: '',
  targetBlank: false,
  file: null,
  previewUrl: '',
  ...overrides,
})

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

const IMAGE_GROUPS = [
  {
    id: 'en',
    title: 'English images',
    hint: 'Used when the storefront is English. Also used as fallback if an Arabic image is empty.',
    slots: [
      { key: 'image', label: 'Desktop' },
      { key: 'tabletImage', label: 'Tablet' },
      { key: 'mobileImage', label: 'Mobile' },
    ],
  },
  {
    id: 'ar',
    title: 'Arabic images',
    hint: 'Used when the storefront is Arabic. Falls back to the English image for that device if empty.',
    slots: [
      { key: 'imageAr', label: 'Desktop' },
      { key: 'tabletImageAr', label: 'Tablet' },
      { key: 'mobileImageAr', label: 'Mobile' },
    ],
  },
]

const TOP_BANNER_SIZES = {
  image: { width: 3054, height: 1080 },
  tabletImage: { width: 1536, height: 544 },
  mobileImage: { width: 768, height: 432 },
  imageAr: { width: 3054, height: 1080 },
  tabletImageAr: { width: 1536, height: 544 },
  mobileImageAr: { width: 768, height: 432 },
}

const BOTTOM_BANNER_SIZES = {
  image: { width: 3054, height: 370 },
  tabletImage: { width: 1536, height: 186 },
  mobileImage: { width: 768, height: 200 },
  imageAr: { width: 3054, height: 370 },
  tabletImageAr: { width: 1536, height: 186 },
  mobileImageAr: { width: 768, height: 200 },
}

const PRODUCT_BANNER_SIZES = {
  image: { width: 1225, height: 639 },
  tabletImage: { width: 800, height: 418 },
  mobileImage: { width: 640, height: 334 },
  imageAr: { width: 1225, height: 639 },
  tabletImageAr: { width: 800, height: 418 },
  mobileImageAr: { width: 640, height: 334 },
}

function gcd(first, second) {
  return second ? gcd(second, first % second) : first
}

function formatImageRatio(width, height) {
  const divisor = gcd(width, height)
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  if (ratioWidth <= 40 && ratioHeight <= 40) {
    return `${ratioWidth}:${ratioHeight}`
  }
  return `${(width / height).toFixed(2)}:1`
}

function ShowcaseImageSlot({ label, size, value, onUpload, onClear }) {
  const width = Number(size?.width) || 0
  const height = Number(size?.height) || 0
  const ratio = width && height ? formatImageRatio(width, height) : ''

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="mb-1.5">
        <div className="text-xs font-semibold text-slate-700">{label}</div>
        {width && height ? (
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            Width {width} px · Height {height} px · Ratio {ratio}
          </p>
        ) : null}
      </div>
      <div
        className="relative mb-2 overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-50"
        style={{ aspectRatio: width && height ? `${width} / ${height}` : '16 / 9' }}
      >
        {value ? (
          <Image src={value} alt={label} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-400">No image</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <Upload size={12} />
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              onUpload(event.target.files?.[0] || null)
              event.target.value = ''
            }}
          />
        </label>
        {value ? (
          <button type="button" onClick={onClear} className="text-xs font-medium text-red-600 hover:underline">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  )
}

function countFilledSlots(item, slots) {
  return slots.filter((slot) => String(item?.[slot.key] || '').trim()).length
}

function getLinkSummary(link, linkType) {
  const choice = readShowcaseLinkChoice(link, linkType)
  if (choice.type === 'category') return choice.value ? `Category · ${choice.value}` : 'Category · not selected'
  if (choice.type === 'product') return choice.value ? `Product · ${choice.value}` : 'Product · not selected'
  return choice.value ? `Custom URL · ${choice.value}` : 'Custom URL · not set'
}

function SmoothPanel({ open, children }) {
  return (
    <div
      className={`grid min-w-0 transition-[grid-template-rows] duration-300 ease-out ${
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className={`min-h-0 min-w-0 ${open ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className={`min-w-0 border-t border-slate-200 px-3 pb-3 pt-3 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}>
          {children}
        </div>
      </div>
    </div>
  )
}

function AccordionRow({ title, summary, open, onToggle, children, actions, className = '' }) {
  return (
    <div className={`min-w-0 rounded-xl border border-slate-200 bg-white ${className}`.trim()}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {summary ? <div className="truncate text-xs text-slate-500">{summary}</div> : null}
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {actions}
      </div>
      <SmoothPanel open={open}>{children}</SmoothPanel>
    </div>
  )
}

const LINK_TYPE_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'custom', label: 'Custom URL' },
]

function useClickOutside(open, onClose) {
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open, onClose])

  return rootRef
}

function ShowcaseSelect({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))
  const selected = options.find((option) => option.value === value) || options[0]

  return (
    <div ref={rootRef} className="relative z-30 min-w-0 w-full max-w-full">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        aria-expanded={open}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="relative z-50 mt-2 w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={`flex w-full min-w-0 items-center justify-between px-3 py-2.5 text-left text-sm ${
                  isSelected ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {isSelected ? <Check size={16} className="shrink-0 text-emerald-600" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function ShowcaseSearchDropdown({
  label,
  placeholder,
  query,
  onQueryChange,
  items,
  selectedValue,
  selectedLabel,
  emptyText,
  onSelect,
  renderItem,
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useClickOutside(open, () => setOpen(false))

  return (
    <div ref={rootRef} className="relative z-20 min-w-0 w-full max-w-full">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left shadow-sm outline-none hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        aria-expanded={open}
      >
        <span className={`min-w-0 truncate text-sm ${selectedLabel ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="relative z-50 mt-2 w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative min-w-0">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search..."
                className="w-full min-w-0 rounded-md border border-slate-200 py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-x-hidden overflow-y-auto py-1">
            {items.length ? items.map((item) => {
              const isSelected = item.value === selectedValue
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  className={`flex w-full min-w-0 items-start justify-between gap-2 px-3 py-2.5 text-left ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="min-w-0 flex-1 overflow-hidden">{renderItem(item, isSelected)}</span>
                  {isSelected ? <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : null}
                </button>
              )
            }) : (
              <p className="px-3 py-3 text-sm text-slate-500">{emptyText}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShowcaseLinkAccordion(props) {
  const [open, setOpen] = useState(false)
  const summary = getLinkSummary(props.link, props.linkType)

  return (
    <AccordionRow
      title="Link"
      summary={`${summary} · click to ${open ? 'hide' : 'edit'}`}
      open={open}
      onToggle={() => setOpen((current) => !current)}
      className="bg-slate-50/70"
    >
      <ShowcaseLinkFields {...props} />
    </AccordionRow>
  )
}

function ShowcaseLinkFields({
  link,
  linkType,
  targetBlank,
  categories,
  products,
  onLinkChange,
  onLinkTypeChange,
  onTargetBlankChange,
}) {
  const choice = readShowcaseLinkChoice(link, linkType)
  const [categoryQuery, setCategoryQuery] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const categoryRows = flattenShowcaseCategories(categories)
  const categorySearch = categoryQuery.trim().toLowerCase()
  const filteredCategories = categoryRows.filter((category) => {
    if (!categorySearch) return true
    return `${category.label} ${category.slug}`.toLowerCase().includes(categorySearch)
  })
  const productSearch = productQuery.trim().toLowerCase()
  const productList = Array.isArray(products) ? products : []
  const filteredProducts = productList.filter((product) => {
    if (!productSearch) return true
    return [product?.name, product?.slug, product?.sku]
      .some((value) => String(value || '').toLowerCase().includes(productSearch))
  })

  const applyChoice = (type, value, extra = {}) => {
    onLinkTypeChange(type)
    onLinkChange(createShowcaseLinkFromChoice(type, value, extra))
  }

  const selectType = (type) => {
    onLinkTypeChange(type)
    const inferred = inferShowcaseLinkType(link)
    if (type !== 'custom' && inferred.type !== type) {
      onLinkChange('')
    }
    if (type !== 'product') setProductQuery('')
    if (type !== 'category') setCategoryQuery('')
  }

  const selectedCategory = categoryRows.find((category) => category.slug === choice.value)
  const selectedProduct = productList.find((product) => (product?.slug || '') === choice.value)

  return (
    <div className="grid min-w-0 gap-3">
      <ShowcaseSelect
        label="Link to"
        value={choice.type}
        options={LINK_TYPE_OPTIONS}
        onChange={selectType}
      />

      {choice.type === 'category' ? (
        <ShowcaseSearchDropdown
          label="Category"
          placeholder="Select a category"
          query={categoryQuery}
          onQueryChange={setCategoryQuery}
          items={filteredCategories.map((category) => ({
            value: category.slug,
            label: category.label,
          }))}
          selectedValue={choice.value}
          selectedLabel={selectedCategory?.label || choice.value}
          emptyText={categorySearch ? 'No categories match this search' : 'No categories found'}
          onSelect={(item) => applyChoice('category', item.value)}
          renderItem={(item, isSelected) => (
            <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-emerald-800' : 'text-slate-700'}`}>
              {item.label}
            </span>
          )}
        />
      ) : null}

      {choice.type === 'product' ? (
        <ShowcaseSearchDropdown
          label="Product"
          placeholder="Select a product"
          query={productQuery}
          onQueryChange={setProductQuery}
          items={filteredProducts.map((product) => ({
            value: product?.slug || '',
            label: product?.name || product?.slug || '',
            sku: product?.sku || product?.slug || '',
            useProductsPath: Boolean(product?.useProductsPath),
          }))}
          selectedValue={choice.value}
          selectedLabel={selectedProduct?.name || choice.value}
          emptyText={productSearch ? 'No products match this search' : 'No products loaded'}
          onSelect={(item) => applyChoice('product', item.value, { useProductsPath: item.useProductsPath })}
          renderItem={(item, isSelected) => (
            <span className="block min-w-0 max-w-full overflow-hidden">
              <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-emerald-800' : 'text-slate-800'}`}>
                {item.label}
              </span>
              <span className="block truncate text-xs text-slate-500">{item.sku}</span>
            </span>
          )}
        />
      ) : null}

      {choice.type === 'custom' ? (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Custom URL</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={choice.value}
            onChange={(event) => applyChoice('custom', event.target.value)}
            placeholder="/shop or https://example.com"
          />
        </label>
      ) : null}

      <label className="inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-700">Open in new window</span>
        <input
          type="checkbox"
          checked={Boolean(targetBlank)}
          onChange={(event) => onTargetBlankChange(event.target.checked)}
        />
      </label>
    </div>
  )
}

function ShowcaseLocaleImageGroups({ item, recommendedSizes, onUpload, onChange }) {
  const [openGroups, setOpenGroups] = useState({})

  return (
    <div className="space-y-3">
      {IMAGE_GROUPS.map((group) => {
        const filled = countFilledSlots(item, group.slots)
        const isOpen = !!openGroups[group.id]

        return (
          <AccordionRow
            key={group.id}
            title={group.title}
            summary={`${filled} of ${group.slots.length} uploaded · click to ${isOpen ? 'hide' : 'edit'}`}
            open={isOpen}
            onToggle={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
            className="bg-slate-50/70"
          >
            <p className="mb-3 text-xs text-slate-500">{group.hint}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {group.slots.map((slot) => (
                <ShowcaseImageSlot
                  key={slot.key}
                  label={slot.label}
                  size={recommendedSizes?.[slot.key]}
                  value={item[slot.key]}
                  onUpload={(file) => onUpload(slot.key, file)}
                  onClear={() => onChange(slot.key, '')}
                />
              ))}
            </div>
          </AccordionRow>
        )
      })}
    </div>
  )
}

function slideOrdinalLabel(index) {
  if (index === 0) return '1st in slider'
  if (index === 1) return '2nd in slider'
  if (index === 2) return '3rd in slider'
  return `${index + 1}th in slider`
}

function LargeBannerSlideCard({
  slide,
  index,
  total,
  recommendedSizes,
  open,
  onToggle,
  onMove,
  onRemove,
  onUpload,
  onChange,
  categoryOptions,
  productOptions,
}) {
  return (
    <AccordionRow
      title={`Slide ${index + 1}`}
      summary={`${slideOrdinalLabel(index)} · click to ${open ? 'hide' : 'edit'}`}
      open={open}
      onToggle={onToggle}
      actions={(
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            title="Move up (earlier in slider)"
            className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            title="Move down (later in slider)"
            className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      )}
    >
      <div className="space-y-3">
        <ShowcaseLocaleImageGroups
          item={slide}
          recommendedSizes={recommendedSizes}
          onUpload={onUpload}
          onChange={onChange}
        />
        <ShowcaseLinkAccordion
          link={slide.link}
          linkType={slide.linkType}
          targetBlank={slide.targetBlank}
          categories={categoryOptions}
          products={productOptions}
          onLinkChange={(value) => onChange('link', value)}
          onLinkTypeChange={(value) => onChange('linkType', value)}
          onTargetBlankChange={(value) => onChange('targetBlank', value)}
        />
      </div>
    </AccordionRow>
  )
}

const DEFAULT_FORM = {
  mainBannerEnabled: true,
  topBannerImage: '',
  topBannerTitle: '',
  topBannerSubtitle: '',
  topBannerCtaText: '',
  topBannerTitleEnabled: true,
  topBannerSubtitleEnabled: true,
  topBannerCtaEnabled: true,
  topBannerCtaBgColor: '#ef2d2d',
  topBannerCtaTextColor: '#ffffff',
  topBannerLink: '/shop',
  topBannerSliderEnabled: true,
  topBannerSliderInterval: 4000,
  topBannerSliderItems: [createLargeBannerSlide({ alt: 'Top banner 1' })],
  bottomBannerImage: '',
  bottomBannerTitle: '',
  bottomBannerSubtitle: '',
  bottomBannerCtaText: '',
  bottomBannerTitleEnabled: true,
  bottomBannerSubtitleEnabled: true,
  bottomBannerCtaEnabled: true,
  bottomBannerCtaBgColor: '#ef2d2d',
  bottomBannerCtaTextColor: '#ffffff',
  bottomBannerLink: '/shop',
  bottomBannerSliderEnabled: true,
  bottomBannerSliderInterval: 4000,
  bottomBannerSliderItems: [createLargeBannerSlide({ alt: 'Bottom banner 1' })],
  productBanners: [
    createBanner(),
    createBanner(),
    createBanner(),
    createBanner(),
  ],
}

const PRODUCT_SLOT_LABELS = ['Card 1', 'Card 2', 'Card 3', 'Card 4']

function mapSliderItemsForEditor(showcase, itemsKey, legacyImageKey, legacyLinkKey, prefix, defaultAlt) {
  return normalizeLargeBannerSliderItemsForEditor(
    showcase?.[itemsKey],
    showcase?.[legacyImageKey],
    showcase?.[legacyLinkKey] || '/shop',
    prefix,
  ).map((slide) => ({
    ...slide,
    file: null,
    ...sanitizeImageFields(slide),
    linkType: ['category', 'product', 'custom'].includes(slide.linkType)
      ? slide.linkType
      : inferShowcaseLinkType(slide.link).type,
  }))
}

function mergeSavedSliderItems(localItems = [], serverItems = []) {
  if (!localItems.length) {
    return serverItems.map((slide) => ({
      ...slide,
      file: null,
      ...sanitizeImageFields(slide),
    }))
  }

  return localItems.map((localSlide, index) => {
    const serverSlide = serverItems.find((item) => item?.id && item.id === localSlide.id) || serverItems[index]
    const merged = {
      ...localSlide,
      ...(serverSlide || {}),
    }

    return {
      ...merged,
      id: localSlide.id || serverSlide?.id,
      ...sanitizeImageFields(merged),
      link: String(serverSlide?.link || localSlide.link || '/shop').trim(),
      alt: String(serverSlide?.alt || localSlide.alt || '').trim(),
      file: null,
    }
  })
}

function buildShowcaseFormState(showcase = {}, previousForm = null) {
  const savedBanners = Array.isArray(showcase?.productBanners) ? showcase.productBanners : []

  return {
    mainBannerEnabled: typeof showcase?.mainBannerEnabled === 'boolean'
      ? showcase.mainBannerEnabled
      : true,
    topBannerImage: sanitizeImageUrl(showcase?.topBannerImage || ''),
    topBannerTitle: showcase?.topBannerTitle || '',
    topBannerSubtitle: showcase?.topBannerSubtitle || '',
    topBannerCtaText: showcase?.topBannerCtaText || '',
    topBannerTitleEnabled: typeof showcase?.topBannerTitleEnabled === 'boolean'
      ? showcase.topBannerTitleEnabled
      : true,
    topBannerSubtitleEnabled: typeof showcase?.topBannerSubtitleEnabled === 'boolean'
      ? showcase.topBannerSubtitleEnabled
      : true,
    topBannerCtaEnabled: typeof showcase?.topBannerCtaEnabled === 'boolean'
      ? showcase.topBannerCtaEnabled
      : true,
    topBannerCtaBgColor: showcase?.topBannerCtaBgColor || '#ef2d2d',
    topBannerCtaTextColor: showcase?.topBannerCtaTextColor || '#ffffff',
    topBannerLink: showcase?.topBannerLink || '/shop',
    topBannerSliderEnabled: showcase?.topBannerSliderEnabled !== false,
    topBannerSliderInterval: Number(showcase?.topBannerSliderInterval) || 4000,
    topBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'topBannerSliderItems', 'topBannerImage', 'topBannerLink', 'top-large-banner', 'Top banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Top banner 1', file: null })]
      if (previousForm?.topBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.topBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    bottomBannerImage: sanitizeImageUrl(showcase?.bottomBannerImage || ''),
    bottomBannerTitle: showcase?.bottomBannerTitle || '',
    bottomBannerSubtitle: showcase?.bottomBannerSubtitle || '',
    bottomBannerCtaText: showcase?.bottomBannerCtaText || '',
    bottomBannerTitleEnabled: typeof showcase?.bottomBannerTitleEnabled === 'boolean'
      ? showcase.bottomBannerTitleEnabled
      : true,
    bottomBannerSubtitleEnabled: typeof showcase?.bottomBannerSubtitleEnabled === 'boolean'
      ? showcase.bottomBannerSubtitleEnabled
      : true,
    bottomBannerCtaEnabled: typeof showcase?.bottomBannerCtaEnabled === 'boolean'
      ? showcase.bottomBannerCtaEnabled
      : true,
    bottomBannerCtaBgColor: showcase?.bottomBannerCtaBgColor || '#ef2d2d',
    bottomBannerCtaTextColor: showcase?.bottomBannerCtaTextColor || '#ffffff',
    bottomBannerLink: showcase?.bottomBannerLink || '/shop',
    bottomBannerSliderEnabled: showcase?.bottomBannerSliderEnabled !== false,
    bottomBannerSliderInterval: Number(showcase?.bottomBannerSliderInterval) || 4000,
    bottomBannerSliderItems: (() => {
      const items = mapSliderItemsForEditor(showcase, 'bottomBannerSliderItems', 'bottomBannerImage', 'bottomBannerLink', 'bottom-large-banner', 'Bottom banner')
      const baseItems = items.length ? items : [createLargeBannerSlide({ alt: 'Bottom banner 1', file: null })]
      if (previousForm?.bottomBannerSliderItems?.length) {
        return mergeSavedSliderItems(previousForm.bottomBannerSliderItems, baseItems)
      }
      return baseItems
    })(),
    topBannerFile: null,
    bottomBannerFile: null,
    productBanners: (() => {
      const mapped = Array.from({ length: Math.max(1, Math.min(4, savedBanners.length || 1)) }, (_, index) => {
        const current = savedBanners[index] || {}
        const fallbackTitle = `Product Title ${index + 1}`
        const normalizedTitle = String(current.title || '').trim()
        const normalizedSubtitle = String(current.subtitle || '').trim()
        const normalizedButtonText = String(current.buttonText || '').trim()
        const normalizedLink = String(current.link || '').trim()

        return createBanner({
          ...sanitizeImageFields(current),
          title: normalizedTitle && normalizedTitle !== fallbackTitle ? normalizedTitle : '',
          subtitle: normalizedSubtitle && normalizedSubtitle !== 'Order now' ? normalizedSubtitle : '',
          buttonText: normalizedButtonText && normalizedButtonText !== 'Order now' ? normalizedButtonText : '',
          link: normalizedLink && normalizedLink !== '/shop' ? normalizedLink : '',
          linkType: ['category', 'product', 'custom'].includes(current.linkType)
            ? current.linkType
            : inferShowcaseLinkType(normalizedLink).type,
          targetBlank: Boolean(current.targetBlank),
          file: null,
          previewUrl: sanitizeImageUrl(current.image || ''),
        })
      })

      if (previousForm?.productBanners?.length && previousForm.productBanners.length === mapped.length) {
        return previousForm.productBanners.map((localBanner, index) => {
          const serverBanner = mapped[index]
          const merged = {
            ...localBanner,
            ...serverBanner,
          }
          const images = sanitizeImageFields(merged)
          return {
            ...merged,
            ...images,
            previewUrl: localBanner.previewUrl || images.image,
            file: null,
          }
        })
      }

      return mapped
    })(),
  }
}

export default function ShowcaseBannersEditor({ embedded = false }) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [productOptions, setProductOptions] = useState([])
  const [openTopSlideId, setOpenTopSlideId] = useState(null)
  const [openBottomSlideId, setOpenBottomSlideId] = useState(null)
  const [openProductIndex, setOpenProductIndex] = useState(null)
  const [openLayoutGuide, setOpenLayoutGuide] = useState(false)
  const [openTopText, setOpenTopText] = useState(false)
  const [openBottomText, setOpenBottomText] = useState(false)
  const [loadedShowcase, setLoadedShowcase] = useState({})
  const formRef = useRef(form)
  const loadedShowcaseRef = useRef(loadedShowcase)
  formRef.current = form
  loadedShowcaseRef.current = loadedShowcase

  const loadData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const res = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` }
      })

      setLoadedShowcase(res.data?.shopShowcase || {})
      setForm(buildShowcaseFormState(res.data?.shopShowcase || {}))
    } catch (error) {
      toast.error('Failed to load showcase banners')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

  const updateBanner = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      productBanners: prev.productBanners.map((banner, bannerIndex) => (
        bannerIndex === index ? { ...banner, [key]: value } : banner
      ))
    }))
  }

  const addProductBanner = () => {
    setForm((prev) => {
      if (prev.productBanners.length >= 4) return prev
      return {
        ...prev,
        productBanners: [...prev.productBanners, createBanner()],
      }
    })
  }

  const removeProductBanner = (index) => {
    setForm((prev) => {
      if (prev.productBanners.length <= 1) {
        return {
          ...prev,
          productBanners: [createBanner()],
        }
      }
      return {
        ...prev,
        productBanners: prev.productBanners.filter((_, bannerIndex) => bannerIndex !== index),
      }
    })
  }

  const moveProductBanner = (index, direction) => {
    setForm((prev) => {
      const items = [...prev.productBanners]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= items.length) return prev
      const [item] = items.splice(index, 1)
      items.splice(targetIndex, 0, item)
      return { ...prev, productBanners: items }
    })
  }

  const updateLargeBannerSlide = (itemsKey, index, key, value) => {
    setForm((prev) => ({
      ...prev,
      [itemsKey]: prev[itemsKey].map((slide, slideIndex) => (
        slideIndex === index ? { ...slide, [key]: value } : slide
      )),
    }))
  }

  const addLargeBannerSlide = (itemsKey, altPrefix) => {
    setForm((prev) => {
      if (prev[itemsKey].length >= 8) return prev
      return {
        ...prev,
        [itemsKey]: [
          ...prev[itemsKey],
          createLargeBannerSlide({ alt: `${altPrefix} ${prev[itemsKey].length + 1}`, file: null }),
        ],
      }
    })
  }

  const removeLargeBannerSlide = (itemsKey, index) => {
    setForm((prev) => ({
      ...prev,
      [itemsKey]: prev[itemsKey].filter((_, slideIndex) => slideIndex !== index),
    }))
  }

  const moveLargeBannerSlide = (itemsKey, index, direction) => {
    setForm((prev) => {
      const items = [...prev[itemsKey]]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= items.length) return prev
      const [item] = items.splice(index, 1)
      items.splice(targetIndex, 0, item)
      return { ...prev, [itemsKey]: items }
    })
  }

  const uploadLargeBannerSlideField = async (itemsKey, index, field, file) => {
    if (!file) return
    try {
      const token = await getToken()
      const url = sanitizeImageUrl(await uploadImage(file, token))
      setForm((prev) => ({
        ...prev,
        [itemsKey]: prev[itemsKey].map((slide, slideIndex) => (
          slideIndex === index ? { ...slide, [field]: url, file: null } : slide
        )),
      }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      console.error(error)
    }
  }

  const uploadProductBannerField = async (index, field, file) => {
    if (!file) return
    try {
      const token = await getToken()
      const url = sanitizeImageUrl(await uploadImage(file, token))
      setForm((prev) => ({
        ...prev,
        productBanners: prev.productBanners.map((banner, bannerIndex) => (
          bannerIndex === index
            ? {
                ...banner,
                [field]: url,
                file: field === 'image' ? null : banner.file,
                previewUrl: field === 'image' ? url : banner.previewUrl,
              }
            : banner
        )),
      }))
      toast.success('Image uploaded')
    } catch (error) {
      toast.error('Failed to upload image')
      console.error(error)
    }
  }

  const handleHeroImageChange = (field, file) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setForm((prev) => ({
      ...prev,
      [field]: previewUrl,
      [field === 'topBannerImage' ? 'topBannerFile' : 'bottomBannerFile']: file,
    }))
  }

  const uploadImage = async (file, token) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadContext', 'showcase-banner')

    const response = await axios.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      }
    })

    return response.data.url
  }

  const save = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const currentForm = formRef.current

      const productBanners = []
      for (const banner of currentForm.productBanners) {
        const persistedPreview = String(banner.previewUrl || '').startsWith('blob:')
          ? ''
          : banner.previewUrl
        const images = serializeShowcaseImageFields({
          ...banner,
          image: sanitizeImageUrl(banner.image || persistedPreview),
          tabletImage: sanitizeImageUrl(banner.tabletImage),
          mobileImage: sanitizeImageUrl(banner.mobileImage),
          imageAr: sanitizeImageUrl(banner.imageAr),
          tabletImageAr: sanitizeImageUrl(banner.tabletImageAr),
          mobileImageAr: sanitizeImageUrl(banner.mobileImageAr),
        })
        if (banner.file) {
          images.image = sanitizeImageUrl(await uploadImage(banner.file, token))
        }
        if (!hasShowcaseBannerImage(images)) continue

        productBanners.push({
          ...images,
          title: String(banner.title || '').trim(),
          subtitle: String(banner.subtitle || '').trim(),
          buttonText: String(banner.buttonText || '').trim(),
          link: String(banner.link || '').trim(),
          linkType: ['category', 'product', 'custom'].includes(banner.linkType)
            ? banner.linkType
            : inferShowcaseLinkType(banner.link).type,
          targetBlank: Boolean(banner.targetBlank),
        })
      }

      let topBannerImage = sanitizeImageUrl(currentForm.topBannerImage)
      let bottomBannerImage = sanitizeImageUrl(currentForm.bottomBannerImage)

      const serializeSlideForSave = async (slide, fallbackLink) => {
        const images = serializeShowcaseImageFields({
          image: sanitizeImageUrl(slide.image),
          tabletImage: sanitizeImageUrl(slide.tabletImage),
          mobileImage: sanitizeImageUrl(slide.mobileImage),
          imageAr: sanitizeImageUrl(slide.imageAr),
          tabletImageAr: sanitizeImageUrl(slide.tabletImageAr),
          mobileImageAr: sanitizeImageUrl(slide.mobileImageAr),
        })
        if (slide.file) {
          images.image = sanitizeImageUrl(await uploadImage(slide.file, token))
        }
        return {
          id: slide.id,
          ...images,
          link: String(slide.link || fallbackLink || '/shop').trim(),
          linkType: ['category', 'product', 'custom'].includes(slide.linkType)
            ? slide.linkType
            : inferShowcaseLinkType(slide.link).type,
          targetBlank: Boolean(slide.targetBlank),
          alt: String(slide.alt || '').trim(),
        }
      }

      const topBannerSliderItems = []
      for (const slide of currentForm.topBannerSliderItems) {
        topBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.topBannerLink))
      }

      const bottomBannerSliderItems = []
      for (const slide of currentForm.bottomBannerSliderItems) {
        bottomBannerSliderItems.push(await serializeSlideForSave(slide, currentForm.bottomBannerLink))
      }

      topBannerImage = topBannerSliderItems.find((slide) => slide.image)?.image || topBannerImage
      bottomBannerImage = bottomBannerSliderItems.find((slide) => slide.image)?.image || bottomBannerImage

      if (currentForm.topBannerFile) {
        topBannerImage = sanitizeImageUrl(await uploadImage(currentForm.topBannerFile, token))
      }

      if (currentForm.bottomBannerFile) {
        bottomBannerImage = sanitizeImageUrl(await uploadImage(currentForm.bottomBannerFile, token))
      }

      const latestResponse = await axios.get('/api/store/preferences/shop-showcase', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const latestShowcase = latestResponse.data?.shopShowcase || loadedShowcaseRef.current || {}

      const response = await axios.put('/api/store/preferences/shop-showcase', {
        ...latestShowcase,
        mainBannerEnabled: !!currentForm.mainBannerEnabled,
        productBanners,
        topBannerImage,
        topBannerTitle: String(currentForm.topBannerTitle || '').trim(),
        topBannerTitleEnabled: !!currentForm.topBannerTitleEnabled,
        topBannerSubtitle: String(currentForm.topBannerSubtitle || '').trim(),
        topBannerSubtitleEnabled: !!currentForm.topBannerSubtitleEnabled,
        topBannerCtaText: String(currentForm.topBannerCtaText || '').trim(),
        topBannerCtaEnabled: !!currentForm.topBannerCtaEnabled,
        topBannerCtaBgColor: String(currentForm.topBannerCtaBgColor || '').trim(),
        topBannerCtaTextColor: String(currentForm.topBannerCtaTextColor || '').trim(),
        topBannerLink: String(currentForm.topBannerLink || '/shop').trim(),
        topBannerSliderEnabled: !!currentForm.topBannerSliderEnabled,
        topBannerSliderInterval: Number(currentForm.topBannerSliderInterval) || 4000,
        topBannerSliderItems,
        bottomBannerImage,
        bottomBannerTitle: String(currentForm.bottomBannerTitle || '').trim(),
        bottomBannerTitleEnabled: !!currentForm.bottomBannerTitleEnabled,
        bottomBannerSubtitle: String(currentForm.bottomBannerSubtitle || '').trim(),
        bottomBannerSubtitleEnabled: !!currentForm.bottomBannerSubtitleEnabled,
        bottomBannerCtaText: String(currentForm.bottomBannerCtaText || '').trim(),
        bottomBannerCtaEnabled: !!currentForm.bottomBannerCtaEnabled,
        bottomBannerCtaBgColor: String(currentForm.bottomBannerCtaBgColor || '').trim(),
        bottomBannerCtaTextColor: String(currentForm.bottomBannerCtaTextColor || '').trim(),
        bottomBannerLink: String(currentForm.bottomBannerLink || '/shop').trim(),
        bottomBannerSliderEnabled: !!currentForm.bottomBannerSliderEnabled,
        bottomBannerSliderInterval: Number(currentForm.bottomBannerSliderInterval) || 4000,
        bottomBannerSliderItems,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const savedShowcase = response.data?.shopShowcase || {}
      setLoadedShowcase(savedShowcase)
      setForm(buildShowcaseFormState(savedShowcase, currentForm))
      toast.success('Showcase banners saved')
    } catch (error) {
      toast.error('Failed to save showcase banners')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin" />
      </div>
    )
  }

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
      <div className={embedded ? '' : 'mb-6'}>
        {!embedded && (
          <>
            <h1 className="text-3xl font-bold text-slate-900">Showcase 4-Grid Banners</h1>
            <p className="mt-2 text-sm text-slate-600">
              Upload images and edit the four product banners shown under the main showcase.
            </p>
          </>
        )}

        <AccordionRow
          title="Layout Upload Guide"
          summary={`Click to ${openLayoutGuide ? 'hide' : 'show'} the storefront layout preview`}
          open={openLayoutGuide}
          onToggle={() => setOpenLayoutGuide((current) => !current)}
          className="mt-4 shadow-sm"
        >
          <p className="mb-3 text-xs text-slate-500">
            English and Arabic can use different photos. Each language has separate Desktop, Tablet, and Mobile uploads with width, height, and ratio shown next to the image.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Left sidebar</div>
              <div className="mt-2 flex h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-medium text-slate-500">
                Category menu
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <div className="relative aspect-[3054/1080] w-full">
                    {form.topBannerSliderItems[0]?.image || form.topBannerImage ? (
                      <Image src={form.topBannerSliderItems[0]?.image || form.topBannerImage} alt="Top large banner preview" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">Top Large Banner image</div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Top Large Banner · 3054 × 1080 px · {formatImageRatio(3054, 1080)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                  <div className="relative aspect-[3054/370] w-full">
                    {form.bottomBannerSliderItems[0]?.image || form.bottomBannerImage ? (
                      <Image src={form.bottomBannerSliderItems[0]?.image || form.bottomBannerImage} alt="Bottom large banner preview" fill unoptimized className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-300">Bottom Large Banner image</div>
                    )}
                    <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                      Bottom Large Banner · 3054 × 370 px · {formatImageRatio(3054, 370)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`grid gap-2 ${(() => {
                const count = form.productBanners.filter((banner) => banner.previewUrl || hasShowcaseBannerImage(banner)).length || form.productBanners.length
                if (count <= 1) return 'grid-cols-1'
                if (count === 2) return 'grid-cols-2'
                if (count === 3) return 'grid-cols-3'
                return 'grid-cols-2 sm:grid-cols-4'
              })()}`}>
                {form.productBanners.map((banner, index) => (
                  <div key={`layout-slot-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                      <div className="relative aspect-[1225/639] w-full">
                        {banner.previewUrl || banner.image || banner.imageAr ? (
                          <Image
                            src={banner.previewUrl || banner.image || banner.imageAr}
                            alt={`${PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} preview`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-300">
                            {PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`}
                          </div>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} · 1225 × 639 · {formatImageRatio(1225, 639)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AccordionRow>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Main Banner Visibility</h2>
              <p className="text-xs text-slate-500">Enable or disable the big main banner on storefront.</p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.mainBannerEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, mainBannerEnabled: event.target.checked }))}
                className="sr-only peer"
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 relative transition peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
              <span className="text-xs font-medium text-slate-700">
                {form.mainBannerEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Top Large Banner</h2>
            <p className="mb-3 text-xs font-medium text-slate-500">
              Layout slot: Row 1 right side · upload multiple images for a slider · Slide 1 plays first
            </p>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">Enable banner slider</span>
              <input
                type="checkbox"
                checked={!!form.topBannerSliderEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, topBannerSliderEnabled: event.target.checked }))}
              />
            </div>

            <label className="mb-4 block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slide interval (ms)</span>
              <input
                type="number"
                min="2000"
                max="15000"
                step="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.topBannerSliderInterval}
                onChange={(event) => setForm((prev) => ({ ...prev, topBannerSliderInterval: Number(event.target.value) || 4000 }))}
              />
            </label>

            <div className="space-y-3">
              {form.topBannerSliderItems.map((slide, index) => {
                const slideId = slide.id || `top-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.topBannerSliderItems.length}
                    recommendedSizes={TOP_BANNER_SIZES}
                    open={openTopSlideId === slideId}
                    onToggle={() => setOpenTopSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('topBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('topBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('topBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('topBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => addLargeBannerSlide('topBannerSliderItems', 'Top banner')}
              disabled={form.topBannerSliderItems.length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add top banner slide
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Desktop: width 3054 px · height 1080 px · ratio {formatImageRatio(3054, 1080)}. Tablet and mobile sizes are shown on each upload.
            </p>

            <AccordionRow
              title="Top banner text"
              summary={`Title, subtitle, and button · click to ${openTopText ? 'hide' : 'edit'}`}
              open={openTopText}
              onToggle={() => setOpenTopText((current) => !current)}
              className="mt-4"
            >
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerTitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show title</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerTitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerTitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerSubtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerSubtitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show subtitle</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerSubtitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerSubtitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.topBannerCtaText}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaText: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show button</span>
                <input
                  type="checkbox"
                  checked={!!form.topBannerCtaEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaEnabled: event.target.checked }))}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button BG</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.topBannerCtaBgColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaBgColor: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button Text</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.topBannerCtaTextColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, topBannerCtaTextColor: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            </AccordionRow>
          </div>

          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Bottom Large Banner</h2>
            <p className="mb-3 text-xs font-medium text-slate-500">
              Layout slot: Row 2 right side · upload multiple images for a slider · Slide 1 plays first
            </p>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-700">Enable banner slider</span>
              <input
                type="checkbox"
                checked={!!form.bottomBannerSliderEnabled}
                onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSliderEnabled: event.target.checked }))}
              />
            </div>

            <label className="mb-4 block max-w-xs">
              <span className="mb-1 block text-sm font-medium text-slate-700">Slide interval (ms)</span>
              <input
                type="number"
                min="2000"
                max="15000"
                step="500"
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                value={form.bottomBannerSliderInterval}
                onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSliderInterval: Number(event.target.value) || 4000 }))}
              />
            </label>

            <div className="space-y-3">
              {form.bottomBannerSliderItems.map((slide, index) => {
                const slideId = slide.id || `bottom-slide-${index}`
                return (
                  <LargeBannerSlideCard
                    key={slideId}
                    slide={slide}
                    index={index}
                    total={form.bottomBannerSliderItems.length}
                    recommendedSizes={BOTTOM_BANNER_SIZES}
                    open={openBottomSlideId === slideId}
                    onToggle={() => setOpenBottomSlideId((current) => (current === slideId ? null : slideId))}
                    onMove={(direction) => moveLargeBannerSlide('bottomBannerSliderItems', index, direction)}
                    onRemove={() => removeLargeBannerSlide('bottomBannerSliderItems', index)}
                    onUpload={(field, file) => uploadLargeBannerSlideField('bottomBannerSliderItems', index, field, file)}
                    onChange={(field, value) => updateLargeBannerSlide('bottomBannerSliderItems', index, field, value)}
                    categoryOptions={categoryOptions}
                    productOptions={productOptions}
                  />
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => addLargeBannerSlide('bottomBannerSliderItems', 'Bottom banner')}
              disabled={form.bottomBannerSliderItems.length >= 8}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add bottom banner slide
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Desktop: width 3054 px · height 370 px · ratio {formatImageRatio(3054, 370)}. Tablet and mobile sizes are shown on each upload.
            </p>

            <AccordionRow
              title="Bottom banner text"
              summary={`Title, subtitle, and button · click to ${openBottomText ? 'hide' : 'edit'}`}
              open={openBottomText}
              onToggle={() => setOpenBottomText((current) => !current)}
              className="mt-4"
            >
            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerTitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show title</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerTitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerTitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerSubtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSubtitle: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show subtitle</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerSubtitleEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerSubtitleEnabled: event.target.checked }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={form.bottomBannerCtaText}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaText: event.target.value }))}
                />
              </label>
              <label className="inline-flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">Show button</span>
                <input
                  type="checkbox"
                  checked={!!form.bottomBannerCtaEnabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaEnabled: event.target.checked }))}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button BG</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.bottomBannerCtaBgColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaBgColor: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Button Text</span>
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg border border-slate-300"
                    value={form.bottomBannerCtaTextColor}
                    onChange={(event) => setForm((prev) => ({ ...prev, bottomBannerCtaTextColor: event.target.value }))}
                  />
                </label>
              </div>
            </div>
            </AccordionRow>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Product banner cards</h2>
            <p className="text-xs text-slate-500">
              Up to 4 cards · remove empty slots · storefront auto-resizes to 1–4 columns
            </p>
          </div>
          <button
            type="button"
            onClick={addProductBanner}
            disabled={form.productBanners.length >= 4}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add banner card
          </button>
        </div>
        {form.productBanners.map((banner, index) => (
          <AccordionRow
            key={`product-banner-${index}`}
            title={`Banner ${index + 1}`}
            summary={`${PRODUCT_SLOT_LABELS[index] || `Card ${index + 1}`} · 1225 × 639 px · ratio ${formatImageRatio(1225, 639)} · click to ${openProductIndex === index ? 'hide' : 'edit'}`}
            open={openProductIndex === index}
            onToggle={() => setOpenProductIndex((current) => (current === index ? null : index))}
            className="shadow-sm"
            actions={(
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveProductBanner(index, -1)}
                  disabled={index === 0}
                  title="Move left (earlier)"
                  className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveProductBanner(index, 1)}
                  disabled={index === form.productBanners.length - 1}
                  title="Move right (later)"
                  className="inline-flex items-center rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeProductBanner(index)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}
          >
            <p className="mb-3 text-xs font-medium text-slate-500">
              Cards without any image are hidden on the storefront. Desktop width 1225 px · height 639 px · ratio {formatImageRatio(1225, 639)}.
            </p>

            <div className="mb-4">
              <ShowcaseLocaleImageGroups
                item={banner}
                recommendedSizes={PRODUCT_BANNER_SIZES}
                onUpload={(field, file) => uploadProductBannerField(index, field, file)}
                onChange={(field, value) => updateBanner(index, field, value)}
              />
            </div>

            <div className="grid gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Title</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.title}
                  onChange={(event) => updateBanner(index, 'title', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Subtitle</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.subtitle}
                  onChange={(event) => updateBanner(index, 'subtitle', event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Button text</span>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  value={banner.buttonText}
                  onChange={(event) => updateBanner(index, 'buttonText', event.target.value)}
                />
              </label>

              <ShowcaseLinkAccordion
                link={banner.link}
                linkType={banner.linkType}
                targetBlank={banner.targetBlank}
                categories={categoryOptions}
                products={productOptions}
                onLinkChange={(value) => updateBanner(index, 'link', value)}
                onLinkTypeChange={(value) => updateBanner(index, 'linkType', value)}
                onTargetBlankChange={(value) => updateBanner(index, 'targetBlank', value)}
              />
            </div>
          </AccordionRow>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Showcase Banners'}
        </button>
      </div>
    </div>
  )
}
