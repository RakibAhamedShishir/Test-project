import React from 'react';
import { Clock, Play, Trash2, X, ShoppingCart } from 'lucide-react';
import { HeldSale, StoreSettings } from '../types/pos';
import { playSound } from '../utils/sound';

interface HeldSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldSales: HeldSale[];
  onRestoreHeldSale: (heldSale: HeldSale) => void;
  onDeleteHeldSale: (id: string) => void;
  settings: StoreSettings;
}

export const HeldSalesModal: React.FC<HeldSalesModalProps> = ({
  isOpen,
  onClose,
  heldSales,
  onRestoreHeldSale,
  onDeleteHeldSale,
  settings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-white text-sm">
              Parked & Held Sales ({heldSales.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-2.5">
          {heldSales.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <ShoppingCart className="w-12 h-12 mx-auto text-slate-600" />
              <p className="font-semibold text-sm">No sales currently on hold</p>
              <p className="text-xs text-slate-500">
                You can park a sale from the register cart at any time using the "Hold" button.
              </p>
            </div>
          ) : (
            heldSales.map((sale) => {
              const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
              const estTotal = sale.items.reduce(
                (sum, item) => sum + (item.customPrice ?? item.product.price) * item.quantity,
                0
              );

              return (
                <div
                  key={sale.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{sale.title}</span>
                      {sale.customerName && (
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800">
                          {sale.customerName}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span>{totalItems} items</span>
                      <span>•</span>
                      <span className="font-bold text-emerald-400">
                        {settings.currencySymbol}{estTotal.toFixed(2)}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                      {sale.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => {
                        playSound.tap();
                        onRestoreHeldSale(sale);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>

                    <button
                      onClick={() => {
                        playSound.errorTone();
                        onDeleteHeldSale(sale.id);
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                      title="Discard ticket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
