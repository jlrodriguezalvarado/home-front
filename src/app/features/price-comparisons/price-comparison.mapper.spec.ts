import { mapList, mapPrice, mapReport } from './price-comparison.mapper';
describe('price comparison mapper', () => {
  it('maps paginated lists and camelCase aliases', () => {
    const prices = mapList({
      results: [{ uuid: 'price-1', storeId: 'store-1', productId: 'product-1', amount: '12.50', storeName: 'Market' }],
    }, mapPrice);
    expect(prices).toEqual([{
      id: 'price-1',
      storeId: 'store-1',
      productId: 'product-1',
      price: '12.50',
      storeName: 'Market',
      productName: '',
    }]);
  });
  it('maps and sorts report products while preserving tied cheapest offers', () => {
    const report = mapReport({
      comparison: { id: 'comparison-1', name: 'Weekly basket', description: '' },
      stores: [
        { id: 'store-1', comparison: 'comparison-1', name: 'A' },
        { id: 'store-2', comparison: 'comparison-1', name: 'B' },
      ],
      products: [
        { id: 'product-2', name: 'Second', categories: [], prices: [], cheapest_offers: [], min_price: null, max_price: null },
        {
          id: 'product-1',
          name: 'First',
          categories: [{ id: 'category-1', name: 'Food' }],
          prices: [{ id: 'price-1', store: 'store-1', product: 'product-1', price: '3.5' }],
          cheapest_offers: [
            { id: 'price-1', store: 'store-1', store_name: 'A', product: 'product-1', price: '3.5' },
            { id: 'price-2', store: 'store-2', store_name: 'B', product: 'product-1', price: '3.5' },
          ],
          min_price: '3.5',
          max_price: '5',
        },
      ],
      summary: {
        product_count: 2,
        store_count: 2,
        priced_product_count: 1,
        cheapest_products: ['product-1'],
        store_rankings: [{ store_id: 'store-1', store_name: 'A', total: '3.5', priced_products: 1, missing_products: 1, is_complete: false }],
        best_complete_basket_stores: [],
      },
    });
    expect(report.products.map((product) => product.id)).toEqual(['product-1', 'product-2']);
    expect(report.products[0].cheapestOffers.length).toBe(2);
    expect(report.products[0].priceRange).toBe('1.5');
    expect(report.summary.cheapestProducts[0].id).toBe('product-1');
  });
  it('does not hide invalid required identifiers', () => {
    expect(() => mapPrice({ store: 'store-1', product: 'product-1', price: 2 })).toThrowError(/id/i);
  });
});
