import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Split, 
  Smartphone, 
  Check, 
  X, 
  ArrowLeft, 
  Delete,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StoreSettings, PaymentMethod, PaymentBreakdown } from '../types/pos';
import { playSound } from '../utils/sound';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  settings: StoreSettings;
  isCardPricing: boolean;
  setIsCardPricing: (val: boolean) => void;
  onCompleteSale: (payment: PaymentBreakdown, finalTotal: number, cardSurcharge: number) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  taxAmount,
  discountAmount,
  grandTotal: baseGrandTotal,
  settings,
  isCardPricing,
  setIsCardPricing,
  onCompleteSale,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tenderedStr, setTenderedStr] = useState<string>('');
  const [cardLast4, setCardLast4] = useState<string>('4242');
  const [splitCashStr, setSplitCashStr] = useState<string>('');

  // Calculate actual total based on dual pricing
  const cardSurcharge = isCardPricing && settings.dualPricingEnabled
    ? Number((baseGrandTotal * (settings.cardSurchargePercent / 100)).toFixed(2))
    : 0;
  const currentTotal = Number((baseGrandTotal + cardSurcharge).toFixed(2));

  const tenderedAmount = parseFloat(tenderedStr) || 0;
  const changeDue = Math.max(0, Number((tenderedAmount - currentTotal).toFixed(2)));
  const isCashSufficient = tenderedAmount >= currentTotal;

  // Split payment calculations
  const splitCash = parseFloat(splitCashStr) || 0;
  const splitCard = Math.max(0, Number((currentTotal - splitCash).toFixed(2)));

  useEffect(() => {
    if (isOpen) {
      // Default tendered to exact or empty
      setTenderedStr('');
      setSplitCashStr((currentTotal / 2).toFixed(2));
      // If paying by card, switch dual pricing flag
      if (method === 'card') {
        setIsCardPricing(true);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Quick tender calculation presets
  const exactAmount = currentTotal;
  const nextDollar = Math.ceil(currentTotal);
  const next5 = Math.ceil(currentTotal / 5) * 5;
  const next10 = Math.ceil(currentTotal / 10) * 10;
  const next20 = Math.ceil(currentTotal / 20) * 20;
  const next50 = 50 >= currentTotal ? 50 : Math.ceil(currentTotal / 50) * 50;
  const next100 = 100 >= currentTotal ? 100 : Math.ceil(currentTotal / 100) * 100;

  const quickPresets = Array.from(
    new Set([exactAmount, nextDollar, next5, next10, next20, next50, next100].filter(v => v >= currentTotal))
  ).slice(0, 5);

  const handleKeypadPress = (val: string) => {
    playSound.tap();
    if (val === 'C') {
      setTenderedStr('');
    } else if (val === 'back') {
      setTenderedStr(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!tenderedStr.includes('.')) {
        setTenderedStr(prev => (prev === '' ? '0.' : prev + '.'));
      }
    } else {
      setTenderedStr(prev => {
        if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev;
        return prev + val;
      });
    }
  };

  const handleFinishPayment = () => {
    let breakdown: PaymentBreakdown;

    if (method === 'cash') {
      if (!isCashSufficient) {
        playSound.errorTone();
        return;
      }
      breakdown = {
        method: 'cash',
        cashTendered: tenderedAmount,
        cashChange: changeDue,
      };
    } else if (method === 'card') {
      breakdown = {
        method: 'card',
        cardAmount: currentTotal,
        cardLast4: cardLast4 || '4242',
      };
    } else if (method === 'split') {
      breakdown = {
        method: 'split',
        splitCashAmount: splitCash,
        splitCardAmount: splitCard,
        cashTendered: splitCash,
        cashChange: 0,
        cardLast4: cardLast4 || '4242',
      };
    } else {
      breakdown = {
        method,
        cashTendered: currentTotal,
        cashChange: 0,
      };
    }

    // Trigger celebration & audio
    try {
      playSound.saleChime();
      playSound.drawerKick();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b']
      });
    } catch {}

    onCompleteSale(breakdown, currentTotal, cardSurcharge);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Checkout & Payment</span>
            </h2>
          </div>

          {/* Dual pricing switch */}
          {settings.dualPricingEnabled && (
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => { setIsCardPricing(false); playSound.tap(); }}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  !isCardPricing ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cash Price ({settings.currencySymbol}{baseGrandTotal.toFixed(2)})
              </button>
              <button
                onClick={() => { setIsCardPricing(true); playSound.tap(); }}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  isCardPricing ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Card Price (+{settings.cardSurchargePercent}%)
              </button>
            </div>
          )}
        </div>

        {/* Amount Due Big Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Amount Due
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              <span>{settings.currencySymbol}</span>
              <span>{currentTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-400 space-y-0.5">
            <div>Subtotal: {settings.currencySymbol}{subtotal.toFixed(2)}</div>
            <div>Tax: {settings.currencySymbol}{taxAmount.toFixed(2)}</div>
            {cardSurcharge > 0 && (
              <div className="text-cyan-400 font-medium">Card Surcharge: +{settings.currencySymbol}{cardSurcharge.toFixed(2)}</div>
            )}
            {discountAmount > 0 && (
              <div className="text-emerald-400">Discount: -{settings.currencySymbol}{discountAmount.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* Payment Methods Selector Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/40 border-b border-slate-800">
          <button
            onClick={() => { setMethod('cash'); setIsCardPricing(false); playSound.tap(); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
              method === 'cash'
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Cash</span>
          </button>

          <button
            onClick={() => { setMethod('card'); setIsCardPricing(true); playSound.tap(); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
              method === 'card'
                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span>Credit/Debit</span>
          </button>

          <button
            onClick={() => { setMethod('split'); playSound.tap(); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
              method === 'split'
                ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Split className="w-5 h-5" />
            <span>Split Pay</span>
          </button>

          <button
            onClick={() => { setMethod('mobile_pay'); playSound.tap(); }}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-bold transition-all ${
              method === 'mobile_pay'
                ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>Tap / Mobile</span>
          </button>
        </div>

        {/* Body Content based on payment method */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {method === 'cash' && (
            <div className="space-y-4">
              {/* Quick Cash Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
                  Quick Cash Tender:
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickPresets.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        setTenderedStr(amt.toFixed(2));
                        playSound.tap();
                      }}
                      className={`flex-1 min-w-[70px] py-2 px-3 rounded-lg border text-xs font-bold transition-all active:scale-95 ${
                        tenderedStr === amt.toFixed(2)
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                      }`}
                    >
                      {amt === currentTotal ? 'Exact' : `${settings.currencySymbol}${amt.toFixed(2)}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tendered Input & Change Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">
                    Cash Received:
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-lg">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tenderedStr}
                      onChange={(e) => setTenderedStr(e.target.value)}
                      placeholder={currentTotal.toFixed(2)}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xl font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Change Due Display */}
                <div className={`p-3 rounded-xl border flex flex-col justify-center ${
                  isCashSufficient 
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    {isCashSufficient ? 'Change to Return' : 'Awaiting Tender'}
                  </span>
                  <span className="text-2xl font-black text-white">
                    {settings.currencySymbol}{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Touchscreen Numeric Keypad */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="grid grid-cols-4 gap-1.5">
                  {['1', '2', '3', '10', '4', '5', '6', '20', '7', '8', '9', '50', 'C', '0', '.', 'back'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (['10', '20', '50'].includes(k)) {
                          setTenderedStr(k);
                          playSound.tap();
                        } else {
                          handleKeypadPress(k);
                        }
                      }}
                      className={`h-11 rounded-lg font-bold text-sm flex items-center justify-center transition-all active:scale-95 ${
                        ['10', '20', '50'].includes(k)
                          ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/50'
                          : k === 'C'
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50'
                          : k === 'back'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-800/90 text-white hover:bg-slate-700'
                      }`}
                    >
                      {k === 'back' ? <Delete className="w-4 h-4" /> : k === 'C' ? 'CLEAR' : ['10', '20', '50'].includes(k) ? `$${k}` : k}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {method === 'card' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                <CreditCard className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h4 className="font-bold text-white text-base">Present Card to Terminal</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Insert chip, tap contactless card / Apple Pay, or swipe
                </p>
              </div>

              <div className="max-w-xs mx-auto text-left">
                <label className="text-xs font-semibold text-slate-400 mb-1 block">
                  Card Last 4 Digits (Optional reference):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value)}
                  placeholder="4242"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono text-center font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-cyan-950/40 border border-cyan-800/40 rounded-lg p-2.5 text-xs text-cyan-300 max-w-sm mx-auto">
                ⚡ EMV Terminal Mock Ready • Auto-approves instantly offline
              </div>
            </div>
          )}

          {method === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">
                    Cash Portion:
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 font-bold">
                      {settings.currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={splitCashStr}
                      onChange={(e) => setSplitCashStr(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">
                    Card Remainder:
                  </label>
                  <div className="text-xl font-bold text-cyan-400 py-1.5">
                    {settings.currencySymbol}{splitCard.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitCashStr((currentTotal / 2).toFixed(2))}
                  className="flex-1 py-1.5 bg-slate-800 text-xs font-semibold text-slate-300 rounded hover:bg-slate-700"
                >
                  Split 50 / 50
                </button>
                <button
                  type="button"
                  onClick={() => setSplitCashStr(Math.floor(currentTotal / 2).toString())}
                  className="flex-1 py-1.5 bg-slate-800 text-xs font-semibold text-slate-300 rounded hover:bg-slate-700"
                >
                  Round Cash
                </button>
              </div>
            </div>
          )}

          {method === 'mobile_pay' && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">QR / Mobile Payment</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Customer scans or taps with Apple Pay, Google Pay, or QR wallet
                </p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-w-xs mx-auto text-xs text-slate-300">
                Awaiting mobile payload authorization...
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Complete Sale */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel (Esc)
          </button>

          <button
            disabled={method === 'cash' && !isCashSufficient}
            onClick={handleFinishPayment}
            className={`flex-1 max-w-sm flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg active:scale-98 ${
              method === 'cash' && !isCashSufficient
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Complete Sale & Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
