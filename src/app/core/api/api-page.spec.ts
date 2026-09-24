import { apiListResults, normalizeApiPage } from './api-page';

describe('API pagination compatibility', () => {
  it('reads legacy arrays', () => {
    expect(apiListResults([{ id: 'one' }])).toEqual([{ id: 'one' }]);
    expect(normalizeApiPage([{ id: 'one' }])).toEqual({
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 'one' }],
    });
  });

  it('preserves paginated responses', () => {
    const page = {
      count: 2,
      next: '/api/items/?page=2&perPage=1',
      previous: null,
      results: [{ id: 'one' }],
    };

    expect(apiListResults(page)).toEqual([{ id: 'one' }]);
    expect(normalizeApiPage(page)).toBe(page);
  });
});
