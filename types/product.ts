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

export type StockStatus = 'In Stock' | 'Limited Stock' | 'Out of Stock';

export type PricingType = 'FIXED' | 'STARTING_FROM';

export type SortOption =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'trending';

/**
 * Serialized product used by the catalog UI (cards, grid, gallery).
 *
 * Every field is a plain JSON-safe primitive. Derived presentation fields
 * (`brand`, `discountPercentage`, `stockStatus`, `isTrending`, `isNewArrival`)
 * are computed in the data access layer from the persisted Prisma columns.
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

export interface FilterState {
  readonly searchQuery: string;
  readonly selectedCategories: readonly string[];
  readonly selectedSort: SortOption;
  readonly showInStockOnly: boolean;
}
