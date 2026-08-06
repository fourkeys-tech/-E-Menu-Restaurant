import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartVariant {
  name: string;
  selectedOption: { label: string; additionalPrice: number };
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
  notes?: string;
  variantSelected?: CartVariant[]; // Changed to Array
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  restaurantSlug: string;
  tableId: string | null;
  addItem: (item: Omit<CartItem, "subtotal">) => void;
  removeItem: (menuItemId: string, variantKey?: string) => void;
  updateQuantity: (menuItemId: string, quantity: number, variantKey?: string) => void;
  clearCart: () => void;
  setTable: (tableId: string) => void;
  setRestaurant: (slug: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

// Generate unique key for variants
export const getVariantKey = (variants?: CartVariant[]) => {
  if (!variants || variants.length === 0) return "";
  return variants.map(v => `${v.name}:${v.selectedOption.label}`).sort().join("|");
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      restaurantSlug: "",
      tableId: null,

      addItem: (item) => {
        set((state) => {
          const key = getVariantKey(item.variantSelected);
          const existing = state.items.find(
            (i) => i.menuItemId === item.menuItemId && getVariantKey(i.variantSelected) === key
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.menuItemId === item.menuItemId && getVariantKey(i.variantSelected) === key
                  ? { ...i, quantity: i.quantity + item.quantity, subtotal: (i.quantity + item.quantity) * item.price }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, subtotal: item.price * item.quantity }],
          };
        });
      },

      removeItem: (menuItemId, variantKey) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.menuItemId === menuItemId && getVariantKey(i.variantSelected) === (variantKey || ""))
          ),
        }));
      },

      updateQuantity: (menuItemId, quantity, variantKey) => {
        if (quantity <= 0) {
          get().removeItem(menuItemId, variantKey);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.menuItemId === menuItemId && getVariantKey(i.variantSelected) === (variantKey || "")
              ? { ...i, quantity, subtotal: i.price * quantity }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      setTable: (tableId) => set({ tableId }),
      setRestaurant: (slug) => set({ restaurantSlug: slug }),
      getTotal: () => get().items.reduce((sum, i) => sum + i.subtotal, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "smartmenu-cart" }
  )
);
