import {
  CloneWeeklyMenuPayload,
  CommerceSummary,
  CopyFavoriteDayPayload,
  CopyFavoriteMealPayload,
  Ingredient,
  IngredientDefaultProduct,
  IngredientFormValue,
  IngredientSummary,
  IngredientWrite,
  MealType,
  MealTypePayload,
  MenuDay,
  MenuMeal,
  MenuMealPayload,
  ProductSummary,
  Recipe,
  RecipeIngredient,
  RecipePayload,
  RecipeWriteOptions,
  ShoppingList,
  ShoppingListItem,
  ShoppingListRecipeUsage,
  ShoppingListWithoutProductItem,
  WeeklyMenu,
  WeeklyMenuPayload,
} from '../models/meal-planning.models';

function mapCommerceSummaryFromApi(item: unknown): CommerceSummary | null {
  if (!item || typeof item !== 'object') return null;
  const data = item as Record<string, unknown>;
  const id = data['id'];
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    name: String(data['name'] ?? ''),
  };
}

function mapProductSummaryFromApi(item: unknown): ProductSummary | null {
  if (!item || typeof item !== 'object') return null;
  const data = item as Record<string, unknown>;
  const id = data['id'];
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    name: String(data['name'] ?? ''),
    commerce: mapCommerceSummaryFromApi(data['commerce']),
  };
}

function parseApiBoolean(value: unknown, defaultValue = false): boolean {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return Boolean(value);
}

function mapIngredientSummaryFromApi(item: unknown): IngredientSummary {
  if (!item || typeof item !== 'object') {
    return { id: '', name: '' };
  }
  const data = item as Record<string, unknown>;
  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
  };
}

function mapRecipeDetailFromApi(item: unknown): Recipe | null {
  if (!item || typeof item !== 'object') return null;
  const data = item as Record<string, unknown>;
  if (data['id'] === undefined || data['id'] === null) return null;
  return mapRecipeFromApi(item);
}

function mapShoppingListRecipeUsageFromApi(item: unknown): ShoppingListRecipeUsage {
  if (!item || typeof item !== 'object') {
    return { recipeId: '', recipeName: '', quantity: '0' };
  }
  const data = item as Record<string, unknown>;
  return {
    recipeId: String(data['recipe_id'] ?? data['recipeId'] ?? ''),
    recipeName: String(data['recipe_name'] ?? data['recipeName'] ?? ''),
    quantity: String(data['quantity'] ?? '0'),
  };
}

function mapIngredientDefaultProductFromApi(item: unknown): IngredientDefaultProduct | null {
  if (!item || typeof item !== 'object') return null;
  const data = item as Record<string, unknown>;
  const id = data['id'];
  if (id === undefined || id === null) return null;
  const commerceId = data['commerce_id'] ?? data['commerceId'];
  return {
    id: String(id),
    name: String(data['name'] ?? ''),
    commerceId: commerceId === undefined || commerceId === null ? null : String(commerceId),
  };
}

export function mapIngredientFromApi(item: unknown): Ingredient {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
    description: String(data['description'] ?? ''),
    defaultProduct: mapIngredientDefaultProductFromApi(data['default_product']),
    isActive: Boolean(data['is_active'] ?? data['isActive'] ?? true),
    createdAt: data['created_at'] ? String(data['created_at']) : undefined,
    updatedAt: data['updated_at'] ? String(data['updated_at']) : undefined,
  };
}

export function mapIngredientToFormValue(ingredient: Ingredient): IngredientFormValue {
  return {
    name: ingredient.name,
    description: ingredient.description,
    defaultProductId: ingredient.defaultProduct?.id ?? null,
    isActive: ingredient.isActive,
  };
}

export function mapIngredientToApi(form: IngredientFormValue): IngredientWrite {
  return {
    name: form.name,
    description: form.description,
    default_product_id: form.defaultProductId,
    is_active: form.isActive,
  };
}

export function mapRecipeIngredientFromApi(item: unknown): RecipeIngredient {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    id: String(data['id'] ?? ''),
    ingredient: mapIngredientSummaryFromApi(data['ingredient']),
    product: mapProductSummaryFromApi(data['product']),
    quantity: String(data['quantity'] ?? '0'),
    unit: String(data['unit'] ?? ''),
    notes: String(data['notes'] ?? ''),
    sortOrder: Number(data['sort_order'] ?? data['sortOrder'] ?? 0),
  };
}

export function mapRecipeFromApi(item: unknown): Recipe {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawIngredients = data['ingredients'];
  const ingredients = Array.isArray(rawIngredients)
    ? rawIngredients.map(mapRecipeIngredientFromApi)
    : [];
  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
    description: String(data['description'] ?? ''),
    link: (data['link'] as string | null | undefined) ?? null,
    image: (data['image'] as string | null | undefined) ?? null,
    video: (data['video'] as string | null | undefined) ?? null,
    isFavorite: parseApiBoolean(data['is_favorite'] ?? data['isFavorite'], false),
    isActive: Boolean(data['is_active'] ?? data['isActive'] ?? true),
    ingredients,
    createdAt: data['created_at'] ? String(data['created_at']) : undefined,
    updatedAt: data['updated_at'] ? String(data['updated_at']) : undefined,
  };
}

export function mapMealTypeFromApi(item: unknown): MealType {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
    code: String(data['code'] ?? ''),
    sortOrder: Number(data['sort_order'] ?? data['sortOrder'] ?? 0),
    isActive: Boolean(data['is_active'] ?? data['isActive'] ?? true),
  };
}

export function mapMenuMealFromApi(item: unknown): MenuMeal {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  return {
    id: String(data['id'] ?? ''),
    menuDayId: String(data['menu_day_id'] ?? data['menuDayId'] ?? data['menu_day'] ?? ''),
    mealType: mapMealTypeFromApi(data['meal_type'] ?? data['mealType']),
    recipe: mapRecipeDetailFromApi(data['recipe']),
    name: String(data['name'] ?? ''),
    notes: String(data['notes'] ?? ''),
    sortOrder: Number(data['sort_order'] ?? data['sortOrder'] ?? 0),
    isFavorite: parseApiBoolean(data['is_favorite'] ?? data['isFavorite'], false),
  };
}

export function mapMenuDayFromApi(item: unknown): MenuDay {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawMeals = data['meals'];
  const meals = Array.isArray(rawMeals) ? rawMeals.map(mapMenuMealFromApi) : [];
  return {
    id: String(data['id'] ?? ''),
    weeklyMenuId: String(data['weekly_menu_id'] ?? data['weeklyMenuId'] ?? data['weekly_menu'] ?? ''),
    dayOfWeek: Number(data['day_of_week'] ?? data['dayOfWeek'] ?? 0),
    dayName: String(data['day_name'] ?? data['dayName'] ?? ''),
    name: String(data['name'] ?? ''),
    isFavorite: parseApiBoolean(data['is_favorite'] ?? data['isFavorite'], false),
    notes: String(data['notes'] ?? ''),
    meals: meals.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function mapWeeklyMenuFromApi(item: unknown): WeeklyMenu {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawDays = data['days'];
  const days = Array.isArray(rawDays) ? rawDays.map(mapMenuDayFromApi) : [];
  return {
    id: String(data['id'] ?? ''),
    name: String(data['name'] ?? ''),
    isFavorite: parseApiBoolean(data['is_favorite'] ?? data['isFavorite'], false),
    isTemplate: Boolean(data['is_template'] ?? data['isTemplate'] ?? false),
    isCurrent: parseApiBoolean(data['is_current'] ?? data['isCurrent'], false),
    notes: String(data['notes'] ?? ''),
    days: days.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  };
}

export function mapShoppingListItemFromApi(item: unknown): ShoppingListItem {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawRecipes = data['recipes'];
  return {
    productId: String(data['product_id'] ?? data['productId'] ?? ''),
    productName: String(data['product_name'] ?? data['productName'] ?? ''),
    commerce: mapCommerceSummaryFromApi(data['commerce']),
    unit: String(data['unit'] ?? ''),
    totalQuantity: String(data['total_quantity'] ?? data['totalQuantity'] ?? '0'),
    recipes: Array.isArray(rawRecipes) ? rawRecipes.map(mapShoppingListRecipeUsageFromApi) : [],
  };
}

export function mapShoppingListWithoutProductItemFromApi(item: unknown): ShoppingListWithoutProductItem {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawRecipes = data['recipes'];
  return {
    ingredientId: String(data['ingredient_id'] ?? data['ingredientId'] ?? ''),
    ingredientName: String(data['ingredient_name'] ?? data['ingredientName'] ?? ''),
    unit: String(data['unit'] ?? ''),
    totalQuantity: String(data['total_quantity'] ?? data['totalQuantity'] ?? '0'),
    recipes: Array.isArray(rawRecipes) ? rawRecipes.map(mapShoppingListRecipeUsageFromApi) : [],
  };
}

export function mapShoppingListFromApi(item: unknown): ShoppingList {
  const data = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
  const rawItems = data['items'];
  const rawWithout = data['without_product'] ?? data['withoutProduct'];
  return {
    weeklyMenuId: String(data['weekly_menu_id'] ?? data['weeklyMenuId'] ?? ''),
    weeklyMenuName: String(data['weekly_menu_name'] ?? data['weeklyMenuName'] ?? ''),
    items: Array.isArray(rawItems) ? rawItems.map(mapShoppingListItemFromApi) : [],
    withoutProduct: Array.isArray(rawWithout) ? rawWithout.map(mapShoppingListWithoutProductItemFromApi) : [],
  };
}


function normalizeRecipeLink(link: string | null | undefined): string | null {
  const trimmed = String(link ?? '').trim();
  return trimmed ? trimmed : null;
}

function mapRecipeIngredientsToApi(payload: RecipePayload): Record<string, unknown>[] {
  return payload.ingredients.map((row) => ({
    ingredient_id: row.ingredient,
    product_id: row.product ?? null,
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes,
    sort_order: row.sortOrder,
  }));
}

function appendRecipeWriteOptionsToFormData(formData: FormData, options?: RecipeWriteOptions): void {
  if (options?.image) formData.append('image', options.image);
  if (options?.video) formData.append('video', options.video);
  if (options?.clearImage) formData.append('clear_image', 'true');
  if (options?.clearVideo) formData.append('clear_video', 'true');
}

export function mapRecipePayloadToApi(payload: RecipePayload, options?: RecipeWriteOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: payload.name,
    description: payload.description,
    link: normalizeRecipeLink(payload.link),
    is_active: payload.isActive,
    ingredients: mapRecipeIngredientsToApi(payload),
  };
  if (options?.clearImage) body['clear_image'] = true;
  if (options?.clearVideo) body['clear_video'] = true;
  return body;
}

export function mapRecipePayloadToFormData(payload: RecipePayload, options?: RecipeWriteOptions): FormData {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('description', payload.description ?? '');
  const link = normalizeRecipeLink(payload.link);
  if (link) formData.append('link', link);
  formData.append('is_active', String(payload.isActive));
  formData.append('ingredients', JSON.stringify(mapRecipeIngredientsToApi(payload)));
  appendRecipeWriteOptionsToFormData(formData, options);
  return formData;
}

export function mapMealTypePayloadToApi(payload: MealTypePayload): Record<string, unknown> {
  return {
    name: payload.name,
    code: payload.code,
    sort_order: payload.sortOrder,
    is_active: payload.isActive,
  };
}

export function mapWeeklyMenuPayloadToApi(payload: WeeklyMenuPayload): Record<string, unknown> {
  return {
    name: payload.name,
    is_template: payload.isTemplate,
    notes: payload.notes,
  };
}

export function mapMenuMealPayloadToApi(payload: MenuMealPayload): Record<string, unknown> {
  return {
    menu_day: payload.menuDay,
    meal_type_id: payload.mealType,
    recipe_id: payload.recipe ?? null,
    name: payload.name,
    notes: payload.notes,
    sort_order: payload.sortOrder,
  };
}

export function mapCloneWeeklyMenuPayloadToApi(payload: CloneWeeklyMenuPayload): Record<string, unknown> {
  return {
    name: payload.name,
  };
}

export function mapCopyFavoriteDayPayloadToApi(payload: CopyFavoriteDayPayload): Record<string, unknown> {
  return {
    source_menu_day_id: payload.sourceMenuDayId,
    target_weekly_menu_id: payload.targetWeeklyMenuId,
    target_day_of_week: payload.targetDayOfWeek,
    replace_existing: payload.replaceExisting,
  };
}

export function mapCopyFavoriteMealPayloadToApi(payload: CopyFavoriteMealPayload): Record<string, unknown> {
  return {
    source_menu_meal_id: payload.sourceMenuMealId,
    target_menu_day_id: payload.targetMenuDayId,
  };
}
