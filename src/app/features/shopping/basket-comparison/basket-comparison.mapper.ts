import { Product } from '../../../core/models/shopping.models';
import { mapApiProductToProduct } from '../../products/product.mapper';
import {
  BasketComparisonDetail,
  BasketComparisonLine,
  BasketComparisonListItem,
  BasketComparisonPriceCell,
  BasketComparisonTotal,
  BasketPriceMode,
} from './basket-comparison.models';

type ApiRecord = Record<string, unknown>;

function record(value: unknown, context: string): ApiRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${context} response`);
  }
  return value as ApiRecord;
}

function value(source: ApiRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
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

function nullableId(source: ApiRecord, ...keys: string[]): string | null {
  const found = value(source, ...keys);
  if (found == null || found === '') return null;
  return String(found);
}

function decimalText(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const source = value as ApiRecord;
    const nested = source['results'] ?? source['data'] ?? source['items'];
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function mapProduct(raw: unknown): Product {
  return mapApiProductToProduct(
    raw && typeof raw === 'object' ? (raw as ApiRecord) : { id: raw },
  );
}

function mapPriceMode(raw: unknown): BasketPriceMode {
  const mode = String(raw ?? 'missing');
  if (mode === 'base' || mode === 'linked' || mode === 'override' || mode === 'missing') {
    return mode;
  }
  return 'missing';
}

function mapPriceCell(raw: unknown): BasketComparisonPriceCell {
  const source = record(raw, 'basket comparison price cell');
  const linkedRaw = value(source, 'linked_product', 'linkedProduct');
  return {
    commerceId: requiredId(source, 'Price cell commerce', 'commerce_id', 'commerceId'),
    mode: mapPriceMode(value(source, 'mode')),
    linkedProductId: nullableId(source, 'linked_product_id', 'linkedProductId'),
    linkedProduct: linkedRaw ? mapProduct(linkedRaw) : null,
    overridePrice: decimalText(value(source, 'override_price', 'overridePrice')),
    effectivePrice: decimalText(value(source, 'effective_price', 'effectivePrice')),
    missingPrice: Boolean(value(source, 'missing_price', 'missingPrice')),
    lineTotal: decimalText(value(source, 'line_total', 'lineTotal')),
  };
}

function mapLine(raw: unknown): BasketComparisonLine {
  const source = record(raw, 'basket comparison line');
  const productRaw = value(source, 'base_product', 'baseProduct');
  if (!productRaw) throw new Error('Basket comparison line is missing base_product');
  return {
    id: requiredId(source, 'Basket comparison line', 'id'),
    baseProduct: mapProduct(productRaw),
    quantity: decimalText(value(source, 'quantity')) ?? '1',
    prices: list(value(source, 'prices')).map(mapPriceCell),
    hasMissingPrice: Boolean(value(source, 'has_missing_price', 'hasMissingPrice')),
  };
}

function mapTotal(raw: unknown): BasketComparisonTotal {
  const source = record(raw, 'basket comparison total');
  return {
    commerceId: requiredId(source, 'Total commerce', 'commerce_id', 'commerceId'),
    total: decimalText(value(source, 'total')) ?? '0',
    missingLineCount: Number(value(source, 'missing_line_count', 'missingLineCount') ?? 0),
  };
}

export function mapBasketComparisonDetail(raw: unknown): BasketComparisonDetail {
  const source = record(raw, 'basket comparison detail');
  const commerceIdsRaw = value(source, 'commerce_ids', 'commerceIds') ?? [];
  return {
    id: requiredId(source, 'Basket comparison', 'id'),
    status: text(source, 'status') || 'current',
    name: text(source, 'name'),
    description: text(source, 'description'),
    baseCommerceId: nullableId(source, 'base_commerce_id', 'baseCommerceId'),
    commerceIds: list(commerceIdsRaw).map((id) => String(id)),
    lines: list(value(source, 'lines')).map(mapLine),
    totalsByCommerce: list(value(source, 'totals_by_commerce', 'totalsByCommerce')).map(mapTotal),
    updatedAt: text(source, 'updated_at', 'updatedAt'),
  };
}

export function mapBasketComparisonListItem(raw: unknown): BasketComparisonListItem {
  const source = record(raw, 'basket comparison list item');
  const commerceIdsRaw = value(source, 'commerce_ids', 'commerceIds') ?? [];
  return {
    id: requiredId(source, 'Basket comparison list item', 'id'),
    status: text(source, 'status') || 'saved',
    name: text(source, 'name'),
    description: text(source, 'description'),
    baseCommerceId: nullableId(source, 'base_commerce_id', 'baseCommerceId'),
    commerceIds: list(commerceIdsRaw).map((id) => String(id)),
    lineCount: Number(value(source, 'line_count', 'lineCount') ?? 0),
    updatedAt: text(source, 'updated_at', 'updatedAt'),
    createdAt: text(source, 'created_at', 'createdAt'),
  };
}

export function mapBasketComparisonList(raw: unknown): BasketComparisonListItem[] {
  return list(raw).map(mapBasketComparisonListItem);
}

export function mapSuggestProducts(raw: unknown): Product[] {
  return list(raw).map(mapProduct);
}
