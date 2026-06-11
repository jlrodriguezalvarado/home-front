export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    me: '/authme/',
  },
  products: {
    list: '/products/',
    detail: (id: string) => `/products/${id}/`,
    scrapeByIds: '/products/scrape-by-ids/',
  },
  productCategories: '/product-categories',
  commerces: {
    list: '/commerces/',
    updateProductsPriceBatch: (id: string) => `/commerces/${id}/update-products-price-batch/`,
  },
  purchases: {
    list: '/purchases/',
    detail: (id: string) => `/purchases/${id}/`,
  },
  currencies: {
    list: '/currencies',
    detail: (id: string) => `/currencies/${id}/`,
  },
  exchangeRates: {
    list: '/exchange-rates/',
    detail: (id: string) => `/exchange-rates/${id}/`,
  },
  finance: {
    monthSummary: '/finance/month-summary/',
    months: '/finance/months/',
    years: '/finance/years/',
    initialExpenseCategories: '/finance/initial-expense-categories/',
    generalExpenseCategories: '/finance/general-expense-categories/',
    savingsAccountTypes: '/finance/savings-account-types/',
    incomeAccounts: '/finance/income-accounts/',
    declaration: '/finance/declaration/',
    exchangeCalculatorPreview: '/finance/exchange-calculator/preview/',
    exchangeCalculatorConfirm: '/finance/exchange-calculator/confirm/',
    exchangeHistory: '/finance/exchange-history/',
    reports: '/finance/reports/',
    reportsGenerate: '/finance/reports/generate/',
    expenseSpendPending: '/finance/expense-spend/pending/',
    expenseSpendRegister: '/finance/expense-spend/register/',
    expenseSpendHistory: '/finance/expense-spend/history/',
    recurringExpensesReplicate: '/finance/recurring-expenses/replicate/',
    resources: {
      'initial-expenses': '/finance/initial-expense-items/',
      math: '/finance/math-items/',
      home: '/finance/home-items/',
      savings: '/finance/savings-items/',
      income: '/finance/income-entries/',
    },
  },
} as const;

export type FinanceFeature = keyof typeof API_ENDPOINTS.finance.resources;

export function getFinanceResource(feature: string): string | null {
  return API_ENDPOINTS.finance.resources[feature as FinanceFeature] ?? null;
}
