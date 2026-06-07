import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'es';

export const APP_STRINGS = {
  login: 'login',
  logout: 'logout',
  email: 'email',
  password: 'password',
  dashboard: 'dashboard',
  commerces: 'commerces',
  products: 'products',
  currencies: 'currencies',
  exchangeRates: 'exchangeRates',
  shoppingCart: 'shoppingCart',
  purchaseHistory: 'purchaseHistory',
  mosaicGrid: 'mosaicGrid',
  finance: 'finance',
  language: 'language',
  darkMode: 'darkMode',
  search: 'search',
  category: 'category',
  addToCart: 'addToCart',
  subtotal: 'subtotal',
  confirmPurchase: 'confirmPurchase',
  save: 'save',
  delete: 'delete',
  cancel: 'cancel',
} as const;

export type AppStringKey = keyof typeof APP_STRINGS;

const EN: Record<AppStringKey, string> = {
  login: 'Login',
  logout: 'Logout',
  email: 'Email',
  password: 'Password',
  dashboard: 'Dashboard',
  commerces: 'Commerces',
  products: 'Products',
  currencies: 'Currencies',
  exchangeRates: 'Exchange Rates',
  shoppingCart: 'Shopping Cart',
  purchaseHistory: 'Purchase History',
  mosaicGrid: 'Mosaic Grid',
  finance: 'Finance',
  language: 'Language',
  darkMode: 'Dark Mode',
  search: 'Search',
  category: 'Category',
  addToCart: 'Add to Cart',
  subtotal: 'Subtotal',
  confirmPurchase: 'Confirm Purchase',
  save: 'Save',
  delete: 'Delete',
  cancel: 'Cancel',
};

const ES: Record<AppStringKey, string> = {
  login: 'Iniciar Sesión',
  logout: 'Cerrar Sesión',
  email: 'Correo Electrónico',
  password: 'Contraseña',
  dashboard: 'Panel de Control',
  commerces: 'Comercios',
  products: 'Productos',
  currencies: 'Divisas',
  exchangeRates: 'Tasas de Cambio',
  shoppingCart: 'Carrito de Compras',
  purchaseHistory: 'Historial de Compras',
  mosaicGrid: 'Mosaico',
  finance: 'Finanzas',
  language: 'Idioma',
  darkMode: 'Modo Oscuro',
  search: 'Buscar',
  category: 'Categoría',
  addToCart: 'Añadir al Carrito',
  subtotal: 'Subtotal',
  confirmPurchase: 'Confirmar Compra',
  save: 'Guardar',
  delete: 'Eliminar',
  cancel: 'Cancelar',
};

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly LANG_KEY = 'app_lang';
  private _lang = signal<Lang>((localStorage.getItem(this.LANG_KEY) as Lang) || 'en');

  lang = this._lang.asReadonly();

  translate(key: AppStringKey): string {
    const map = this._lang() === 'en' ? EN : ES;
    return map[key] || key;
  }

  setLang(lang: Lang) {
    this._lang.set(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  t(key: AppStringKey): string {
    return this.translate(key);
  }
}
