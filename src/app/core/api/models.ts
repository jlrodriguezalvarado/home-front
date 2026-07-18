export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Commerce {
  id: string;
  name: string;
  logo: string | null;
  currencyCode: string;
  currencySymbol: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  active: boolean;
}

export type { Product, CartItem } from '../models/shopping.models';
