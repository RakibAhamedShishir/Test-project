import React from 'react';
import { AlertTriangle, Package, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { Product } from '../types/pos';
import { playSound } from '../utils/sound';

export interface LowStockAlertItem {
  product: Product;
  newStock: number;
  threshold: number;
}

interface LowStockAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockItems: LowStockAlertItem[];
  currencySymbol: string;
  onGoToInventory: () => void;
}

export const LowStockAlertModal: React.FC<LowStockAlertModalProps> = ({
  isOpen,
  onClose,
  lowStockItems,
  currencySymbol,
  onGoToInventory,
}) => {
  if (!isOpen || lowStockItems.length === 0) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-amber-500/40 w-full max-w-lg rounded-2xl shadow-2xl shadow-amber-950/40 overflow-hidden flex flex-col max-h-[90vh] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">Low Stock Alert</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {lowStockItems.length === 1
                  ? '1 item reached its minimum stock threshold during this sale.'
                  : `${lowStockItems.length} items reached minimum stock thresholds during this sale.`}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound.tap();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Items List */}
        <div className="p-4 overflow-y-auto space-y-2 max-h-[60vh]">
          {lowStockItems.map((item) => {
            const isOutOfStock = item.newStock <= 0;
            return (
              <div
                key={item.product.id}
                className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="font-medium text-white text-sm truncate">{item.product.name}</div>
                  <div className="text-xs text-slate-400 font-mono">
                    {item.product.sku} · {item.product.category}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className={`text-base font-bold font-mono ${isOutOfStock ? 'text-rose-400' : 'text-amber-400'}`}>
                      {item.newStock} {item.product.unit}
                    </span>
                    <span className="text-xs text-slate-500">remaining</span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Threshold: <span className="font-mono text-slate-300">{item.threshold} {item.product.unit}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              playSound.tap();
              onClose();
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl border border-slate-800 transition-colors"
          >
            Dismiss
          </button>

          <button
            type="button"
            onClick={() => {
              playSound.tap();
              onClose();
              onGoToInventory();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <Package className="w-4 h-4" />
            <span>Go to Inventory & Restock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
