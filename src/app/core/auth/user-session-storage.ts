const USER_SCOPED_LOCAL_STORAGE_KEYS = [
  'shopping_cart_items_v4',
  'shopping_cart',
  'shopping_cart_filter_commerce_id_v1',
  'home_finance_period_v1',
  'home_finance_workspace_v1',
  'products_list_filters_v1',
  'chat_recent_emojis'
] as const;

export function clearUserScopedStorage(): void {
  for (const key of USER_SCOPED_LOCAL_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}
