import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { GeneratedReport } from '../models/finance.models';
import { FinanceReportsService } from './finance-reports.service';

function report(status: GeneratedReport['status']): GeneratedReport {
  return {
    id: 'report-1',
    financialYear: 'year-1',
    year: 2026,
    triggeredFromMonth: null,
    file: null,
    fileUrl: status === 'completed' ? 'https://example.test/report.pdf' : '',
    status,
    errorMessage: null,
    createdAt: '',
    updatedAt: '',
    generatedBy: null,
    includedMonths: [],
  };
}

describe('FinanceReportsService generation flow', () => {
  let service: FinanceReportsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: {} }],
    });
    service = TestBed.inject(FinanceReportsService);
  });

  it('waits for a pending report without requiring nested subscriptions', () => {
    const pending = report('pending');
    const completed = report('completed');
    spyOn(service, 'generate').and.returnValue(of(pending));
    const wait = spyOn(service, 'waitForReportCompletion').and.returnValue(of(completed));
    let result: GeneratedReport | undefined;

    service.generateAndWait(2026, 7, 1500).subscribe((value) => (result = value));

    expect(wait).toHaveBeenCalledOnceWith(pending, 1500);
    expect(result).toBe(completed);
  });

  it('returns an already completed report without polling', () => {
    const completed = report('completed');
    spyOn(service, 'generate').and.returnValue(of(completed));
    const wait = spyOn(service, 'waitForReportCompletion');

    service.generateAndWait(2026).subscribe();

    expect(wait).not.toHaveBeenCalled();
  });
});
