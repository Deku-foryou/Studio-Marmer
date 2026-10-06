// ─────────────────────────────────────────────────────────────────────────────
// Studio Marmer — Core Domain Types (database-backed catalog)
// Strict TypeScript: zero `any`, all interfaces explicitly typed
//
// NOTE ON `CatalogProduct`:
// This is a *serialized view model*, not the Prisma model. It is the shape
// that crosses the server -> client boundary. Prisma `Decimal` values are
// converted to `number` here (in the data access layer) so that no Decimal
// instance is ever handed to a Client Component. See lib/data/products.ts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categories are now managed in the database, so the set is no longer a
 * compile-time union. Kept as an alias so existing imports keep working.
 */
export type ProductCategory = string;

export type StockStatus = 'In Stock' | 'Limited Stock' | 'Out of Stock';

export type PricingType = 'FIXED' | 'STARTING_FROM';

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'trending';

/**
 * Serialized product used by Client Components (cards, cart drawer, filters).
 *
 * Every field is a plain JSON-safe primitive. Derived presentation fields
 * (`brand`, `discountPercentage`, `stockStatus`, `isTrending`, `isNewArrival`)
 * are computed in the data access layer from the persisted Prisma columns, so
 * the existing UI components keep working unchanged.
 */
export interface CatalogProduct {
  /** Stringified numeric primary key. Used for DOM ids and cart line keys. */
  id: string;
  /** Public URL segment: /produk/[slug] */
  slug: string;
  title: string;
  /** Derived eyebrow label (stone type). */
  brand: string;
  category: string;
  categorySlug: string;
  /** Number, never a Prisma Decimal. */
  price: number;
  /** Number or null, never a Prisma Decimal. */
  originalPrice: number | null;
  /** Derived from price/originalPrice. Never stored in the database. */
  discountPercentage: number;
  pricingType: PricingType;
  stockStatus: StockStatus;
  isTrending: boolean;
  isNewArrival: boolean;
  isUniquePiece: boolean;
  /** Whether the piece can currently be purchased. */
  isAvailable: boolean;
  imageUrl: string;
  imageAlt: string;
}

/** Serialized category used by FilterBar. */
export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Extra marble detail rendered on the product detail page (server-side). */
export interface ProductDetail extends CatalogProduct {
  material: string | null;
  stoneType: string | null;
  color: string;
  dimensions: string;
  weightGrams: number;
  craftingTime: string | null;
  shopeeUrl: string | null;
  whatsappEnabled: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  shortDescription: string;
  description: string;
  /** Ordered, already flattened to display-ready label/value pairs. */
  specifications: readonly ProductSpecification[];
  /** Ordered image URLs for the gallery. */
  imageUrls: readonly string[];
}

export interface ProductSpecification {
  readonly label: string;
  readonly value: string;
}

export interface CartItem {
  readonly product: CatalogProduct;
  quantity: number;
}

export interface CartState {
  readonly items: CartItem[];
  readonly isDrawerOpen: boolean;
}

export interface FilterState {
  readonly searchQuery: string;
  readonly selectedCategories: readonly string[];
  readonly selectedSort: SortOption;
  readonly showInStockOnly: boolean;
}

export type CartAction =
  | { type: 'ADD_ITEM'; payload: CatalogProduct }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'INCREMENT_QTY'; payload: string }
  | { type: 'DECREMENT_QTY'; payload: string }
  | { type: 'TOGGLE_DRAWER' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'CLEAR_CART' };

export interface PriceBreakdown {
  readonly subtotal: number;
  readonly total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPRECATED — retained only for data/products.ts
//
// The old consumer-electronics dataset is no longer read by any application
// code (the catalog is served from MySQL via lib/data/products.ts). The file
// itself is still on disk pending the next cleanup checkpoint, so this shape
// exists purely to keep it type-checking. Both this interface AND
// data/products.ts should be deleted together - do not use it for new code.
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use `CatalogProduct`. Retained for data/products.ts only. */
export interface Product {
  readonly id: string;
  readonly title: string;
  readonly brand: string;
  readonly category: ProductCategory;
  readonly price: number;
  readonly originalPrice: number;
  readonly discountPercentage: number;
  readonly stockStatus: StockStatus;
  readonly isTrending: boolean;
  readonly isNewArrival: boolean;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly shortDescription: string;
  readonly specifications: readonly ProductSpecification[];
  readonly tags: readonly string[];
  readonly sku: string;
}
