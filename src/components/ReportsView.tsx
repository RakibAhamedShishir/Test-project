import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  CreditCard, 
  RotateCcw, 
  Printer, 
  Download, 
  Calendar, 
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  X
} from 'lucide-react';
import { Sale, StoreSettings, Product } from '../types/pos';
import { playSound } from '../utils/sound';
import { generateSalesReportPdf } from '../utils/pdfGenerator';

interface ReportsViewProps {
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
  onReprintReceipt: (sale: Sale) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  sales,
  setSales,
  products,
  setProducts,
  settings,
  onReprintReceipt,
}) => {
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [searchLedger, setSearchLedger] = useState('');
  const [refundModalSale, setRefundModalSale] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer changed mind');
  const [receiptModalType, setReceiptModalType] = useState<'week' | 'month' | 'today' | 'yesterday' | 'all' | null>(null);

  // Compute metrics for receipt action modal
  const modalTargetSales = useMemo(() => {
    if (!receiptModalType) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return sales.filter((s) => {
      const saleTime = new Date(s.timestamp).getTime();
      if (receiptModalType === 'today') {
        return saleTime >= startOfToday;
      } else if (receiptModalType === 'yesterday') {
        const startOfYesterday = startOfToday - 86400000;
        return saleTime >= startOfYesterday && saleTime < startOfToday;
      } else if (receiptModalType === 'week') {
        return saleTime >= startOfToday - 7 * 86400000;
      } else if (receiptModalType === 'month') {
        return saleTime >= startOfToday - 30 * 86400000;
      }
      return true;
    });
  }, [sales, receiptModalType]);

  const modalMetrics = useMemo(() => {
    const valid = modalTargetSales.filter(s => s.status !== 'refunded');
    const gross = valid.reduce((acc, s) => acc + s.grandTotal, 0);
    const refunds = modalTargetSales.filter(s => s.status === 'refunded').reduce((acc, s) => acc + (s.refundAmount || s.grandTotal), 0);
    const net = Math.max(0, gross - refunds);
    const units = valid.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    return {
      orderCount: valid.length,
      grossSales: gross,
      netSales: net,
      unitsSold: units,
    };
  }, [modalTargetSales]);

  // Filter sales based on selected date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return sales.filter((s) => {
      const saleTime = new Date(s.timestamp).getTime();
      if (timeRange === 'today') {
        return saleTime >= startOfToday;
      } else if (timeRange === 'yesterday') {
        const startOfYesterday = startOfToday - 86400000;
        return saleTime >= startOfYesterday && saleTime < startOfToday;
      } else if (timeRange === 'week') {
        return saleTime >= startOfToday - 7 * 86400000;
      } else if (timeRange === 'month') {
        return saleTime >= startOfToday - 30 * 86400000;
      }
      return true;
    });
  }, [sales, timeRange]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    const validSales = filteredSales.filter(s => s.status !== 'refunded');

    const grossSales = validSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const netSubtotal = validSales.reduce((sum, s) => sum + s.subtotal - s.discountAmount, 0);
    const taxCollected = validSales.reduce((sum, s) => sum + s.taxAmount, 0);

    // Calculate COGS (Cost of goods sold)
    let totalCost = 0;
    validSales.forEach(s => {
      s.items.forEach(item => {
        totalCost += (item.costPrice || 0) * item.quantity;
      });
    });

    const grossProfit = Math.max(0, netSubtotal - totalCost);
    const profitMargin = netSubtotal > 0 ? (grossProfit / netSubtotal) * 100 : 0;
    const orderCount = validSales.length;
    const avgBasket = orderCount > 0 ? grossSales / orderCount : 0;

    // Payment method breakdown
    let cashTotal = 0;
    let cardTotal = 0;
    validSales.forEach(s => {
      if (s.payment.method === 'cash') cashTotal += s.grandTotal;
      else if (s.payment.method === 'card') cardTotal += s.grandTotal;
      else if (s.payment.method === 'split') {
        cashTotal += s.payment.splitCashAmount || 0;
        cardTotal += s.payment.splitCardAmount || 0;
      } else {
        cardTotal += s.grandTotal;
      }
    });

    return {
      grossSales,
      netSubtotal,
      taxCollected,
      totalCost,
      grossProfit,
      profitMargin,
      orderCount,
      avgBasket,
      cashTotal,
      cardTotal,
    };
  }, [filteredSales]);

  // Hourly sales distribution
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM
    const buckets: { hourLabel: string; count: number; total: number }[] = hours.map(h => ({
      hourLabel: `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
      count: 0,
      total: 0,
    }));

    filteredSales.forEach(s => {
      if (s.status === 'refunded') return;
      const d = new Date(s.timestamp);
      const h = d.getHours();
      const index = h - 8;
      if (index >= 0 && index < buckets.length) {
        buckets[index].count += 1;
        buckets[index].total += s.grandTotal;
      }
    });

    const maxTotal = Math.max(...buckets.map(b => b.total), 1);
    return { buckets, maxTotal };
  }, [filteredSales]);

  // Top products leaderboard
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredSales.forEach(s => {
      if (s.status === 'refunded') return;
      s.items.forEach(item => {
        const existing = map.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.total;
        map.set(item.productId, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredSales]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredSales.forEach(s => {
      if (s.status === 'refunded') return;
      s.items.forEach(item => {
        const cat = item.category || 'Other';
        map.set(cat, (map.get(cat) || 0) + item.total);
      });
    });
    return Array.from(map.entries())
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales]);

  // Ledger search filter
  const ledgerSales = useMemo(() => {
    const q = searchLedger.trim().toLowerCase();
    if (!q) return filteredSales;
    return filteredSales.filter(
      s =>
        s.receiptNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.items.some(i => i.productName.toLowerCase().includes(q))
    );
  }, [filteredSales, searchLedger]);

  // Refund transaction process & restock inventory
  const handleProcessRefund = () => {
    if (!refundModalSale) return;

    // 1. Mark sale as refunded
    setSales(prev =>
      prev.map(s =>
        s.id === refundModalSale.id
          ? {
              ...s,
              status: 'refunded',
              refundReason,
              refundTimestamp: new Date().toISOString(),
              refundAmount: s.grandTotal,
            }
          : s
      )
    );

    // 2. Restock products back to inventory
    setProducts(prev => {
      const updated = [...prev];
      refundModalSale.items.forEach(saleItem => {
        const idx = updated.findIndex(p => p.id === saleItem.productId);
        if (idx > -1) {
          updated[idx] = {
            ...updated[idx],
            stock: updated[idx].stock + saleItem.quantity,
          };
        }
      });
      return updated;
    });

    playSound.tap();
    setRefundModalSale(null);
  };

  // Export Sales Report PDF (Current Filter)
  const exportSalesReport = () => {
    handleDownloadRangeReport(timeRange);
  };

  // Download Comprehensive Professional PDF Sales Report
  const handleDownloadRangeReport = (type: 'week' | 'month' | 'today' | 'yesterday' | 'all') => {
    playSound.tap();
    generateSalesReportPdf({
      sales,
      settings,
      rangeType: type,
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      
      {/* Top Header & Range Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-300" />
            <span>Sales & Financial Reports</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial performance and transaction history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Toggle */}
          <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-xs">
            {(['today', 'yesterday', 'week', 'month', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range);
                  playSound.tap();
                }}
                className={`px-3 py-1.5 rounded-lg capitalize text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range === 'all' ? 'All Time' : range}
              </button>
            ))}
          </div>

          {/* Dedicated Download/Print Options for Weekly and Monthly Thermal Receipts */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playSound.tap();
                setReceiptModalType('week');
              }}
              title="Print or Download Weekly Sales Receipt (80mm/58mm)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold rounded-xl text-slate-200 hover:text-white transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Weekly Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound.tap();
                setReceiptModalType('month');
              }}
              title="Print or Download Monthly Sales Receipt (80mm/58mm)"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs font-semibold rounded-xl text-slate-200 hover:text-white transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Monthly Receipt</span>
            </button>
          </div>

          <button
            onClick={() => {
              playSound.tap();
              setReceiptModalType(timeRange);
            }}
            title={`Print or Download ${timeRange} sales receipt`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs font-medium rounded-xl text-slate-400 hover:text-white transition-colors active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Gross Sales */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Gross Sales</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{metrics.grossSales.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            {metrics.orderCount} orders completed
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Gross Profit</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{metrics.grossProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400">
            {metrics.profitMargin.toFixed(1)}% margin
          </div>
        </div>

        {/* Average Basket */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Average Ticket</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{metrics.avgBasket.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Avg revenue per sale
          </div>
        </div>

        {/* Cash vs Card Split */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Payment Mix</div>
          <div className="text-xs space-y-1 pt-1 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Cash:</span>
              <span className="font-semibold text-slate-200">{settings.currencySymbol}{metrics.cashTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-sans">Card:</span>
              <span className="font-semibold text-slate-200">{settings.currencySymbol}{metrics.cardTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Sales Visual Chart & Top Products Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-white">Sales Activity</h3>
            <span className="text-xs text-slate-400">Hourly Distribution</span>
          </div>

          <div className="flex-1 flex items-end gap-1.5 h-36 pt-4 px-1">
            {hourlyData.buckets.map((b, i) => {
              const heightPct = (b.total / hourlyData.maxTotal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {b.total > 0 && (
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-20">
                      ${b.total.toFixed(0)} ({b.count})
                    </div>
                  )}

                  <div className="w-full bg-slate-950/80 rounded-t h-28 flex items-end overflow-hidden border-b border-slate-800">
                    <div
                      style={{ height: `${Math.max(b.total > 0 ? 8 : 0, heightPct)}%` }}
                      className="w-full bg-slate-500 group-hover:bg-cyan-500 rounded-t transition-colors"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">
                    {b.hourLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Leaderboard */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl shadow-xs space-y-3">
          <h3 className="font-semibold text-sm text-white">Top Products</h3>

          <div className="space-y-1.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No sales recorded yet</p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/70 text-xs"
                >
                  <div className="truncate mr-2">
                    <div className="font-medium text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{p.qty} sold</div>
                  </div>
                  <div className="text-right shrink-0 font-bold text-white font-mono">
                    {settings.currencySymbol}{p.revenue.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm text-white">
              Transaction Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete audit trail of sales and refunds
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchLedger}
              onChange={(e) => setSearchLedger(e.target.value)}
              placeholder="Search receipt, product, customer..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800/80">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Receipt #</th>
                <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                <th className="py-2.5 px-3 font-semibold">Items</th>
                <th className="py-2.5 px-3 font-semibold">Payment</th>
                <th className="py-2.5 px-3 font-semibold">Customer</th>
                <th className="py-2.5 px-3 font-semibold">Total</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {ledgerSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No transactions recorded for this period
                  </td>
                </tr>
              ) : (
                ledgerSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                      {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-slate-400">
                      {sale.payment.method}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {sale.customerName || 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3 font-bold font-mono text-white">
                      {settings.currencySymbol}{sale.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-xs font-medium ${
                          sale.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {sale.status === 'completed' ? 'Completed' : 'Refunded'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reprint */}
                        <button
                          onClick={() => onReprintReceipt(sale)}
                          title="Reprint receipt"
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Refund if completed */}
                        {sale.status === 'completed' && (
                          <button
                            onClick={() => setRefundModalSale(sale)}
                            title="Process Refund / Return"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          REFUND / RETURN MODAL
          ========================================= */}
      {refundModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-0.5">Process Sale Refund</h3>
            <p className="text-xs text-slate-400 mb-3">
              Receipt: {refundModalSale.receiptNumber} ({settings.currencySymbol}{refundModalSale.grandTotal.toFixed(2)})
            </p>

            <div className="bg-rose-950/40 border border-rose-800/40 rounded-xl p-3 text-xs text-rose-300 mb-3">
              This will reverse the transaction and automatically return the items to inventory stock.
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Refund Reason:
              </label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-slate-600 transition-colors"
              >
                <option value="Customer returned item">Customer returned item</option>
                <option value="Item defective or spoiled">Item defective or spoiled</option>
                <option value="Customer changed mind">Customer changed mind</option>
                <option value="Cashier ring error">Cashier ring error</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRefundModalSale(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-xs transition-colors active:scale-95"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print or Download Receipt Options Modal */}
      {receiptModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-5 text-slate-100 flex flex-col space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {receiptModalType === 'week'
                      ? 'Weekly Sales Receipt'
                      : receiptModalType === 'month'
                      ? 'Monthly Sales Receipt'
                      : `${receiptModalType.toUpperCase()} Sales Receipt`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Thermal printer tape ({settings.paperWidth || '80mm'})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReceiptModalType(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Receipt Slip Preview */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="text-center font-bold text-slate-200">
                {settings.storeName.toUpperCase()}
              </div>
              <div className="text-center text-[11px] text-slate-400">
                {receiptModalType === 'week'
                  ? 'PERIOD: LAST 7 DAYS'
                  : receiptModalType === 'month'
                  ? 'PERIOD: LAST 30 DAYS'
                  : `PERIOD: ${receiptModalType.toUpperCase()}`}
              </div>
              <div className="border-t border-dashed border-slate-800 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Total Orders:</span>
                  <span className="font-bold">{modalMetrics.orderCount}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Units Sold:</span>
                  <span>{modalMetrics.unitsSold}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Gross Sales:</span>
                  <span>{settings.currencySymbol}{modalMetrics.grossSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-dashed border-slate-800 pt-1 text-xs">
                  <span>Net Revenue:</span>
                  <span className="text-emerald-400">{settings.currencySymbol}{modalMetrics.netSales.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Prompt text */}
            <p className="text-xs text-slate-300">
              Choose output format for this sales report:
            </p>

            {/* Action Buttons: Print vs Download */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  generateSalesReportPdf({
                    sales,
                    settings,
                    rangeType: receiptModalType,
                    action: 'print',
                  });
                  playSound.tap();
                  setReceiptModalType(null);
                }}
                className="flex flex-col items-center justify-center p-3.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-white font-semibold transition-all active:scale-95 shadow-md group cursor-pointer"
              >
                <Printer className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Print Receipt</span>
                <span className="text-[10px] text-sky-100 font-normal mt-0.5">Send to printer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  generateSalesReportPdf({
                    sales,
                    settings,
                    rangeType: receiptModalType,
                    action: 'download',
                  });
                  playSound.tap();
                  setReceiptModalType(null);
                }}
                className="flex flex-col items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-slate-200 hover:text-white font-semibold transition-all active:scale-95 shadow-md group cursor-pointer"
              >
                <Download className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform text-slate-300" />
                <span className="text-xs font-bold">Download PDF</span>
                <span className="text-[10px] text-slate-400 font-normal mt-0.5">Save .pdf file</span>
              </button>
            </div>

            {/* Footer close */}
            <button
              type="button"
              onClick={() => setReceiptModalType(null)}
              className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
