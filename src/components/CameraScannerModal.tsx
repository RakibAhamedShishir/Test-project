import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Barcode as BarcodeIcon, AlertCircle, Sparkles } from 'lucide-react';
import { Product } from '../types/pos';
import { playSound } from '../utils/sound';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
  products: Product[];
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  products,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported by this browser. Use quick barcodes or hardware scanner.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check if native BarcodeDetector API is supported
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });

        const scanInterval = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const detected = await barcodeDetector.detect(videoRef.current);
            if (detected && detected.length > 0) {
              const code = detected[0].rawValue;
              if (code) {
                playSound.scanBeep();
                onBarcodeDetected(code);
                clearInterval(scanInterval);
                onClose();
              }
            }
          } catch {}
        }, 200);

        return () => clearInterval(scanInterval);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Camera permission was denied or camera is not available. You can use the Quick Test Barcode Picker below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm md:text-base">Barcode Camera Scanner</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="text-center p-6 space-y-2">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 max-w-xs mx-auto">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Target Scan Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-36 border-2 border-dashed border-cyan-400/80 rounded-xl relative shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  {/* Laser Line Animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce" />
                </div>
              </div>
              <div className="absolute bottom-2 text-center text-[11px] bg-slate-950/80 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">
                Align barcode within target box
              </div>
            </>
          )}
        </div>

        {/* Quick Test Barcode Bar (for rapid demo / simulation without physical items) */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Click to Simulate Real Scan:</span>
            </div>
            <span className="text-[10px] text-slate-400">Instant barcode trigger</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
            {products.slice(0, 8).map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => {
                  playSound.scanBeep();
                  onBarcodeDetected(prod.barcode);
                  onClose();
                }}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500 hover:bg-cyan-950/30 text-left transition-all text-xs"
              >
                <div className="truncate mr-1">
                  <div className="font-semibold text-white truncate text-[11px]">{prod.name}</div>
                  <div className="font-mono text-[9px] text-cyan-400">{prod.barcode}</div>
                </div>
                <div className="font-bold text-[11px] text-emerald-400 shrink-0">
                  ${prod.price.toFixed(2)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
