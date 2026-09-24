import { Product } from '../../../core/models/shopping.models';

export type BasketComparisonStatus = 'current' | 'saved' | string;
export type BasketPriceMode = 'base' | 'linked' | 'override' | 'missing';
export type BasketSetPriceMode = 'linked' | 'override';
export type DecimalString = string;

export interface BasketComparisonPriceCell {
  commerceId: string;
  mode: BasketPriceMode;
  linkedProductId: string | null;
  linkedProduct: Product | null;
  overridePrice: DecimalString | null;
  effectivePrice: DecimalString | null;
  missingPrice: boolean;
  lineTotal: DecimalString | null;
}

export interface BasketComparisonLine {
  id: string;
  baseProduct: Product;
  quantity: DecimalString;
  prices: BasketComparisonPriceCell[];
  hasMissingPrice: boolean;
}

export interface BasketComparisonTotal {
  commerceId: string;
  total: DecimalString;
  missingLineCount: number;
}

export interface BasketComparisonDetail {
  id: string;
  status: BasketComparisonStatus;
  name: string;
  description: string;
  baseCommerceId: string | null;
  commerceIds: string[];
  lines: BasketComparisonLine[];
  totalsByCommerce: BasketComparisonTotal[];
  updatedAt: string;
}

export interface BasketComparisonListItem {
  id: string;
  status: BasketComparisonStatus;
  name: string;
  description: string;
  baseCommerceId: string | null;
  commerceIds: string[];
  lineCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface BasketFromCartPayload {
  commerceId?: string | null;
}

export interface BasketSavePayload {
  name: string;
  description?: string;
  fromCurrent: true;
}

export interface BasketSetPricePayload {
  commerceId: string;
  mode: BasketSetPriceMode;
  linkedProductId?: string | null;
  overridePrice?: string | null;
}

export interface BasketPatchPayload {
  name?: string;
  description?: string;
  commerceIds?: string[];
}
