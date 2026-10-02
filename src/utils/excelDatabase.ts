import * as XLSX from 'xlsx';
import { Product, Sale, Shift, Customer, StoreSettings, CashMovement } from '../types/pos';
import { posStorage } from './storage';

export interface ExcelAutoBackupSettings {
  autoBackupDaily: boolean;
  lastAutoBackupDate: string | null;
  lastAutoBackupTime: string | null;
  connectedFileName: string | null;
  backupOnShiftClose: boolean;
}

const EXCEL_BACKUP_SETTINGS_KEY = 'sleetpos_excel_backup_settings_v1';

export const DEFAULT_EXCEL_BACKUP_SETTINGS: ExcelAutoBackupSettings = {
  autoBackupDaily: true,
  lastAutoBackupDate: null,
  lastAutoBackupTime: null,
  connectedFileName: null,
  backupOnShiftClose: true,
};

export function getExcelBackupSettings(): ExcelAutoBackupSettings {
  try {
    const raw = localStorage.getItem(EXCEL_BACKUP_SETTINGS_KEY);
    if (!raw) return DEFAULT_EXCEL_BACKUP_SETTINGS;
    return { ...DEFAULT_EXCEL_BACKUP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_EXCEL_BACKUP_SETTINGS;
  }
}

export function saveExcelBackupSettings(settings: ExcelAutoBackupSettings): void {
  try {
    localStorage.setItem(EXCEL_BACKUP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save Excel backup settings:', err);
  }
}

// In-memory FileSystemFileHandle for modern browser direct local file writes
let connectedFileHandle: any = null;

export function getConnectedFileHandle(): any {
  return connectedFileHandle;
}

export function setConnectedFileHandle(handle: any): void {
  connectedFileHandle = handle;
}

/**
 * Builds the complete multi-sheet Excel workbook from current database
 */
export function buildDatabaseWorkbook(data?: {
  products?: Product[];
  sales?: Sale[];
  currentShift?: Shift;
  shiftHistory?: Shift[];
  cashMovements?: CashMovement[];
  customers?: Customer[];
  settings?: StoreSettings;
}): XLSX.WorkBook {
  const products = data?.products ?? posStorage.getProducts();
  const sales = data?.sales ?? posStorage.getSales();
  const currentShift = data?.currentShift ?? posStorage.getCurrentShift();
  const shiftHistory = data?.shiftHistory ?? posStorage.getShiftHistory();
  const cashMovements = data?.cashMovements ?? posStorage.getCashMovements();
  const customers = data?.customers ?? posStorage.getCustomers();
  const settings = data?.settings ?? posStorage.getSettings();

  const wb = XLSX.utils.book_new();

  // 1. INVENTORY SHEET
  const inventoryRows = products.map((p) => {
    const margin = p.price > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(1) + '%' : '0%';
    const totalStockValue = Number((p.stock * p.price).toFixed(2));
    const totalCostValue = Number((p.stock * p.costPrice).toFixed(2));

    return {
      'Product ID': p.id,
      'Product Name': p.name,
      'SKU': p.sku,
      'Barcode': p.barcode,
      'Category': p.category,
      'Price': p.price,
      'Card Price': p.cardPrice ?? Number((p.price * (1 + settings.cardSurchargePercent / 100)).toFixed(2)),
      'Cost Price': p.costPrice,
      'Profit Margin': margin,
      'Stock Quantity': p.stock,
      'Unit': p.unit,
      'Min Stock Threshold': p.lowStockThreshold,
      'Stock Status': p.stock <= 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? 'Low Stock' : 'In Stock',
      'Inventory Value (Retail)': totalStockValue,
      'Inventory Value (Cost)': totalCostValue,
      'Taxable': p.taxable ? 'Yes' : 'No',
      'Active': p.isActive ? 'Active' : 'Inactive',
    };
  });
  const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory');

  // 2. SALES SHEET (Transactions)
  const salesRows = sales.map((s) => ({
    'Receipt #': s.receiptNumber,
    'Sale ID': s.id,
    'Date & Time': new Date(s.timestamp).toLocaleString(),
    'Timestamp ISO': s.timestamp,
    'Cashier': s.cashierName,
    'Status': s.status.toUpperCase(),
    'Customer ID': s.customerId || 'WALK-IN',
    'Customer Name': s.customerName || 'Walk-in Customer',
    'Total Items Count': s.items.reduce((sum, item) => sum + item.quantity, 0),
    'Subtotal': s.subtotal,
    'Tax Rate (%)': s.taxRate,
    'Tax Amount': s.taxAmount,
    'Discount Amount': s.discountAmount,
    'Discount (%)': s.discountPercent,
    'Dual Pricing (Card)': s.isCardPricing ? 'Yes' : 'No',
    'Card Surcharge Amount': s.cardSurchargeAmount,
    'Grand Total': s.grandTotal,
    'Payment Method': s.payment.method.toUpperCase(),
    'Cash Tendered': s.payment.cashTendered ?? 0,
    'Cash Change': s.payment.cashChange ?? 0,
    'Card Last 4': s.payment.cardLast4 || '',
    'Security Hash': s.tamperHash || '',
  }));
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales');

  // 3. SALE_ITEMS SHEET (Line-item granularity)
  const saleItemRows: any[] = [];
  sales.forEach((s) => {
    s.items.forEach((item) => {
      const margin = item.total - (item.costPrice * item.quantity);
      saleItemRows.push({
        'Receipt #': s.receiptNumber,
        'Date & Time': new Date(s.timestamp).toLocaleString(),
        'Product ID': item.productId,
        'Product Name': item.productName,
        'SKU': item.sku,
        'Barcode': item.barcode,
        'Category': item.category,
        'Quantity': item.quantity,
        'Unit Selling Price': item.unitPrice,
        'Unit Cost Price': item.costPrice,
        'Discount (%)': item.discountPercent,
        'Item Subtotal': item.subtotal,
        'Item Tax': item.tax,
        'Item Total': item.total,
        'Gross Profit': Number(margin.toFixed(2)),
        'Cashier': s.cashierName,
        'Customer': s.customerName || 'Walk-in',
      });
    });
  });
  const wsSaleItems = XLSX.utils.json_to_sheet(saleItemRows);
  XLSX.utils.book_append_sheet(wb, wsSaleItems, 'Sale_Items');

  // 4. REFUNDS SHEET
  const refundSales = sales.filter((s) => s.status === 'refunded' || s.status === 'partially_refunded' || (s.refundAmount && s.refundAmount > 0));
  const refundRows = refundSales.map((r) => ({
    'Receipt #': r.receiptNumber,
    'Original Sale Date': new Date(r.timestamp).toLocaleString(),
    'Refund Date': r.refundTimestamp ? new Date(r.refundTimestamp).toLocaleString() : 'N/A',
    'Customer': r.customerName || 'Walk-in',
    'Original Total': r.grandTotal,
    'Refund Amount': r.refundAmount ?? r.grandTotal,
    'Refund Reason': r.refundReason || 'Customer return',
    'Original Payment Method': r.payment.method.toUpperCase(),
    'Items Returned': r.items.map((i) => `${i.quantity}x ${i.productName}`).join('; '),
  }));
  const wsRefunds = XLSX.utils.json_to_sheet(refundRows.length > 0 ? refundRows : [{ 'Notice': 'No refund transactions recorded yet.' }]);
  XLSX.utils.book_append_sheet(wb, wsRefunds, 'Refunds');

  // 5. CUSTOMERS SHEET
  const customerRows = customers.map((c) => ({
    'Customer ID': c.id,
    'Customer Name': c.name,
    'Phone': c.phone,
    'Email': c.email || '',
    'Loyalty Points': c.points,
    'Total Spent': c.totalSpent,
    'Total Visits': c.visitCount,
    'Member Since': new Date(c.createdAt).toLocaleDateString(),
    'Notes': c.notes || '',
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

  // 6. REPORTS_SUMMARY SHEET
  const totalRevenue = sales.reduce((acc, s) => (s.status !== 'refunded' ? acc + s.grandTotal : acc), 0);
  const totalCost = sales.reduce((acc, s) => {
    if (s.status === 'refunded') return acc;
    return acc + s.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  }, 0);
  const grossProfit = totalRevenue - totalCost;
  const totalItemsSold = sales.reduce((acc, s) => {
    if (s.status === 'refunded') return acc;
    return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
  }, 0);
  const cashSales = sales.filter((s) => s.payment.method === 'cash' && s.status !== 'refunded').reduce((acc, s) => acc + s.grandTotal, 0);
  const cardSales = sales.filter((s) => s.payment.method === 'card' && s.status !== 'refunded').reduce((acc, s) => acc + s.grandTotal, 0);
  const otherSales = sales.filter((s) => !['cash', 'card'].includes(s.payment.method) && s.status !== 'refunded').reduce((acc, s) => acc + s.grandTotal, 0);
  const inventoryRetailVal = products.reduce((acc, p) => acc + (p.stock * p.price), 0);
  const inventoryCostVal = products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const summaryRows = [
    { 'Key Metric': 'Store Name', 'Value': settings.storeName, 'Category': 'Store Information' },
    { 'Key Metric': 'Address', 'Value': settings.address, 'Category': 'Store Information' },
    { 'Key Metric': 'Phone / Email', 'Value': `${settings.phone} / ${settings.email}`, 'Category': 'Store Information' },
    { 'Key Metric': 'Database Export Date', 'Value': new Date().toLocaleString(), 'Category': 'Export Details' },
    { 'Key Metric': 'Total Completed Revenue', 'Value': `${settings.currencySymbol}${totalRevenue.toFixed(2)}`, 'Category': 'Sales Performance' },
    { 'Key Metric': 'Total Cost of Goods', 'Value': `${settings.currencySymbol}${totalCost.toFixed(2)}`, 'Category': 'Sales Performance' },
    { 'Key Metric': 'Estimated Gross Profit', 'Value': `${settings.currencySymbol}${grossProfit.toFixed(2)}`, 'Category': 'Sales Performance' },
    { 'Key Metric': 'Overall Profit Margin', 'Value': totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(1)}%` : '0%', 'Category': 'Sales Performance' },
    { 'Key Metric': 'Total Transactions Completed', 'Value': sales.filter((s) => s.status !== 'refunded').length, 'Category': 'Sales Performance' },
    { 'Key Metric': 'Total Line Items Sold', 'Value': totalItemsSold, 'Category': 'Sales Performance' },
    { 'Key Metric': 'Cash Payment Volume', 'Value': `${settings.currencySymbol}${cashSales.toFixed(2)}`, 'Category': 'Payment Breakdown' },
    { 'Key Metric': 'Card Payment Volume', 'Value': `${settings.currencySymbol}${cardSales.toFixed(2)}`, 'Category': 'Payment Breakdown' },
    { 'Key Metric': 'Other / Mobile Volume', 'Value': `${settings.currencySymbol}${otherSales.toFixed(2)}`, 'Category': 'Payment Breakdown' },
    { 'Key Metric': 'Total Refunded Orders', 'Value': refundSales.length, 'Category': 'Returns & Refunds' },
    { 'Key Metric': 'Total Refunded Amount', 'Value': `${settings.currencySymbol}${refundSales.reduce((acc, r) => acc + (r.refundAmount ?? r.grandTotal), 0).toFixed(2)}`, 'Category': 'Returns & Refunds' },
    { 'Key Metric': 'Total Catalog Products', 'Value': products.length, 'Category': 'Inventory Health' },
    { 'Key Metric': 'Inventory Retail Valuation', 'Value': `${settings.currencySymbol}${inventoryRetailVal.toFixed(2)}`, 'Category': 'Inventory Health' },
    { 'Key Metric': 'Inventory Cost Valuation', 'Value': `${settings.currencySymbol}${inventoryCostVal.toFixed(2)}`, 'Category': 'Inventory Health' },
    { 'Key Metric': 'Low Stock Alert Items', 'Value': lowStockCount, 'Category': 'Inventory Health' },
    { 'Key Metric': 'Out of Stock Items', 'Value': outOfStockCount, 'Category': 'Inventory Health' },
    { 'Key Metric': 'Registered Customers', 'Value': customers.length, 'Category': 'Customer Base' },
  ];
  const wsReportSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsReportSummary, 'Reports_Summary');

  // 7. SHIFT_LOG SHEET
  const allShifts = [currentShift, ...shiftHistory];
  const shiftRows = allShifts.map((sh) => ({
    'Shift #': sh.shiftNumber,
    'Shift ID': sh.id,
    'Cashier': sh.cashierName,
    'Opened At': new Date(sh.openedAt).toLocaleString(),
    'Closed At': sh.closedAt ? new Date(sh.closedAt).toLocaleString() : 'Currently Active',
    'Status': sh.isClosed ? 'CLOSED' : 'OPEN / ACTIVE',
    'Opening Float': sh.openingFloat,
    'Cash Sales': sh.cashSales,
    'Card Sales': sh.cardSales,
    'Total Sales': sh.totalSales,
    'Cash Added (In)': sh.cashIn,
    'Cash Drops (Out)': sh.cashOut,
    'Expected Cash in Drawer': sh.expectedCash,
    'Actual Cash Counted': sh.actualCashCounted ?? 'N/A',
    'Over / Short Discrepancy': sh.cashDiscrepancy !== undefined ? sh.cashDiscrepancy : 'N/A',
    'Shift Notes': sh.note || '',
  }));
  const wsShifts = XLSX.utils.json_to_sheet(shiftRows);
  XLSX.utils.book_append_sheet(wb, wsShifts, 'Shift_Log');

  return wb;
}

/**
 * Generates binary ArrayBuffer from workbook
 */
export function workbookToArrayBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return wbout;
}

/**
 * Downloads workbook as .xlsx directly in browser
 */
export function downloadWorkbookFile(wb: XLSX.WorkBook, filename?: string): void {
  const defaultName = filename || `sleetpos_database_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, defaultName);
}

/**
 * Connect to or Pick an offline local file on the device
 * Uses the modern File System Access API when available
 */
export async function connectLocalExcelFile(): Promise<{ success: boolean; filename: string | null; error?: string }> {
  try {
    if (!('showSaveFilePicker' in window)) {
      return { 
        success: false, 
        filename: null, 
        error: 'Direct device file-linking requires Chrome, Edge, or Chromium. Standard .xlsx exports work in all browsers.' 
      };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const suggestedName = `sleetpos_database_${todayStr}.xlsx`;

    const handle = await (window as any).showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Excel Spreadsheet (*.xlsx)',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });

    if (handle) {
      setConnectedFileHandle(handle);
      const settings = getExcelBackupSettings();
      settings.connectedFileName = handle.name || suggestedName;
      saveExcelBackupSettings(settings);

      // Write initial state immediately to the file
      const wb = buildDatabaseWorkbook();
      const buffer = workbookToArrayBuffer(wb);
      const writable = await handle.createWritable();
      await writable.write(buffer);
      await writable.close();

      return { success: true, filename: handle.name || suggestedName };
    }

    return { success: false, filename: null };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return { success: false, filename: null };
    }
    return { success: false, filename: null, error: err.message || 'File selection failed' };
  }
}

/**
 * Writes the database snapshot to the connected local file or downloads it
 */
export async function saveDatabaseToExcel(options?: {
  silent?: boolean;
  isDailyAuto?: boolean;
}): Promise<{ success: boolean; message: string; path?: string }> {
  try {
    const wb = buildDatabaseWorkbook();
    const handle = getConnectedFileHandle();

    if (handle) {
      try {
        const buffer = workbookToArrayBuffer(wb);
        const writable = await handle.createWritable();
        await writable.write(buffer);
        await writable.close();

        const settings = getExcelBackupSettings();
        const now = new Date();
        settings.lastAutoBackupDate = now.toISOString().slice(0, 10);
        settings.lastAutoBackupTime = now.toISOString();
        saveExcelBackupSettings(settings);

        return {
          success: true,
          message: `Saved directly to local offline file "${handle.name}"`,
          path: handle.name,
        };
      } catch (writeErr) {
        console.warn('Failed writing to local file handle, falling back to download:', writeErr);
      }
    }

    // Fallback: standard offline .xlsx download
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = options?.isDailyAuto
      ? `sleetpos_daily_backup_${todayStr}.xlsx`
      : `sleetpos_database_${todayStr}.xlsx`;

    downloadWorkbookFile(wb, filename);

    const settings = getExcelBackupSettings();
    const now = new Date();
    settings.lastAutoBackupDate = now.toISOString().slice(0, 10);
    settings.lastAutoBackupTime = now.toISOString();
    saveExcelBackupSettings(settings);

    return {
      success: true,
      message: `Offline database exported to ${filename}`,
      path: filename,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to save Excel file',
    };
  }
}

/**
 * Checks if daily auto-backup is due today, and executes it if so
 */
export async function checkAndTriggerDailyBackup(): Promise<boolean> {
  const settings = getExcelBackupSettings();
  if (!settings.autoBackupDaily) return false;

  const todayStr = new Date().toISOString().slice(0, 10);
  if (settings.lastAutoBackupDate === todayStr) {
    return false; // Already backed up today
  }

  // Run auto backup
  const handle = getConnectedFileHandle();
  if (handle) {
    // We have a direct local file handle, write silently to the local file!
    await saveDatabaseToExcel({ silent: true, isDailyAuto: true });
    return true;
  }

  return false;
}

/**
 * Restores POS Database from an uploaded .xlsx file
 */
export async function importDatabaseFromExcel(file: File): Promise<{
  success: boolean;
  message: string;
  counts?: { products: number; customers: number; sales: number };
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        let productsImported = 0;
        let customersImported = 0;
        let salesImported = 0;

        // 1. Parse Inventory
        if (wb.SheetNames.includes('Inventory')) {
          const rawInv = XLSX.utils.sheet_to_json<any>(wb.Sheets['Inventory']);
          if (rawInv.length > 0) {
            const currentProds = posStorage.getProducts();
            const prodMap = new Map(currentProds.map((p) => [p.id, p]));

            rawInv.forEach((row, idx) => {
              const id = row['Product ID'] || `prod-imp-${idx + 1}`;
              const existing = prodMap.get(id);

              const price = parseFloat(row['Price']) || 0;
              const costPrice = parseFloat(row['Cost Price']) || 0;
              const cardPrice = parseFloat(row['Card Price']) || (price * 1.035);
              const stock = parseInt(row['Stock Quantity']) || 0;
              const threshold = parseInt(row['Min Stock Threshold']) || 5;

              prodMap.set(id, {
                id,
                name: row['Product Name'] || existing?.name || `Product ${idx + 1}`,
                sku: row['SKU'] || existing?.sku || `SKU-${idx + 1}`,
                barcode: String(row['Barcode'] || existing?.barcode || ''),
                category: row['Category'] || existing?.category || 'General',
                costPrice,
                price,
                cardPrice,
                stock,
                lowStockThreshold: threshold,
                unit: row['Unit'] || existing?.unit || 'pc',
                taxable: row['Taxable'] === 'Yes' || row['Taxable'] === true,
                isActive: row['Active'] !== 'Inactive',
                colorTag: existing?.colorTag || '#06b6d4',
              });
            });

            const merged = Array.from(prodMap.values());
            posStorage.saveProducts(merged);
            productsImported = merged.length;
          }
        }

        // 2. Parse Customers
        if (wb.SheetNames.includes('Customers')) {
          const rawCust = XLSX.utils.sheet_to_json<any>(wb.Sheets['Customers']);
          if (rawCust.length > 0) {
            const currentCust = posStorage.getCustomers();
            const custMap = new Map(currentCust.map((c) => [c.id, c]));

            rawCust.forEach((row, idx) => {
              const id = row['Customer ID'] || `cust-imp-${idx + 1}`;
              const existing = custMap.get(id);

              custMap.set(id, {
                id,
                name: row['Customer Name'] || existing?.name || `Customer ${idx + 1}`,
                phone: String(row['Phone'] || existing?.phone || ''),
                email: row['Email'] || existing?.email || '',
                points: parseInt(row['Loyalty Points']) || 0,
                totalSpent: parseFloat(row['Total Spent']) || 0,
                visitCount: parseInt(row['Total Visits']) || 1,
                createdAt: existing?.createdAt || new Date().toISOString(),
                notes: row['Notes'] || existing?.notes || '',
              });
            });

            const mergedCust = Array.from(custMap.values());
            posStorage.saveCustomers(mergedCust);
            customersImported = mergedCust.length;
          }
        }

        resolve({
          success: true,
          message: `Database restored from Excel! (${productsImported} products, ${customersImported} customers updated)`,
          counts: { products: productsImported, customers: customersImported, sales: salesImported },
        });
      } catch (err: any) {
        resolve({
          success: false,
          message: `Error reading Excel file: ${err.message || 'Invalid format'}`,
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, message: 'Failed to read the uploaded Excel file.' });
    };

    reader.readAsArrayBuffer(file);
  });
}
