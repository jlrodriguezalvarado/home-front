import { Commerce } from '../../core/api/models';

export type ProcessingJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export interface ProcessingJobSummary {
  id: string;
  jobType: string;
  status: ProcessingJobStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface SourceUrlDetail {
  id: string;
  commerce: string;
  name: string;
  url: string;
  sourceType: string;
  isActive: boolean;
  notes: string | null;
  isProcessing: boolean;
  latestJob: ProcessingJobSummary | null;
}

export interface CommerceListItem extends Commerce {
  urlsProcessing: boolean;
  activeJobsCount: number;
}

export interface CommerceDetail extends Commerce {
  urlsProcessing: boolean;
  activeJobs: ProcessingJobSummary[];
  sourceUrls: SourceUrlDetail[];
  reprocessStrategy: string | null;
  wasReprocessedToday: boolean;
}

export interface RunSourceUrlScrapingPayload {
  source_url_id?: string;
  category_name?: string;
}

export interface ScrapingActionResponse {
  status?: string;
  message?: string;
  category_name?: string;
  job_id?: string;
}
