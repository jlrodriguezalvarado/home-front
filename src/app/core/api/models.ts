export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type { Product, CartItem } from '../models/shopping.models';
export type { Commerce } from '../../features/commerce/commerce.models';
export type { Currency } from '../../features/currency/currency.models';
export type { Category } from '../../features/products/product.models';
