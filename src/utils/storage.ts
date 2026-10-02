import { Product, Sale, Shift, Customer, StoreSettings, HeldSale, CashMovement } from '../types/pos';

const STORAGE_KEYS = {
  PRODUCTS: 'sleetpos_products_v1',
  SALES: 'sleetpos_sales_v1',
  CURRENT_SHIFT: 'sleetpos_current_shift_v1',
  SHIFT_HISTORY: 'sleetpos_shifts_v1',
  CASH_MOVEMENTS: 'sleetpos_cash_movements_v1',
  CUSTOMERS: 'sleetpos_customers_v1',
  HELD_SALES: 'sleetpos_held_sales_v1',
  SETTINGS: 'sleetpos_settings_v1',
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'SLEET MARKET & BODEGA',
  tagline: 'Modern Independent Retail & Quick Market',
  address: '142 Bedford Avenue, Brooklyn, NY 11211',
  phone: '(718) 555-0198',
  email: 'checkout@sleetmarket.com',
  taxIdNumber: 'TAX-8492019-NY',
  currencySymbol: '$',
  defaultTaxRate: 8.875,
  dualPricingEnabled: true,
  cardSurchargePercent: 3.5, // 3.5% dual pricing surcharge on card / cash discount
  cashDiscountLabel: 'Cash Discount Applied',
  paperWidth: '80mm',
  receiptHeaderMsg: 'THANK YOU FOR SHOPPING LOCAL!',
  receiptFooterMsg: 'Returns accepted within 14 days with receipt. Scan QR for digital receipt.',
  soundEnabled: true,
  autoPrintReceipt: false,
  cashierName: 'Maria S. (Reg 01)',
  lowStockAlertBadge: true,
  themeMode: 'dark',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Coca-Cola Classic 20oz Bottle',
    sku: 'BEV-COKE-20',
    barcode: '049000028904',
    category: 'Beverages',
    costPrice: 1.10,
    price: 2.49,
    cardPrice: 2.58,
    stock: 48,
    lowStockThreshold: 10,
    unit: 'bottle',
    colorTag: '#ef4444',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-002',
    name: 'Red Bull Energy Drink 12oz',
    sku: 'BEV-REDBULL-12',
    barcode: '611269002100',
    category: 'Beverages',
    costPrice: 2.05,
    price: 3.99,
    cardPrice: 4.13,
    stock: 24,
    lowStockThreshold: 8,
    unit: 'can',
    colorTag: '#3b82f6',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-003',
    name: 'Poland Spring Spring Water 1L',
    sku: 'BEV-WATER-1L',
    barcode: '071537021115',
    category: 'Beverages',
    costPrice: 0.65,
    price: 1.79,
    cardPrice: 1.85,
    stock: 65,
    lowStockThreshold: 15,
    unit: 'bottle',
    colorTag: '#06b6d4',
    taxable: false,
    isActive: true,
  },
  {
    id: 'prod-004',
    name: 'Monster Energy Ultra Zero 16oz',
    sku: 'BEV-MNSTR-ULTRA',
    barcode: '070847012480',
    category: 'Beverages',
    costPrice: 1.85,
    price: 3.49,
    cardPrice: 3.61,
    stock: 18,
    lowStockThreshold: 6,
    unit: 'can',
    colorTag: '#10b981',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-005',
    name: "Doritos Nacho Cheese 9.25oz",
    sku: 'SNK-DORITOS-NC',
    barcode: '028400040112',
    category: 'Snacks & Candy',
    costPrice: 2.50,
    price: 4.99,
    cardPrice: 5.16,
    stock: 32,
    lowStockThreshold: 8,
    unit: 'bag',
    colorTag: '#f97316',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-006',
    name: "Lay's Classic Potato Chips 8oz",
    sku: 'SNK-LAYS-CLASSIC',
    barcode: '028400043809',
    category: 'Snacks & Candy',
    costPrice: 2.25,
    price: 4.79,
    cardPrice: 4.96,
    stock: 22,
    lowStockThreshold: 8,
    unit: 'bag',
    colorTag: '#eab308',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-007',
    name: 'Snickers King Size 3.29oz',
    sku: 'SNK-SNICK-KS',
    barcode: '040000004318',
    category: 'Snacks & Candy',
    costPrice: 1.15,
    price: 2.29,
    cardPrice: 2.37,
    stock: 5, // low stock trigger
    lowStockThreshold: 10,
    unit: 'bar',
    colorTag: '#78350f',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-008',
    name: 'Haribo Goldbears Gummi Candy 5oz',
    sku: 'SNK-HARIBO-GLD',
    barcode: '042238301138',
    category: 'Snacks & Candy',
    costPrice: 1.20,
    price: 2.49,
    cardPrice: 2.58,
    stock: 40,
    lowStockThreshold: 10,
    unit: 'bag',
    colorTag: '#e11d48',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-009',
    name: 'Organic Whole Milk 1 Gallon',
    sku: 'GROC-MILK-1GAL',
    barcode: '070038334412',
    category: 'Grocery & Dairy',
    costPrice: 4.10,
    price: 5.99,
    cardPrice: 6.20,
    stock: 14,
    lowStockThreshold: 5,
    unit: 'jug',
    colorTag: '#6366f1',
    taxable: false,
    isActive: true,
  },
  {
    id: 'prod-010',
    name: 'Grade A Large White Eggs 12ct',
    sku: 'GROC-EGGS-12CT',
    barcode: '011110852103',
    category: 'Grocery & Dairy',
    costPrice: 2.80,
    price: 4.49,
    cardPrice: 4.65,
    stock: 28,
    lowStockThreshold: 6,
    unit: 'carton',
    colorTag: '#f59e0b',
    taxable: false,
    isActive: true,
  },
  {
    id: 'prod-011',
    name: "Nature's Own Sliced White Bread 20oz",
    sku: 'GROC-BREAD-20OZ',
    barcode: '072250037129',
    category: 'Grocery & Dairy',
    costPrice: 1.95,
    price: 3.79,
    cardPrice: 3.92,
    stock: 16,
    lowStockThreshold: 5,
    unit: 'loaf',
    colorTag: '#d97706',
    taxable: false,
    isActive: true,
  },
  {
    id: 'prod-012',
    name: 'Bacon, Egg & Cheese on Roll (Hot)',
    sku: 'DELI-BEC-ROLL',
    barcode: '890100000012',
    category: 'Deli & Prepared',
    costPrice: 2.20,
    price: 6.50,
    cardPrice: 6.73,
    stock: 50,
    lowStockThreshold: 10,
    unit: 'pcs',
    colorTag: '#ec4899',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-013',
    name: 'Hot Brewed Dark Roast Coffee 16oz',
    sku: 'DELI-COFFEE-16',
    barcode: '890100000013',
    category: 'Deli & Prepared',
    costPrice: 0.45,
    price: 2.75,
    cardPrice: 2.85,
    stock: 100,
    lowStockThreshold: 20,
    unit: 'cup',
    colorTag: '#854d0e',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-014',
    name: 'Fresh Glazed Donut (Single)',
    sku: 'DELI-DONUT-GLZ',
    barcode: '890100000014',
    category: 'Deli & Prepared',
    costPrice: 0.35,
    price: 1.50,
    cardPrice: 1.55,
    stock: 3, // low stock alert
    lowStockThreshold: 8,
    unit: 'pcs',
    colorTag: '#f43f5e',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-015',
    name: 'Tylenol Extra Strength 500mg (24ct)',
    sku: 'PHARM-TYLENOL-24',
    barcode: '300450449272',
    category: 'Personal Care',
    costPrice: 4.80,
    price: 7.99,
    cardPrice: 8.27,
    stock: 12,
    lowStockThreshold: 4,
    unit: 'box',
    colorTag: '#dc2626',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-016',
    name: 'BIC Classic Pocket Lighter (Single)',
    sku: 'MISC-BIC-LIGHTER',
    barcode: '070330600021',
    category: 'Sundries & Misc',
    costPrice: 0.95,
    price: 2.25,
    cardPrice: 2.33,
    stock: 45,
    lowStockThreshold: 10,
    unit: 'pcs',
    colorTag: '#2563eb',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-017',
    name: 'Duracell Coppertop AA Batteries 4-Pack',
    sku: 'MISC-DURACELL-AA4',
    barcode: '041333001043',
    category: 'Sundries & Misc',
    costPrice: 3.50,
    price: 6.99,
    cardPrice: 7.23,
    stock: 19,
    lowStockThreshold: 5,
    unit: 'pack',
    colorTag: '#b45309',
    taxable: true,
    isActive: true,
  },
  {
    id: 'prod-018',
    name: 'Fresh Organic Hass Avocado',
    sku: 'PROD-AVOCADO-EA',
    barcode: '033383401124',
    category: 'Fresh Produce',
    costPrice: 0.90,
    price: 1.99,
    cardPrice: 2.06,
    stock: 35,
    lowStockThreshold: 10,
    unit: 'ea',
    colorTag: '#16a34a',
    taxable: false,
    isActive: true,
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-walkin',
    name: 'Walk-in Customer',
    phone: '',
    points: 0,
    totalSpent: 0,
    visitCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust-001',
    name: 'Alex Rivera',
    phone: '718-555-0142',
    email: 'alex.rivera@email.com',
    points: 145,
    totalSpent: 284.50,
    visitCount: 18,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    notes: 'Likes oat milk in coffee. Frequent morning regular.',
  },
  {
    id: 'cust-002',
    name: 'Sara Connor',
    phone: '347-555-8821',
    email: 'sara.c@brooklyn.net',
    points: 80,
    totalSpent: 162.20,
    visitCount: 9,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    notes: 'Local artist, neighborhood resident.',
  }
];

// Helper to seed initial sample sales so analytics are populated immediately
function generateSeedSales(): Sale[] {
  const sales: Sale[] = [];
  const baseTime = Date.now();
  const sampleData = [
    { minsAgo: 180, total: 14.27, cash: 20.00, change: 5.73, method: 'cash' as const, items: [
      { prod: INITIAL_PRODUCTS[0], qty: 2 },
      { prod: INITIAL_PRODUCTS[4], qty: 1 },
      { prod: INITIAL_PRODUCTS[12], qty: 1 }
    ]},
    { minsAgo: 125, total: 8.98, card: 8.98, method: 'card' as const, items: [
      { prod: INITIAL_PRODUCTS[1], qty: 1 },
      { prod: INITIAL_PRODUCTS[5], qty: 1 }
    ]},
    { minsAgo: 85, total: 11.24, cash: 15.00, change: 3.76, method: 'cash' as const, items: [
      { prod: INITIAL_PRODUCTS[11], qty: 1 },
      { prod: INITIAL_PRODUCTS[12], qty: 1 },
      { prod: INITIAL_PRODUCTS[13], qty: 1 }
    ]},
    { minsAgo: 45, total: 22.45, card: 22.45, method: 'card' as const, items: [
      { prod: INITIAL_PRODUCTS[8], qty: 1 },
      { prod: INITIAL_PRODUCTS[9], qty: 1 },
      { prod: INITIAL_PRODUCTS[10], qty: 1 },
      { prod: INITIAL_PRODUCTS[14], qty: 1 }
    ]},
    { minsAgo: 15, total: 7.48, cash: 10.00, change: 2.52, method: 'cash' as const, items: [
      { prod: INITIAL_PRODUCTS[0], qty: 1 },
      { prod: INITIAL_PRODUCTS[4], qty: 1 }
    ]}
  ];

  sampleData.forEach((sd, idx) => {
    const saleTime = new Date(baseTime - sd.minsAgo * 60000).toISOString();
    const saleItems = sd.items.map(item => ({
      productId: item.prod.id,
      productName: item.prod.name,
      sku: item.prod.sku,
      barcode: item.prod.barcode,
      category: item.prod.category,
      costPrice: item.prod.costPrice,
      unitPrice: item.prod.price,
      quantity: item.qty,
      discountPercent: 0,
      subtotal: Number((item.prod.price * item.qty).toFixed(2)),
      tax: item.prod.taxable ? Number((item.prod.price * item.qty * 0.08875).toFixed(2)) : 0,
      total: Number((item.prod.price * item.qty * (item.prod.taxable ? 1.08875 : 1)).toFixed(2))
    }));

    const subtotal = saleItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    const taxAmount = saleItems.reduce((acc, curr) => acc + curr.tax, 0);
    const grandTotal = Number((subtotal + taxAmount).toFixed(2));

    sales.push({
      id: `sale-${1000 + idx}`,
      receiptNumber: `R-260929-${1000 + idx}`,
      timestamp: saleTime,
      items: saleItems,
      subtotal,
      taxRate: 8.875,
      taxAmount,
      discountAmount: 0,
      discountPercent: 0,
      isCardPricing: sd.method === 'card',
      cardSurchargeAmount: sd.method === 'card' ? Number((grandTotal * 0.035).toFixed(2)) : 0,
      grandTotal,
      payment: {
        method: sd.method,
        cashTendered: sd.cash,
        cashChange: sd.change,
        cardAmount: sd.card,
        cardLast4: sd.method === 'card' ? '4182' : undefined,
      },
      cashierName: 'Maria S. (Reg 01)',
      shiftId: 'shift-101',
      customerId: idx % 2 === 0 ? 'cust-001' : undefined,
      customerName: idx % 2 === 0 ? 'Alex Rivera' : 'Walk-in Customer',
      status: 'completed',
      tamperHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    });
  });

  return sales;
}

export const initialShift: Shift = {
  id: 'shift-101',
  shiftNumber: 101,
  cashierName: 'Maria S. (Reg 01)',
  openedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  openingFloat: 150.00,
  cashSales: 32.99,
  cardSales: 31.43,
  otherSales: 0,
  totalSales: 64.42,
  cashIn: 0,
  cashOut: 0,
  expectedCash: 182.99,
  isClosed: false,
};

// Safe JSON LocalStorage Helpers
export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key} from storage:`, err);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key} to storage:`, err);
  }
}

// POS Data Access APIs
export const posStorage = {
  getProducts: (): Product[] => {
    return loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  },
  saveProducts: (products: Product[]) => {
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  },
  getSales: (): Sale[] => {
    const defaultSales = generateSeedSales();
    return loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, defaultSales);
  },
  saveSales: (sales: Sale[]) => {
    saveToStorage(STORAGE_KEYS.SALES, sales);
  },
  getCurrentShift: (): Shift => {
    return loadFromStorage<Shift>(STORAGE_KEYS.CURRENT_SHIFT, initialShift);
  },
  saveCurrentShift: (shift: Shift) => {
    saveToStorage(STORAGE_KEYS.CURRENT_SHIFT, shift);
  },
  getShiftHistory: (): Shift[] => {
    return loadFromStorage<Shift[]>(STORAGE_KEYS.SHIFT_HISTORY, []);
  },
  saveShiftHistory: (shifts: Shift[]) => {
    saveToStorage(STORAGE_KEYS.SHIFT_HISTORY, shifts);
  },
  getCashMovements: (): CashMovement[] => {
    return loadFromStorage<CashMovement[]>(STORAGE_KEYS.CASH_MOVEMENTS, []);
  },
  saveCashMovements: (movements: CashMovement[]) => {
    saveToStorage(STORAGE_KEYS.CASH_MOVEMENTS, movements);
  },
  getCustomers: (): Customer[] => {
    return loadFromStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  },
  saveCustomers: (customers: Customer[]) => {
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
  },
  getHeldSales: (): HeldSale[] => {
    return loadFromStorage<HeldSale[]>(STORAGE_KEYS.HELD_SALES, []);
  },
  saveHeldSales: (held: HeldSale[]) => {
    saveToStorage(STORAGE_KEYS.HELD_SALES, held);
  },
  getSettings: (): StoreSettings => {
    return loadFromStorage<StoreSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  },
  saveSettings: (settings: StoreSettings) => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  },
  resetToSampleData: () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SHIFT);
    localStorage.removeItem(STORAGE_KEYS.SHIFT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.CASH_MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.HELD_SALES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
};
