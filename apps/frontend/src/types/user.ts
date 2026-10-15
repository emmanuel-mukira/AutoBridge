/**
 * User type definitions
 */

export type UserRole = "sales_rep" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";

export interface SalesRep {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}
