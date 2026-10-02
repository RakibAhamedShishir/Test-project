import jsPDF from 'jspdf';
import { StoreSettings } from '../types/pos';
import { playSound } from './sound';

export interface BarcodeScannerInfo {
  status: 'connected' | 'disconnected';
  mode: 'hid_keyboard' | 'webhid' | 'webusb';
  deviceName: string;
  lastScannedBarcode: string | null;
  lastScannedAt: string | null;
  totalScans: number;
  avgBurstMs: number;
  isWebHidSupported: boolean;
}

export interface ReceiptPrinterInfo {
  status: 'ready' | 'offline';
  driverType: 'system_spooler' | 'webusb';
  deviceName: string;
  paperWidth: '80mm' | '58mm';
  lastPrintedAt: string | null;
  totalJobsPrinted: number;
  isWebUsbSupported: boolean;
}

const STORAGE_SCANNER_KEY = 'sleetpos_hw_scanner_info';
const STORAGE_PRINTER_KEY = 'sleetpos_hw_printer_info';

// Initial hardware states: Default to disconnected until real physical hardware is detected
export const initialScannerInfo: BarcodeScannerInfo = {
  status: 'disconnected',
  mode: 'hid_keyboard',
  deviceName: 'No Barcode Scanner Detected',
  lastScannedBarcode: null,
  lastScannedAt: null,
  totalScans: 0,
  avgBurstMs: 0,
  isWebHidSupported: typeof navigator !== 'undefined' && 'hid' in navigator,
};

export const initialPrinterInfo: ReceiptPrinterInfo = {
  status: 'offline',
  driverType: 'system_spooler',
  deviceName: 'No Receipt Printer Connected',
  paperWidth: '80mm',
  lastPrintedAt: null,
  totalJobsPrinted: 0,
  isWebUsbSupported: typeof navigator !== 'undefined' && 'usb' in navigator,
};

// Persistence helpers
export const loadScannerInfo = (): BarcodeScannerInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_SCANNER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Only persist connected if user actually has paired devices or scanned barcodes
      if (parsed.status === 'connected' && (parsed.totalScans > 0 || parsed.mode === 'webhid')) {
        return { ...initialScannerInfo, ...parsed };
      }
    }
  } catch {
    // fallback
  }
  return initialScannerInfo;
};

export const saveScannerInfo = (info: BarcodeScannerInfo) => {
  try {
    localStorage.setItem(STORAGE_SCANNER_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }
};

export const loadPrinterInfo = (): ReceiptPrinterInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_PRINTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Only persist ready if user actually paired a printer or executed test/jobs
      if (parsed.status === 'ready' && (parsed.totalJobsPrinted > 0 || parsed.driverType === 'webusb')) {
        return { ...initialPrinterInfo, ...parsed };
      }
    }
  } catch {
    // fallback
  }
  return initialPrinterInfo;
};

export const savePrinterInfo = (info: ReceiptPrinterInfo) => {
  try {
    localStorage.setItem(STORAGE_PRINTER_KEY, JSON.stringify(info));
  } catch {
    // ignore
  }
};

/**
 * Checks for connected WebHID barcode scanners
 */
export async function detectWebHidScanners(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !('hid' in navigator)) {
    return null;
  }
  try {
    const devices = await (navigator as any).hid.getDevices();
    if (devices && devices.length > 0) {
      const dev = devices[0];
      return dev.productName || `USB HID Scanner (${dev.vendorId.toString(16)}:${dev.productId.toString(16)})`;
    }
  } catch (err) {
    console.warn('WebHID device query error:', err);
  }
  return null;
}

/**
 * Requests pairing with a USB Barcode Scanner via WebHID API
 */
export async function requestWebHidScanner(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (typeof navigator === 'undefined' || !('hid' in navigator)) {
    return { success: false, error: 'WebHID API is not supported in this browser.' };
  }
  try {
    const devices = await (navigator as any).hid.requestDevice({ filters: [] });
    if (devices && devices.length > 0) {
      const dev = devices[0];
      const name = dev.productName || `USB Barcode Scanner (VID: ${dev.vendorId.toString(16).toUpperCase()})`;
      return { success: true, deviceName: name };
    }
    return { success: false, error: 'No device selected' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Pairing cancelled' };
  }
}

/**
 * Checks for connected WebUSB Thermal Printers
 */
export async function detectWebUsbPrinters(): Promise<string | null> {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    return null;
  }
  try {
    const devices = await (navigator as any).usb.getDevices();
    if (devices && devices.length > 0) {
      const dev = devices[0];
      return dev.productName || `USB Thermal Printer (VID: ${dev.vendorId.toString(16)})`;
    }
  } catch (err) {
    console.warn('WebUSB device query error:', err);
  }
  return null;
}

/**
 * Requests pairing with a USB Thermal Printer via WebUSB API
 */
export async function requestWebUsbPrinter(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    return { success: false, error: 'WebUSB API is not supported in this browser.' };
  }
  try {
    const navUsb = (navigator as any).usb;
    const device = await navUsb.requestDevice({
      filters: [{ classCode: 7 }],
    }).catch(async () => {
      return await navUsb.requestDevice({ filters: [] });
    });

    if (device) {
      const name = device.productName || `USB Thermal Printer (VID: ${device.vendorId.toString(16).toUpperCase()})`;
      return { success: true, deviceName: name };
    }
    return { success: false, error: 'No printer device selected' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Printer pairing cancelled' };
  }
}

/**
 * Execute real, workable thermal printer test print
 */
export function executeThermalPrinterTest(settings: StoreSettings): { success: boolean; message: string } {
  try {
    const printWidth = settings.paperWidth === '58mm' ? 58 : 80;
    const testHeight = 110;
    const margin = 4;
    const now = new Date();

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [printWidth, testHeight],
    });

    let y = 6;
    const lineHeight = 4;
    const dividerCount = printWidth === 58 ? 32 : 44;

    const printCentered = (text: string, currentY: number, isBold: boolean = false, size: number = 7.5) => {
      doc.setFont('courier', isBold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(0, 0, 0);
      doc.text(text, printWidth / 2, currentY, { align: 'center' });
    };

    const printRow = (label: string, value: string, currentY: number, isBold: boolean = false, size: number = 7) => {
      doc.setFont('courier', isBold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(0, 0, 0);
      doc.text(label, margin, currentY);
      doc.text(value, printWidth - margin, currentY, { align: 'right' });
    };

    const printDivider = (currentY: number, char: '-' | '=' = '-') => {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(char.repeat(dividerCount), printWidth / 2, currentY, { align: 'center' });
    };

    // Header
    printCentered(settings.storeName.toUpperCase(), y, true, 9.5);
    y += lineHeight + 1;

    printCentered('*** HARDWARE PRINTER TEST ***', y, true, 8);
    y += lineHeight;

    printDivider(y, '=');
    y += lineHeight;

    printCentered(`ROLL WIDTH: ${printWidth}mm THERMAL PAPER`, y, true, 7.5);
    y += lineHeight;

    printCentered(`STATUS: HARDWARE TEST SUCCESS`, y, false, 7);
    y += lineHeight;

    printCentered(`DATE: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, y, false, 6.5);
    y += lineHeight;

    printCentered(`TERMINAL: REG-01  |  SleetPOS v1.0`, y, false, 6.5);
    y += lineHeight;

    printDivider(y, '-');
    y += lineHeight;

    // Alignment test
    printRow('LEFT MARGIN TEST', 'RIGHT MARGIN', y, true, 6.5);
    y += lineHeight;

    printRow('CHAR SPACING CHECK', '1234567890', y, false, 6.5);
    y += lineHeight;

    printRow('CURRENCY SYMBOL', `${settings.currencySymbol} 100.00 OK`, y, false, 6.5);
    y += lineHeight;

    printRow('CUTTER TEST LINE', 'READY', y, false, 6.5);
    y += lineHeight;

    printDivider(y, '-');
    y += lineHeight;

    // Density check bar
    doc.setFillColor(0, 0, 0);
    doc.rect(margin, y, printWidth - margin * 2, 2.5, 'F');
    y += 5.5;

    printCentered('*** PRINTER TEST COMPLETE ***', y, true, 7.5);
    y += lineHeight;

    printCentered('✂ - - - - - [ TEAR / CUT HERE ] - - - - - ✂', y, false, 6);
    y += lineHeight;

    printDivider(y, '=');

    // Trigger Print Subsystem via hidden iframe
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.src = String(blobUrl);
    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(printFrame);
            URL.revokeObjectURL(String(blobUrl));
          } catch {
            // ignore
          }
        }, 60000);
      }, 250);
    };

    playSound.doubleBeep();
    return { success: true, message: `Test slip sent to ${printWidth}mm receipt printer!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to print test slip' };
  }
}
