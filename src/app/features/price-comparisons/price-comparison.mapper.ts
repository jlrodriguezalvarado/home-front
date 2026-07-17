import { ComparisonCategory, ComparisonPrice, ComparisonProduct, ComparisonStore, PriceComparison, PriceComparisonReport, ProductCategory, ReportOffer, ReportProduct, StoreRanking } from './price-comparison.models';
type ApiRecord = Record<string, unknown>;
function record(value: unknown, context: string): ApiRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${context} response`);
  return value as ApiRecord;
}
function value(source: ApiRecord, ...keys: string[]): unknown {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null) return source[key];
  return undefined;
}
function text(source: ApiRecord, ...keys: string[]): string {
  const found = value(source, ...keys);
  return found == null ? '' : String(found);
}
function requiredId(source: ApiRecord, context: string, ...keys: string[]): string {
  const id = text(source, ...keys);
  if (!id) throw new Error(`${context} is missing an id`);
  return id;
}
function relationId(source: ApiRecord, context: string, ...keys: string[]): string {
  const found = value(source, ...keys);
  if (found && typeof found === 'object') return requiredId(found as ApiRecord, context, 'id', 'uuid');
  const id = found == null ? '' : String(found);
  if (!id) throw new Error(`${context} is missing`);
  return id;
}
function numberValue(source: ApiRecord, ...keys: string[]): number | null {
  const found = value(source, ...keys);
  if (found === undefined || found === null || found === '') return null;
  const parsed = Number(found);
  return Number.isFinite(parsed) ? parsed : null;
}
function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const source = value as ApiRecord;
    const nested = source['results'] ?? source['data'] ?? source['items'];
    if (Array.isArray(nested)) return nested;
  }
  throw new Error('Invalid list response');
}
export function mapList<T>(response: unknown, mapper: (item: unknown) => T): T[] {
  return list(response).map(mapper);
}
export function mapComparison(raw: unknown): PriceComparison {
  const source = record(raw, 'comparison');
  return {
    id: requiredId(source, 'Comparison', 'id', 'uuid'),
    name: text(source, 'name', 'title'),
    description: text(source, 'description', 'details'),
    createdAt: text(source, 'created_at', 'createdAt') || null,
    updatedAt: text(source, 'updated_at', 'updatedAt') || null,
  };
}
export function mapStore(raw: unknown): ComparisonStore {
  const source = record(raw, 'store');
  return {
    id: requiredId(source, 'Store', 'id', 'uuid'),
    comparisonId: relationId(source, 'Store comparison', 'comparison', 'comparison_id', 'comparisonId'),
    name: text(source, 'name', 'store_name', 'storeName'),
    description: text(source, 'description', 'details'),
  };
}
export function mapCategory(raw: unknown): ComparisonCategory {
  const source = record(raw, 'category');
  return {
    id: requiredId(source, 'Category', 'id', 'uuid'),
    comparisonId: relationId(source, 'Category comparison', 'comparison', 'comparison_id', 'comparisonId'),
    name: text(source, 'name', 'category_name', 'categoryName'),
  };
}
function mapProductCategory(raw: unknown): ProductCategory {
  const source = record(raw, 'product category');
  return { id: requiredId(source, 'Product category', 'id', 'uuid'), name: text(source, 'name', 'category_name', 'categoryName') };
}
export function mapProduct(raw: unknown): ComparisonProduct {
  const source = record(raw, 'product');
  const categories = value(source, 'categories', 'product_categories', 'productCategories');
  return {
    id: requiredId(source, 'Product', 'id', 'uuid'),
    comparisonId: relationId(source, 'Product comparison', 'comparison', 'comparison_id', 'comparisonId'),
    name: text(source, 'name', 'product_name', 'productName'),
    description: text(source, 'description', 'details'),
    categories: categories == null ? [] : list(categories).map(mapProductCategory),
  };
}
export function mapPrice(raw: unknown): ComparisonPrice {
  const source = record(raw, 'price');
  const store = value(source, 'store');
  const product = value(source, 'product');
  const price = numberValue(source, 'price', 'amount', 'value');
  if (price === null) throw new Error('Price is missing or invalid');
  return {
    id: requiredId(source, 'Price', 'id', 'uuid'),
    storeId: relationId(source, 'Price store', 'store', 'store_id', 'storeId'),
    productId: relationId(source, 'Price product', 'product', 'product_id', 'productId'),
    price,
    storeName: text(source, 'store_name', 'storeName') || (store && typeof store === 'object' ? text(store as ApiRecord, 'name') : ''),
    productName: text(source, 'product_name', 'productName') || (product && typeof product === 'object' ? text(product as ApiRecord, 'name') : ''),
  };
}
function mapOffer(raw: unknown, productId = '', productName = ''): ReportOffer {
  const source = record(raw, 'report offer');
  const price = numberValue(source, 'price', 'amount', 'value');
  if (price === null) throw new Error('Report offer price is missing or invalid');
  return {
    id: text(source, 'id', 'uuid'),
    storeId: relationId(source, 'Report offer store', 'store', 'store_id', 'storeId'),
    storeName: text(source, 'store_name', 'storeName'),
    productId: text(source, 'product_id', 'productId') || productId,
    productName: text(source, 'product_name', 'productName') || productName,
    price,
  };
}
function mapReportProduct(raw: unknown): ReportProduct {
  const source = record(raw, 'report product');
  const id = requiredId(source, 'Report product', 'id', 'uuid', 'product_id', 'productId');
  const name = text(source, 'name', 'product_name', 'productName');
  const prices = value(source, 'prices', 'offers');
  const cheapest = value(source, 'cheapest_offers', 'cheapestOffers', 'best_offers', 'bestOffers');
  const minPrice = numberValue(source, 'min_price', 'minPrice', 'minimum_price', 'minimumPrice');
  const maxPrice = numberValue(source, 'max_price', 'maxPrice', 'maximum_price', 'maximumPrice');
  return {
    id,
    name,
    description: text(source, 'description', 'details'),
    categories: value(source, 'categories') == null ? [] : list(value(source, 'categories')).map(mapProductCategory),
    prices: prices == null ? [] : list(prices).map((item) => mapOffer(item, id, name)),
    cheapestOffers: cheapest == null ? [] : list(cheapest).map((item) => mapOffer(item, id, name)),
    minPrice,
    maxPrice,
    priceRange: numberValue(source, 'price_range', 'priceRange') ?? (minPrice !== null && maxPrice !== null ? maxPrice - minPrice : null),
  };
}
function mapRanking(raw: unknown): StoreRanking {
  const source = record(raw, 'store ranking');
  const total = numberValue(source, 'total', 'basket_total', 'basketTotal');
  return {
    storeId: requiredId(source, 'Store ranking', 'store_id', 'storeId', 'id'),
    storeName: text(source, 'store_name', 'storeName', 'name'),
    total: total ?? 0,
    pricedProducts: numberValue(source, 'priced_products', 'pricedProducts') ?? 0,
    missingProducts: numberValue(source, 'missing_products', 'missingProducts') ?? 0,
    isComplete: Boolean(value(source, 'is_complete', 'isComplete')),
  };
}
export function mapReport(raw: unknown): PriceComparisonReport {
  const source = record(raw, 'report');
  const summary = record(value(source, 'summary') ?? {}, 'report summary');
  const comparisonRaw = value(source, 'comparison');
  if (!comparisonRaw || typeof comparisonRaw !== 'object') throw new Error('Report comparison is missing');
  const stores = mapList(value(source, 'stores') ?? [], mapStore);
  const products = mapList(value(source, 'products') ?? [], mapReportProduct).sort((a, b) => (a.minPrice ?? Number.POSITIVE_INFINITY) - (b.minPrice ?? Number.POSITIVE_INFINITY));
  const rankings = mapList(value(summary, 'store_rankings', 'storeRankings') ?? [], mapRanking);
  const bestRaw = value(summary, 'best_complete_basket_stores', 'bestCompleteBasketStores') ?? [];
  const best = list(bestRaw).map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const match = rankings.find((ranking) => ranking.storeId === String(item));
      if (!match) throw new Error('Best complete basket store is not present in rankings');
      return match;
    }
    return mapRanking(item);
  });
  const cheapestRaw = value(summary, 'cheapest_products', 'cheapestProducts') ?? [];
  const cheapestIds = list(cheapestRaw).map((item) => typeof item === 'object' && item ? text(item as ApiRecord, 'id', 'product_id', 'productId') : String(item));
  return {
    comparison: mapComparison(comparisonRaw),
    stores,
    products,
    summary: {
      productCount: numberValue(summary, 'product_count', 'productCount') ?? products.length,
      storeCount: numberValue(summary, 'store_count', 'storeCount') ?? stores.length,
      pricedProductCount: numberValue(summary, 'priced_product_count', 'pricedProductCount') ?? products.filter((product) => product.minPrice !== null).length,
      cheapestProducts: cheapestIds.map((id) => products.find((product) => product.id === id)).filter((product): product is ReportProduct => Boolean(product)),
      storeRankings: rankings,
      bestCompleteBasketStores: best,
    },
  };
}
