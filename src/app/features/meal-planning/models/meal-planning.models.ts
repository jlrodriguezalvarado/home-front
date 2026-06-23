export interface ProductSummary {
  id: string;
  name: string;
  commerce?: CommerceSummary | null;
}

export interface CommerceSummary {
  id: string;
  name: string;
}

export interface IngredientSummary {
  id: string;
  name: string;
}

export interface RecipeSummary {
  id: string;
  name: string;
  link?: string | null;
  image?: string | null;
  video?: string | null;
}

export type RecipeDetail = Recipe;

export interface IngredientDefaultProduct {
  id: string;
  name: string;
  commerceId: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
  description: string;
  defaultProduct: IngredientDefaultProduct | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IngredientFormValue {
  name: string;
  description: string;
  defaultProductId: string | null;
  isActive: boolean;
}

export interface IngredientWrite {
  name: string;
  description: string;
  default_product_id: string | null;
  is_active: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  link?: string | null;
  image?: string | null;
  video?: string | null;
  isFavorite: boolean;
  isActive: boolean;
  ingredients: RecipeIngredient[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeIngredient {
  id: string;
  ingredient: IngredientSummary;
  product: ProductSummary | null;
  quantity: string;
  unit: string;
  notes: string;
  sortOrder: number;
}

export interface MealType {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WeeklyMenu {
  id: string;
  name: string;
  isFavorite: boolean;
  isTemplate: boolean;
  isCurrent: boolean;
  notes: string;
  days: MenuDay[];
}

export interface MenuDay {
  id: string;
  weeklyMenuId: string;
  dayOfWeek: number;
  dayName: string;
  name: string;
  isFavorite: boolean;
  notes: string;
  meals: MenuMeal[];
}

export interface MenuMeal {
  id: string;
  menuDayId: string;
  mealType: MealType;
  recipe: RecipeDetail | null;
  name: string;
  notes: string;
  sortOrder: number;
  isFavorite: boolean;
}

export interface ShoppingList {
  weeklyMenuId: string;
  weeklyMenuName: string;
  items: ShoppingListItem[];
  withoutProduct: ShoppingListWithoutProductItem[];
}

export interface ShoppingListItem {
  productId: string;
  productName: string;
  commerce: CommerceSummary | null;
  unit: string;
  totalQuantity: string;
  recipes: ShoppingListRecipeUsage[];
}

export interface ShoppingListWithoutProductItem {
  ingredientId: string;
  ingredientName: string;
  unit: string;
  totalQuantity: string;
  recipes: ShoppingListRecipeUsage[];
}

export interface ShoppingListRecipeUsage {
  recipeId: string;
  recipeName: string;
  quantity: string;
}

export interface RecipePayload {
  name: string;
  description: string;
  link?: string | null;
  isActive: boolean;
  ingredients: RecipeIngredientPayload[];
}

export interface RecipeIngredientPayload {
  ingredient: string;
  product?: string | null;
  quantity: string;
  unit: string;
  notes: string;
  sortOrder: number;
}

export interface RecipeWriteOptions {
  image?: File;
  video?: File;
  clearImage?: boolean;
  clearVideo?: boolean;
}

export interface MealTypePayload {
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WeeklyMenuPayload {
  name: string;
  isTemplate: boolean;
  notes: string;
}

export interface MenuMealPayload {
  menuDay: string;
  mealType: string;
  recipe?: string | null;
  name: string;
  notes: string;
  sortOrder: number;
}

export interface CloneWeeklyMenuPayload {
  name: string;
}

export interface CopyFavoriteDayPayload {
  sourceMenuDayId: string;
  targetWeeklyMenuId: string;
  targetDayOfWeek: number;
  replaceExisting: boolean;
}

export interface CopyFavoriteMealPayload {
  sourceMenuMealId: string;
  targetMenuDayId: string;
}
