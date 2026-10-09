export function getProductSalePrice(product) {
  if (!product) return 0;

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    const variantPrices = product.variants
      .map((variant) => Number(variant?.price || variant?.salePrice || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (variantPrices.length > 0) return Math.min(...variantPrices);
  }

  const sale = Number(
    product.price
    ?? product.salePrice
    ?? product.sale_price
    ?? product.discountedPrice
    ?? product.sellingPrice
    ?? product.offerPrice
    ?? product.currentPrice
    ?? 0,
  );
  if (Number.isFinite(sale) && sale > 0) return sale;

  const fallback = Number(product.AED ?? 0);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0;
}

export function getSidebarPriceQuery(filters = {}) {
  const min = Number(filters.priceRange?.min);
  const max = Number(filters.priceRange?.max);
  const bound = Number(filters.priceBound);
  const minActive = filters.priceMinActive === true
    || (Number.isFinite(min) && min > 0);
  const maxActive = filters.priceMaxActive === true
    || (Number.isFinite(max) && bound > 0 && max < bound);

  return {
    minPrice: minActive && Number.isFinite(min) ? String(min) : '',
    maxPrice: maxActive && Number.isFinite(max) ? String(max) : '',
  };
}

export function productMatchesPriceRange(product, filters = {}) {
  const price = getProductSalePrice(product);
  const min = Number(filters.priceRange?.min ?? filters.min);
  const max = Number(filters.priceRange?.max ?? filters.max);
  const { minPrice, maxPrice } = getSidebarPriceQuery(filters);
  const minCap = minPrice !== '' ? Number(minPrice) : (Number.isFinite(min) && min > 0 ? min : null);
  const maxCap = maxPrice !== '' ? Number(maxPrice) : null;

  if (minCap != null && Number.isFinite(minCap) && price < minCap) return false;
  if (maxCap != null && Number.isFinite(maxCap) && price > maxCap) return false;
  return true;
}

export function applySidebarPriceFilters(products, filters = {}) {
  return (Array.isArray(products) ? products : []).filter((product) => (
    productMatchesPriceRange(product, filters)
  ));
}

export function mongoSalePriceExpr() {
  return {
    $let: {
      vars: {
        sale: { $convert: { input: '$price', to: 'double', onError: 0, onNull: 0 } },
        aed: { $convert: { input: '$AED', to: 'double', onError: 0, onNull: 0 } },
      },
      in: {
        $cond: [{ $gt: ['$$sale', 0] }, '$$sale', '$$aed'],
      },
    },
  };
}
