export const TOP_DEALS_SECTION_KEYS = ['top_deals', 'top-deals', 'topdeals']

export function normalizeHomeSectionKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function isTopDealsSectionKey(value) {
  return TOP_DEALS_SECTION_KEYS.includes(normalizeHomeSectionKey(value))
}

export function findTopDealsSection(homeSections = []) {
  return (Array.isArray(homeSections) ? homeSections : []).find((item) => (
    isTopDealsSectionKey(item?.section)
  )) || null
}

export function isTopDealsVisibleOnWebsite(section) {
  return Boolean(section) && section.isActive !== false
}
