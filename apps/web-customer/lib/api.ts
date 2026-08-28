const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data.data;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  description?: string;
  openHours?: string;
  taxPercentage: number;
  serviceCharge: number;
  primaryColor: string;
  accentColor: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  menuItems: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isBestSeller: boolean;
  isSpicy: boolean;
  allergenInfo?: string;
  variants?: Array<{
    name: string;
    options: Array<{ label: string; additionalPrice: number }>;
  }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  promotion?: { name: string };
  createdAt: string;
  table?: { tableNumber: string; label?: string };
  restaurant: { name: string; logoUrl?: string; primaryColor: string; accentColor: string };
  orderItems: Array<{
    id: string;
    quantity: number;
    priceAtOrder: number;
    notes?: string;
    subtotal: number;
    variantSelected?: string;
    menuItem: { name: string; imageUrl?: string };
  }>;
  payment?: { snapToken?: string; snapRedirectUrl?: string; status: string };
}

export const api = {
  getMenu: (slug: string, category?: string, search?: string) =>
    fetchAPI<{ restaurant: Restaurant; categories: Category[] }>(
      `/api/public/${slug}/menu${category ? `?category=${category}` : ""}${search ? `&search=${search}` : ""}`
    ),

  getOrderStatus: (orderId: string) =>
    fetchAPI<Order>(`/api/orders/${orderId}/status`),

  createOrder: (body: {
    restaurantSlug: string;
    tableId?: string | null;
    customerName?: string;
    customerPhone?: string;
    promoCode?: string;
    notes?: string;
    paymentMethod: "midtrans" | "cashier";
    items: Array<{
      menuItemId: string;
      quantity: number;
      notes?: string;
      variantSelected?: unknown;
    }>;
  }) =>
    fetchAPI<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    
  getTableStatus: (restaurantSlug: string, tableId: string) =>
    fetchAPI<{ isOccupied: boolean; tableNumber?: string }>(`/api/public/${restaurantSlug}/table-status/${tableId}`),
};

export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
