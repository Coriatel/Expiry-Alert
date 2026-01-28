import { create } from 'zustand';
import type { Reagent, GeneralNote, NotificationSettings } from '@/types';

interface AppState {
  reagents: Reagent[];
  archivedReagents: Reagent[];
  generalNotes: GeneralNote[];
  notificationSettings: NotificationSettings | null;
  expiringReagents: Reagent[];
  selectedReagentIds: number[];
  isLoading: boolean;

  setReagents: (reagents: Reagent[]) => void;
  setArchivedReagents: (reagents: Reagent[]) => void;
  setGeneralNotes: (notes: GeneralNote[]) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
  setExpiringReagents: (reagents: Reagent[]) => void;
  setSelectedReagentIds: (ids: number[]) => void;
  toggleReagentSelection: (id: number) => void;
  clearSelection: () => void;
  setIsLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  reagents: [],
  archivedReagents: [],
  generalNotes: [],
  notificationSettings: null,
  expiringReagents: [],
  selectedReagentIds: [],
  isLoading: false,

  setReagents: (reagents) => set({ reagents }),
  setArchivedReagents: (reagents) => set({ archivedReagents: reagents }),
  setGeneralNotes: (notes) => set({ generalNotes: notes }),
  setNotificationSettings: (settings) => set({ notificationSettings: settings }),
  setExpiringReagents: (reagents) => set({ expiringReagents: reagents }),
  setSelectedReagentIds: (ids) => set({ selectedReagentIds: ids }),
  toggleReagentSelection: (id) =>
    set((state) => ({
      selectedReagentIds: state.selectedReagentIds.includes(id)
        ? state.selectedReagentIds.filter((rid) => rid !== id)
        : [...state.selectedReagentIds, id],
    })),
  clearSelection: () => set({ selectedReagentIds: [] }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
