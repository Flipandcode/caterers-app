// Hand-written domain types mirroring supabase/migrations/0001_init.sql.
// Once the project is running, generate `types/supabase.ts` via
// `supabase gen types typescript` and have these extend/re-export from it —
// kept hand-written for now so Phase 2 UI has something concrete to build against.

export type MemberRole = "owner" | "manager" | "staff";
export type FoodType = "veg" | "non_veg" | "egg";
export type OrderFoodType = "veg" | "non_veg" | "mixed";
export type OrderStatus =
  | "enquiry"
  | "quotation_sent"
  | "tentative"
  | "confirmed"
  | "preparation"
  | "completed"
  | "cancelled";
export type PaymentType = "advance" | "part_payment" | "final_payment" | "refund" | "adjustment";
export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "cheque" | "other";

/** All money fields are integer paise. Never floats. */
export type Paise = number;

export interface Business {
  id: string;
  name: string;
  displayName: string | null;
  ownerId: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pinCode: string | null;
  timezone: string;
  onboardingCompleted: boolean;
}

export interface MenuCategory {
  id: string;
  businessId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  foodType: FoodType;
  description: string | null;
  defaultExtraPricePaise: Paise;
  isActive: boolean;
  isArchived: boolean;
  displayOrder: number;
}

/** Convenience shape used by the catalogue UI: items grouped under their category. */
export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

/** "Choose N from category X" within a package. */
export interface PackageCategoryRule {
  id: string;
  packageId: string;
  categoryId: string;
  categoryName: string; // denormalized for display convenience
  allowedSelectionCount: number;
  displayOrder: number;
}

/** A fixed item always included in a package, e.g. "Jeera Rice" every time. */
export interface PackageItem {
  id: string;
  packageId: string;
  menuItemId: string;
  menuItemName: string; // denormalized for display convenience
  displayOrder: number;
}

export interface Package {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  foodType: OrderFoodType;
  basePricePerPlatePaise: Paise;
  minGuestCount: number;
  isActive: boolean;
  isArchived: boolean;
  categoryRules: PackageCategoryRule[];
  preselectedItems: PackageItem[];
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  whatsappNumber: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

/** A menu line actually chosen on a specific order — snapshot fields included. */
export interface OrderMenuItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  menuItemNameSnapshot: string;
  categoryNameSnapshot: string;
  foodType: FoodType;
  isExtra: boolean;
  extraPricePaise: Paise;
  extraPriceIsFlat: boolean;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  orderNumber: string;
  eventName: string;
  eventDate: string; // ISO date
  eventStartTime: string | null;
  eventEndTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  guestCount: number;
  specialInstructions: string | null;
  foodType: OrderFoodType;
  packageId: string | null;
  packageNameSnapshot: string | null;
  pricePerPlatePaise: Paise;
  serviceChargePaise: Paise;
  transportChargePaise: Paise;
  equipmentChargePaise: Paise;
  staffChargePaise: Paise;
  otherChargesPaise: Paise;
  discountPaise: Paise;
  taxEnabled: boolean;
  taxName: string | null;
  taxPercentage: number;
  subtotalPaise: Paise;
  taxAmountPaise: Paise;
  grandTotalPaise: Paise;
  termsSnapshot: string | null;
  status: OrderStatus;
  isCancelled: boolean;
  menuItems: OrderMenuItem[];
}

export interface Payment {
  id: string;
  businessId: string;
  orderId: string;
  paymentNumber: string;
  amountPaise: Paise;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  paymentDate: string; // ISO date
  referenceNumber: string | null;
  notes: string | null;
}

/** Derived, not stored — computed wherever an order + its payments are loaded together. */
export interface PaymentSummary {
  grandTotalPaise: Paise;
  totalPaidPaise: Paise;
  balancePaise: Paise;
  status: "not_paid" | "partially_paid" | "paid" | "overdue";
}
