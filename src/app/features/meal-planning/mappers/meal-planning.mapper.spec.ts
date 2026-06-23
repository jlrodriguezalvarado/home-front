import {
  mapCopyFavoriteDayPayloadToApi,
  mapCopyFavoriteMealPayloadToApi,
  mapIngredientFromApi,
  mapIngredientToApi,
  mapIngredientToFormValue,
  mapMenuMealPayloadToApi,
  mapRecipeFromApi,
  mapRecipePayloadToApi,
  mapShoppingListFromApi,
  mapWeeklyMenuFromApi,
} from './meal-planning.mapper';

describe('meal-planning.mapper', () => {
  it('should map ingredient from API default_product nested object', () => {
    const result = mapIngredientFromApi({
      id: 'ing-1',
      name: 'Tomato',
      description: 'Fresh tomato',
      default_product: {
        id: 'prod-1',
        name: 'Tomato pack',
        commerce_id: 'commerce-1',
      },
      is_active: true,
      created_at: '2024-01-01',
    });
    expect(result.id).toBe('ing-1');
    expect(result.name).toBe('Tomato');
    expect(result.defaultProduct).toEqual({
      id: 'prod-1',
      name: 'Tomato pack',
      commerceId: 'commerce-1',
    });
    expect(result.isActive).toBe(true);
  });

  it('should map ingredient default_product commerce_id as null when absent', () => {
    const result = mapIngredientFromApi({
      id: 'ing-1',
      name: 'Salt',
      description: '',
      default_product: { id: 'prod-1', name: 'Table salt' },
      is_active: true,
    });
    expect(result.defaultProduct?.commerceId).toBeNull();
  });

  it('should map ingredient read -> form -> write', () => {
    const ingredient = mapIngredientFromApi({
      id: 'ing-1',
      name: 'Rice',
      description: 'White rice',
      default_product: {
        id: 'prod-1',
        name: 'White rice',
        commerce_id: 'commerce-1',
      },
      is_active: true,
    });
    const form = mapIngredientToFormValue(ingredient);
    expect(form.defaultProductId).toBe('prod-1');
    expect(form.name).toBe('Rice');
    const write = mapIngredientToApi(form);
    expect(write).toEqual({
      name: 'Rice',
      description: 'White rice',
      default_product_id: 'prod-1',
      is_active: true,
    });
    expect(write).not.toEqual(jasmine.objectContaining({ default_product: jasmine.anything() }));
  });

  it('should map ingredient form with null product to explicit default_product_id null', () => {
    expect(mapIngredientToApi({
      name: 'Salt',
      description: '',
      defaultProductId: null,
      isActive: true,
    })).toEqual({
      name: 'Salt',
      description: '',
      default_product_id: null,
      is_active: true,
    });
  });

  it('should map recipe with nested ingredients from API', () => {
    const result = mapRecipeFromApi({
      id: 'rec-1',
      name: 'Salad',
      description: 'Green salad',
      link: 'https://example.com/salad',
      is_favorite: true,
      is_active: true,
      ingredients: [
        {
          id: 'ri-1',
          ingredient: { id: 'ing-1', name: 'Lettuce' },
          product: null,
          quantity: '2.5',
          unit: 'kg',
          notes: '',
          sort_order: 0,
        },
      ],
    });
    expect(result.isFavorite).toBe(true);
    expect(result.link).toBe('https://example.com/salad');
    expect(result.ingredients.length).toBe(1);
    expect(result.ingredients[0].quantity).toBe('2.5');
    expect(result.ingredients[0].ingredient.name).toBe('Lettuce');
  });

  it('should map recipe without link as null', () => {
    const result = mapRecipeFromApi({
      id: 'rec-2',
      name: 'Soup',
      description: '',
      is_active: true,
      ingredients: [],
    });
    expect(result.link).toBeNull();
  });

  it('should map weekly menu with days and meals', () => {
    const result = mapWeeklyMenuFromApi({
      id: 'wm-1',
      name: 'Week 1',
      is_favorite: false,
      is_template: true,
      is_current: true,
      notes: 'Notes',
      days: [
        {
          id: 'day-1',
          weekly_menu_id: 'wm-1',
          day_of_week: 1,
          day_name: 'Monday',
          name: '',
          is_favorite: false,
          notes: '',
          meals: [
            {
              id: 'meal-1',
              menu_day_id: 'day-1',
              meal_type: { id: 'mt-1', name: 'Breakfast', code: 'breakfast', sort_order: 0, is_active: true },
              recipe: {
                id: 'rec-1',
                name: 'Omelette',
                description: 'Egg omelette',
                link: 'https://example.com/omelette',
                is_favorite: false,
                is_active: true,
                ingredients: [
                  {
                    id: 'ri-1',
                    ingredient: { id: 'ing-1', name: 'Egg' },
                    product: null,
                    quantity: '2',
                    unit: 'unit',
                    notes: '',
                    sort_order: 0,
                  },
                ],
              },
              name: '',
              notes: '',
              sort_order: 0,
              is_favorite: false,
            },
          ],
        },
      ],
    });
    expect(result.days[0].dayName).toBe('Monday');
    expect(result.days[0].meals[0].mealType.code).toBe('breakfast');
    expect(result.days[0].meals[0].recipe?.description).toBe('Egg omelette');
    expect(result.days[0].meals[0].recipe?.ingredients.length).toBe(1);
    expect(result.isTemplate).toBe(true);
    expect(result.isCurrent).toBe(true);
  });

  it('should map shopping list from API', () => {
    const result = mapShoppingListFromApi({
      weekly_menu_id: 'wm-1',
      weekly_menu_name: 'Week 1',
      items: [
        {
          product_id: 'p-1',
          product_name: 'Milk',
          commerce: { id: 'c-1', name: 'Store A' },
          unit: 'L',
          total_quantity: '3.0',
          recipes: [{ recipe_id: 'r-1', recipe_name: 'Pancakes', quantity: '1.5' }],
        },
      ],
      without_product: [
        {
          ingredient_id: 'i-1',
          ingredient_name: 'Salt',
          unit: 'g',
          total_quantity: '10',
          recipes: [],
        },
      ],
    });
    expect(result.weeklyMenuName).toBe('Week 1');
    expect(result.items[0].productName).toBe('Milk');
    expect(result.items[0].totalQuantity).toBe('3.0');
    expect(result.withoutProduct[0].ingredientName).toBe('Salt');
  });

  it('should map recipe payload to API snake_case', () => {
    const payload = mapRecipePayloadToApi({
      name: 'Soup',
      description: '',
      link: 'https://example.com/soup',
      isActive: true,
      ingredients: [{
        ingredient: 'ing-1',
        product: null,
        quantity: '1',
        unit: 'L',
        notes: '',
        sortOrder: 0,
      }],
    });
    expect(payload['link']).toBe('https://example.com/soup');
    expect(payload['ingredients']).toEqual([{
      ingredient_id: 'ing-1',
      product_id: null,
      quantity: '1',
      unit: 'L',
      notes: '',
      sort_order: 0,
    }]);
  });

  it('should map empty recipe link to null in API payload', () => {
    expect(mapRecipePayloadToApi({
      name: 'Soup',
      description: '',
      link: '   ',
      isActive: true,
      ingredients: [],
    })['link']).toBeNull();
  });

  it('should map menu meal payload to API snake_case with foreign key ids', () => {
    expect(mapMenuMealPayloadToApi({
      menuDay: 'day-1',
      mealType: 'mt-1',
      recipe: 'rec-1',
      name: '',
      notes: '',
      sortOrder: 0,
    })).toEqual({
      menu_day: 'day-1',
      meal_type_id: 'mt-1',
      recipe_id: 'rec-1',
      name: '',
      notes: '',
      sort_order: 0,
    });
  });

  it('should map copy favorite day payload to API', () => {
    expect(mapCopyFavoriteDayPayloadToApi({
      sourceMenuDayId: 'day-src',
      targetWeeklyMenuId: 'wm-target',
      targetDayOfWeek: 3,
      replaceExisting: true,
    })).toEqual({
      source_menu_day_id: 'day-src',
      target_weekly_menu_id: 'wm-target',
      target_day_of_week: 3,
      replace_existing: true,
    });
  });

  it('should map copy favorite meal payload to API', () => {
    expect(mapCopyFavoriteMealPayloadToApi({
      sourceMenuMealId: 'meal-src',
      targetMenuDayId: 'day-target',
    })).toEqual({
      source_menu_meal_id: 'meal-src',
      target_menu_day_id: 'day-target',
    });
  });
});
