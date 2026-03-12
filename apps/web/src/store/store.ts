import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Reagent,
  GeneralNote,
  NotificationSettings,
  ExpiryStatus,
} from "@/types";

interface AppState {
  reagents: Reagent[];
  archivedReagents: Reagent[];
  generalNotes: GeneralNote[];
  notificationSettings: NotificationSettings | null;
  expiringReagents: Reagent[];
  selectedReagentIds: number[];
  isLoading: boolean;

  // User preferences (persisted)
  viewMode: "table" | "cards";
  statusFilter: ExpiryStatus | "all";
  categoryFilter: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  alertExpanded: boolean | null;
  calendarExpanded: boolean;

  setReagents: (reagents: Reagent[]) => void;
  setArchivedReagents: (reagents: Reagent[]) => void;
  setGeneralNotes: (notes: GeneralNote[]) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
  setExpiringReagents: (reagents: Reagent[]) => void;
  setSelectedReagentIds: (ids: number[]) => void;
  toggleReagentSelection: (id: number) => void;
  clearSelection: () => void;
  setIsLoading: (loading: boolean) => void;

  // Preference setters
  setViewMode: (mode: "table" | "cards") => void;
  setStatusFilter: (filter: ExpiryStatus | "all") => void;
  setCategoryFilter: (filter: string) => void;
  setSortField: (field: string) => void;
  setSortDirection: (direction: "asc" | "desc") => void;
  setAlertExpanded: (expanded: boolean | null) => void;
  setCalendarExpanded: (expanded: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      reagents: [],
      archivedReagents: [],
      generalNotes: [],
      notificationSettings: null,
      expiringReagents: [],
      selectedReagentIds: [],
      isLoading: false,

      // Preference defaults
      viewMode: "table",
      statusFilter: "all",
      categoryFilter: "all",
      sortField: "expiry_date",
      sortDirection: "asc",
      alertExpanded: null,
      calendarExpanded: false,

      setReagents: (reagents) => set({ reagents }),
      setArchivedReagents: (reagents) => set({ archivedReagents: reagents }),
      setGeneralNotes: (notes) => set({ generalNotes: notes }),
      setNotificationSettings: (settings) =>
        set({ notificationSettings: settings }),
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

      // Preference setters
      setViewMode: (mode) => set({ viewMode: mode }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setCategoryFilter: (filter) => set({ categoryFilter: filter }),
      setSortField: (field) => set({ sortField: field }),
      setSortDirection: (direction) => set({ sortDirection: direction }),
      setAlertExpanded: (expanded) => set({ alertExpanded: expanded }),
      setCalendarExpanded: (expanded) => set({ calendarExpanded: expanded }),
    }),
    {
      name: "expiry-alert-preferences",
      partialize: (state) => ({
        viewMode: state.viewMode,
        statusFilter: state.statusFilter,
        categoryFilter: state.categoryFilter,
        sortField: state.sortField,
        sortDirection: state.sortDirection,
        alertExpanded: state.alertExpanded,
        calendarExpanded: state.calendarExpanded,
      }),
    },
  ),
);
