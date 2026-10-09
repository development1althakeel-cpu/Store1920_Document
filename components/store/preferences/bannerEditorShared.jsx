'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Check, ChevronDown, Search, Upload } from 'lucide-react'
import {
  createShowcaseLinkFromChoice,
  flattenShowcaseCategories,
  inferShowcaseLinkType,
  readShowcaseLinkChoice,
} from '@/lib/showcaseBannerLinks'

export const SHOWCASE_IMAGE_GROUPS = [
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

function gcd(first, second) {
  return second ? gcd(second, first % second) : first
}

export function formatImageRatio(width, height) {
  const divisor = gcd(width, height)
  const ratioWidth = width / divisor
  const ratioHeight = height / divisor
  if (ratioWidth <= 40 && ratioHeight <= 40) {
    return `${ratioWidth}:${ratioHeight}`
  }
  return `${(width / height).toFixed(2)}:1`
}

export function ShowcaseImageSlot({ label, size, value, onUpload, onClear }) {
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

export function SmoothPanel({ open, children }) {
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

export function AccordionRow({ title, summary, open, onToggle, children, actions, className = '' }) {
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

export function ShowcaseLocaleImageGroups({ item, recommendedSizes, onUpload, onChange }) {
  const [openGroups, setOpenGroups] = useState({})

  return (
    <div className="space-y-3">
      {SHOWCASE_IMAGE_GROUPS.map((group) => {
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

function getLinkSummary(link, linkType) {
  const choice = readShowcaseLinkChoice(link, linkType)
  if (choice.type === 'category') return choice.value ? `Category · ${choice.value}` : 'Category · not selected'
  if (choice.type === 'product') return choice.value ? `Product · ${choice.value}` : 'Product · not selected'
  return choice.value ? `Custom URL · ${choice.value}` : 'Custom URL · not set'
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

export function ShowcaseLinkFields({
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

export function ShowcaseLinkAccordion(props) {
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
