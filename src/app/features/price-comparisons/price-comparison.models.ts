export interface PriceComparison {
  id: string;
  name: string;
  description: string;
  createdAt: string | null;
  updatedAt: string | null;
}
export type DecimalString = string;
export interface ComparisonStore {
  id: string;
  comparisonId: string;
  name: string;
  description: string;
}
export interface ComparisonCategory {
  id: string;
  comparisonId: string;
  name: string;
}
export interface ProductCategory {
  id: string;
  name: string;
}
export interface ComparisonProduct {
  id: string;
  comparisonId: string;
  name: string;
  description: string;
  categories: ProductCategory[];
}
export interface ComparisonPrice {
  id: string;
  storeId: string;
  productId: string;
  price: DecimalString;
  storeName: string;
  productName: string;
}
export interface ReportOffer {
  id: string;
  storeId: string;
  storeName: string;
  productId: string;
  productName: string;
  price: DecimalString;
}
export interface ReportProduct {
  id: string;
  name: string;
  description: string;
  categories: ProductCategory[];
  prices: ReportOffer[];
  cheapestOffers: ReportOffer[];
  minPrice: DecimalString | null;
  maxPrice: DecimalString | null;
  priceRange: DecimalString | null;
}
export interface StoreRanking {
  storeId: string;
  storeName: string;
  total: DecimalString;
  pricedProducts: number;
  missingProducts: number;
  isComplete: boolean;
}
export interface PriceComparisonReport {
  comparison: PriceComparison;
  stores: ComparisonStore[];
  products: ReportProduct[];
  summary: {
    productCount: number;
    storeCount: number;
    pricedProductCount: number;
    cheapestProducts: ReportProduct[];
    storeRankings: StoreRanking[];
    bestCompleteBasketStores: StoreRanking[];
  };
}
export interface ComparisonPayload {
  name: string;
  description: string;
}
export interface StorePayload {
  comparison: string;
  name: string;
  description: string;
}
export interface CategoryPayload {
  comparison: string;
  name: string;
}
export interface ProductPayload {
  comparison: string;
  name: string;
  description: string;
  category_ids: string[];
}
export interface PricePayload {
  store_id: string;
  product_id: string;
  price: string;
}
