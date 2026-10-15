export type CallPurpose = "Prospective" | "Selling" | "Coverage" | "Collection" | "Complaint";
export type CallLocationType = "Customer_Office" | "Customer_Site" | "Hotel" | "Dealer_Branch";
export type ProductLine = "Parts" | "Electrical" | "Hardware" | "Generator" | "Small_Workers";

export interface CallPlan {
  id: number;
  companyId: number;
  salesRepId: number;
  customerId: number;
  contactPersonId: number | null;
  weekBeginning: string;
  dayOfWeek: string;
  plannedDate: string;
  purpose: CallPurpose;
  locationType: CallLocationType;
  exactLocation: string;
  productLine: ProductLine;
  proposedGenerator: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    companyName: string;
    location: string;
  };
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  contactPerson: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
}

export interface CreateCallPlanInput {
  salesRepId: number;
  customerId: number;
  contactPersonId?: number;
  weekBeginning: string;
  dayOfWeek: string;
  plannedDate: string;
  purpose: CallPurpose;
  locationType: CallLocationType;
  exactLocation: string;
  productLine: ProductLine;
  proposedGenerator?: string;
}

export interface UpdateCallPlanInput {
  customerId?: number;
  contactPersonId?: number | null;
  weekBeginning?: string;
  dayOfWeek?: string;
  plannedDate?: string;
  purpose?: CallPurpose;
  locationType?: CallLocationType;
  exactLocation?: string;
  productLine?: ProductLine;
  proposedGenerator?: string;
  isCompleted?: boolean;
}

export interface MarkCompletedInput {
  notes?: string;
  contactPersonId?: number | null;
}

export interface ListCallPlansParams {
  salesRepId?: number;
  startDate?: string;
  endDate?: string;
  isCompleted?: boolean;
}

export interface CallPlansResponse {
  callPlans: CallPlan[];
  total: number;
}
