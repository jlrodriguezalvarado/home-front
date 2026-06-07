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
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  image: string | null;
  commerce: Commerce;
  category: Category | null;
  unit: string;
}
