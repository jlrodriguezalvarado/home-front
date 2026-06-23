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
  mealPlanning: {
    ingredients: {
      list: '/meal-planning/ingredients/',
      detail: (id: string) => `/meal-planning/ingredients/${id}/`,
    },
    recipes: {
      list: '/meal-planning/recipes/',
      detail: (id: string) => `/meal-planning/recipes/${id}/`,
      toggleFavorite: (id: string) => `/meal-planning/recipes/${id}/toggle-favorite/`,
      favorites: '/meal-planning/recipes/favorites/',
    },
    mealTypes: {
      list: '/meal-planning/meal-types/',
      detail: (id: string) => `/meal-planning/meal-types/${id}/`,
    },
    weeklyMenus: {
      list: '/meal-planning/weekly-menus/',
      detail: (id: string) => `/meal-planning/weekly-menus/${id}/`,
      current: '/meal-planning/weekly-menus/current/',
      setCurrent: (id: string) => `/meal-planning/weekly-menus/${id}/set-current/`,
      toggleFavorite: (id: string) => `/meal-planning/weekly-menus/${id}/toggle-favorite/`,
      favorites: '/meal-planning/weekly-menus/favorites/',
      clone: (id: string) => `/meal-planning/weekly-menus/${id}/clone/`,
      shoppingList: (id: string) => `/meal-planning/weekly-menus/${id}/shopping-list/`,
    },
    menuDays: {
      list: '/meal-planning/menu-days/',
      detail: (id: string) => `/meal-planning/menu-days/${id}/`,
      toggleFavorite: (id: string) => `/meal-planning/menu-days/${id}/toggle-favorite/`,
      favorites: '/meal-planning/menu-days/favorites/',
      copyFavorite: '/meal-planning/menu-days/copy-favorite/',
    },
    menuMeals: {
      list: '/meal-planning/menu-meals/',
      detail: (id: string) => `/meal-planning/menu-meals/${id}/`,
      toggleFavorite: (id: string) => `/meal-planning/menu-meals/${id}/toggle-favorite/`,
      favorites: '/meal-planning/menu-meals/favorites/',
      copyFavorite: '/meal-planning/menu-meals/copy-favorite/',
    },
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
