"use client";

import { create } from "zustand";

export type AppLanguage = "fr" | "en";

type State = {
  language: AppLanguage;
  initialized: boolean;
  setLanguage: (language: AppLanguage) => void;
  initFromStorage: () => void;
};

const STORAGE_KEY = "luna.preferences.v1";

export const usePreferencesStore = create<State>((set, get) => ({
  language: "fr",
  initialized: false,
  setLanguage: (language) => {
    set({ language });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ language }));
  },
  initFromStorage: () => {
    if (get().initialized) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { language?: AppLanguage };
        set({
          language: parsed.language === "en" ? "en" : "fr",
          initialized: true,
        });
        return;
      }
    } catch {
      // no-op: fallback to defaults
    }
    set({ initialized: true });
  },
}));
