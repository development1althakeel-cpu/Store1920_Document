import { mongoSalePriceExpr } from '@/lib/productPriceFilter'

export function normalizeProductListSort(sort = 'newest') {
  switch (String(sort || 'newest')) {
    case 'price-low-high':
    case 'price-low':
    case 'priceLowToHigh':
      return 'priceLowToHigh'
    case 'price-high-low':
    case 'price-high':
    case 'priceHighToLow':
      return 'priceHighToLow'
    case 'nameAZ':
    case 'name-az':
      return 'nameAZ'
    case 'nameZA':
    case 'name-za':
      return 'nameZA'
    case 'rating':
      return 'rating'
    case 'discount':
      return 'discount'
    case 'popularity':
      return 'popularity'
    case 'newest':
    default:
      return 'newest'
  }
}

export function buildProductListSort(sort = 'newest') {
  switch (normalizeProductListSort(sort)) {
    case 'priceLowToHigh':
      return { price: 1, createdAt: -1 }
    case 'priceHighToLow':
      return { price: -1, createdAt: -1 }
    case 'nameAZ':
      return { name: 1 }
    case 'nameZA':
      return { name: -1 }
    case 'popularity':
      return { soldCount: -1, createdAt: -1 }
    case 'rating':
      return { soldCount: -1, createdAt: -1 }
    case 'discount':
      return { AED: -1, price: 1, createdAt: -1 }
    case 'newest':
    default:
      return { createdAt: -1 }
  }
}

function mergePriceBounds(priceQuery, { min, max } = {}) {
  if (Number.isFinite(min)) {
    priceQuery.min = priceQuery.min != null ? Math.max(priceQuery.min, min) : min
  }
  if (Number.isFinite(max)) {
    priceQuery.max = priceQuery.max != null ? Math.min(priceQuery.max, max) : max
  }
}

export function applyShopPriceFilters(matchStage, { priceFilter = 'all', minPrice = '', maxPrice = '' } = {}) {
  const bounds = {}

  if (priceFilter === 'under499') {
    mergePriceBounds(bounds, { max: 498.99 })
  } else if (priceFilter === '500to999') {
    mergePriceBounds(bounds, { min: 500, max: 999 })
  } else if (priceFilter === '1000to1999') {
    mergePriceBounds(bounds, { min: 1000, max: 1999 })
  } else if (priceFilter === '2000plus') {
    mergePriceBounds(bounds, { min: 2000 })
  }

  const minValue = Number(minPrice)
  const maxValue = Number(maxPrice)
  if (Number.isFinite(minValue) && String(minPrice).trim() !== '') {
    mergePriceBounds(bounds, { min: minValue })
  }
  if (Number.isFinite(maxValue) && String(maxPrice).trim() !== '') {
    mergePriceBounds(bounds, { max: maxValue })
  }

  if (bounds.min == null && bounds.max == null) return

  const exprAnd = []
  if (bounds.min != null) exprAnd.push({ $gte: [mongoSalePriceExpr(), bounds.min] })
  if (bounds.max != null) exprAnd.push({ $lte: [mongoSalePriceExpr(), bounds.max] })

  if (!matchStage.$and) matchStage.$and = []
  matchStage.$and.push({ $expr: exprAnd.length === 1 ? exprAnd[0] : { $and: exprAnd } })
}

export function collectDescendantCategoryIds(allCategories = [], rootCategoryId) {
  const rootId = String(rootCategoryId || '').trim();
  if (!rootId) return [];

  const ids = new Set([rootId]);
  let added = true;

  while (added) {
    added = false;
    for (const category of allCategories) {
      const id = String(category?._id || '').trim();
      const parentId = String(category?.parentId || '').trim();
      if (!id || !parentId || ids.has(id) || !ids.has(parentId)) continue;
      ids.add(id);
      added = true;
    }
  }

  return Array.from(ids);
}

export async function buildCategoryMatchConditions(categoryParam, Category) {
  if (!categoryParam) return []

  const normalizedName = categoryParam.replace(/-/g, ' ').trim()
  const slugWords = categoryParam
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const separator = '(?:\\s*&\\s*|\\s+|\\s+and\\s+)'
  const categoryRegex = new RegExp(slugWords.join(separator), 'i')

  const escapedName = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const categoryDoc = await Category.findOne({
    $or: [
      { slug: categoryParam },
      { name: new RegExp(`^${escapedName}$`, 'i') },
      { nameAr: new RegExp(`^${escapedName}$`, 'i') },
    ],
  }).select('_id name nameAr slug').lean()

  return [
    ...(categoryDoc?._id ? [{ category: categoryDoc._id }, { categories: categoryDoc._id }] : []),
    ...(categoryDoc?.name ? [{ category: categoryDoc.name }, { categories: categoryDoc.name }] : []),
    ...(categoryDoc?.nameAr ? [{ category: categoryDoc.nameAr }, { categories: categoryDoc.nameAr }] : []),
    ...(categoryDoc?.slug ? [{ category: categoryDoc.slug }, { categories: categoryDoc.slug }] : []),
    { category: categoryParam },
    { categories: categoryParam },
    { category: normalizedName },
    { categories: normalizedName },
    { category: categoryRegex },
    { categories: categoryRegex },
  ]
}

export async function applyCategoryFilter(matchStage, categoryParam, Category) {
  const categoryConditions = await buildCategoryMatchConditions(categoryParam, Category)
  if (!categoryConditions.length) return

  if (!matchStage.$and) {
    matchStage.$and = []
  }
  matchStage.$and.push({ $or: categoryConditions })
}

export async function applyCategoriesFilter(matchStage, categoryParams, Category) {
  const slugs = Array.from(new Set(
    (Array.isArray(categoryParams) ? categoryParams : [categoryParams])
      .map((slug) => String(slug || '').trim())
      .filter(Boolean),
  ))

  if (!slugs.length) return

  const allCategories = await Category.find({ isActive: { $ne: false } })
    .select('_id parentId slug')
    .lean()

  const slugLookup = new Map(
    allCategories.map((category) => [String(category?.slug || '').trim().toLowerCase(), category]),
  )

  const matchedCategoryIds = new Set()
  const legacySlugs = []

  for (const slug of slugs) {
    const categoryDoc = slugLookup.get(slug.toLowerCase())
    if (categoryDoc?._id) {
      collectDescendantCategoryIds(allCategories, categoryDoc._id)
        .forEach((id) => matchedCategoryIds.add(id))
      continue
    }
    legacySlugs.push(slug)
  }

  const orConditions = []

  if (matchedCategoryIds.size) {
    const categoryIds = Array.from(matchedCategoryIds)
    orConditions.push(
      { category: { $in: categoryIds } },
      { categories: { $in: categoryIds } },
    )
  }

  for (const slug of legacySlugs) {
    const conditions = await buildCategoryMatchConditions(slug, Category)
    orConditions.push(...conditions)
  }

  if (!orConditions.length) return

  if (!matchStage.$and) {
    matchStage.$and = []
  }
  matchStage.$and.push({ $or: orConditions })
}

export function buildShopMatchStage({
  includeOutOfStock = false,
  fastDelivery = false,
  inStockOnly = false,
  bestSellerOnly = false,
  priceFilter = 'all',
  minPrice = '',
  maxPrice = '',
} = {}) {
  const matchStage = {}

  if (!includeOutOfStock || inStockOnly) {
    matchStage.inStock = true
  }

  if (fastDelivery) {
    matchStage.fastDelivery = true
  }

  if (bestSellerOnly) {
    if (!matchStage.$and) matchStage.$and = []
    matchStage.$and.push({
      $or: [
        { tags: { $regex: /bestseller|best seller|top seller/i } },
        { badges: { $regex: /best seller/i } },
      ],
    })
  }

  applyShopPriceFilters(matchStage, { priceFilter, minPrice, maxPrice })

  return matchStage
}

export function applyStorefrontVisibilityFilters(matchStage = {}) {
  matchStage.published = { $ne: false }
  return matchStage
}
