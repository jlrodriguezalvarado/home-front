import { PaginatedResponse } from '../../core/api/models';

export interface PriceComparisonDto {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonStoreDto {
  id: string;
  comparison: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ComparisonCategoryDto {
  id: string;
  comparison: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryDto {
  id: string;
  name: string;
}

export interface ComparisonProductDto {
  id: string;
  comparison: string;
  name: string;
  description: string;
  categories: ProductCategoryDto[];
  created_at: string;
  updated_at: string;
}

export interface ComparisonPriceDto {
  id: string;
  store: string;
  store_name: string;
  product: string;
  product_name: string;
  price: string;
  created_at: string;
  updated_at: string;
}

export interface ReportOfferDto {
  id: string;
  store: string;
  store_name: string;
  product: string;
  product_name: string;
  price: string;
}

export interface ReportProductDto {
  id: string;
  name: string;
  description: string;
  categories: ProductCategoryDto[];
  prices: ReportOfferDto[];
  cheapest_offers: ReportOfferDto[];
  min_price: string | null;
  max_price: string | null;
  price_range: string | null;
}

export interface StoreRankingDto {
  store_id: string;
  store_name: string;
  total: string;
  priced_products: number;
  missing_products: number;
  is_complete: boolean;
}

export interface PriceComparisonReportDto {
  comparison: PriceComparisonDto;
  stores: ComparisonStoreDto[];
  products: ReportProductDto[];
  summary: {
    product_count: number;
    store_count: number;
    priced_product_count: number;
    cheapest_products: string[];
    store_rankings: StoreRankingDto[];
    best_complete_basket_stores: StoreRankingDto[];
  };
}

/** The Django API paginates; the array variant is retained for legacy deployments. */
export type PriceComparisonListDto<T> = T[] | PaginatedResponse<T>;
