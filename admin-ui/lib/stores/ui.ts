"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  notesOpen: boolean;
  activeNoteId: string | null;
  toggleSidebar: () => void;
  openNotes: () => void;
  closeNotes: () => void;
  setActiveNote: (id: string | null) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      notesOpen: false,
      activeNoteId: null,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      openNotes: () => set({ notesOpen: true }),
      closeNotes: () => set({ notesOpen: false }),
      setActiveNote: (id) => set({ activeNoteId: id }),
    }),
    { name: "catalog-atelier.ui", version: 1 },
  ),
);
