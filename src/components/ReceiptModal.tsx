import React, { useRef, useState } from 'react';
import { Printer, Check, Copy, X, Share2, RotateCcw } from 'lucide-react';
import { Sale, StoreSettings } from '../types/pos';
import { BarcodeView } from './BarcodeView';
import { playSound } from '../utils/sound';

interface ReceiptModalProps {
  sale: Sale | null;
  settings: StoreSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const [copied, setCopied] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.paperWidth || '80mm');
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    playSound.tap();
    window.print();
  };

  const handleDone = () => {
    playSound.tap();
    onClose();
    if (onNewSale) {
      onNewSale();
    }
  };

  const handleCopyText = () => {
    const textReceipt = `
========================================
       ${settings.storeName}
    ${settings.tagline}
    ${settings.address}
    Tel: ${settings.phone}
    Tax ID: ${settings.taxIdNumber}
========================================
Receipt #: ${sale.receiptNumber}
Date: ${new Date(sale.timestamp).toLocaleString()}
Cashier: ${sale.cashierName}
Customer: ${sale.customerName || 'Walk-in'}
----------------------------------------
${sale.items.map(item => `${item.productName.padEnd(24).substring(0, 24)}
  ${item.quantity} x ${settings.currencySymbol}${item.unitPrice.toFixed(2)}    ${settings.currencySymbol}${item.total.toFixed(2)}`).join('\n')}
----------------------------------------
Subtotal:       ${settings.currencySymbol}${sale.subtotal.toFixed(2)}
Tax (${sale.taxRate}%):    ${settings.currencySymbol}${sale.taxAmount.toFixed(2)}
${sale.discountAmount > 0 ? `Discount:      -${settings.currencySymbol}${sale.discountAmount.toFixed(2)}\n` : ''}${sale.cardSurchargeAmount > 0 ? `Card Adjustment:${settings.currencySymbol}${sale.cardSurchargeAmount.toFixed(2)}\n` : ''}TOTAL:          ${settings.currencySymbol}${sale.grandTotal.toFixed(2)}
========================================
Payment:        ${sale.payment.method.toUpperCase()}
${sale.payment.cashTendered ? `Tendered:       ${settings.currencySymbol}${sale.payment.cashTendered.toFixed(2)}\nChange:         ${settings.currencySymbol}${(sale.payment.cashChange || 0).toFixed(2)}\n` : ''}${sale.payment.cardLast4 ? `Card:           ****${sale.payment.cardLast4}\n` : ''}========================================
${settings.receiptHeaderMsg}
${settings.receiptFooterMsg}
`;
    navigator.clipboard.writeText(textReceipt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${sale.status === 'refunded' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'} flex items-center justify-center`}>
              {sale.status === 'refunded' ? <RotateCcw className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Receipt #{sale.receiptNumber}</h3>
              <p className="text-xs text-slate-400">
                {sale.status === 'refunded'
                  ? `Refunded: ${sale.refundReason || 'Customer return'}`
                  : 'Transaction completed successfully'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper width selector */}
            <div className="flex bg-slate-800 p-0.5 rounded text-xs">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-0.5 rounded transition-all ${
                  paperWidth === '80mm' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-0.5 rounded transition-all ${
                  paperWidth === '58mm' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                58mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 overflow-y-auto bg-slate-950/40 flex justify-center">
          {/* Printable Thermal Receipt Paper Container */}
          <div
            id="receipt-print-area"
            ref={printRef}
            style={{ width: paperWidth === '80mm' ? '320px' : '260px' }}
            className="bg-white text-slate-900 p-4 shadow-xl font-mono text-xs rounded-sm transition-all select-text border border-slate-200"
          >
            {/* Perforated Top Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <div className="font-extrabold text-sm tracking-wider uppercase mb-0.5">
                {settings.storeName}
              </div>
              {sale.status === 'refunded' && (
                <div className="font-extrabold text-xs text-rose-700 border-2 border-rose-600 my-1.5 py-0.5 uppercase tracking-widest bg-rose-50 text-center">
                  *** REFUND RECEIPT ***
                </div>
              )}
              <div className="text-[10px] text-slate-600 font-sans">{settings.tagline}</div>
              <div className="text-[10px] text-slate-600 mt-1">{settings.address}</div>
              <div className="text-[10px] text-slate-600">Tel: {settings.phone}</div>
              {settings.taxIdNumber && (
                <div className="text-[10px] text-slate-500">Tax ID: {settings.taxIdNumber}</div>
              )}
            </div>

            {/* Sale Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] leading-tight space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Receipt #:</span>
                <span className="font-bold">{sale.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span>{new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Cashier:</span>
                <span>{sale.cashierName}</span>
              </div>
              {sale.customerName && sale.customerName !== 'Walk-in Customer' && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer:</span>
                  <span className="font-semibold">{sale.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items Table */}
            <div className="py-2 border-b-2 border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[11px] mb-1.5 pb-1 border-b border-slate-200">
                <span>ITEM / QTY</span>
                <span>TOTAL</span>
              </div>

              <div className="space-y-2">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="text-[11px] leading-snug">
                    <div className="font-semibold truncate">{item.productName}</div>
                    <div className="flex justify-between text-slate-600">
                      <span>
                        {item.quantity} x {settings.currencySymbol}{item.unitPrice.toFixed(2)}
                        {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                      </span>
                      <span className="font-bold text-slate-900">
                        {settings.currencySymbol}{item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 space-y-1 text-[11px] border-b-2 border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>{settings.currencySymbol}{sale.subtotal.toFixed(2)}</span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span>-{settings.currencySymbol}{sale.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-600">Tax ({sale.taxRate}%)</span>
                <span>{settings.currencySymbol}{sale.taxAmount.toFixed(2)}</span>
              </div>

              {sale.isCardPricing && sale.cardSurchargeAmount > 0 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Card Surcharge</span>
                  <span>+{settings.currencySymbol}{sale.cardSurchargeAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-slate-300 text-slate-950">
                <span>TOTAL DUE</span>
                <span>{settings.currencySymbol}{sale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Payment Method</span>
                <span className="uppercase">{sale.payment.method}</span>
              </div>

              {sale.payment.cashTendered !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Cash Tendered</span>
                    <span>{settings.currencySymbol}{sale.payment.cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 bg-slate-100 px-1 py-0.5 rounded">
                    <span>CHANGE DUE</span>
                    <span>{settings.currencySymbol}{(sale.payment.cashChange || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              {sale.payment.cardLast4 && (
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Card Auth</span>
                  <span>APPROVED (****{sale.payment.cardLast4})</span>
                </div>
              )}
            </div>

            {/* Barcode & Footer Notice */}
            <div className="pt-3 text-center space-y-2">
              <div className="flex justify-center py-1">
                <BarcodeView value={sale.receiptNumber} height={38} showText={true} />
              </div>

              {settings.receiptHeaderMsg && (
                <p className="font-semibold text-[10px] text-slate-700 uppercase">
                  {settings.receiptHeaderMsg}
                </p>
              )}

              <p className="text-[9px] text-slate-500 font-sans leading-tight">
                {settings.receiptFooterMsg}
              </p>

              <p className="text-[8px] text-slate-400 font-sans pt-1">
                Powered by SleetPOS Offline Register • Local ID: {sale.id}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Receipt</span>
            </button>

            <button
              onClick={handleDone}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md active:scale-95"
            >
              <span>Done & Next Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
