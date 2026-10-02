import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, X, Delete, ArrowRight, ShieldCheck } from 'lucide-react';
import { playSound } from '../utils/sound';

interface InventoryAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const InventoryAuthModal: React.FC<InventoryAuthModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen]);

  // Handle keyboard inputs
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleVerify(pin);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length >= 6) return;
    playSound.tap();
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      handleVerify(nextPin);
    }
  };

  const handleBackspace = () => {
    playSound.tap();
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    playSound.tap();
    setPin('');
    setErrorMsg('');
  };

  const handleVerify = (codeToVerify: string) => {
    if (codeToVerify === '1111') {
      playSound.tap();
      onSuccess();
    } else {
      playSound.errorTone();
      setErrorMsg('Incorrect password. Access denied.');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div
        className={`bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col items-center select-none transition-transform duration-200 ${
          isShaking ? 'translate-x-[-8px] animate-bounce' : ''
        }`}
      >
        {/* Top Icon */}
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 mb-3 shadow-inner">
          <Lock className="w-6 h-6 stroke-[1.8]" />
        </div>

        <h3 className="font-bold text-base text-white">Inventory Locked</h3>
        <p className="text-xs text-slate-400 text-center mt-1">
          Enter password to access product catalog & inventory
        </p>

        {/* PIN Indicators */}
        <div className="flex items-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => {
            const hasVal = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  hasVal
                    ? 'bg-white scale-110 shadow-sm'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg ? (
          <div className="text-xs font-medium text-rose-400 mb-2 h-4">{errorMsg}</div>
        ) : (
          <div className="text-[11px] text-slate-500 mb-2 h-4">Type on keyboard or use keypad</div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-base font-semibold text-white shadow-xs border border-slate-700/70 transition-all active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-xs font-medium text-slate-400 border border-slate-800 transition-all active:scale-95 flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-base font-semibold text-white shadow-xs border border-slate-700/70 transition-all active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>

        {/* Cancel button */}
        <div className="w-full flex gap-2 mt-4 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700/60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
