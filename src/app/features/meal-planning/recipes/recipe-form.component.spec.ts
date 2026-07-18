import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecipeFormComponent } from './recipe-form.component';
import { RecipeRepository } from '../repositories/recipe.repository';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { ProductRepository } from '../../products/product.repository';

describe('RecipeFormComponent', () => {
  let component: RecipeFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeFormComponent],
      providers: [
        FormBuilder,
        provideRouter([]),
        {
          provide: IngredientRepository,
          useValue: { list: () => of([]) },
        },
        {
          provide: ProductRepository,
          useValue: { list: () => of({ count: 0, next: null, previous: null, results: [] }) },
        },
        {
          provide: RecipeRepository,
          useValue: { get: () => of(null) },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RecipeFormComponent);
    component = fixture.componentInstance;
    component.addIngredientRow();
  });

  it('should require recipe name', () => {
    component.form.patchValue({ name: '' });
    expect(component.form.valid).toBeFalse();
  });

  it('should reject zero or negative quantity', () => {
    const row = component.ingredientsArray.at(0);
    row.patchValue({ ingredient: 'ing-1', quantity: '0' });
    expect(row.get('quantity')?.valid).toBeFalse();
    row.patchValue({ quantity: '-1' });
    expect(row.get('quantity')?.valid).toBeFalse();
  });

  it('should accept decimal quantity for kg unit', () => {
    const row = component.ingredientsArray.at(0);
    row.patchValue({ ingredient: 'ing-1', unit: 'kg', quantity: '2.5' });
    expect(row.get('quantity')?.valid).toBeTrue();
  });

  it('should mark form valid with name and valid ingredient row', () => {
    component.form.patchValue({ name: 'Test Recipe' });
    component.ingredientsArray.at(0).patchValue({ ingredient: 'ing-1', quantity: '1' });
    expect(component.form.valid).toBeTrue();
  });

  it('should accept valid recipe link', () => {
    component.form.patchValue({ name: 'Test Recipe', link: 'https://example.com/recipe' });
    component.ingredientsArray.at(0).patchValue({ ingredient: 'ing-1', quantity: '1' });
    expect(component.form.get('link')?.valid).toBeTrue();
    expect(component.form.valid).toBeTrue();
  });

  it('should accept empty recipe link', () => {
    component.form.patchValue({ name: 'Test Recipe', link: '' });
    component.ingredientsArray.at(0).patchValue({ ingredient: 'ing-1', quantity: '1' });
    expect(component.form.get('link')?.valid).toBeTrue();
    expect(component.form.valid).toBeTrue();
  });

  it('should reject invalid recipe link', () => {
    component.form.patchValue({ name: 'Test Recipe', link: 'not-a-url' });
    component.ingredientsArray.at(0).patchValue({ ingredient: 'ing-1', quantity: '1' });
    expect(component.form.get('link')?.valid).toBeFalse();
    expect(component.form.valid).toBeFalse();
  });
});
