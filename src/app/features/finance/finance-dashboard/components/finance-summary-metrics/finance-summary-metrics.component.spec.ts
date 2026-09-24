import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FinanceSummaryMetricsComponent } from './finance-summary-metrics.component';
import { I18nService } from '../../../../../core/i18n/i18n.service';

describe('FinanceSummaryMetricsComponent', () => {
  let fixture: ComponentFixture<FinanceSummaryMetricsComponent>;
  let component: FinanceSummaryMetricsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceSummaryMetricsComponent],
      providers: [{ provide: I18nService, useValue: { t: (k: string) => k, lang: () => 'en' } }],
    }).compileComponents();
    fixture = TestBed.createComponent(FinanceSummaryMetricsComponent);
    component = fixture.componentInstance;
    component.primaryMetrics = [
      {
        id: 'balance',
        labelEn: 'Balance',
        labelEs: 'Balance',
        value: '10',
        colorClass: 'text-on-surface',
      },
    ];
    component.secondaryMetrics = [
      {
        id: 'cash',
        labelEn: 'Cash',
        labelEs: 'Efectivo',
        value: '5',
        colorClass: 'text-on-surface',
      },
    ];
    component.state = {
      previousMonthExpenseEditable: false,
      manualPreviousMonthExpense: '',
      savingManualPreviousMonthExpense: false,
      canSaveManualPreviousMonthExpense: false,
      previousMonthRemainderEditable: false,
      manualPreviousMonthRemainder: '',
      savingManualPreviousMonthRemainder: false,
      canSaveManualPreviousMonthRemainder: false,
      previousGlobalSavingsEditable: false,
      manualPreviousGlobalSavings: '',
      savingManualPreviousGlobalSavings: false,
      canSaveManualPreviousGlobalSavings: false,
    };
    fixture.detectChanges();
  });

  it('renders primary metrics and emits toggle for secondary', () => {
    expect(fixture.nativeElement.textContent).toContain('Balance');
    const spy = spyOn(component.toggleDetails, 'emit');
    const button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click');
    expect(spy).toHaveBeenCalled();
  });
});
