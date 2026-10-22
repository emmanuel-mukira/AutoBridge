import { create } from "zustand";
import type { Lead, LeadStatus } from "@/features/leads/types";

interface LeadsState {
  selectedLead: Lead | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDetailDialogOpen: boolean;
  filterStatus: LeadStatus | "ALL";
}

interface LeadsActions {
  setSelectedLead: (lead: Lead | null) => void;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (lead: Lead) => void;
  closeEditDialog: () => void;
  openDetailDialog: (lead: Lead) => void;
  closeDetailDialog: () => void;
  setFilterStatus: (status: LeadStatus | "ALL") => void;
  reset: () => void;
}

type LeadsStore = LeadsState & LeadsActions;

export const useLeadsStore = create<LeadsStore>((set) => ({
  selectedLead: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDetailDialogOpen: false,
  filterStatus: "ALL",

  setSelectedLead: (lead) => set({ selectedLead: lead }),

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false, selectedLead: null }),

  openEditDialog: (lead) => set({ isEditDialogOpen: true, selectedLead: lead }),
  closeEditDialog: () => set({ isEditDialogOpen: false, selectedLead: null }),

  openDetailDialog: (lead) => set({ isDetailDialogOpen: true, selectedLead: lead }),
  closeDetailDialog: () => set({ isDetailDialogOpen: false, selectedLead: null }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  reset: () => set({
    selectedLead: null,
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    isDetailDialogOpen: false,
    filterStatus: "ALL",
  }),
}));

// Optimized selector hooks - each component subscribes only to what it needs
export const useCreateDialogState = () => useLeadsStore((state) => state.isCreateDialogOpen);
export const useEditDialogState = () => useLeadsStore((state) => state.isEditDialogOpen);
export const useDetailDialogState = () => useLeadsStore((state) => state.isDetailDialogOpen);
export const useSelectedLead = () => useLeadsStore((state) => state.selectedLead);

// Action selectors - stable references, won't cause re-renders
export const useOpenCreateDialog = () => useLeadsStore((state) => state.openCreateDialog);
export const useCloseCreateDialog = () => useLeadsStore((state) => state.closeCreateDialog);
export const useOpenEditDialog = () => useLeadsStore((state) => state.openEditDialog);
export const useCloseEditDialog = () => useLeadsStore((state) => state.closeEditDialog);
export const useOpenDetailDialog = () => useLeadsStore((state) => state.openDetailDialog);
export const useCloseDetailDialog = () => useLeadsStore((state) => state.closeDetailDialog);
