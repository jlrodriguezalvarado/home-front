import { mapCommerceDetail, mapCommerceListItem } from './commerce.mapper';

describe('commerce mapper', () => {
  it('maps list DTOs without leaking snake_case', () => {
    const result = mapCommerceListItem({
      id: 'commerce-1',
      name: 'Market',
      default_currency: { code: 'USD', symbol: '$' },
      urls_processing: true,
      active_jobs_count: 2,
    });

    expect(result).toEqual({
      id: 'commerce-1',
      name: 'Market',
      logo: null,
      currencyCode: 'USD',
      currencySymbol: '$',
      urlsProcessing: true,
      activeJobsCount: 2,
    });
  });

  it('maps nested detail DTOs with safe defaults', () => {
    const result = mapCommerceDetail({
      id: 'commerce-1',
      name: 'Market',
      active_jobs: [{ id: 'job-1', status: 'processing' }],
      source_urls: [
        {
          id: 'source-1',
          commerce: 'commerce-1',
          name: 'Weekly offers',
          url: 'https://example.test/offers',
        },
      ],
    });

    expect(result.activeJobs[0].status).toBe('processing');
    expect(result.sourceUrls[0].isActive).toBeFalse();
    expect(result.sourceUrls[0].latestJob).toBeNull();
  });
});
