import { getVariantSelectionKeys, getVariantStock } from './productVariantOptions.js';

function positiveNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** Same color/size/option family, ignoring pack size. */
export function getVariantSelectionSignature(options = {}) {
  return getVariantSelectionKeys(options)
    .sort()
    .map((key) => `${key}:${String(options?.[key] ?? '').trim()}`)
    .join('|');
}

export function isBundlePackVariant(variant) {
  return positiveNumber(variant?.options?.bundleQty) > 0;
}

/** All pack sizes that share one physical inventory pool. */
export function getBundleSiblingIndexes(variants = [], matchedIndex = -1) {
  const list = Array.isArray(variants) ? variants : [];
  const matched = list[matchedIndex];
  if (!matched || !isBundlePackVariant(matched)) {
    return matchedIndex >= 0 ? [matchedIndex] : [];
  }

  const signature = getVariantSelectionSignature(matched.options);
  const indexes = [];
  list.forEach((variant, index) => {
    if (!isBundlePackVariant(variant)) return;
    if (getVariantSelectionSignature(variant.options) === signature) {
      indexes.push(index);
    }
  });
  return indexes.length ? indexes : [matchedIndex];
}

export function getBundleSiblingVariants(variants = [], options = {}) {
  const list = Array.isArray(variants) ? variants : [];
  const hasPack = positiveNumber(options?.bundleQty) > 0
    || list.some((variant) => isBundlePackVariant(variant));
  if (!hasPack) return [];

  const signature = getVariantSelectionSignature(options);
  return list.filter((variant) => (
    isBundlePackVariant(variant)
    && getVariantSelectionSignature(variant.options) === signature
  ));
}

/**
 * Physical units on the shelf for one option (or the whole product for Buy 1 / Bundle of 3).
 * Pack rows do not have their own stock — they share this number.
 */
export function getSharedBundleUnitStock(product = {}, options = {}) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const siblings = getBundleSiblingVariants(variants, options);
  if (siblings.length) {
    const unitStocks = siblings
      .map((variant) => getVariantStock(variant))
      .filter((amount) => Number.isFinite(amount));
    if (unitStocks.length) {
      return Math.max(0, Math.min(...unitStocks));
    }
  }

  const productStock = Number(product?.stockQuantity);
  return Number.isFinite(productStock) ? Math.max(0, productStock) : 0;
}

/** How many packs of this size can still be sold from the shared unit pool. */
export function getAvailableBundlePacks(product = {}, options = {}, bundleQty = 1) {
  const units = getSharedBundleUnitStock(product, options);
  const qty = Math.max(1, Number(bundleQty) || 1);
  return Math.floor(units / qty);
}

/** Unique physical units across pack families (do not count Buy 1 + Bundle of 3 twice). */
export function getSharedBundleUnitStockTotal(product = {}) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const packVariants = variants.filter(isBundlePackVariant);
  if (!packVariants.length) {
    const productStock = Number(product?.stockQuantity);
    return Number.isFinite(productStock) ? Math.max(0, productStock) : 0;
  }

  const seen = new Set();
  let total = 0;
  packVariants.forEach((variant) => {
    const signature = getVariantSelectionSignature(variant.options);
    if (seen.has(signature)) return;
    seen.add(signature);
    total += getSharedBundleUnitStock(product, variant.options);
  });
  return total;
}
