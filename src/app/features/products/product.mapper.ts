import { Product } from '../../core/models/shopping.models';
import { resolveMediaUrl } from '../../core/api/api-url';
import { normalizePresentationUnit } from '../shopping/utils/presentation-unit.utils';
import { stableProductId } from '../shopping/utils/product-id.utils';
import { normalizeProductCurrency, resolveCurrencyCode } from '../shopping/utils/price.utils';

function resolveCurrencyFromRaw(raw: Record<string, unknown>): string {
  const commerce = raw['commerce'] as Record<string, unknown> | undefined;
  return normalizeProductCurrency(
    { originalCurrency: raw['original_currency'] ?? raw['originalCurrency'] },
    commerce?.['currency'] ?? commerce?.['currency_code'],
  );
}

function resolveCommerceId(p: Record<string, unknown>): string {
  const commerce = p['commerce'];
  if (typeof commerce === 'string') return commerce.trim();
  if (commerce && typeof commerce === 'object') {
    return String((commerce as Record<string, unknown>)['id'] ?? '').trim();
  }
  return String(p['commerce_id'] ?? '').trim();
}

export function mapApiProductToProduct(p: Record<string, unknown>): Product {
  const apiId = String(p['id'] ?? '');
  const commerce = p['commerce'] as Record<string, unknown> | undefined;

  const imageUrl =
    (p['public_image'] as string | undefined) ??
    resolveMediaUrl(p['image'] as string | undefined) ??
    resolveMediaUrl(p['image_path'] as string | undefined) ??
    null;

  const categoryRaw = p['category'] as Record<string, unknown> | null | undefined;

  return {
    id: stableProductId(apiId),
    apiId,
    name: String(p['name'] ?? ''),
    category: categoryRaw
      ? { id: String(categoryRaw['id']), name: String(categoryRaw['name']) }
      : null,
    imageUrl,
    originalPrice: parseFloat(String(p['price'] ?? p['original_price'] ?? '0')),
    originalCurrency: normalizeProductCurrency(
      { originalCurrency: p['original_currency'] ?? p['originalCurrency'] },
      commerce?.['currency'] ?? commerce?.['currency_code'],
    ),
    convertedPrice:
      p['converted_price'] != null ? parseFloat(String(p['converted_price'])) : null,
    commerceId: resolveCommerceId(p),
    presentationUnit: normalizePresentationUnit(
      String(p['unit'] ?? p['presentation_unit'] ?? 'unit'),
    ),
    sourceUrl: (p['source_url'] as string | null | undefined) ?? null,
    extractionSource: String(p['extraction_source'] ?? ''),
    extractionDate: String(p['extraction_date'] ?? new Date().toISOString()),
    isActive: p['is_active'] !== false,
  };
}

/** Normalize a product snapshot from cart storage or purchase history. */
export function normalizeStoredProduct(raw: Record<string, unknown>): Product | null {
  if (!raw || raw['apiId'] == null && raw['id'] == null) return null;

  if (typeof raw['originalPrice'] === 'number' && raw['apiId'] != null) {
    return {
      id: Number(raw['id']),
      apiId: String(raw['apiId']),
      name: String(raw['name'] ?? ''),
      category: (raw['category'] as Product['category']) ?? null,
      imageUrl: (raw['imageUrl'] as string | null | undefined) ?? null,
      originalPrice: Number(raw['originalPrice']),
      originalCurrency: resolveCurrencyFromRaw(raw),
      convertedPrice:
        raw['convertedPrice'] != null ? Number(raw['convertedPrice']) : null,
      commerceId: String(
        raw['commerceId']
          ?? (raw['commerce'] as Record<string, unknown> | undefined)?.['id']
          ?? '',
      ).trim(),
      presentationUnit: normalizePresentationUnit(String(raw['presentationUnit'] ?? 'unit')),
      sourceUrl: (raw['sourceUrl'] as string | null | undefined) ?? null,
      extractionSource: String(raw['extractionSource'] ?? ''),
      extractionDate: String(raw['extractionDate'] ?? new Date().toISOString()),
      isActive: raw['isActive'] !== false,
    };
  }

  return mapApiProductToProduct(raw);
}
