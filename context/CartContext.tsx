'use client';

import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
} from 'react';
import type {
  CartState,
  CartAction,
  CartItem,
  CatalogProduct,
  PriceBreakdown,
} from '@/types/product';

// ─── Constants ────────────────────────────────────────────────────────────────
const LS_KEY = 'studio-marmer-cart-v2';

// ─── Initial State ─────────────────────────────────────────────────────────────
const initialState: CartState = {
  items: [],
  isDrawerOpen: false,
};

// ─── Reducer ───────────────────────────────────────────────────────────────────
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.product.id === action.payload.id
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.payload.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.payload, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.product.id !== action.payload),
      };

    case 'INCREMENT_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.payload
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      };

    case 'DECREMENT_QTY': {
      const updated = state.items
        .map((i) =>
          i.product.id === action.payload
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0);
      return { ...state, items: updated };
    }

    case 'TOGGLE_DRAWER':
      return { ...state, isDrawerOpen: !state.isDrawerOpen };

    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };

    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
      };

    default:
      return state;
  }
}

// ─── Context Shape ─────────────────────────────────────────────────────────────
interface CartContextValue {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  priceBreakdown: PriceBreakdown;
  totalItemCount: number;
  addToCart: (product: CatalogProduct) => void;
  removeFromCart: (productId: string) => void;
  incrementQty: (productId: string) => void;
  decrementQty: (productId: string) => void;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ─── Provider ──────────────────────────────────────────────────────────────────
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage (SSR-safe: runs only on client)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          items?: CartItem[];
        };
        if (parsed.items && Array.isArray(parsed.items)) {
          parsed.items.forEach((item: CartItem) => {
            dispatch({ type: 'ADD_ITEM', payload: item.product });
            // Add additional quantities beyond the first
            for (let q = 1; q < item.quantity; q++) {
              dispatch({ type: 'INCREMENT_QTY', payload: item.product.id });
            }
          });
        }
      }
    } catch {
      // silently ignore localStorage parse errors
    } finally {
      setIsHydrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage on state changes (after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          items: state.items,
        })
      );
    } catch {
      // silently ignore
    }
  }, [
    state.items,
    isHydrated,
  ]);

  // ─── Memoized: Price Breakdown ─────────────────────────────────────────────
  const priceBreakdown = useMemo((): PriceBreakdown => {
    const subtotal =
      Math.round(
        state.items.reduce(
          (acc, item) => acc + item.product.price * item.quantity,
          0
        ) * 100
      ) / 100;

    return { subtotal, total: subtotal };
  }, [state.items]);

  // ─── Memoized: Total Count ────────────────────────────────────────────────
  const totalItemCount = useMemo(
    () => state.items.reduce((acc, item) => acc + item.quantity, 0),
    [state.items]
  );

  // ─── Stable Action Helpers ─────────────────────────────────────────────────
  const addToCart = useCallback(
    (product: CatalogProduct) => dispatch({ type: 'ADD_ITEM', payload: product }),
    []
  );
  const removeFromCart = useCallback(
    (productId: string) =>
      dispatch({ type: 'REMOVE_ITEM', payload: productId }),
    []
  );
  const incrementQty = useCallback(
    (productId: string) =>
      dispatch({ type: 'INCREMENT_QTY', payload: productId }),
    []
  );
  const decrementQty = useCallback(
    (productId: string) =>
      dispatch({ type: 'DECREMENT_QTY', payload: productId }),
    []
  );
  const toggleDrawer = useCallback(
    () => dispatch({ type: 'TOGGLE_DRAWER' }),
    []
  );
  const openDrawer = useCallback(
    () => dispatch({ type: 'OPEN_DRAWER' }),
    []
  );
  const closeDrawer = useCallback(
    () => dispatch({ type: 'CLOSE_DRAWER' }),
    []
  );
  const clearCart = useCallback(
    () => dispatch({ type: 'CLEAR_CART' }),
    []
  );

  const value = useMemo<CartContextValue>(
    () => ({
      state,
      dispatch,
      priceBreakdown,
      totalItemCount,
      addToCart,
      removeFromCart,
      incrementQty,
      decrementQty,
      toggleDrawer,
      openDrawer,
      closeDrawer,
      clearCart,
    }),
    [
      state,
      priceBreakdown,
      totalItemCount,
      addToCart,
      removeFromCart,
      incrementQty,
      decrementQty,
      toggleDrawer,
      openDrawer,
      closeDrawer,
      clearCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return ctx;
}
