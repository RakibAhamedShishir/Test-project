import React, { useState, useMemo } from 'react';
import { RotateCcw, Search, X, Check, AlertCircle, ShoppingBag, Receipt, ArrowLeft } from 'lucide-react';
import { Sale, StoreSettings } from '../types/pos';
import { playSound } from '../utils/sound';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  onConfirmRefund: (sale: Sale, reason: string) => void;
  settings: StoreSettings;
  preselectedSale?: Sale | null;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  sales,
  onConfirmRefund,
  settings,
  preselectedSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(preselectedSale || null);
  const [reason, setReason] = useState('Customer returned item');

  // Completed sales eligible for refund
  const eligibleSales = useMemo(() => {
    return sales.filter((s) => s.status === 'completed');
  }, [sales]);

  // Filtered sales based on search query
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return eligibleSales.slice(0, 8); // show recent 8
    return eligibleSales.filter(
      (s) =>
        s.receiptNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.items.some((i) => i.productName.toLowerCase().includes(q))
    );
  }, [eligibleSales, searchQuery]);

  if (!isOpen) return null;

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    playSound.tap();
  };

  const handleExecuteRefund = () => {
    if (!selectedSale) return;
    playSound.tap();
    onConfirmRefund(selectedSale, reason);
    setSelectedSale(null);
    setSearchQuery('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Refund & Returns</h3>
              <p className="text-xs text-slate-400">Process return, refund customer & restock inventory</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!selectedSale ? (
            /* Step 1: Find Transaction */
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Scan or type receipt #, product name, or customer..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Recent Completed Transactions ({eligibleSales.length})
                </div>

                {filteredSales.length === 0 ? (
                  <div className="text-center py-8 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                    No matching completed transactions found.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {filteredSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/90 hover:border-rose-500/60 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all active:scale-98"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-xs">{sale.receiptNumber}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase">
                              {sale.payment.method}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 line-clamp-1 max-w-sm">
                            {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            {new Date(sale.timestamp).toLocaleString()} • {sale.customerName || 'Walk-in'}
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div className="font-black text-sm text-emerald-400">
                            {settings.currencySymbol}{sale.grandTotal.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-rose-400 font-semibold hover:underline">
                            Select Refund →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Step 2: Confirm Refund Details */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Choose a different transaction</span>
              </button>

              {/* Receipt Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                  <div>
                    <span className="text-xs text-slate-400 block">Receipt Number:</span>
                    <span className="font-mono font-bold text-white text-sm">{selectedSale.receiptNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Paid With:</span>
                    <span className="font-bold text-cyan-400 uppercase text-xs">{selectedSale.payment.method}</span>
                  </div>
                </div>

                {/* Items to be returned */}
                <div className="text-xs space-y-1.5 py-1">
                  <div className="font-semibold text-slate-300">Items to Restock:</div>
                  <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-1.5">
                    {selectedSale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="font-mono text-slate-400">
                          {settings.currencySymbol}{item.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Refund Banner */}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                  <span className="font-bold text-xs text-slate-400 uppercase">Refund Amount:</span>
                  <span className="text-2xl font-black text-rose-400">
                    {settings.currencySymbol}{selectedSale.grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Reason Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reason for Refund / Return:
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Customer returned item">Customer returned item</option>
                  <option value="Item defective or spoiled">Item defective or spoiled</option>
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Wrong item purchased">Wrong item purchased</option>
                  <option value="Cashier ring error">Cashier ring error</option>
                </select>
              </div>

              <div className="bg-rose-950/30 border border-rose-800/40 p-3 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  Confirming will mark this sale as refunded, automatically return all items back into inventory stock, and balance the cash drawer.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
          >
            Cancel
          </button>

          {selectedSale && (
            <button
              type="button"
              onClick={handleExecuteRefund}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Confirm Refund ({settings.currencySymbol}{selectedSale.grandTotal.toFixed(2)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
