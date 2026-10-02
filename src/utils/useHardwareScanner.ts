import { useEffect, useRef } from 'react';
import { loadScannerInfo, saveScannerInfo, BarcodeScannerInfo } from './hardwareManager';

interface UseHardwareScannerProps {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Global Keyboard Hook for Physical USB / Bluetooth Barcode Scanners.
 * Retail scanners emit keys at ~10-40ms intervals and finish with Enter.
 */
export function useHardwareScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 60,
  enabled = true,
}: UseHardwareScannerProps) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const scanStartTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in standard inputs unless it's very fast scanner speed
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Enter key marks end of scan in standard barcode scanners
      if (e.key === 'Enter') {
        const scannedCode = bufferRef.current.trim();
        const codeLength = scannedCode.length;
        const totalDuration = currentTime - scanStartTimeRef.current;
        const avgBurst = codeLength > 1 ? Math.round(totalDuration / codeLength) : 0;
        
        bufferRef.current = '';

        if (scannedCode.length >= minChars) {
          // If scanner finished, prevent form submission or newline
          e.preventDefault();
          e.stopPropagation();

          // Update hardware detection record
          try {
            const currentInfo = loadScannerInfo();
            const updatedInfo: BarcodeScannerInfo = {
              ...currentInfo,
              status: 'connected',
              lastScannedBarcode: scannedCode,
              lastScannedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              totalScans: (currentInfo.totalScans || 0) + 1,
              avgBurstMs: avgBurst > 0 ? avgBurst : 24,
            };
            saveScannerInfo(updatedInfo);
            // Dispatch custom window event so all UI components update in real-time
            window.dispatchEvent(new CustomEvent('pos:hardware-scanner-update', { detail: updatedInfo }));
          } catch {
            // ignore
          }

          onScan(scannedCode);
        }
        return;
      }

      // If key is a printable character
      if (e.key.length === 1) {
        // If elapsed time between keystrokes is too large, reset buffer (human typing is usually >100ms)
        // Exception: start of scan
        if (diff > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }

        if (bufferRef.current.length === 0) {
          scanStartTimeRef.current = currentTime;
        }

        // If user is actively typing in a normal text input (like searching or editing name),
        // we only capture if keystrokes are coming in at superhuman scanner speed (< 50ms)
        if (isInput && diff > 50 && bufferRef.current.length === 0) {
          return;
        }

        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, minChars, maxIntervalMs, enabled]);
}
