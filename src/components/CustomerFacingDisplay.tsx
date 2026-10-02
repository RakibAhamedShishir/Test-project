import React from 'react';
import { ShoppingCart, CheckCircle, Tv, X, Sparkles } from 'lucide-react';
import { CartItem, StoreSettings } from '../types/pos';

interface CustomerFacingDisplayProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  settings: StoreSettings;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  isCardPricing: boolean;
}

export const CustomerFacingDisplay: React.FC<CustomerFacingDisplayProps> = ({
  isOpen,
  onClose,
  cart,
  settings,
  subtotal,
  taxAmount,
  discountAmount,
  grandTotal,
  isCardPricing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 text-white">
      <div className="w-full max-w-4xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl shadow-inner">
              S
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">{settings.storeName}</h2>
              <p className="text-xs text-cyan-400 font-medium">Customer Facing Display • Welcome!</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
              Live Register Sync
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Display Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Scanned Items List */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-950/40">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <ShoppingCart className="w-16 h-16 text-slate-700" />
                <h3 className="text-xl font-bold text-slate-300">Welcome to {settings.storeName}</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Your scanned items and savings will appear here in real-time.
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fadeIn"
                >
                  <div>
                    <div className="text-base font-bold text-white">{item.product.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      {item.quantity} x {settings.currencySymbol}{item.product.price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xl font-black text-emerald-400">
                    {settings.currencySymbol}{(item.quantity * item.product.price).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Large Totals & Savings */}
          <div className="w-full md:w-80 bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Order Summary
              </div>

              <div className="space-y-2 text-sm text-slate-300 border-b border-slate-800 pb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{settings.currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Discount Savings</span>
                    <span>-{settings.currencySymbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Sales Tax</span>
                  <span>{settings.currencySymbol}{taxAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Due
              </div>
              <div className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight">
                {settings.currencySymbol}{grandTotal.toFixed(2)}
              </div>

              {settings.dualPricingEnabled && (
                <div className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800 mt-2">
                  💵 Cash discount included. Card payments subject to +{settings.cardSurchargePercent}% processing fee.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
