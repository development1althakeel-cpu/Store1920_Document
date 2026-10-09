import { toPublicCategoryPath } from '@/lib/categorySlug'

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch {
    return String(value || '')
  }
}

function normalizeShowcaseLinkPath(link) {
  const raw = String(link || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    return `${url.pathname || ''}${url.search || ''}`
  } catch {
    return raw
  }
}

export function inferShowcaseLinkType(link) {
  const normalized = normalizeShowcaseLinkPath(link)
  if (!normalized) return { type: 'custom', value: '' }

  if (normalized.startsWith('/category/')) {
    return { type: 'category', value: normalized.replace(/^\/category\//, '').trim() }
  }

  if (normalized.startsWith('/shop?')) {
    const query = normalized.split('?')[1] || ''
    const params = new URLSearchParams(query)
    const category = params.get('category')
    if (category) {
      return { type: 'category', value: safeDecode(category) }
    }
  }

  if (normalized.startsWith('/product/')) {
    return { type: 'product', value: safeDecode(normalized.replace('/product/', '').trim()) }
  }

  if (normalized.startsWith('/products/')) {
    return { type: 'product', value: safeDecode(normalized.replace('/products/', '').trim()) }
  }

  return { type: 'custom', value: String(link || '').trim() }
}

export function readShowcaseLinkChoice(link, linkType) {
  const inferred = inferShowcaseLinkType(link)
  const type = ['category', 'product', 'custom'].includes(linkType) ? linkType : inferred.type

  if (type === 'custom') {
    return { type, value: String(link || '').trim() }
  }

  if (inferred.type === type) {
    return inferred
  }

  return { type, value: '' }
}

export function createShowcaseLinkFromChoice(type, rawValue, extra = {}) {
  const value = String(rawValue || '').trim()
  if (!value) return ''

  if (type === 'category') {
    return toPublicCategoryPath(value)
  }

  if (type === 'product') {
    const prefix = extra.useProductsPath ? '/products' : '/product'
    return `${prefix}/${encodeURIComponent(value)}`
  }

  return value
}

export function flattenShowcaseCategories(categories = []) {
  const rows = []
  const seen = new Set()

  const walk = (items, depth) => {
    for (const item of items || []) {
      const slug = String(item?.slug || '').trim()
      if (slug && !seen.has(slug)) {
        seen.add(slug)
        rows.push({
          slug,
          label: `${'— '.repeat(depth)}${item?.name || slug}`,
        })
      }
      if (Array.isArray(item?.children) && item.children.length) {
        walk(item.children, slug ? depth + 1 : depth)
      }
    }
  }

  const list = Array.isArray(categories) ? categories : []
  const roots = list.filter((item) => !item?.parentId)
  walk(roots.length ? roots : list, 0)

  for (const item of list) {
    const slug = String(item?.slug || '').trim()
    if (slug && !seen.has(slug)) {
      seen.add(slug)
      rows.push({
        slug,
        label: item?.name || slug,
      })
    }
  }

  return rows
}

export function getShowcaseLinkProps(item = {}, fallbackHref = '/shop') {
  const href = String(item?.link || '').trim() || fallbackHref
  if (!item?.targetBlank) return { href }
  return {
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
  }
}
