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
