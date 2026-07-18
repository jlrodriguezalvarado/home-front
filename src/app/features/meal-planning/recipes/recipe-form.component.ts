import { Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RecipeRepository } from '../repositories/recipe.repository';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { ProductRepository } from '../../products/product.repository';
import { Ingredient, RecipePayload } from '../models/meal-planning.models';
import { Product } from '../../../core/models/shopping.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ToastService } from '../../../shared/services/toast.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state.component';
import { RichTextEditorComponent } from '../../../shared/components/rich-text-editor.component';
import { IngredientManageDialogComponent } from '../ingredients/ingredient-manage-dialog.component';
import { IngredientFormDialogComponent } from '../ingredients/ingredient-form-dialog.component';
import { canonicalPresentationUnit, isPresentationUnitKg } from '../../shopping/utils/presentation-unit.utils';

function urlValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return { invalidUrl: true };
    return null;
  } catch {
    return { invalidUrl: true };
  }
}

function quantityValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return { required: true };
  const normalized = value.replace(',', '.');
  const num = Number(normalized);
  if (Number.isNaN(num) || num <= 0) return { positiveQuantity: true };
  const unit = String(control.parent?.get('unit')?.value ?? '');
  if (!isPresentationUnitKg(unit) && !Number.isInteger(num)) return { integerQuantity: true };
  return null;
}

@Component({
  selector: 'app-recipe-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LoadingStateComponent,
    ErrorStateComponent,
    RichTextEditorComponent,
    IngredientManageDialogComponent,
    IngredientFormDialogComponent,
  ],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.scss',
})
export class RecipeFormComponent implements OnInit, OnDestroy {
  @ViewChild('imageInput') imageInput?: ElementRef<HTMLInputElement>;
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  repo = inject(RecipeRepository);
  ingredientRepo = inject(IngredientRepository);
  productRepo = inject(ProductRepository);
  i18n = inject(I18nService);
  toast = inject(ToastService);
  ingredients = signal<Ingredient[]>([]);
  productsById = signal<Record<string, Product>>({});
  loadingProductsById = signal<Record<string, boolean>>({});
  loading = signal(false);
  saving = signal(false);
  error = signal(false);
  editingId = signal<string | null>(null);
  existingImage = signal<string | null>(null);
  existingVideo = signal<string | null>(null);
  selectedImage = signal<File | null>(null);
  selectedVideo = signal<File | null>(null);
  clearImage = signal(false);
  clearVideo = signal(false);
  imagePreviewUrl = signal<string | null>(null);
  videoPreviewUrl = signal<string | null>(null);
  showManageIngredients = signal(false);
  showIngredientForm = signal(false);
  ingredientFormTarget = signal<Ingredient | null>(null);
  ingredientFormRowIndex = signal<number | null>(null);
  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    link: ['', urlValidator],
    isActive: [true],
    ingredients: this.fb.array([]),
  });
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.editingId.set(id);
    this.loading.set(true);
    this.ingredientRepo.list({ is_active: true }).subscribe({
      next: (ingredients) => {
        this.ingredients.set(ingredients);
        if (id) {
          this.loadRecipe(id);
        } else {
          this.addIngredientRow();
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  ngOnDestroy() {
    this.revokeObjectUrl(this.imagePreviewUrl());
    this.revokeObjectUrl(this.videoPreviewUrl());
  }

  displayImageUrl(): string | null {
    if (this.imagePreviewUrl()) return this.imagePreviewUrl();
    if (this.clearImage()) return null;
    return this.existingImage();
  }

  displayVideoUrl(): string | null {
    if (this.videoPreviewUrl()) return this.videoPreviewUrl();
    if (this.clearVideo()) return null;
    return this.existingVideo();
  }

  hasMediaUpload(): boolean {
    return Boolean(this.selectedImage() || this.selectedVideo());
  }

  openImagePicker() {
    this.imageInput?.nativeElement.click();
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.revokeObjectUrl(this.imagePreviewUrl());
    this.selectedImage.set(file);
    this.clearImage.set(false);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
    input.value = '';
  }

  onVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.revokeObjectUrl(this.videoPreviewUrl());
    this.selectedVideo.set(file);
    this.clearVideo.set(false);
    this.videoPreviewUrl.set(URL.createObjectURL(file));
  }

  removeImage() {
    this.revokeObjectUrl(this.imagePreviewUrl());
    this.selectedImage.set(null);
    this.imagePreviewUrl.set(null);
    if (this.existingImage()) this.clearImage.set(true);
  }

  removeVideo() {
    this.revokeObjectUrl(this.videoPreviewUrl());
    this.selectedVideo.set(null);
    this.videoPreviewUrl.set(null);
    if (this.existingVideo()) this.clearVideo.set(true);
  }

  savingLabel(): string {
    if (!this.saving()) return this.i18n.t('save');
    if (this.hasMediaUpload()) {
      return this.i18n.lang() === 'en' ? 'Uploading...' : 'Subiendo...';
    }
    return this.i18n.lang() === 'en' ? 'Saving...' : 'Guardando...';
  }

  get ingredientsArray(): FormArray {
    return this.form.get('ingredients') as FormArray;
  }

  loadRecipe(id: string) {
    this.repo.get(id).subscribe({
      next: (recipe) => {
        this.existingImage.set(recipe.image ?? null);
        this.existingVideo.set(recipe.video ?? null);
        this.clearImage.set(false);
        this.clearVideo.set(false);
        this.form.patchValue({
          name: recipe.name,
          description: recipe.description,
          link: recipe.link ?? '',
          isActive: recipe.isActive,
        });
        this.ingredientsArray.clear();
        recipe.ingredients.forEach((row) => {
          this.ingredientsArray.push(this.createIngredientGroup({
            ingredient: row.ingredient.id,
            product: row.product?.id ?? null,
            quantity: row.quantity,
            unit: row.unit,
            notes: row.notes,
            sortOrder: row.sortOrder,
          }));
        });
        recipe.ingredients.forEach((row, index) => {
          if (row.product?.id) this.ensureProductLoaded(row.product.id, index);
        });
        this.ingredientsArray.controls.forEach((_, index) => this.syncIngredientRow(index));
        if (recipe.ingredients.length === 0) this.addIngredientRow();
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  createIngredientGroup(data?: {
    ingredient?: string;
    product?: string | null;
    quantity?: string;
      unit?: 'kg' | 'unit' | string;
    notes?: string;
    sortOrder?: number;
  }) {
    return this.fb.group({
      ingredient: [data?.ingredient ?? '', Validators.required],
      product: [data?.product ?? null],
      quantity: [data?.quantity ?? '1', quantityValidator],
      unit: [data?.unit ?? 'unit'],
      notes: [data?.notes ?? ''],
      sortOrder: [data?.sortOrder ?? this.ingredientsArray.length],
    });
  }

  addIngredientRow() {
    this.ingredientsArray.push(this.createIngredientGroup());
  }

  removeIngredientRow(index: number) {
    this.ingredientsArray.removeAt(index);
  }

  onIngredientChange(index: number) {
    this.syncIngredientRow(index);
  }

  openManageIngredients() {
    this.showManageIngredients.set(true);
  }

  closeManageIngredients() {
    this.showManageIngredients.set(false);
  }

  onIngredientsManaged(activeIngredients: Ingredient[]) {
    this.ingredients.set(activeIngredients);
    this.ingredientsArray.controls.forEach((_, index) => this.syncIngredientRow(index));
  }

  openCreateIngredient(rowIndex?: number) {
    this.ingredientFormTarget.set(null);
    this.ingredientFormRowIndex.set(rowIndex ?? null);
    this.showIngredientForm.set(true);
  }

  openEditSelectedIngredient(rowIndex: number) {
    const ingredientId = String(this.ingredientsArray.at(rowIndex).get('ingredient')?.value ?? '');
    const ingredient = this.ingredients().find((i) => i.id === ingredientId);
    if (!ingredient) return;
    this.ingredientFormTarget.set(ingredient);
    this.ingredientFormRowIndex.set(rowIndex);
    this.showIngredientForm.set(true);
  }

  closeIngredientForm() {
    this.showIngredientForm.set(false);
    this.ingredientFormTarget.set(null);
    this.ingredientFormRowIndex.set(null);
  }

  onIngredientFormSaved(saved: Ingredient) {
    const wasCreate = !this.ingredientFormTarget();
    const rowIndex = this.ingredientFormRowIndex();
    this.closeIngredientForm();
    if (saved.isActive) {
      this.ingredients.update((items) => {
        const index = items.findIndex((item) => item.id === saved.id);
        if (index === -1) return [...items, saved].sort((a, b) => a.name.localeCompare(b.name));
        return items.map((item) => (item.id === saved.id ? saved : item));
      });
    } else {
      this.ingredients.update((items) => items.filter((item) => item.id !== saved.id));
    }
    if (wasCreate && rowIndex !== null && saved.isActive) {
      this.ingredientsArray.at(rowIndex).patchValue({ ingredient: saved.id });
      this.syncIngredientRow(rowIndex);
      return;
    }
    this.ingredientsArray.controls.forEach((_, index) => this.syncIngredientRow(index));
  }

  associatedProductName(index: number): string | null {
    const group = this.ingredientsArray.at(index);
    const ingredientId = group.get('ingredient')?.value;
    const ingredient = this.ingredients().find((i) => i.id === ingredientId);
    return ingredient?.defaultProduct?.name ?? this.loadedProductName(index);
  }

  hasIngredientDefaultProduct(index: number): boolean {
    const group = this.ingredientsArray.at(index);
    const ingredientId = String(group.get('ingredient')?.value ?? '');
    const ingredient = this.ingredients().find((i) => i.id === ingredientId);
    return Boolean(ingredient?.defaultProduct);
  }

  isUnitRow(index: number): boolean {
    const group = this.ingredientsArray.at(index);
    const unit = String(group.get('unit')?.value ?? '');
    return !isPresentationUnitKg(unit);
  }

  onQuantityBlur(index: number) {
    const group = this.ingredientsArray.at(index);
    const raw = String(group.get('quantity')?.value ?? '').trim();
    const normalized = raw.replace(',', '.');
    const num = Number(normalized);
    if (Number.isNaN(num) || num <= 0) return;
    if (this.isUnitRow(index)) {
      group.get('quantity')?.setValue(String(Math.round(num)));
      return;
    }
    group.get('quantity')?.setValue(normalized);
  }

  private syncIngredientRow(index: number) {
    const group = this.ingredientsArray.at(index);
    const ingredientId = String(group.get('ingredient')?.value ?? '');
    const ingredient = this.ingredients().find((i) => i.id === ingredientId);
    const productId = ingredient?.defaultProduct?.id ?? null;
    if (productId) {
      group.patchValue({ product: productId }, { emitEvent: false });
      this.ensureProductLoaded(productId, index);
    } else if (!group.get('product')?.value) {
      group.patchValue({ product: null }, { emitEvent: false });
    }
    group.get('quantity')?.updateValueAndValidity({ emitEvent: false });
  }

  private loadedProductName(index: number): string | null {
    const productId = String(this.ingredientsArray.at(index).get('product')?.value ?? '');
    if (!productId) return null;
    return this.productsById()[productId]?.name ?? null;
  }

  private ensureProductLoaded(productId: string, index: number) {
    if (this.productsById()[productId] || this.loadingProductsById()[productId]) return;
    this.loadingProductsById.set({ ...this.loadingProductsById(), [productId]: true });
    this.productRepo.get(productId).subscribe({
      next: (product) => {
        this.productsById.set({ ...this.productsById(), [productId]: product });
        this.loadingProductsById.set({ ...this.loadingProductsById(), [productId]: false });
        const group = this.ingredientsArray.at(index);
        if (!group) return;
        group.patchValue({ unit: canonicalPresentationUnit(product.presentationUnit) }, { emitEvent: false });
        group.get('quantity')?.updateValueAndValidity({ emitEvent: false });
      },
      error: () => {
        this.loadingProductsById.set({ ...this.loadingProductsById(), [productId]: false });
      },
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(this.i18n.lang() === 'en' ? 'Please fix validation errors' : 'Corrige los errores de validación');
      return;
    }
    const value = this.form.getRawValue();
    const rows = (value.ingredients ?? []) as Array<{
      ingredient?: string;
      product?: string | null;
      quantity?: string;
      unit?: string;
      notes?: string;
      sortOrder?: number;
    }>;
    const linkValue = String(value.link ?? '').trim();
    const payload: RecipePayload = {
      name: value.name ?? '',
      description: value.description ?? '',
      link: linkValue ? linkValue : null,
      isActive: value.isActive ?? true,
      ingredients: rows.map((row, index) => ({
        ingredient: String(row.ingredient ?? ''),
        product: row.product ? String(row.product) : null,
        quantity: String(row.quantity ?? '0').replace(',', '.'),
        unit: String(row.unit ?? 'unit'),
        notes: String(row.notes ?? ''),
        sortOrder: Number(row.sortOrder ?? index),
      })),
    };
    this.saving.set(true);
    const editingId = this.editingId();
    const writeOptions = {
      image: this.selectedImage() ?? undefined,
      video: this.selectedVideo() ?? undefined,
      clearImage: this.clearImage() || undefined,
      clearVideo: this.clearVideo() || undefined,
    };
    const request$ = editingId
      ? this.repo.update(editingId, payload, writeOptions)
      : this.repo.create(payload, writeOptions.image, writeOptions.video);
    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(this.i18n.t('save'));
        this.router.navigate(['/meal-planning/recipes']);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.toast.error(this.extractSaveErrorMessage(err));
      },
    });
  }

  private revokeObjectUrl(url: string | null) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  private extractSaveErrorMessage(err: HttpErrorResponse): string {
    const fallback = this.i18n.lang() === 'en' ? 'Save failed' : 'Error al guardar';
    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (!body || typeof body !== 'object') return fallback;
    const record = body as Record<string, unknown>;
    const detail = record['detail'];
    if (typeof detail === 'string' && detail.trim()) return detail;
    for (const key of ['image', 'video', 'non_field_errors']) {
      const value = record[key];
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string' && value.trim()) return value;
    }
    return fallback;
  }
}
