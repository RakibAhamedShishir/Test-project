export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: number;
  price: number; // Cash or base price
  cardPrice?: number; // Optional dual pricing (cash vs card)
  stock: number;
  lowStockThreshold: number;
  unit: string; // 'pcs', 'pack', 'kg', 'can', 'bottle'
  colorTag?: string;
  taxable: boolean;
  imageUrl?: string;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number;
  discountPercent?: number; // 0 - 100
  note?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'split' | 'store_credit' | 'mobile_pay';

export interface PaymentBreakdown {
  method: PaymentMethod;
  cashTendered?: number;
  cashChange?: number;
  cardAmount?: number;
  splitCashAmount?: number;
  splitCardAmount?: number;
  cardLast4?: string;
  reference?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  costPrice: number;
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  timestamp: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  isCardPricing: boolean;
  cardSurchargeAmount: number;
  grandTotal: number;
  payment: PaymentBreakdown;
  cashierName: string;
  shiftId?: string;
  customerId?: string;
  customerName?: string;
  status: 'completed' | 'refunded' | 'partially_refunded';
  refundReason?: string;
  refundTimestamp?: string;
  refundAmount?: number;
  tamperHash: string;
}

export interface HeldSale {
  id: string;
  title: string;
  createdAt: string;
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  discountPercent: number;
  isCardPricing: boolean;
  notes?: string;
}

export interface CashMovement {
  id: string;
  shiftId: string;
  timestamp: string;
  type: 'cash_in' | 'cash_out' | 'float_initial';
  amount: number;
  reason: string;
  cashierName: string;
}

export interface Shift {
  id: string;
  shiftNumber: number;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  cashSales: number;
  cardSales: number;
  otherSales: number;
  totalSales: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  actualCashCounted?: number;
  cashDiscrepancy?: number; // actual - expected
  note?: string;
  isClosed: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  totalSpent: number;
  visitCount: number;
  createdAt: string;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxIdNumber: string;
  currencySymbol: string;
  defaultTaxRate: number; // e.g. 8.25 for 8.25%
  dualPricingEnabled: boolean;
  cardSurchargePercent: number; // e.g. 3.0 for 3%
  cashDiscountLabel: string;
  paperWidth: '80mm' | '58mm';
  receiptHeaderMsg: string;
  receiptFooterMsg: string;
  soundEnabled: boolean;
  autoPrintReceipt: boolean;
  cashierName: string;
  lowStockAlertBadge: boolean;
  themeMode?: 'dark' | 'light';
}
