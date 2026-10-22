import { 
  Building2, 
  GraduationCap, 
  Church, 
  Hospital, 
  Hotel, 
  Users, 
  Factory, 
  Home, 
  Tractor, 
  ShoppingCart, 
  Fuel, 
  Building 
} from "lucide-react";
import type { CustomerCategory } from "../types";

export const CUSTOMER_CATEGORIES: { value: CustomerCategory; label: string }[] = [
  { value: "SACCOS_BANKS", label: "Saccos & Banks" },
  { value: "SCHOOLS", label: "Schools" },
  { value: "CHURCHES", label: "Churches" },
  { value: "HOSPITALS", label: "Hospitals" },
  { value: "HOTELS", label: "Hotels" },
  { value: "NGOS", label: "NGOs" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "DOMESTIC", label: "Domestic" },
  { value: "FARMING_DAIRY", label: "Farming & Dairy Society" },
  { value: "SUPERMARKETS", label: "Supermarkets" },
  { value: "PETROL_STATIONS", label: "Petrol Stations" },
  { value: "APARTMENTS_COMMERCIALS", label: "Apartments & Commercials" },
];

export function getCategoryLabel(category?: CustomerCategory): string {
  if (!category) return "Uncategorized";
  const found = CUSTOMER_CATEGORIES.find((c) => c.value === category);
  return found?.label || category;
}

export function getCategoryIcon(category?: CustomerCategory) {
  if (!category) return Building2;
  
  const iconMap: Record<CustomerCategory, any> = {
    SACCOS_BANKS: Building2,
    SCHOOLS: GraduationCap,
    CHURCHES: Church,
    HOSPITALS: Hospital,
    HOTELS: Hotel,
    NGOS: Users,
    INDUSTRIAL: Factory,
    DOMESTIC: Home,
    FARMING_DAIRY: Tractor,
    SUPERMARKETS: ShoppingCart,
    PETROL_STATIONS: Fuel,
    APARTMENTS_COMMERCIALS: Building,
  };
  
  return iconMap[category] || Building2;
}
