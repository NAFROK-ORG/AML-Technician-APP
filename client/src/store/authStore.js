import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      setAuth: (token, user) => set({ token, user }),

      // FIX: updateUser merges instead of replaces, so partial updates don't wipe fields
      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),

      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "al-auth",
    }
  )
);
