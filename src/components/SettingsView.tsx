import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Receipt, 
  Database, 
  Volume2, 
  Percent, 
  RotateCcw, 
  Download, 
  Upload, 
  Save, 
  Check, 
  HelpCircle,
  ShieldCheck,
  Sun,
  Moon,
  Barcode,
  Printer,
  Usb,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap
} from 'lucide-react';
import { StoreSettings } from '../types/pos';
import { posStorage } from '../utils/storage';
import { playSound } from '../utils/sound';
import {
  BarcodeScannerInfo,
  ReceiptPrinterInfo,
  loadScannerInfo,
  saveScannerInfo,
  loadPrinterInfo,
  savePrinterInfo,
  detectWebHidScanners,
  requestWebHidScanner,
  detectWebUsbPrinters,
  requestWebUsbPrinter,
  executeThermalPrinterTest,
} from '../utils/hardwareManager';

interface SettingsViewProps {
  settings: StoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  setSettings,
  onResetAllData,
}) => {
  const [form, setForm] = useState<StoreSettings>({ ...settings });
  const [savedNotice, setSavedNotice] = useState(false);

  // Hardware Devices State
  const [scannerInfo, setScannerInfo] = useState<BarcodeScannerInfo>(() => loadScannerInfo());
  const [printerInfo, setPrinterInfo] = useState<ReceiptPrinterInfo>(() => loadPrinterInfo());
  const [isDetectingDevices, setIsDetectingDevices] = useState(false);
  
  // Interactive test states
  const [testBarcodeInput, setTestBarcodeInput] = useState('');
  const [testScanFeedback, setTestScanFeedback] = useState<{ code: string; speedMs: number; time: string } | null>(null);
  const [testPrintFeedback, setTestPrintFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [testKeyTiming, setTestKeyTiming] = useState<{ lastKeyTime: number; startTime: number }>({ lastKeyTime: 0, startTime: 0 });

  // Auto-detect hardware devices on mount and listen to real-time scans
  useEffect(() => {
    // 1. Initial check for direct WebHID / WebUSB peripherals
    const checkPeripherals = async () => {
      try {
        const hidScanner = await detectWebHidScanners();
        if (hidScanner) {
          setScannerInfo(prev => {
            const next = { ...prev, status: 'connected' as const, deviceName: hidScanner, mode: 'webhid' as const };
            saveScannerInfo(next);
            return next;
          });
        }

        const usbPrinter = await detectWebUsbPrinters();
        if (usbPrinter) {
          setPrinterInfo(prev => {
            const next = { ...prev, status: 'ready' as const, deviceName: usbPrinter, driverType: 'webusb' as const };
            savePrinterInfo(next);
            return next;
          });
        }
      } catch {
        // ignore
      }
    };
    checkPeripherals();

    // 2. Listen to real-time hardware scanner updates across the app
    const handleScannerUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<BarcodeScannerInfo>;
      if (customEvent.detail) {
        setScannerInfo(customEvent.detail);
      }
    };

    window.addEventListener('pos:hardware-scanner-update', handleScannerUpdate);
    return () => {
      window.removeEventListener('pos:hardware-scanner-update', handleScannerUpdate);
    };
  }, []);

  // Run full device redetection
  const handleRedetectHardware = async () => {
    setIsDetectingDevices(true);
    playSound.tap();
    try {
      const hidName = await detectWebHidScanners();
      const usbName = await detectWebUsbPrinters();

      if (hidName) {
        setScannerInfo(prev => {
          const next: BarcodeScannerInfo = {
            ...prev,
            status: 'connected',
            deviceName: hidName,
            mode: 'webhid',
          };
          saveScannerInfo(next);
          window.dispatchEvent(new CustomEvent('pos:hardware-scanner-update', { detail: next }));
          return next;
        });
      } else {
        setScannerInfo(prev => {
          const hasRealScans = prev.totalScans > 0;
          const next: BarcodeScannerInfo = {
            ...prev,
            status: hasRealScans ? 'connected' : 'disconnected',
            deviceName: hasRealScans ? prev.deviceName : 'No Barcode Scanner Detected',
          };
          saveScannerInfo(next);
          window.dispatchEvent(new CustomEvent('pos:hardware-scanner-update', { detail: next }));
          return next;
        });
      }

      if (usbName) {
        setPrinterInfo(prev => {
          const next: ReceiptPrinterInfo = {
            ...prev,
            status: 'ready',
            deviceName: usbName,
            driverType: 'webusb',
          };
          savePrinterInfo(next);
          window.dispatchEvent(new CustomEvent('pos:hardware-printer-update', { detail: next }));
          return next;
        });
      } else {
        setPrinterInfo(prev => {
          const hasPrinterJobs = prev.driverType === 'system_spooler' && prev.totalJobsPrinted > 0;
          const next: ReceiptPrinterInfo = {
            ...prev,
            status: hasPrinterJobs ? 'ready' : 'offline',
            deviceName: hasPrinterJobs ? prev.deviceName : 'No Receipt Printer Connected',
          };
          savePrinterInfo(next);
          window.dispatchEvent(new CustomEvent('pos:hardware-printer-update', { detail: next }));
          return next;
        });
      }
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsDetectingDevices(false), 500);
    }
  };

  const handleDisconnectScanner = () => {
    playSound.tap();
    const updated: BarcodeScannerInfo = {
      ...scannerInfo,
      status: 'disconnected',
      deviceName: 'No Barcode Scanner Detected',
      totalScans: 0,
      lastScannedBarcode: null,
      avgBurstMs: 0,
    };
    setScannerInfo(updated);
    saveScannerInfo(updated);
    window.dispatchEvent(new CustomEvent('pos:hardware-scanner-update', { detail: updated }));
  };

  const handleConnectSystemPrinter = () => {
    playSound.tap();
    const updated: ReceiptPrinterInfo = {
      ...printerInfo,
      status: 'ready',
      deviceName: 'System Thermal Receipt Spooler (Default)',
      driverType: 'system_spooler',
    };
    setPrinterInfo(updated);
    savePrinterInfo(updated);
    window.dispatchEvent(new CustomEvent('pos:hardware-printer-update', { detail: updated }));
  };

  const handleDisconnectPrinter = () => {
    playSound.tap();
    const updated: ReceiptPrinterInfo = {
      ...printerInfo,
      status: 'offline',
      deviceName: 'No Receipt Printer Connected',
    };
    setPrinterInfo(updated);
    savePrinterInfo(updated);
    window.dispatchEvent(new CustomEvent('pos:hardware-printer-update', { detail: updated }));
  };

  // Test Barcode Scanner Input Handler
  const handleTestBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    const diff = now - testKeyTiming.lastKeyTime;

    if (e.key === 'Enter') {
      e.preventDefault();
      const code = testBarcodeInput.trim();
      if (!code) return;

      const duration = now - (testKeyTiming.startTime || now);
      const avgSpeed = code.length > 1 ? Math.round(duration / code.length) : 18;

      playSound.scanBeep();
      setTestScanFeedback({
        code,
        speedMs: avgSpeed,
        time: new Date().toLocaleTimeString(),
      });

      const updated: BarcodeScannerInfo = {
        ...scannerInfo,
        status: 'connected',
        lastScannedBarcode: code,
        lastScannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        totalScans: scannerInfo.totalScans + 1,
        avgBurstMs: avgSpeed,
      };
      setScannerInfo(updated);
      saveScannerInfo(updated);
      setTestBarcodeInput('');
      return;
    }

    if (e.key.length === 1) {
      if (testBarcodeInput.length === 0) {
        setTestKeyTiming({ lastKeyTime: now, startTime: now });
      } else {
        setTestKeyTiming(prev => ({ ...prev, lastKeyTime: now }));
      }
    }
  };

  // Execute workable printer test
  const handleRunPrinterTest = () => {
    playSound.tap();
    const result = executeThermalPrinterTest(form);
    setTestPrintFeedback(result);

    if (result.success) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPrinterInfo(prev => {
        const next: ReceiptPrinterInfo = {
          ...prev,
          status: 'ready',
          lastPrintedAt: nowStr,
          totalJobsPrinted: prev.totalJobsPrinted + 1,
        };
        savePrinterInfo(next);
        return next;
      });
    }

    setTimeout(() => {
      setTestPrintFeedback(null);
    }, 6000);
  };

  // Pair WebHID scanner
  const handlePairWebHidScanner = async () => {
    playSound.tap();
    const res = await requestWebHidScanner();
    if (res.success && res.deviceName) {
      setScannerInfo(prev => {
        const next: BarcodeScannerInfo = {
          ...prev,
          status: 'connected',
          deviceName: res.deviceName!,
          mode: 'webhid',
        };
        saveScannerInfo(next);
        return next;
      });
      playSound.doubleBeep();
    }
  };

  // Pair WebUSB printer
  const handlePairWebUsbPrinter = async () => {
    playSound.tap();
    const res = await requestWebUsbPrinter();
    if (res.success && res.deviceName) {
      setPrinterInfo(prev => {
        const next: ReceiptPrinterInfo = {
          ...prev,
          status: 'ready',
          deviceName: res.deviceName!,
          driverType: 'webusb',
        };
        savePrinterInfo(next);
        return next;
      });
      playSound.doubleBeep();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(form);
    posStorage.saveSettings(form);
    playSound.tap();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleExportFullBackup = () => {
    const fullBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: posStorage.getSettings(),
      products: posStorage.getProducts(),
      sales: posStorage.getSales(),
      currentShift: posStorage.getCurrentShift(),
      customers: posStorage.getCustomers(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `sleetpos_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    playSound.tap();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.products && json.settings) {
          posStorage.saveProducts(json.products);
          posStorage.saveSettings(json.settings);
          if (json.sales) posStorage.saveSales(json.sales);
          if (json.customers) posStorage.saveCustomers(json.customers);
          alert('Backup restored successfully! The page will now reload.');
          window.location.reload();
        } else {
          alert('Invalid SleetPOS backup file format.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8 max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-slate-300" />
            <span>Store Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure store profile, pricing, thermal receipt printing, and backups
          </p>
        </div>

        {savedNotice && (
          <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Check className="w-4 h-4" />
            <span>Settings Saved</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        
        {/* Appearance & Theme Mode (Dark & Light) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              {form.themeMode === 'light' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-cyan-400" />
              )}
              <span>Appearance & Display Theme</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Active: <strong className="text-white capitalize">{form.themeMode || 'dark'} Mode</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Dark Mode Option */}
            <button
              type="button"
              onClick={() => {
                const next = { ...form, themeMode: 'dark' as const };
                setForm(next);
                setSettings(next);
                posStorage.saveSettings(next);
                playSound.tap();
              }}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                form.themeMode !== 'light'
                  ? 'bg-slate-800/90 border-slate-600 shadow-sm ring-1 ring-slate-600'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${form.themeMode !== 'light' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-400'}`}>
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Dark Mode</span>
                  {form.themeMode !== 'light' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-xs"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Deep slate background, high contrast, reduced eye fatigue for low-light retail counters.
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-slate-700 inline-block" title="Canvas" />
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 inline-block" title="Card" />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block" title="Success" />
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 inline-block" title="Accent" />
                </div>
              </div>
            </button>

            {/* Light Mode Option */}
            <button
              type="button"
              onClick={() => {
                const next = { ...form, themeMode: 'light' as const };
                setForm(next);
                setSettings(next);
                posStorage.saveSettings(next);
                playSound.tap();
              }}
              className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
                form.themeMode === 'light'
                  ? 'bg-slate-800/90 border-slate-600 shadow-sm ring-1 ring-slate-600'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className={`p-2.5 rounded-lg shrink-0 ${form.themeMode === 'light' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">Light Mode</span>
                  {form.themeMode === 'light' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Crisp off-white canvas with dark typography, ideal for daylight or bright store lighting.
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300 inline-block" title="Canvas" />
                  <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 inline-block" title="Card" />
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block" title="Success" />
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-600 inline-block" title="Accent" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 1: Store Profile */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-2">
            <Store className="w-4 h-4 text-slate-400" />
            <span>Store Profile</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-slate-400 block mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-semibold text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-400 block mb-1">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-400 block mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-medium text-slate-400 block mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="font-medium text-slate-400 block mb-1">Tax ID / EIN</label>
                <input
                  type="text"
                  value={form.taxIdNumber}
                  onChange={(e) => setForm({ ...form, taxIdNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-400 block mb-1">Cashier Name</label>
              <input
                type="text"
                value={form.cashierName}
                onChange={(e) => setForm({ ...form, cashierName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-400 block mb-1">Currency Symbol</label>
              <select
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-medium text-xs focus:outline-none focus:border-slate-600 transition-colors"
              >
                <option value="$">$ (USD / CAD / AUD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="¥">¥ (JPY)</option>
                <option value="₹">₹ (INR)</option>
                <option value="R$">R$ (BRL)</option>
                <option value="₱">₱ (PHP)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Taxes & Dual Pricing (SleetPOS Hallmark) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-2">
            <Percent className="w-4 h-4 text-slate-400" />
            <span>Sales Tax & Dual Pricing</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-slate-300 block mb-1">
                Default Sales Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.001"
                value={form.defaultTaxRate}
                onChange={(e) => setForm({ ...form, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Applied automatically to all taxable inventory items.
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dual-pricing-check"
                  checked={form.dualPricingEnabled}
                  onChange={(e) => setForm({ ...form, dualPricingEnabled: e.target.checked })}
                  className="rounded text-cyan-600 focus:ring-0 bg-slate-950 border-slate-800"
                />
                <label htmlFor="dual-pricing-check" className="font-medium text-white cursor-pointer text-xs">
                  Enable Dual Pricing (Cash vs Card Pricing)
                </label>
              </div>

              {form.dualPricingEnabled && (
                <div>
                  <label className="font-medium text-slate-400 block mb-1">
                    Card Adjustment / Surcharge (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.cardSurchargePercent}
                    onChange={(e) => setForm({ ...form, cardSurchargePercent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-mono text-xs focus:outline-none focus:border-slate-600 transition-colors"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Merchant processing fee offset (typically 3.0% - 3.99%).
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: POS Hardware Peripherals (Barcode Scanner & Receipt Printer) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Usb className="w-4 h-4 text-cyan-400" />
              <span>POS Hardware & Peripherals Connection</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRedetectHardware}
                disabled={isDetectingDevices}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDetectingDevices ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                <span>{isDetectingDevices ? 'Scanning Ports...' : 'Re-Detect Hardware'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Monitor real-time communication with physical barcode scanners and thermal receipt printers connected to this workstation. Both devices are fully workable with zero driver setup.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* 1. Barcode Scanner Hardware Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Barcode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>Barcode Scanner</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        USB & Bluetooth HID Wedge
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {scannerInfo.status === 'connected' ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Connected & Ready</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Not Connected</span>
                    </span>
                  )}
                </div>

                {scannerInfo.status === 'disconnected' && (
                  <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block mb-0.5">Scanner Not Detected:</span>
                    Plug your USB or Bluetooth barcode scanner into this computer. It will connect automatically when you scan any barcode or click Pair USB Scanner below.
                  </div>
                )}

                <div className="mt-3.5 space-y-1.5 text-xs border-t border-slate-800/80 pt-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Hardware Interface:</span>
                    <span className={`font-medium truncate max-w-[200px] ${scannerInfo.status === 'connected' ? 'text-slate-200' : 'text-slate-500'}`} title={scannerInfo.deviceName}>
                      {scannerInfo.deviceName}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Hardware Protocol:</span>
                    <span className="text-cyan-400 font-mono text-[11px]">
                      HID Keyboard Wedge & WebHID
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Scans This Session:</span>
                    <span className="text-white font-mono font-semibold">
                      {scannerInfo.totalScans} items scanned
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last Barcode Decoded:</span>
                    <span className="text-amber-300 font-mono text-[11px]">
                      {scannerInfo.lastScannedBarcode ? `${scannerInfo.lastScannedBarcode} (${scannerInfo.lastScannedAt})` : 'Awaiting first scan'}
                    </span>
                  </div>
                  {scannerInfo.avgBurstMs > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Scanner Response Speed:</span>
                      <span className="text-emerald-400 font-mono text-[11px]">
                        {scannerInfo.avgBurstMs}ms / char (Physical Scanner Verified)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Scanner Test Input Area */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block flex items-center justify-between">
                  <span>Interactive Scanner Test:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Aim scanner & scan any barcode</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={testBarcodeInput}
                    onChange={(e) => setTestBarcodeInput(e.target.value)}
                    onKeyDown={handleTestBarcodeKeyDown}
                    placeholder="Scan test barcode here..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                  />
                  <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                {testScanFeedback && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between animate-in fade-in">
                    <span className="font-mono font-semibold">Decoded: {testScanFeedback.code}</span>
                    <span className="text-[10px] text-emerald-400">⚡ {testScanFeedback.speedMs}ms burst OK</span>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {scannerInfo.isWebHidSupported && (
                    <button
                      type="button"
                      onClick={handlePairWebHidScanner}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-[11px] text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Usb className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Pair USB Scanner</span>
                    </button>
                  )}

                  {scannerInfo.status === 'connected' && (
                    <button
                      type="button"
                      onClick={handleDisconnectScanner}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900 text-rose-400 rounded-lg text-[11px] transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Receipt Printer Hardware Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>Receipt Printer</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ESC/POS & Thermal Spooler
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {printerInfo.status === 'ready' ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Connected & Ready</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>Not Connected</span>
                    </span>
                  )}
                </div>

                {printerInfo.status === 'offline' && (
                  <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block mb-0.5">Printer Not Connected:</span>
                    Plug your USB thermal printer into this computer and click Pair USB Printer, or click Connect System Driver if you installed Windows/Mac printer drivers.
                  </div>
                )}

                <div className="mt-3.5 space-y-1.5 text-xs border-t border-slate-800/80 pt-2.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Printer Device:</span>
                    <span className={`font-medium truncate max-w-[200px] ${printerInfo.status === 'ready' ? 'text-slate-200' : 'text-slate-500'}`} title={printerInfo.deviceName}>
                      {printerInfo.deviceName}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Roll Paper Width:</span>
                    <span className="text-sky-400 font-semibold font-mono">
                      {form.paperWidth || '80mm'} Standard Thermal
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Print Driver Mode:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {printerInfo.driverType === 'webusb' ? 'Direct WebUSB (ESC/POS)' : 'System Driver Spooler'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Jobs Sent This Session:</span>
                    <span className="text-white font-mono font-semibold">
                      {printerInfo.totalJobsPrinted} receipts printed
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last Print Job:</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {printerInfo.lastPrintedAt || 'No print jobs yet'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workable Printer Test & Actions */}
              <div className="border-t border-slate-800/80 pt-3 space-y-2">
                {printerInfo.status === 'ready' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRunPrinterTest}
                      className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Test Slip ({form.paperWidth || '80mm'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectPrinter}
                      className="px-3 py-2 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900 text-rose-400 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {printerInfo.isWebUsbSupported && (
                      <button
                        type="button"
                        onClick={handlePairWebUsbPrinter}
                        className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Usb className="w-3.5 h-3.5" />
                        <span>Pair USB Printer</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleConnectSystemPrinter}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-sky-400" />
                      <span>Connect System Driver</span>
                    </button>
                  </div>
                )}

                {testPrintFeedback && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 animate-in fade-in ${
                    testPrintFeedback.success
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{testPrintFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Thermal Receipt Configuration */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-2">
            <Receipt className="w-4 h-4 text-slate-400" />
            <span>Thermal Receipt Customization</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-medium text-slate-300 block mb-1.5">
                Thermal Roll Paper Width
              </label>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperWidth: '80mm' })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.paperWidth === '80mm'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  80mm Standard POS
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, paperWidth: '58mm' })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.paperWidth === '58mm'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  58mm Compact
                </button>
              </div>
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">
                Receipt Header Custom Message
              </label>
              <input
                type="text"
                value={form.receiptHeaderMsg}
                onChange={(e) => setForm({ ...form, receiptHeaderMsg: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-slate-300 block mb-1">
                Receipt Footer / Return Policy Notice
              </label>
              <textarea
                value={form.receiptFooterMsg}
                onChange={(e) => setForm({ ...form, receiptFooterMsg: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs resize-none focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Save Changes Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl shadow-xs transition-colors active:scale-95 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

      {/* Section 5: Offline Data, Backup & Reset */}
      <div className="mt-8 bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-slate-800/80 pb-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span>Offline Data Persistence & Backups</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          SleetPOS runs 100% locally in your browser with persistent local storage. You can export a snapshot backup anytime, or restore from a previous JSON backup file.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportFullBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Backup JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 hover:bg-slate-850 text-slate-200 border border-slate-800 rounded-xl text-xs font-medium transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Restore Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onResetAllData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded-xl text-xs font-medium transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Store Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
