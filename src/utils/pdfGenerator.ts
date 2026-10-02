import jsPDF from 'jspdf';
import { Sale, StoreSettings } from '../types/pos';

export interface GeneratePdfOptions {
  sales: Sale[];
  settings: StoreSettings;
  rangeType: 'week' | 'month' | 'today' | 'yesterday' | 'all';
  action?: 'download' | 'print';
}

export function generateSalesReportPdf({
  sales,
  settings,
  rangeType,
  action = 'download',
}: GeneratePdfOptions): void {
  // Determine printer roll width (80mm standard, or 58mm compact)
  const printWidth = settings.paperWidth === '58mm' ? 58 : 80;
  const margin = 4;
  const usableWidth = printWidth - margin * 2;

  // Filter sales for the selected date range
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const targetSales = sales.filter((s) => {
    const saleTime = new Date(s.timestamp).getTime();
    if (rangeType === 'today') {
      return saleTime >= startOfToday;
    } else if (rangeType === 'yesterday') {
      const startOfYesterday = startOfToday - 86400000;
      return saleTime >= startOfYesterday && saleTime < startOfToday;
    } else if (rangeType === 'week') {
      return saleTime >= startOfToday - 7 * 86400000;
    } else if (rangeType === 'month') {
      return saleTime >= startOfToday - 30 * 86400000;
    }
    return true;
  });

  // Sort descending by timestamp (newest first)
  targetSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Metrics
  const validSales = targetSales.filter((s) => s.status !== 'refunded');
  const refundedSales = targetSales.filter((s) => s.status === 'refunded');

  const grossSales = validSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalTax = validSales.reduce((acc, s) => acc + s.taxAmount, 0);
  const totalDiscounts = validSales.reduce((acc, s) => acc + (s.discountAmount || 0), 0);
  const totalRefundAmount = refundedSales.reduce((acc, s) => acc + (s.refundAmount || s.grandTotal), 0);
  const netRevenue = Math.max(0, grossSales - totalRefundAmount);

  const totalItemsSold = validSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const avgBasket = validSales.length > 0 ? grossSales / validSales.length : 0;

  // Tender payment breakdown
  let cashTotal = 0;
  let cardTotal = 0;
  validSales.forEach((s) => {
    if (s.payment.method === 'cash') cashTotal += s.grandTotal;
    else if (s.payment.method === 'card') cardTotal += s.grandTotal;
    else if (s.payment.method === 'split') {
      cashTotal += s.payment.splitCashAmount || 0;
      cardTotal += s.payment.splitCardAmount || 0;
    } else {
      cardTotal += s.grandTotal;
    }
  });

  // Top selling products (top 5)
  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  validSales.forEach((s) => {
    s.items.forEach((item) => {
      const existing = productMap.get(item.productId) || {
        name: item.productName,
        qty: 0,
        revenue: 0,
      };
      existing.qty += item.quantity;
      existing.revenue += item.total;
      productMap.set(item.productId, existing);
    });
  });

  const topSellingList = Array.from(productMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  // Dynamic receipt height estimation based on summary and top items (no transaction log)
  const headerHeight = 36;
  const summaryHeight = 44;
  const tenderHeight = 18;
  const topItemsHeight = topSellingList.length > 0 ? 14 + topSellingList.length * 4.5 : 0;
  const footerHeight = 24;

  const totalHeight = Math.max(
    130,
    headerHeight + summaryHeight + tenderHeight + topItemsHeight + footerHeight + 10
  );

  // Create document sized exactly to the thermal receipt roll
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [printWidth, totalHeight],
  });

  let y = 6;
  const lineHeight = 3.8;
  const dividerCharCount = printWidth === 58 ? 32 : 44;

  const printCentered = (text: string, currentY: number, isBold: boolean = false, size: number = 7.5) => {
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(text, printWidth / 2, currentY, { align: 'center' });
  };

  const printRow = (label: string, value: string, currentY: number, isBold: boolean = false, size: number = 7) => {
    doc.setFont('courier', isBold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    doc.text(label, margin, currentY);
    doc.text(value, printWidth - margin, currentY, { align: 'right' });
  };

  const printDivider = (currentY: number, char: '-' | '=' = '-') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    const line = char.repeat(dividerCharCount);
    doc.text(line, printWidth / 2, currentY, { align: 'center' });
  };

  // ==========================================
  // 1. STORE HEADER
  // ==========================================
  printCentered(settings.storeName.toUpperCase(), y, true, 9.5);
  y += lineHeight + 1;

  if (settings.tagline) {
    printCentered(settings.tagline, y, false, 6.5);
    y += lineHeight - 0.5;
  }

  if (settings.address) {
    printCentered(settings.address, y, false, 6.5);
    y += lineHeight - 0.5;
  }

  if (settings.phone) {
    printCentered(`TEL: ${settings.phone}`, y, false, 6.5);
    y += lineHeight - 0.5;
  }

  y += 1;
  printDivider(y, '=');
  y += lineHeight;

  // Report Title
  const titleText =
    rangeType === 'week'
      ? '*** WEEKLY SALES REPORT ***'
      : rangeType === 'month'
      ? '*** MONTHLY SALES REPORT ***'
      : `*** ${rangeType.toUpperCase()} SALES REPORT ***`;

  printCentered(titleText, y, true, 8);
  y += lineHeight + 0.5;

  // Date range info
  const rangeInfo =
    rangeType === 'week'
      ? 'PERIOD: LAST 7 DAYS'
      : rangeType === 'month'
      ? 'PERIOD: LAST 30 DAYS'
      : `PERIOD: ${rangeType.toUpperCase()}`;

  printCentered(rangeInfo, y, false, 6.5);
  y += lineHeight - 0.5;

  const datePrintedStr = `PRINTED: ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  printCentered(datePrintedStr, y, false, 6.5);
  y += lineHeight - 0.5;

  printCentered(`REGISTER: REG-01  |  CASHIER: ${settings.cashierName.split(' ')[0]}`, y, false, 6.5);
  y += lineHeight - 0.5;

  printDivider(y, '=');
  y += lineHeight;

  // ==========================================
  // 2. FINANCIAL SUMMARY
  // ==========================================
  printCentered('[ FINANCIAL SUMMARY ]', y, true, 7.5);
  y += lineHeight;

  printRow('TOTAL ORDERS:', `${validSales.length}`, y);
  y += lineHeight;

  printRow('TOTAL UNITS SOLD:', `${totalItemsSold}`, y);
  y += lineHeight;

  printRow('AVG BASKET / TICKET:', `${settings.currencySymbol}${avgBasket.toFixed(2)}`, y);
  y += lineHeight;

  printRow('GROSS SALES:', `${settings.currencySymbol}${grossSales.toFixed(2)}`, y, true);
  y += lineHeight;

  if (totalDiscounts > 0) {
    printRow('DISCOUNTS GIVEN:', `-${settings.currencySymbol}${totalDiscounts.toFixed(2)}`, y);
    y += lineHeight;
  }

  if (totalTax > 0) {
    printRow(`TAX COLLECTED (${settings.defaultTaxRate}%):`, `${settings.currencySymbol}${totalTax.toFixed(2)}`, y);
    y += lineHeight;
  }

  if (totalRefundAmount > 0) {
    printRow(`REFUNDS (${refundedSales.length} tx):`, `-${settings.currencySymbol}${totalRefundAmount.toFixed(2)}`, y);
    y += lineHeight;
  }

  printDivider(y, '-');
  y += lineHeight;

  printRow('NET SALES REVENUE:', `${settings.currencySymbol}${netRevenue.toFixed(2)}`, y, true, 8);
  y += lineHeight + 1;

  printDivider(y, '-');
  y += lineHeight;

  // ==========================================
  // 3. PAYMENT METHOD BREAKDOWN
  // ==========================================
  printCentered('[ PAYMENT BREAKDOWN ]', y, true, 7.5);
  y += lineHeight;

  printRow('CASH TOTAL:', `${settings.currencySymbol}${cashTotal.toFixed(2)}`, y);
  y += lineHeight;

  printRow('CARD / ELECTRONIC:', `${settings.currencySymbol}${cardTotal.toFixed(2)}`, y);
  y += lineHeight + 0.5;

  printDivider(y, '-');
  y += lineHeight;

  // ==========================================
  // 4. TOP SELLING PRODUCTS
  // ==========================================
  if (topSellingList.length > 0) {
    printCentered('[ TOP SELLING ITEMS ]', y, true, 7.5);
    y += lineHeight;

    printRow('QTY  DESCRIPTION', 'TOTAL', y, true, 6.5);
    y += lineHeight - 0.5;

    topSellingList.forEach((item) => {
      const maxNameLen = printWidth === 58 ? 16 : 24;
      const cleanName = item.name.length > maxNameLen ? item.name.slice(0, maxNameLen - 2) + '..' : item.name;
      const label = `${String(item.qty).padStart(3, ' ')}x ${cleanName}`;
      printRow(label, `${settings.currencySymbol}${item.revenue.toFixed(2)}`, y, false, 6.5);
      y += lineHeight - 0.5;
    });

    printDivider(y, '=');
    y += lineHeight;
  }

  // ==========================================
  // 5. RECEIPT FOOTER / CUT LINE
  // ==========================================
  printCentered('*** END OF SALES REPORT ***', y, true, 7.5);
  y += lineHeight;

  printCentered('STORE FINANCIAL AUDIT TAPE', y, false, 6.5);
  y += lineHeight - 0.5;

  printCentered('KEEP WITH SHIFT REGISTER RECORDS', y, false, 6);
  y += lineHeight + 1;

  printDivider(y, '=');

  // Trigger Action: Direct Print or Download
  const cleanStoreName = settings.storeName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const dateStamp = now.toISOString().slice(0, 10);

  if (action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const blobUrlString = String(blobUrl);
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.src = blobUrlString;
    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          // Fallback if blocked
          window.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(printFrame);
            URL.revokeObjectURL(blobUrlString);
          } catch {
            // ignore
          }
        }, 60000);
      }, 250);
    };
  } else {
    doc.save(`${cleanStoreName}_receipt_${rangeType}_sales_${dateStamp}.pdf`);
  }
}
