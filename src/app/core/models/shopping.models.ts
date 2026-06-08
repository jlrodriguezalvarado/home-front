export interface Product {
  id: number;
  apiId: string;
  name: string;
  category?: { id: string; name: string } | null;
  imageUrl?: string | null;
  originalPrice: number;
  originalCurrency: string;
  convertedPrice?: number | null;
  commerceId: string;
  presentationUnit: string;
  sourceUrl?: string | null;
  extractionSource: string;
  extractionDate: string;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
