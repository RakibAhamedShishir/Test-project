import React, { useState } from 'react';
import { 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  Printer, 
  Lock, 
  Unlock, 
  X, 
  Check, 
  AlertTriangle 
} from 'lucide-react';
import { Shift, StoreSettings, CashMovement } from '../types/pos';
import { playSound } from '../utils/sound';
import { saveDatabaseToExcel, getExcelBackupSettings } from '../utils/excelDatabase';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  setShift: React.Dispatch<React.SetStateAction<Shift>>;
  settings: StoreSettings;
  onPrintReport: (reportText: string, title: string) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  shift,
  setShift,
  settings,
  onPrintReport,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'cash_drop' | 'close'>('status');
  
  // Cash Drop / In state
  const [dropType, setDropType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [dropAmount, setDropAmount] = useState<string>('50.00');
  const [dropReason, setDropReason] = useState<string>('Cash drop to safe');

  // Shift Close state
  const [countedCash, setCountedCash] = useState<string>('');
  const [closeNote, setCloseNote] = useState<string>('');

  // Start new shift state
  const [newOpeningFloat, setNewOpeningFloat] = useState<string>('150.00');

  if (!isOpen) return null;

  const expectedCash = Number(
    (shift.openingFloat + shift.cashSales + shift.cashIn - shift.cashOut).toFixed(2)
  );

  const countedNum = parseFloat(countedCash) || 0;
  const discrepancy = Number((countedNum - expectedCash).toFixed(2));

  // Handle cash in / cash out
  const handleApplyCashMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(dropAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (dropType === 'cash_in') {
      setShift(prev => ({
        ...prev,
        cashIn: prev.cashIn + amt,
        expectedCash: prev.expectedCash + amt,
      }));
    } else {
      setShift(prev => ({
        ...prev,
        cashOut: prev.cashOut + amt,
        expectedCash: prev.expectedCash - amt,
      }));
    }

    playSound.drawerKick();
    setActiveTab('status');
  };

  // Handle Close Shift & Print Z-Report
  const handleCloseShift = () => {
    const finalShift: Shift = {
      ...shift,
      closedAt: new Date().toISOString(),
      actualCashCounted: countedNum,
      cashDiscrepancy: discrepancy,
      note: closeNote,
      isClosed: true,
    };

    setShift(finalShift);
    playSound.saleChime();

    // Generate Z-Report
    const zReport = `
========================================
           ${settings.storeName}
        OFFICIAL SHIFT Z-REPORT
========================================
Shift #:         #${shift.shiftNumber}
Cashier:         ${shift.cashierName}
Opened:          ${new Date(shift.openedAt).toLocaleString()}
Closed:          ${new Date().toLocaleString()}
----------------------------------------
Opening Float:   ${settings.currencySymbol}${shift.openingFloat.toFixed(2)}
Cash Sales:      ${settings.currencySymbol}${shift.cashSales.toFixed(2)}
Card Sales:      ${settings.currencySymbol}${shift.cardSales.toFixed(2)}
Total Sales:     ${settings.currencySymbol}${shift.totalSales.toFixed(2)}
----------------------------------------
Cash Added (In): +${settings.currencySymbol}${shift.cashIn.toFixed(2)}
Cash Drops(Out): -${settings.currencySymbol}${shift.cashOut.toFixed(2)}
----------------------------------------
EXPECTED CASH:   ${settings.currencySymbol}${expectedCash.toFixed(2)}
ACTUAL COUNTED:  ${settings.currencySymbol}${countedNum.toFixed(2)}
OVER / SHORT:    ${discrepancy >= 0 ? '+' : ''}${settings.currencySymbol}${discrepancy.toFixed(2)}
========================================
Shift Status: CLOSED & BALANCED
========================================
`;

    onPrintReport(zReport, `Z-Report Shift #${shift.shiftNumber}`);

    // Auto-update Excel backup on shift close
    try {
      const backupConfig = getExcelBackupSettings();
      if (backupConfig.backupOnShiftClose) {
        saveDatabaseToExcel({ silent: true, isDailyAuto: true }).catch(() => {});
      }
    } catch {}

    onClose();
  };

  // Print Mid-Shift X-Report
  const handlePrintXReport = () => {
    const xReport = `
========================================
           ${settings.storeName}
        MID-SHIFT X-REPORT (SNAPSHOT)
========================================
Shift #:         #${shift.shiftNumber}
Cashier:         ${shift.cashierName}
Opened:          ${new Date(shift.openedAt).toLocaleString()}
Snapshot Time:   ${new Date().toLocaleString()}
----------------------------------------
Opening Float:   ${settings.currencySymbol}${shift.openingFloat.toFixed(2)}
Cash Sales:      ${settings.currencySymbol}${shift.cashSales.toFixed(2)}
Card Sales:      ${settings.currencySymbol}${shift.cardSales.toFixed(2)}
TOTAL SALES:     ${settings.currencySymbol}${shift.totalSales.toFixed(2)}
----------------------------------------
Cash In:         +${settings.currencySymbol}${shift.cashIn.toFixed(2)}
Cash Out:        -${settings.currencySymbol}${shift.cashOut.toFixed(2)}
----------------------------------------
CURRENT IN DRAWER:${settings.currencySymbol}${expectedCash.toFixed(2)}
========================================
`;
    playSound.tap();
    onPrintReport(xReport, `X-Report Shift #${shift.shiftNumber}`);
  };

  // Open a new shift
  const handleStartNewShift = () => {
    const float = parseFloat(newOpeningFloat) || 150.0;
    const nextShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNumber: shift.shiftNumber + 1,
      cashierName: settings.cashierName,
      openedAt: new Date().toISOString(),
      openingFloat: float,
      cashSales: 0,
      cardSales: 0,
      otherSales: 0,
      totalSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: float,
      isClosed: false,
    };
    setShift(nextShift);
    playSound.tap();
    setActiveTab('status');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-slate-800/80 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-white text-base">
              Shift #{shift.shiftNumber}
            </h3>
            <span
              className={`text-xs font-medium ${
                shift.isClosed ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {shift.isClosed ? 'Closed' : 'Active'}
            </span>
          </div>

          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        {!shift.isClosed && (
          <div className="flex border-b border-slate-800/80 bg-slate-950/60 p-1 text-xs">
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'status' ? 'bg-slate-800 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Drawer Overview
            </button>
            <button
              onClick={() => setActiveTab('cash_drop')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'cash_drop' ? 'bg-slate-800 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cash In / Out
            </button>
            <button
              onClick={() => {
                setActiveTab('close');
                setCountedCash(expectedCash.toFixed(2));
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'close' ? 'bg-slate-800 text-rose-300 font-semibold shadow-xs' : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              End Shift (Z-Report)
            </button>
          </div>
        )}

        {/* Tab 1: Shift Status / Overview */}
        {activeTab === 'status' && !shift.isClosed && (
          <div className="p-5 space-y-4">
            {/* Big Drawer Balance Card */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">
                  Expected Cash In Drawer
                </div>
                <div className="text-3xl font-black text-white font-mono tracking-tight mt-1">
                  {settings.currencySymbol}{expectedCash.toFixed(2)}
                </div>
              </div>
              <button
                onClick={() => playSound.drawerKick()}
                title="Test trigger cash drawer pulse"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 rounded-lg border border-slate-800 transition-colors"
              >
                Test Kick Drawer
              </button>
            </div>

            {/* Financial Details Table */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Opening Float:</span>
                <span className="text-slate-200">
                  {settings.currencySymbol}{shift.openingFloat.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Cash Sales:</span>
                <span className="text-slate-200 font-semibold">
                  +{settings.currencySymbol}{shift.cashSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Card Sales:</span>
                <span className="text-slate-200">
                  {settings.currencySymbol}{shift.cardSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Cash Dropped / Payouts:</span>
                <span className="text-rose-400 font-semibold">
                  -{settings.currencySymbol}{shift.cashOut.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white">
                <span>Total Shift Revenue:</span>
                <span>{settings.currencySymbol}{shift.totalSales.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handlePrintXReport}
                className="flex-1 py-2.5 px-3 bg-slate-950 hover:bg-slate-800 rounded-xl text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Mid-Shift X-Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Cash In / Out (Drop) */}
        {activeTab === 'cash_drop' && !shift.isClosed && (
          <form onSubmit={handleApplyCashMovement} className="p-5 space-y-4 text-xs">
            <div>
              <label className="font-medium text-slate-400 block mb-1.5">Action Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDropType('cash_out')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    dropType === 'cash_out'
                      ? 'bg-rose-950/60 text-rose-300 border-rose-800/80 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4 text-rose-400" />
                  <span>Cash Out (Drop)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDropType('cash_in')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    dropType === 'cash_in'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 font-semibold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>Cash In (Float)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-400 block mb-1">
                Amount ({settings.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={dropAmount}
                onChange={(e) => setDropAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-lg font-bold text-white focus:outline-none focus:border-slate-600 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Reason / Note:</label>
              <input
                type="text"
                required
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="e.g. Midday safe drop, bread delivery cash payment"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-bold shadow-md"
              >
                Confirm Cash Movement
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: End Shift (Z-Report) */}
        {activeTab === 'close' && !shift.isClosed && (
          <div className="p-5 space-y-4 text-xs">
            <div className="bg-rose-950/30 border border-rose-800/40 p-3 rounded-xl">
              <div className="font-bold text-rose-300 text-sm mb-1">Shift Close & Z-Report</div>
              <p className="text-slate-400 leading-relaxed">
                Count the physical cash in the drawer and enter it below. The system will calculate any over/short discrepancy and print the official Z-Report.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-400 block text-[11px]">System Expected Cash:</span>
                <span className="text-xl font-extrabold text-white">
                  {settings.currencySymbol}{expectedCash.toFixed(2)}
                </span>
              </div>

              <div className={`p-3 border rounded-xl ${
                discrepancy === 0
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-700 text-amber-300'
              }`}>
                <span className="block text-[11px]">Discrepancy (Over/Short):</span>
                <span className="text-xl font-extrabold">
                  {discrepancy >= 0 ? '+' : ''}{settings.currencySymbol}{discrepancy.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Actual Physical Cash Counted ({settings.currencySymbol}):
              </label>
              <input
                type="number"
                step="0.01"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xl font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Shift Notes:</label>
              <input
                type="text"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="All registers balanced, shift hand-off clean."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-white font-bold shadow-lg"
              >
                Close Shift & Print Z-Report
              </button>
            </div>
          </div>
        )}

        {/* State when Shift is ALREADY Closed: Prompt to Open New Shift */}
        {shift.isClosed && (
          <div className="p-5 space-y-4 text-xs text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-bold text-base text-white">Shift #{shift.shiftNumber} is Closed</h4>
              <p className="text-slate-400 mt-1">
                Closed on {new Date(shift.closedAt || '').toLocaleString()} by {shift.cashierName}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl max-w-xs mx-auto text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Sales:</span>
                <span className="font-bold text-white">{settings.currencySymbol}{shift.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Counted Cash:</span>
                <span className="font-bold text-emerald-400">{settings.currencySymbol}{(shift.actualCashCounted || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Variance:</span>
                <span className="font-bold text-amber-400">{settings.currencySymbol}{(shift.cashDiscrepancy || 0).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 max-w-xs mx-auto text-left">
              <label className="font-semibold text-slate-300 block mb-1">
                New Shift Opening Cash Float:
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newOpeningFloat}
                  onChange={(e) => setNewOpeningFloat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-base font-bold text-white"
                />
                <button
                  onClick={handleStartNewShift}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shrink-0 flex items-center gap-1"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Start Shift</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
