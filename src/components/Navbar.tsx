import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Clock, 
  Settings as SettingsIcon, 
  Users, 
  Volume2, 
  VolumeX, 
  Barcode, 
  WifiOff, 
  Tv, 
  Coins,
  ChevronRight,
  Maximize2,
  Lock,
  Printer
} from 'lucide-react';
import { Shift, StoreSettings } from '../types/pos';
import { playSound } from '../utils/sound';
import { loadScannerInfo, loadPrinterInfo } from '../utils/hardwareManager';

export type ActiveTab = 'register' | 'inventory' | 'reports' | 'shift' | 'customers' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: StoreSettings;
  setSettings: (settings: StoreSettings) => void;
  currentShift: Shift;
  onOpenShiftModal: () => void;
  onToggleCustomerDisplay: () => void;
  heldSalesCount: number;
  onOpenHeldSales: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  setSettings,
  currentShift,
  onOpenShiftModal,
  onToggleCustomerDisplay,
  heldSalesCount,
  onOpenHeldSales,
}) => {
  const [time, setTime] = useState<string>('');
  const [scannerConnected, setScannerConnected] = useState<boolean>(() => loadScannerInfo().status === 'connected');
  const [printerReady, setPrinterReady] = useState<boolean>(() => loadPrinterInfo().status === 'ready');

  useEffect(() => {
    const handleScannerUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setScannerConnected(customEvent.detail.status === 'connected');
      }
    };
    const handlePrinterUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setPrinterReady(customEvent.detail.status === 'ready');
      }
    };

    window.addEventListener('pos:hardware-scanner-update', handleScannerUpdate);
    window.addEventListener('pos:hardware-printer-update', handlePrinterUpdate);
    return () => {
      window.removeEventListener('pos:hardware-scanner-update', handleScannerUpdate);
      window.removeEventListener('pos:hardware-printer-update', handlePrinterUpdate);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const nextState = !settings.soundEnabled;
    setSettings({ ...settings, soundEnabled: nextState });
    if (nextState) playSound.tap();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 text-white select-none sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 py-2 md:px-5">
        {/* Brand & Store Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white text-sm shadow-xs">
              S
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-bold tracking-tight text-white text-sm">SLEET</span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider">POS</span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal truncate max-w-[130px] md:max-w-none">
                {settings.storeName}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800/80">
            {/* Shift pill button */}
            <button
              onClick={onOpenShiftModal}
              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${currentShift.isClosed ? 'bg-rose-500' : 'bg-emerald-400'}`} />
              <span>{currentShift.isClosed ? 'Shift Closed' : `Shift #${currentShift.shiftNumber}`}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Minimalist Segmented Control) */}
        <nav className="flex items-center gap-0.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => { setActiveTab('register'); playSound.tap(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'register'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>

          <button
            onClick={() => { setActiveTab('inventory'); playSound.tap(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'inventory'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory</span>
            <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </button>

          <button
            onClick={() => { setActiveTab('reports'); playSound.tap(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => { setActiveTab('shift'); playSound.tap(); }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'shift'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Shift</span>
          </button>

          <button
            onClick={() => { setActiveTab('customers'); playSound.tap(); }}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'customers'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => { setActiveTab('settings'); playSound.tap(); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
            title="Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </nav>

        {/* Right Tools & Status */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Hardware Peripherals Status Badges */}
          <button
            type="button"
            onClick={() => { setActiveTab('settings'); playSound.tap(); }}
            title={`Hardware: Scanner ${scannerConnected ? 'Connected' : 'Not Connected'} | Printer ${printerReady ? 'Connected' : 'Not Connected'}. Click to manage.`}
            className="hidden lg:flex items-center gap-2 bg-slate-950/70 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded-lg text-[11px] text-slate-300 transition-colors cursor-pointer"
          >
            <span className={`flex items-center gap-1 ${scannerConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
              <Barcode className="w-3.5 h-3.5" />
              <span className={`w-1.5 h-1.5 rounded-full ${scannerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-medium hidden xl:inline">
                {scannerConnected ? 'Scanner' : 'No Scanner'}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span className={`flex items-center gap-1 ${printerReady ? 'text-sky-400' : 'text-slate-500'}`}>
              <Printer className="w-3.5 h-3.5" />
              <span className={`w-1.5 h-1.5 rounded-full ${printerReady ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-medium hidden xl:inline">
                {printerReady ? 'Printer' : 'No Printer'}
              </span>
            </span>
          </button>

          {/* Held tickets indicator if any */}
          {heldSalesCount > 0 && (
            <button
              onClick={onOpenHeldSales}
              className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-amber-500/20 transition-colors"
              title="Parked sales"
            >
              <span>Held</span>
              <span className="bg-amber-400 text-slate-950 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {heldSalesCount}
              </span>
            </button>
          )}

          {/* Customer Facing Screen Toggle */}
          <button
            onClick={onToggleCustomerDisplay}
            title="Open Customer-Facing Dual Screen"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors hidden md:block"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={settings.soundEnabled ? 'Mute Audio Effects' : 'Enable Audio Effects'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors hidden md:block"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Live Clock */}
          <div className="text-right pl-2 hidden xl:block border-l border-slate-800/80">
            <div className="text-xs font-mono font-medium text-slate-300">
              {time}
            </div>
            <div className="text-[10px] text-slate-400">
              {settings.cashierName.split(' ')[0]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
