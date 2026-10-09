import { getCustomerSiteUrl, normalizePublicSiteUrl } from '@/lib/appUrl';
import { getVariantSelectionKeys, getVariantStock } from '@/lib/productVariantOptions';
import { getAvailableBundlePacks, isBundlePackVariant } from '@/lib/bundleSharedStock';
import { getProductThumbnailUrl } from '@/lib/productMedia';
import { getProductAbsoluteUrl } from '@/lib/productUrl';
import { applyStorefrontPublishedFilter } from '@/lib/productVisibility';
import { PLACEHOLDER_IMAGE } from '@/lib/mediaUrls';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import Product from '@/models/Product';

export const META_PRODUCT_FEED_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'brand',
  'product_type',
  'custom_label_0',
];

const HTML_TAG_REGEX = /<[^>]+>/g;

function stripHtml(value = '') {
  return String(value || '').replace(HTML_TAG_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

function escapeCsv(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function formatAed(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `${value.toFixed(2)} AED`;
}

function slugLabel(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function toAbsoluteHttpsUrl(url = '', baseUrl = getCustomerSiteUrl()) {
  const value = String(url || '').trim();
  if (!value || value === PLACEHOLDER_IMAGE) return '';
  const base = normalizePublicSiteUrl(baseUrl).replace(/\/$/, '');

  let resolved = value;
  if (value.startsWith('//')) resolved = `https:${value}`;
  else if (value.startsWith('/')) resolved = `${base}${value}`;
  else if (!/^https?:\/\//i.test(value)) resolved = `${base}/${value.replace(/^\//, '')}`;

  if (/^http:\/\//i.test(resolved)) {
    resolved = resolved.replace(/^http:/i, 'https:');
  }

  return /^https:\/\//i.test(resolved) ? resolved : '';
}

function uniqueFeedId(preferred, usedIds) {
  const base = String(preferred || '').trim().slice(0, 90);
  if (!base) return '';

  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }

  let index = 2;
  let next = `${base}-${index}`;
  while (usedIds.has(next)) {
    index += 1;
    next = `${base}-${index}`;
  }
  usedIds.add(next);
  return next;
}

function variantLabel(variant) {
  const options = variant?.options && typeof variant.options === 'object' ? variant.options : {};
  const parts = getVariantSelectionKeys(options)
    .map((key) => String(options[key] || '').trim())
    .filter(Boolean);

  const bundleQty = Number(options.bundleQty);
  if (Number.isFinite(bundleQty) && bundleQty > 1) {
    parts.push(`Bundle of ${bundleQty}`);
  }

  return parts.join(' / ');
}

function resolveImageUrl(product, variant, baseUrl) {
  const variantImage = String(variant?.options?.image || variant?.image || '').trim();
  if (variantImage) {
    const absolute = toAbsoluteHttpsUrl(variantImage, baseUrl);
    if (absolute) return absolute;
  }

  const combined = {
    images: [
      ...(Array.isArray(product.images) ? product.images : []),
      ...(Array.isArray(product.externalImages) ? product.externalImages : []),
    ],
    image: product.image,
  };
  return toAbsoluteHttpsUrl(getProductThumbnailUrl(combined, { fallback: '' }), baseUrl);
}

function resolvePrices(product, variant) {
  const saleAmount = Number(variant?.price ?? product.price ?? product.AED ?? 0);
  const regularAmount = Number(
    variant?.AED
    ?? variant?.mrp
    ?? product.AED
    ?? product.mrp
    ?? saleAmount,
  );
  const sale = Number.isFinite(saleAmount) && saleAmount > 0 ? saleAmount : 0;
  const regular = Number.isFinite(regularAmount) && regularAmount > 0 ? regularAmount : sale;
  return { sale, regular };
}

function resolveAvailability(product, variant) {
  if (variant) {
    if (isBundlePackVariant(variant)) {
      const qty = Number(variant.options?.bundleQty) || 1;
      return getAvailableBundlePacks(product, variant.options, qty) > 0
        ? 'in stock'
        : 'out of stock';
    }
    return getVariantStock(variant) > 0 ? 'in stock' : 'out of stock';
  }

  if (product.inStock === false) return 'out of stock';
  if (typeof product.stockQuantity === 'number') {
    return product.stockQuantity > 0 ? 'in stock' : 'out of stock';
  }
  return 'in stock';
}

function resolveCategory(product, categoryMap) {
  const ids = [
    product.category,
    ...(Array.isArray(product.categories) ? product.categories : []),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  for (const id of ids) {
    const match = categoryMap.get(id) || categoryMap.get(id.toLowerCase());
    if (match) return match;
  }

  const fallbackName = ids.find((id) => id.length < 80 && !/^[a-f0-9]{24}$/i.test(id)) || '';
  return {
    name: fallbackName,
    slug: slugLabel(fallbackName),
  };
}

function listVariants(product) {
  if (!Array.isArray(product.variants) || product.variants.length === 0) return [];
  return product.variants.filter((variant) => variant && typeof variant === 'object');
}

function mapFeedRow(product, variant, variantIndex, { baseUrl, categoryMap, usedIds }) {
  const parentSku = String(product.sku || '').trim();
  const variantSku = String(variant?.sku || '').trim();
  const preferredId = variant
    ? (variantSku || (parentSku ? `${parentSku}-${variantIndex + 1}` : String(product._id || '')))
    : (parentSku || String(product._id || ''));
  const id = uniqueFeedId(preferredId, usedIds);
  const titleBase = stripHtml(product.name || 'Product').slice(0, 150);
  const suffix = variant ? variantLabel(variant) : '';
  const title = suffix ? `${titleBase} - ${suffix}`.slice(0, 200) : titleBase;
  const description = stripHtml(
    product.shortDescription || product.description || product.name || 'Product',
  ).slice(0, 5000);
  const { sale, regular } = resolvePrices(product, variant);
  const link = toAbsoluteHttpsUrl(getProductAbsoluteUrl(product, baseUrl), baseUrl);
  const imageLink = resolveImageUrl(product, variant, baseUrl);
  const category = resolveCategory(product, categoryMap);

  if (!id || !title || !link || !imageLink || sale <= 0) return null;

  const onSale = regular > sale;
  return {
    id,
    title,
    description,
    availability: resolveAvailability(product, variant),
    condition: 'new',
    price: formatAed(onSale ? regular : sale),
    sale_price: onSale ? formatAed(sale) : '',
    link,
    image_link: imageLink,
    brand: stripHtml(product.brand || 'Store1920').slice(0, 70),
    product_type: stripHtml(category.name || ''),
    custom_label_0: slugLabel(category.slug || category.name || ''),
  };
}

function buildCategoryMap(categories = []) {
  const map = new Map();
  categories.forEach((category) => {
    const record = {
      name: String(category.name || '').trim(),
      slug: String(category.slug || '').trim(),
    };
    const keys = [
      String(category._id || ''),
      String(category.slug || ''),
      String(category.name || ''),
    ];
    keys.forEach((key) => {
      const normalized = String(key || '').trim();
      if (!normalized) return;
      map.set(normalized, record);
      map.set(normalized.toLowerCase(), record);
    });
  });
  return map;
}

export async function fetchMetaCatalogProducts() {
  await connectDB();

  const [products, categories] = await Promise.all([
    Product.find(applyStorefrontPublishedFilter({}))
      .select('name description shortDescription slug sku price AED mrp images externalImages brand category categories inStock stockQuantity published hasVariants variants useProductsPath')
      .sort({ updatedAt: -1 })
      .limit(50000)
      .lean(),
    Category.find({}).select('_id name slug').lean(),
  ]);

  return { products, categories };
}

export function buildMetaProductFeedRows(products = [], categories = [], baseUrl = getCustomerSiteUrl()) {
  const categoryMap = buildCategoryMap(categories);
  const usedIds = new Set();
  const rows = [];

  products.forEach((product) => {
    const variants = listVariants(product);
    if (variants.length) {
      variants.forEach((variant, index) => {
        const row = mapFeedRow(product, variant, index, { baseUrl, categoryMap, usedIds });
        if (row) rows.push(row);
      });
      return;
    }

    const row = mapFeedRow(product, null, 0, { baseUrl, categoryMap, usedIds });
    if (row) rows.push(row);
  });

  return rows;
}

export function toMetaProductCsv(rows = []) {
  const lines = [
    META_PRODUCT_FEED_HEADERS.join(','),
    ...rows.map((row) => META_PRODUCT_FEED_HEADERS.map((key) => escapeCsv(row[key])).join(',')),
  ];
  return `${lines.join('\n')}\n`;
}

export async function buildMetaProductFeedCsv() {
  const { products, categories } = await fetchMetaCatalogProducts();
  const rows = buildMetaProductFeedRows(products, categories, getCustomerSiteUrl());
  return toMetaProductCsv(rows);
}
