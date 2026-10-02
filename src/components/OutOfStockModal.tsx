import React, { useEffect } from 'react';
import { PackageX, AlertTriangle, ArrowRight, X, AlertCircle } from 'lucide-react';
import { Product } from '../types/pos';
import { playSound } from '../utils/sound';

export interface OutOfStockAlertData {
  product: Product;
  availableStock: number;
  currentCartQty: number;
}

interface OutOfStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OutOfStockAlertData | null;
  onGoToInventory?: () => void;
}

export const OutOfStockModal: React.FC<OutOfStockModalProps> = ({
  isOpen,
  onClose,
  data,
  onGoToInventory,
}) => {
  // Listen for Escape or Enter key to dismiss quickly
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        playSound.tap();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  const isCompletelyOutOfStock = data.availableStock <= 0;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-rose-500/50 w-full max-w-md rounded-2xl shadow-2xl shadow-rose-950/40 overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              {isCompletelyOutOfStock ? (
                <PackageX className="w-5 h-5 text-rose-400 stroke-[2.2]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 stroke-[2.2]" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <span>{isCompletelyOutOfStock ? 'Out of Stock Alert' : 'Stock Limit Reached'}</span>
              </h3>
              <p className="text-xs text-rose-400 font-medium mt-0.5">
                {isCompletelyOutOfStock
                  ? 'Cannot add sold-out item to cart'
                  : 'Cannot add more units than available'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound.tap();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close [Esc]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Product details card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  {data.product.category}
                </span>
                <h4 className="font-bold text-sm text-white line-clamp-2">
                  {data.product.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                  <span>SKU: {data.product.sku}</span>
                  {data.product.barcode && (
                    <>
                      <span>•</span>
                      <span>Barcode: {data.product.barcode}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 text-right">
                <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-xs font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{isCompletelyOutOfStock ? '0 in Stock' : `${data.availableStock} in Stock`}</span>
                </span>
              </div>
            </div>

            {/* Inventory vs Cart stats */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Available Inventory</span>
                <span className="font-bold font-mono text-sm text-rose-400">
                  {data.availableStock} {data.product.unit || 'units'}
                </span>
              </div>
              <div className="bg-slate-900/80 rounded-lg p-2.5 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Already in Cart</span>
                <span className="font-bold font-mono text-sm text-white">
                  {data.currentCartQty} {data.product.unit || 'units'}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation Banner */}
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              {isCompletelyOutOfStock ? (
                <span>
                  <strong>"{data.product.name}"</strong> is currently out of stock. You cannot ring up this product until stock is received and adjusted in Inventory.
                </span>
              ) : (
                <span>
                  You already have all <strong>{data.availableStock} available {data.product.unit || 'units'}</strong> of <strong>"{data.product.name}"</strong> in this checkout cart. No additional units can be added.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-800 bg-slate-950/70">
          {onGoToInventory ? (
            <button
              type="button"
              onClick={() => {
                playSound.tap();
                onGoToInventory();
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>View in Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => {
              playSound.tap();
              onClose();
            }}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ml-auto"
          >
            Understood (OK)
          </button>
        </div>

      </div>
    </div>
  );
};
