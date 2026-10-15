import { create } from "zustand";
import type { Quotation } from "@/types/quotation";

interface QuotationsStore {
  selectedQuotation: Quotation | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDetailDialogOpen: boolean;
  isVersionHistoryDialogOpen: boolean;
  filterStatus: string;

  setSelectedQuotation: (quotation: Quotation | null) => void;

  openCreateDialog: () => void;
  closeCreateDialog: () => void;

  openEditDialog: (quotation: Quotation) => void;
  closeEditDialog: () => void;

  openDetailDialog: (quotation: Quotation) => void;
  closeDetailDialog: () => void;

  openVersionHistoryDialog: (quotation: Quotation) => void;
  closeVersionHistoryDialog: () => void;

  setFilterStatus: (status: string) => void;
  reset: () => void;
}

export const useQuotationsStore = create<QuotationsStore>((set) => ({
  selectedQuotation: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDetailDialogOpen: false,
  isVersionHistoryDialogOpen: false,
  filterStatus: "ALL",

  setSelectedQuotation: (quotation) => set({ selectedQuotation: quotation }),

  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false, selectedQuotation: null }),

  openEditDialog: (quotation) => set({ isEditDialogOpen: true, selectedQuotation: quotation }),
  closeEditDialog: () => set({ isEditDialogOpen: false, selectedQuotation: null }),

  openDetailDialog: (quotation) => set({ isDetailDialogOpen: true, selectedQuotation: quotation }),
  closeDetailDialog: () => set({ isDetailDialogOpen: false, selectedQuotation: null }),

  openVersionHistoryDialog: (quotation) => set({ isVersionHistoryDialogOpen: true, selectedQuotation: quotation }),
  closeVersionHistoryDialog: () => set({ isVersionHistoryDialogOpen: false, selectedQuotation: null }),

  setFilterStatus: (status) => set({ filterStatus: status }),

  reset: () => set({
    selectedQuotation: null,
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    isDetailDialogOpen: false,
    isVersionHistoryDialogOpen: false,
    filterStatus: "ALL",
  }),
}));
