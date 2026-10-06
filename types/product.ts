// ─────────────────────────────────────────────────────────────────────────────
// NEXUS STORE — Core Domain Types
// Strict TypeScript: zero `any`, all interfaces explicitly typed
// ─────────────────────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'Smartphones'
  | 'Laptops'
  | 'Audio'
  | 'Wearables'
  | 'Cameras'
  | 'Gaming'
  | 'Accessories';

export type StockStatus = 'In Stock' | 'Limited Stock' | 'Out of Stock';

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'trending';

export interface ProductSpecification {
  readonly label: string;
  readonly value: string;
}

export interface Product {
  readonly id: string;
  readonly title: string;
  readonly brand: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly originalPrice: number;
  readonly discountPercentage: number;
  readonly stockStatus: StockStatus;
  readonly stockQuantity: number;
  readonly matchScore: number;
  readonly isTrending: boolean;
  readonly isNewArrival: boolean;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly shortDescription: string;
  readonly specifications: readonly ProductSpecification[];
  readonly tags: readonly string[];
  readonly sku: string;
}

export interface CartItem {
  readonly product: Product;
  quantity: number;
}

export interface CartState {
  readonly items: CartItem[];
  readonly isDrawerOpen: boolean;
  readonly couponCode: string;
  readonly isCouponApplied: boolean;
  readonly couponDiscountRate: number;
}

export interface FilterState {
  readonly searchQuery: string;
  readonly selectedCategories: readonly ProductCategory[];
  readonly selectedSort: SortOption;
  readonly showInStockOnly: boolean;
}

export interface CheckoutFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
}

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormData, string>>;

export type CartAction =
  | { type: 'ADD_ITEM'; payload: Product }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'INCREMENT_QTY'; payload: string }
  | { type: 'DECREMENT_QTY'; payload: string }
  | { type: 'APPLY_COUPON'; payload: string }
  | { type: 'REMOVE_COUPON' }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'CLEAR_CART' };

export interface PriceBreakdown {
  readonly subtotal: number;
  readonly couponDiscount: number;
  readonly taxableAmount: number;
  readonly estimatedTax: number;
  readonly total: number;
}
