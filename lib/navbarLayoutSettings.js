import { DEFAULT_OFFERS_NAV_STYLE, getOffersNavButtonAppearance, normalizeOffersNavStyle } from '@/lib/offersPageSettings'

export const DEFAULT_CATEGORIES_BUTTON_STYLE = {
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: '500',
  fontColor: '#334155',
  fontColorAuto: false,
  borderWidth: 1,
  borderColor: '#ffffff',
  borderRadius: 16,
  width: 0,
  backgroundTransparent: false,
  backgroundColor: '#ffffff',
}

export const DEFAULT_SEARCH_STYLE = {
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: '400',
  fontColor: '#1e293b',
  fontColorAuto: false,
  borderWidth: 1,
  borderColor: '#ffffff',
  borderRadius: 16,
  width: 0,
  backgroundTransparent: false,
  backgroundColor: '#ffffff',
  animation: 'none',
}

export const NAVBAR_FIXED_ITEM_IDS = [
  'logo',
  'deals',
  'categories',
  'search',
  'account',
  'orders',
  'wishlist',
  'cart',
]

export const DEFAULT_NAVBAR_ITEM_ORDER = [...NAVBAR_FIXED_ITEM_IDS]

export const DEFAULT_NAVBAR_LAYOUT = {
  extraButtons: [],
  searchMaxWidth: 600,
  searchPlaceholder: '',
  searchPlaceholderAr: '',
  searchStyle: { ...DEFAULT_SEARCH_STYLE },
  navbarMaxWidth: 1400,
  itemGap: 12,
  mobileItemGap: 4,
  stickyHeader: false,
  showCategoriesButton: true,
  categoriesButtonLabel: '',
  categoriesButtonLabelAr: '',
  categoriesButtonStyle: { ...DEFAULT_CATEGORIES_BUTTON_STYLE },
  itemOrder: [...DEFAULT_NAVBAR_ITEM_ORDER],
}

const MAX_EXTRA_BUTTONS = 3

export function createNavbarExtraButton() {
  return {
    id: `nav-extra-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    labelAr: '',
    link: '/offers',
    enabled: true,
    style: { ...DEFAULT_OFFERS_NAV_STYLE },
  }
}

export function normalizeNavbarExtraButtons(value = []) {
  if (!Array.isArray(value)) return []
  return value.slice(0, MAX_EXTRA_BUTTONS).map((item, index) => ({
    id: String(item?.id || `nav-extra-${index + 1}`).trim() || `nav-extra-${index + 1}`,
    label: String(item?.label || '').trim(),
    labelAr: String(item?.labelAr || '').trim(),
    link: String(item?.link || '').trim() || '/offers',
    enabled: item?.enabled !== false,
    style: normalizeOffersNavStyle(item?.style),
  }))
}

function clampWidth(value, min, max, fallback) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.max(min, Math.min(max, Math.round(next)))
}

export function defaultNavbarItemOrder(extraButtons = []) {
  const extras = normalizeNavbarExtraButtons(extraButtons).map((item) => item.id)
  return ['logo', 'deals', ...extras, 'categories', 'search', 'account', 'orders', 'wishlist', 'cart']
}

export function normalizeNavbarItemOrder(order, extraButtons = []) {
  const extras = normalizeNavbarExtraButtons(extraButtons).map((item) => item.id)
  const allowed = new Set([...NAVBAR_FIXED_ITEM_IDS, ...extras])
  const defaults = defaultNavbarItemOrder(extraButtons)
  const next = []
  const seen = new Set()

  for (const rawId of Array.isArray(order) ? order : []) {
    const id = String(rawId || '').trim()
    if (!id || !allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }

  for (const id of defaults) {
    if (seen.has(id)) continue
    let inserted = false
    const defaultIndex = defaults.indexOf(id)
    for (let index = defaultIndex + 1; index < defaults.length; index += 1) {
      const neighbor = next.indexOf(defaults[index])
      if (neighbor >= 0) {
        next.splice(neighbor, 0, id)
        inserted = true
        break
      }
    }
    if (!inserted) next.push(id)
    seen.add(id)
  }

  return next
}

export function moveNavbarItem(order, fromId, toId, extraButtons = []) {
  const next = normalizeNavbarItemOrder(order, extraButtons)
  const from = next.indexOf(fromId)
  const to = next.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return next
  const copy = [...next]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function isNavbarItemVisible(id, layout = {}, visibility = {}) {
  if (id === 'categories') return layout.showCategoriesButton !== false
  if (id === 'orders') return visibility.orders !== false
  if (id === 'wishlist') return visibility.wishlist !== false
  if (id === 'cart') return visibility.cart !== false
  if (id === 'logo' || id === 'deals' || id === 'search' || id === 'account') return true
  const button = normalizeNavbarExtraButtons(layout.extraButtons).find((item) => item.id === id)
  return Boolean(button && button.enabled !== false && (button.label || button.labelAr))
}

export function getNavbarItemLabel(id, layout = {}) {
  if (id === 'logo') return 'Logo'
  if (id === 'deals') return 'LAST CHANCE'
  if (id === 'categories') return getNavbarCategoriesButtonLabel(layout, 'en', 'Categories')
  if (id === 'search') return 'Search'
  if (id === 'account') return 'Account'
  if (id === 'orders') return 'Orders'
  if (id === 'wishlist') return 'Wishlist'
  if (id === 'cart') return 'Cart'
  const button = normalizeNavbarExtraButtons(layout.extraButtons).find((item) => item.id === id)
  return button?.label || button?.labelAr || 'Button'
}

export function getNavbarArrangeItems(layout = {}, visibility = {}) {
  return normalizeNavbarItemOrder(layout.itemOrder, layout.extraButtons)
    .filter((id) => isNavbarItemVisible(id, layout, visibility))
    .map((id) => ({ id, label: getNavbarItemLabel(id, layout) }))
}

export function normalizeNavbarLayout(raw = {}) {
  const extraButtons = normalizeNavbarExtraButtons(raw.extraButtons || raw.navExtraButtons)
  return {
    extraButtons,
    searchMaxWidth: clampWidth(raw.searchMaxWidth, 320, 900, DEFAULT_NAVBAR_LAYOUT.searchMaxWidth),
    searchPlaceholder: String(raw.searchPlaceholder || '').trim(),
    searchPlaceholderAr: String(raw.searchPlaceholderAr || '').trim(),
    searchStyle: normalizeOffersNavStyle({
      ...DEFAULT_SEARCH_STYLE,
      ...(raw.searchStyle && Object.keys(raw.searchStyle).length ? raw.searchStyle : {}),
    }),
    navbarMaxWidth: clampWidth(raw.navbarMaxWidth, 1100, 1400, DEFAULT_NAVBAR_LAYOUT.navbarMaxWidth),
    itemGap: clampWidth(raw.itemGap, 0, 48, DEFAULT_NAVBAR_LAYOUT.itemGap),
    mobileItemGap: clampWidth(raw.mobileItemGap, 0, 24, DEFAULT_NAVBAR_LAYOUT.mobileItemGap),
    stickyHeader: raw.stickyHeader === true,
    showCategoriesButton: raw.showCategoriesButton !== false,
    categoriesButtonLabel: String(raw.categoriesButtonLabel || '').trim(),
    categoriesButtonLabelAr: String(raw.categoriesButtonLabelAr || '').trim(),
    categoriesButtonStyle: normalizeOffersNavStyle(
      raw.categoriesButtonStyle && Object.keys(raw.categoriesButtonStyle).length
        ? raw.categoriesButtonStyle
        : DEFAULT_CATEGORIES_BUTTON_STYLE,
    ),
    itemOrder: normalizeNavbarItemOrder(raw.itemOrder || raw.navbarItemOrder, extraButtons),
  }
}

export function getNavbarCategoriesButtonAppearance(layout = {}, variant = 'desktop') {
  const appearance = getOffersNavButtonAppearance(
    layout?.categoriesButtonStyle || DEFAULT_CATEGORIES_BUTTON_STYLE,
    variant,
  )
  const fontSize = Number.parseInt(String(appearance.style?.fontSize || ''), 10)
  const chevronSize = Math.max(12, Math.round((Number.isFinite(fontSize) ? fontSize : 13) * 0.95))
  return {
    ...appearance,
    chevronSize,
  }
}

export function getNavbarSearchAppearance(layout = {}, variant = 'desktop') {
  const appearance = getOffersNavButtonAppearance(
    layout?.searchStyle && Object.keys(layout.searchStyle || {}).length
      ? layout.searchStyle
      : DEFAULT_SEARCH_STYLE,
    variant,
  )
  const style = appearance.style || {}
  return {
    fontId: appearance.fontId,
    boxStyle: {
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth,
      borderStyle: style.borderStyle,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
    },
    inputStyle: {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      color: style.color,
    },
    textColor: appearance.textColor,
  }
}

export function visibleNavbarExtraButtons(buttons = [], language = 'en') {
  return normalizeNavbarExtraButtons(buttons)
    .filter((item) => item.enabled && (item.label || item.labelAr))
    .map((item) => ({
      ...item,
      displayLabel: language === 'ar'
        ? (item.labelAr || item.label)
        : (item.label || item.labelAr),
    }))
    .filter((item) => item.displayLabel)
}

export function getNavbarCategoriesButtonLabel(layout = {}, language = 'en', fallback = 'Categories') {
  const english = String(layout.categoriesButtonLabel || '').trim()
  const arabic = String(layout.categoriesButtonLabelAr || '').trim()
  if (language === 'ar') return arabic || english || fallback
  return english || arabic || fallback
}
