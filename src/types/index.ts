export type MenuTemplate = 'classic' | 'modern-bistro' | 'premium-dark' | 'street-food' | 'organic-cafe' | 'luxury-dining';

export interface RestaurantTheme {
  name?: string;
  primary?: string;
  primaryHover?: string;
  primaryLight?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  buttonStyle?: 'rounded' | 'pill' | 'square';
}

export type AnnouncementType = 'offer' | 'information' | 'warning' | 'event';
export type AnnouncementSpeed = 'slow' | 'medium' | 'fast';

export interface AnnouncementBar {
  enabled?: boolean;
  text?: string;
  type?: AnnouncementType;
  backgroundColor?: string;
  textColor?: string;
  speed?: AnnouncementSpeed;
  link?: string;
  buttonText?: string;
  startDate?: string;
  endDate?: string;
}

export interface Category {
  _id?: string;
  id: string;
  name: string;
  order: number;
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuItem {
  _id?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  hasImage: boolean;
  type: 'veg' | 'non-veg';
  popular: boolean;
  available: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Restaurant {
  _id?: string;
  name: string;
  tagline: string;
  logo: string;
  heroImage: string;
  phone: string;
  email: string;
  location: string;
  about: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    whatsappMessage?: string;
    enableWhatsapp?: boolean;
    enableInstagram?: boolean;
  };
  enableClickTracking?: boolean;
  clickRetentionDays?: number;
  theme?: RestaurantTheme;
  template?: MenuTemplate;
  announcement?: AnnouncementBar;
  socialAnalytics?: {
    whatsappClicks: number;
    instagramClicks: number;
    facebookClicks: number;
    twitterClicks: number;
  };
}

export interface Admin {
  _id?: string;
  username: string;
  password: string;
  createdAt?: Date;
}

// ── Staff Management Types ────────────────────────────────────

export type StaffRole = 'manager' | 'chef' | 'waiter' | 'cashier' | 'delivery' | 'helper';
export type SalaryType = 'monthly' | 'daily' | 'hourly';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';
export type PayrollStatus = 'pending' | 'paid';

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  role: string;
  joiningDate: string;
  salaryType: SalaryType;
  salaryAmount: number;
  emergencyContact: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  tenantId: string;
  staffId: string;
  staffName?: string;
  staffRole?: string;
  date: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payroll {
  id: string;
  tenantId: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  month: string;
  baseSalary: number;
  overtimeAmount: number;
  advanceDeduction: number;
  absentDeduction: number;
  finalAmount: number;
  status: PayrollStatus;
  paidDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuFilters {
  search: string;
  category: string;
  type: 'all' | 'veg' | 'non-veg';
  showOnlyPopular: boolean;
}

// ── POS Types ─────────────────────────────────────────────────

export type POSOrderType = 'dine-in' | 'takeaway' | 'delivery';
export type POSOrderStatus = 'open' | 'kot' | 'paid' | 'closed' | 'cancelled';
export type POSPaymentMethod = 'cash' | 'card' | 'upi';
export type POSTableStatus = 'available' | 'occupied' | 'reserved';

export interface POSSettings {
  posEnabled: boolean;
  id: string;
  tenantId: string;
  gstEnabled: boolean;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  currency: string;
  currencySymbol: string;
  billPrefix: string;
  nextBillNumber: number;
  enableKot: boolean;
}

export interface POSSection {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface POSTable {
  id: string;
  tenantId: string;
  sectionId: string;
  sectionName: string;
  name: string;
  capacity: number;
  status: POSTableStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface POSOrderItem {
  id?: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  subtotal: number;
}

export interface POSOrder {
  id: string;
  tenantId: string;
  orderNumber: string;
  orderType: POSOrderType;
  sectionId: string | null;
  tableId: string | null;
  tableName: string | null;
  customerName: string;
  customerPhone: string;
  status: POSOrderStatus;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: POSPaymentMethod | null;
  paymentStatus: 'pending' | 'paid';
  notes: string;
  items: POSOrderItem[];
  createdAt: string;
  updatedAt: string;
}
