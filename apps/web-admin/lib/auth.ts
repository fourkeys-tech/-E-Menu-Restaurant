import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurant: { id: string; name: string; slug: string; logoUrl?: string; primaryColor?: string; accentColor?: string } | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasRole: (...roles: string[]) => boolean;
  shiftActive: boolean;
  setShiftActive: (active: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      shiftActive: false,
      setShiftActive: (active) => set({ shiftActive: active }),
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, shiftActive: false }),
      isAuthenticated: () => !!get().token,
      hasRole: (...roles) => !!get().user && roles.includes(get().user!.role),
    }),
    { name: "smartmenu-auth" }
  )
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchAdmin<T>(path: string, options?: RequestInit): Promise<T> {
  const { token } = useAuthStore.getState();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Terjadi kesalahan");
  return data;
}
