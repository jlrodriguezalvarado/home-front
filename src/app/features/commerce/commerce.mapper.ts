import { resolveMediaUrl } from '../../core/api/api-url';
import { CommerceDetailDto, CommerceListDto, ProcessingJobDto, SourceUrlDto } from './commerce.dto';
import {
  Commerce,
  CommerceDetail,
  CommerceListItem,
  ProcessingJobStatus,
  ProcessingJobSummary,
  SourceUrlDetail,
} from './commerce.models';

function processingJobStatus(value: string | null | undefined): ProcessingJobStatus {
  switch (value) {
    case 'pending':
    case 'processing':
    case 'completed':
    case 'completed_with_errors':
    case 'failed':
    case 'cancelled':
      return value;
    default:
      return 'failed';
  }
}

function mapCommerceBase(dto: CommerceListDto): Commerce {
  return {
    id: dto.id,
    name: dto.name,
    logo: resolveMediaUrl(dto.image ?? dto.logo),
    currencyCode: dto.default_currency?.code ?? dto.currency_code ?? '',
    currencySymbol: dto.default_currency?.symbol ?? '',
  };
}

export function mapProcessingJob(dto: ProcessingJobDto): ProcessingJobSummary {
  return {
    id: dto.id,
    jobType: dto.job_type ?? '',
    status: processingJobStatus(dto.status),
    startedAt: dto.started_at ?? null,
    finishedAt: dto.finished_at ?? null,
    errorMessage: dto.error_message ?? null,
  };
}

function mapSourceUrl(dto: SourceUrlDto): SourceUrlDetail {
  return {
    id: dto.id,
    commerce: dto.commerce,
    name: dto.name,
    url: dto.url,
    sourceType: dto.source_type ?? '',
    isActive: dto.is_active ?? false,
    notes: dto.notes ?? null,
    isProcessing: dto.is_processing ?? false,
    latestJob: dto.latest_job ? mapProcessingJob(dto.latest_job) : null,
  };
}

export function mapCommerceListItem(dto: CommerceListDto): CommerceListItem {
  return {
    ...mapCommerceBase(dto),
    urlsProcessing: dto.urls_processing ?? false,
    activeJobsCount: dto.active_jobs_count ?? 0,
  };
}

export function mapCommerceDetail(dto: CommerceDetailDto): CommerceDetail {
  return {
    ...mapCommerceBase(dto),
    urlsProcessing: dto.urls_processing ?? false,
    activeJobs: (dto.active_jobs ?? []).map(mapProcessingJob),
    sourceUrls: (dto.source_urls ?? []).map(mapSourceUrl),
    reprocessStrategy: dto.reprocess_strategy ?? null,
    wasReprocessedToday: dto.was_reprocessed_today ?? false,
  };
}
