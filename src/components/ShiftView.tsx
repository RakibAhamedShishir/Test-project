import React, { useState } from 'react';
import { 
  Coins, 
  ArrowDownRight, 
  ArrowUpRight, 
  Printer, 
  Lock, 
  Unlock, 
  Check, 
  AlertTriangle,
  History,
  RotateCcw,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { Shift, StoreSettings } from '../types/pos';
import { playSound } from '../utils/sound';
import { saveDatabaseToExcel, getExcelBackupSettings } from '../utils/excelDatabase';

interface ShiftViewProps {
  currentShift: Shift;
  setCurrentShift: React.Dispatch<React.SetStateAction<Shift>>;
  settings: StoreSettings;
  onPrintReport?: (reportText: string, title: string) => void;
}

export const ShiftView: React.FC<ShiftViewProps> = ({
  currentShift: shift,
  setCurrentShift: setShift,
  settings,
  onPrintReport,
}) => {
  const [activeActionTab, setActiveActionTab] = useState<'overview' | 'cash_movement' | 'close'>('overview');
  
  // Cash Drop / In state
  const [dropType, setDropType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [dropAmount, setDropAmount] = useState<string>('50.00');
  const [dropReason, setDropReason] = useState<string>('Cash drop to safe');

  // Shift Close state
  const [countedCash, setCountedCash] = useState<string>('');
  const [closeNote, setCloseNote] = useState<string>('');

  // Start new shift state
  const [newOpeningFloat, setNewOpeningFloat] = useState<string>('150.00');

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
    setActiveActionTab('overview');
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

    if (onPrintReport) {
      onPrintReport(zReport, `Z-Report Shift #${shift.shiftNumber}`);
    }

    // Auto-update Excel backup on shift close
    try {
      const backupConfig = getExcelBackupSettings();
      if (backupConfig.backupOnShiftClose) {
        saveDatabaseToExcel({ silent: true, isDailyAuto: true }).catch(() => {});
      }
    } catch {}

    setActiveActionTab('overview');
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
    if (onPrintReport) {
      onPrintReport(xReport, `X-Report Shift #${shift.shiftNumber}`);
    }
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
    setCountedCash('');
    setCloseNote('');
    playSound.saleChime();
    setActiveActionTab('overview');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-slate-300" />
              <span>Shift #{shift.shiftNumber}</span>
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-md font-medium border ${
                shift.isClosed
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {shift.isClosed ? 'Closed' : 'Active Shift'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cashier: <strong className="text-slate-200">{shift.cashierName}</strong> · Started {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(shift.openedAt).toLocaleDateString()})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!shift.isClosed && (
            <>
              {/* Mid-Shift X-Report */}
              <button
                onClick={handlePrintXReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-medium rounded-xl text-slate-300 hover:text-white transition-colors active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print X-Report</span>
              </button>

              {/* Pop Drawer */}
              <button
                onClick={() => playSound.drawerKick()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-medium rounded-xl text-slate-300 hover:text-white transition-colors active:scale-95"
              >
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span>Kick Drawer</span>
              </button>
            </>
          )}

          {/* Segmented View Switch */}
          <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveActionTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeActionTab === 'overview'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            {!shift.isClosed && (
              <>
                <button
                  onClick={() => setActiveActionTab('cash_movement')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeActionTab === 'cash_movement'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cash Drop / In
                </button>
                <button
                  onClick={() => setActiveActionTab('close')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeActionTab === 'close'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  End Shift & Balance
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards: Shift Cash & Drawer Balance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Expected in Drawer */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Expected in Drawer</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{expectedCash.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Float + Cash Sales + In - Out
          </div>
        </div>

        {/* Opening Float */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Opening Float</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{shift.openingFloat.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Initial drawer starting cash
          </div>
        </div>

        {/* Cash Sales */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Cash Sales</div>
          <div className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">
            {settings.currencySymbol}{shift.cashSales.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500">
            Card: {settings.currencySymbol}{shift.cardSales.toFixed(2)}
          </div>
        </div>

        {/* Net Cash Movement */}
        <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-xl space-y-1 shadow-xs">
          <div className="text-xs text-slate-400 font-medium">Cash Drops & In</div>
          <div className="text-xs space-y-1 pt-1 font-mono">
            <div className="flex justify-between">
              <span className="text-emerald-400 font-sans">+ Cash Added:</span>
              <span className="font-semibold text-emerald-300">+{settings.currencySymbol}{shift.cashIn.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-rose-400 font-sans">- Drops / Payouts:</span>
              <span className="font-semibold text-rose-300">-{settings.currencySymbol}{shift.cashOut.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Pane depending on selected action tab */}
      {activeActionTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Shift Details Breakdown */}
          <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
            <h3 className="font-semibold text-sm text-white border-b border-slate-800/80 pb-2">
              Drawer Reconciliation Ledger
            </h3>

            <div className="divide-y divide-slate-800/60 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">Opening Starting Float</span>
                <span className="font-mono font-semibold text-slate-200">
                  {settings.currencySymbol}{shift.openingFloat.toFixed(2)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">Total Cash Tendered (Sales)</span>
                <span className="font-mono font-semibold text-emerald-400">
                  +{settings.currencySymbol}{shift.cashSales.toFixed(2)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">Credit / Debit Card Sales (Settled via Terminal)</span>
                <span className="font-mono font-semibold text-slate-300">
                  {settings.currencySymbol}{shift.cardSales.toFixed(2)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">Manual Cash In (Petty cash / additions)</span>
                <span className="font-mono font-semibold text-emerald-400">
                  +{settings.currencySymbol}{shift.cashIn.toFixed(2)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-400">Safe Drops & Drawer Payouts</span>
                <span className="font-mono font-semibold text-rose-400">
                  -{settings.currencySymbol}{shift.cashOut.toFixed(2)}
                </span>
              </div>

              <div className="py-3 flex justify-between items-baseline font-bold text-sm border-t border-slate-700/80">
                <span className="text-white">Current Cash Expected in Till</span>
                <span className="font-mono text-xl text-white">
                  {settings.currencySymbol}{expectedCash.toFixed(2)}
                </span>
              </div>
            </div>

            {shift.isClosed && (
              <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Counted Cash at Close:</span>
                  <span className="font-mono font-bold text-white">
                    {settings.currencySymbol}{(shift.actualCashCounted || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Discrepancy (Over / Short):</span>
                  <span className={`font-mono font-bold ${(shift.cashDiscrepancy || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {(shift.cashDiscrepancy || 0) >= 0 ? '+' : ''}{settings.currencySymbol}{(shift.cashDiscrepancy || 0).toFixed(2)}
                  </span>
                </div>
                {shift.note && (
                  <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    Note: {shift.note}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Box: Start New Shift or Quick Actions */}
          <div className="bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-4 flex flex-col justify-between">
            {shift.isClosed ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-white mb-1">Open Next Shift</h3>
                  <p className="text-xs text-slate-400">
                    Shift #{shift.shiftNumber} is closed. Enter opening float to start Shift #{shift.shiftNumber + 1}.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Opening Float Cash ({settings.currencySymbol}):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOpeningFloat}
                    onChange={(e) => setNewOpeningFloat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>

                <button
                  onClick={handleStartNewShift}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors active:scale-95"
                >
                  Open Shift #{shift.shiftNumber + 1}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-white border-b border-slate-800/80 pb-2">
                  Shift Operations
                </h3>

                <button
                  onClick={() => setActiveActionTab('cash_movement')}
                  className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded-xl transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Record Safe Drop</div>
                      <div className="text-[11px] text-slate-400">Transfer excess cash to store safe</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveActionTab('cash_movement')}
                  className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded-xl transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Add Cash (Paid In)</div>
                      <div className="text-[11px] text-slate-400">Replenish change or coins</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveActionTab('close')}
                  className="w-full py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left rounded-xl transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">End Shift (Z-Report)</div>
                      <div className="text-[11px] text-slate-400">Count till & finalize shift</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500">
              Shift tracking ensures cashier accountability and provides official Z-Reports for store accounting.
            </div>
          </div>
        </div>
      )}

      {/* Cash Movement Form Tab */}
      {activeActionTab === 'cash_movement' && !shift.isClosed && (
        <div className="max-w-xl mx-auto w-full bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="font-semibold text-sm text-white">Record Cash Movement (Drop / In)</h3>
            <button
              onClick={() => setActiveActionTab('overview')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleApplyCashMovement} className="space-y-4 text-xs">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setDropType('cash_out')}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  dropType === 'cash_out'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cash Out (Safe Drop)
              </button>
              <button
                type="button"
                onClick={() => setDropType('cash_in')}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                  dropType === 'cash_in'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cash In (Paid In)
              </button>
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Amount ({settings.currencySymbol}):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={dropAmount}
                onChange={(e) => setDropAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-base focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Reason / Note:
              </label>
              <input
                type="text"
                required
                value={dropReason}
                onChange={(e) => setDropReason(e.target.value)}
                placeholder="e.g. Mid-day safe drop, Till coin restock"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveActionTab('overview')}
                className="flex-1 py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl font-medium text-slate-300 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-white transition-colors"
              >
                Record Movement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* End Shift & Count Cash Tab */}
      {activeActionTab === 'close' && !shift.isClosed && (
        <div className="max-w-xl mx-auto w-full bg-slate-900/70 border border-slate-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="font-semibold text-sm text-white">Final Drawer Balancing (Z-Report)</h3>
              <p className="text-xs text-slate-400">Count physical bills & coins in the drawer</p>
            </div>
            <button
              onClick={() => setActiveActionTab('overview')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">System Expected Cash:</span>
            <span className="font-mono font-bold text-white text-base">
              {settings.currencySymbol}{expectedCash.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Actual Cash Counted in Till ({settings.currencySymbol}):
              </label>
              <input
                type="number"
                step="0.01"
                autoFocus
                placeholder="0.00"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xl focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            {countedCash && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                discrepancy === 0
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : discrepancy > 0
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                <span>Discrepancy (Over / Short):</span>
                <span className="font-mono font-bold text-sm">
                  {discrepancy >= 0 ? '+' : ''}{settings.currencySymbol}{discrepancy.toFixed(2)}
                </span>
              </div>
            )}

            <div>
              <label className="text-slate-400 font-medium block mb-1">
                Closing Note (Optional):
              </label>
              <input
                type="text"
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="e.g. Drawer balanced, petty cash verified"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveActionTab('overview')}
                className="flex-1 py-2.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl font-medium text-slate-300 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                disabled={!countedCash}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 font-bold rounded-xl text-white transition-colors"
              >
                Confirm Close & Print Z-Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
