export interface CommerceCurrencyDto {
  code?: string | null;
  symbol?: string | null;
}

export interface ProcessingJobDto {
  id: string;
  job_type?: string | null;
  status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
}

export interface SourceUrlDto {
  id: string;
  commerce: string;
  name: string;
  url: string;
  source_type?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  is_processing?: boolean | null;
  latest_job?: ProcessingJobDto | null;
}

export interface CommerceListDto {
  id: string;
  name: string;
  image?: string | null;
  logo?: string | null;
  default_currency?: CommerceCurrencyDto | null;
  currency_code?: string | null;
  urls_processing?: boolean | null;
  active_jobs_count?: number | null;
}

export interface CommerceDetailDto extends CommerceListDto {
  active_jobs?: ProcessingJobDto[] | null;
  source_urls?: SourceUrlDto[] | null;
  reprocess_strategy?: string | null;
  was_reprocessed_today?: boolean | null;
}
