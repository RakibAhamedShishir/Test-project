import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Barcode as BarcodeIcon, 
  Camera, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  PauseCircle, 
  RotateCcw, 
  CreditCard, 
  Percent, 
  Check, 
  AlertTriangle,
  Tag,
  Sparkles,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Product, CartItem, StoreSettings, Customer, HeldSale } from '../types/pos';
import { playSound } from '../utils/sound';
import { OutOfStockAlertData } from './OutOfStockModal';

interface RegisterViewProps {
  products: Product[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  settings: StoreSettings;
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  onOpenPaymentModal: () => void;
  onOpenCameraScanner: () => void;
  onHoldSale: (title?: string) => void;
  heldSalesCount: number;
  onOpenHeldSales: () => void;
  isCardPricing: boolean;
  setIsCardPricing: (val: boolean) => void;
  orderDiscountPercent: number;
  setOrderDiscountPercent: (val: number) => void;
  onUnrecognizedBarcode?: (code: string) => void;
  onOpenRefundModal?: () => void;
  onShowOutOfStockAlert?: (data: OutOfStockAlertData) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  products,
  cart,
  setCart,
  settings,
  customers,
  selectedCustomer,
  setSelectedCustomer,
  onOpenPaymentModal,
  onOpenCameraScanner,
  onHoldSale,
  heldSalesCount,
  onOpenHeldSales,
  isCardPricing,
  setIsCardPricing,
  orderDiscountPercent,
  setOrderDiscountPercent,
  onUnrecognizedBarcode,
  onOpenRefundModal,
  onShowOutOfStockAlert,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  
  // Custom item state
  const [customName, setCustomName] = useState('Open Ring Item');
  const [customPrice, setCustomPrice] = useState('5.00');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...cats];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // Add product to cart helper with Out of Stock checks
  const addToCart = (product: Product, qty: number = 1) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    const currentQty = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    // Check if product is completely out of stock or if requested quantity exceeds available stock
    if (product.stock <= 0 || currentQty + qty > product.stock) {
      playSound.errorTone();
      if (onShowOutOfStockAlert) {
        onShowOutOfStockAlert({
          product,
          availableStock: product.stock,
          currentCartQty: currentQty,
        });
      }
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + qty,
        };
        playSound.doubleBeep();
        return next;
      } else {
        playSound.scanBeep();
        return [...prev, { product, quantity: qty }];
      }
    });
  };

  // Handle direct barcode search enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim();
      if (!code) return;

      // Look for exact barcode match
      const exactMatch = products.find(
        (p) => p.barcode.toLowerCase() === code.toLowerCase() || p.sku.toLowerCase() === code.toLowerCase()
      );

      if (exactMatch) {
        addToCart(exactMatch, 1);
        setSearchQuery('');
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0], 1);
        setSearchQuery('');
      } else {
        playSound.errorTone();
        if (onUnrecognizedBarcode) {
          onUnrecognizedBarcode(code);
          setSearchQuery('');
        }
      }
    }
  };

  // Cart item modifications with stock validation
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeCartItem(index);
      return;
    }

    const item = cart[index];
    if (item && newQty > item.product.stock) {
      playSound.errorTone();
      if (onShowOutOfStockAlert) {
        onShowOutOfStockAlert({
          product: item.product,
          availableStock: item.product.stock,
          currentCartQty: item.quantity,
        });
      }
      return;
    }

    setCart((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
    playSound.tap();
  };

  const removeCartItem = (index: number) => {
    playSound.tap();
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    playSound.tap();
    setCart([]);
    setOrderDiscountPercent(0);
  };

  // Add custom unlisted item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const customProduct: Product = {
      id: `custom-${Date.now()}`,
      name: customName || 'Custom Item',
      sku: 'CUSTOM-RING',
      barcode: `OPEN-${Date.now().toString().slice(-6)}`,
      category: 'Open Ring',
      costPrice: 0,
      price: priceNum,
      stock: 999,
      lowStockThreshold: 0,
      unit: 'pcs',
      colorTag: '#64748b',
      taxable: true,
      isActive: true,
    };

    addToCart(customProduct, 1);
    setShowCustomItemModal(false);
    setCustomName('Open Ring Item');
    setCustomPrice('5.00');
  };

  // Cart financial calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.customPrice ?? item.product.price;
      const discount = item.discountPercent ? (price * item.discountPercent) / 100 : 0;
      return acc + (price - discount) * item.quantity;
    }, 0);
  }, [cart]);

  const orderDiscountAmount = (subtotal * orderDiscountPercent) / 100;
  const discountedSubtotal = Math.max(0, subtotal - orderDiscountAmount);

  const taxAmount = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!item.product.taxable) return acc;
      const price = item.customPrice ?? item.product.price;
      const discount = item.discountPercent ? (price * item.discountPercent) / 100 : 0;
      const itemSubtotal = (price - discount) * item.quantity;
      // Pro-rate order discount on taxable items
      const effectiveSubtotal = orderDiscountPercent > 0 ? itemSubtotal * (1 - orderDiscountPercent / 100) : itemSubtotal;
      return acc + effectiveSubtotal * (settings.defaultTaxRate / 100);
    }, 0);
  }, [cart, orderDiscountPercent, settings.defaultTaxRate]);

  const baseGrandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));
  const cardSurcharge = isCardPricing && settings.dualPricingEnabled
    ? Number((baseGrandTotal * (settings.cardSurchargePercent / 100)).toFixed(2))
    : 0;
  const currentTotal = Number((baseGrandTotal + cardSurcharge).toFixed(2));
  const totalItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Keyboard shortcut listener for checkout (F12 or Space when not typing in input)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'F12' || (e.key === ' ' && !isInput && cart.length > 0)) {
        if (cart.length > 0) {
          e.preventDefault();
          onOpenPaymentModal();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        if (cart.length > 0) {
          e.preventDefault();
          onHoldSale();
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        onOpenCameraScanner();
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenRefundModal?.();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [cart, onOpenPaymentModal, onHoldSale, onOpenCameraScanner, onOpenRefundModal]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950 text-slate-100">
      
      {/* =========================================
          LEFT / CENTER SECTION: PRODUCTS & SCANNING
          ========================================= */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-900/60 overflow-hidden">
        
        {/* Top Control Bar: Search & Action triggers */}
        <div className="p-3 bg-slate-900 border-b border-slate-800/80 space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Search / Barcode Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products, SKU, or scan barcode (Enter adds)... [F2]"
                className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors shadow-inner"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white p-0.5"
                >
                  ✕
                </button>
              ) : (
                <BarcodeIcon className="w-4 h-4 text-slate-600 absolute right-3.5 top-3 pointer-events-none" />
              )}
            </div>

            {/* Camera Scan Button */}
            <button
              onClick={onOpenCameraScanner}
              title="Open camera barcode scanner [F9]"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              <Camera className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {/* Custom / Open Ring button */}
            <button
              onClick={() => setShowCustomItemModal(true)}
              title="Add custom unlisted item"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Custom</span>
            </button>

            {/* Refund / Return Button */}
            {onOpenRefundModal && (
              <button
                onClick={onOpenRefundModal}
                title="Process customer refund or return [F10]"
                className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-300 transition-colors active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span className="hidden sm:inline">Refund</span>
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    playSound.tap();
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-slate-950/30">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Search className="w-10 h-10 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="font-medium text-sm text-slate-300">No products found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching another name or scanning a barcode.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredProducts.map((product) => {
                const isLowStock = product.stock <= product.lowStockThreshold;
                const isOutOfStock = product.stock <= 0;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product, 1)}
                    className={`flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] select-none cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-900/40 border-rose-900/40 hover:border-rose-600/60 hover:bg-rose-950/20'
                        : 'bg-slate-900/70 hover:bg-slate-850/90 hover:border-slate-700/80 border-slate-800/70 shadow-xs'
                    }`}
                    title={isOutOfStock ? 'Item is out of stock - click for details' : undefined}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate">{product.category}</span>
                        {isOutOfStock ? (
                          <span className="text-rose-400 font-medium text-[11px]">Out</span>
                        ) : isLowStock ? (
                          <span className="text-amber-400 font-medium text-[11px]">{product.stock} {product.unit}</span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">{product.stock} {product.unit}</span>
                        )}
                      </div>

                      <div className="font-medium text-sm text-slate-100 line-clamp-2 mt-1 leading-snug">
                        {product.name}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[80px]">
                        {product.sku}
                      </span>
                      <span className="text-base font-bold text-white tracking-tight">
                        {settings.currencySymbol}{product.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          RIGHT SECTION: REGISTER CART & TICKET
          ========================================= */}
      <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 flex flex-col bg-slate-900 border-l border-slate-800">
        
        {/* Ticket Header & Customer Selector */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white tracking-tight">
              Current Ticket
            </span>
            {cart.length > 0 && (
              <span className="text-xs text-slate-400 font-mono">
                ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </div>

          {/* Customer Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate max-w-[110px]">
                {selectedCustomer ? selectedCustomer.name : 'Walk-in'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showCustomerDropdown && (
              <div className="absolute right-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-40 py-1 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Select Customer (Loyalty)
                </div>
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c.id === 'cust-walkin' ? null : c);
                      setShowCustomerDropdown(false);
                      playSound.tap();
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.name}</div>
                      {c.phone && <div className="text-[10px] text-slate-400">{c.phone}</div>}
                    </div>
                    {c.points > 0 && (
                      <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800">
                        {c.points} pts
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-[160px] md:min-h-0 bg-slate-950/20">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <BarcodeIcon className="w-10 h-10 text-slate-700 mb-2 stroke-[1.5]" />
              <p className="font-medium text-sm text-slate-300">Ticket is empty</p>
              <p className="text-xs text-slate-500 max-w-[200px] mt-1">
                Scan barcode or select an item on the left.
              </p>
            </div>
          ) : (
            cart.map((item, index) => {
              const unitPrice = item.customPrice ?? item.product.price;
              const itemTotal = unitPrice * item.quantity;

              return (
                <div
                  key={`${item.product.id}-${index}`}
                  className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-colors hover:border-slate-700/80"
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-xs text-white truncate">
                      {item.product.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {settings.currencySymbol}{unitPrice.toFixed(2)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/90">
                    <button
                      onClick={() => updateQuantity(index, item.quantity - 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 active:scale-95 transition-colors"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(index, item.quantity + 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-850 active:scale-95 transition-colors"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Item Subtotal & Delete */}
                  <div className="text-right min-w-[65px] pl-1">
                    <div className="font-bold text-xs text-white font-mono">
                      {settings.currencySymbol}{itemTotal.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeCartItem(index)}
                      className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors mt-0.5"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Summary & Pricing Breakdown */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          
          {/* Dual Pricing Toggle (Cash vs Card) */}
          {settings.dualPricingEnabled && (
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => { setIsCardPricing(false); playSound.tap(); }}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
                  !isCardPricing ? 'bg-slate-800 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cash Price
              </button>
              <button
                onClick={() => { setIsCardPricing(true); playSound.tap(); }}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
                  isCardPricing ? 'bg-slate-800 text-white font-semibold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Card (+{settings.cardSurchargePercent}%)
              </button>
            </div>
          )}

          {/* Subtotals & Taxes */}
          <div className="space-y-1.5 text-xs text-slate-400 pt-0.5">
            <div className="flex justify-between">
              <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
              <span className="text-slate-200 font-mono">{settings.currencySymbol}{subtotal.toFixed(2)}</span>
            </div>

            {/* Discount line */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDiscountModal(true)}
                className="text-xs flex items-center gap-1.5 font-medium transition-colors text-sky-500 hover:text-sky-400 dark:text-sky-400 dark:hover:text-sky-300"
              >
                <Percent className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span className="hover:underline underline-offset-2">
                  {orderDiscountPercent > 0 ? `Discount (${orderDiscountPercent}%)` : 'Add discount'}
                </span>
              </button>
              {orderDiscountPercent > 0 && (
                <span className="text-emerald-400 font-mono font-medium">
                  -{settings.currencySymbol}{orderDiscountAmount.toFixed(2)}
                </span>
              )}
            </div>

            {/* Tax */}
            <div className="flex justify-between">
              <span>Tax ({settings.defaultTaxRate}%)</span>
              <span className="text-slate-200 font-mono">{settings.currencySymbol}{taxAmount.toFixed(2)}</span>
            </div>

            {/* Card Surcharge if active */}
            {isCardPricing && cardSurcharge > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Card surcharge</span>
                <span className="font-mono">+{settings.currencySymbol}{cardSurcharge.toFixed(2)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="pt-2.5 mt-1 border-t border-slate-800/80 flex justify-between items-baseline">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total</span>
              <span className="text-3xl font-black text-white tracking-tight font-mono">
                {settings.currencySymbol}{currentTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="space-y-2 pt-1">
            <button
              onClick={onOpenPaymentModal}
              disabled={cart.length === 0}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-200" />
                <span>Pay / Charge</span>
                <span className="text-xs opacity-75 font-normal">[F12]</span>
              </div>
              <span className="text-base font-black font-mono">
                {settings.currencySymbol}{currentTotal.toFixed(2)}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onHoldSale()}
                disabled={cart.length === 0}
                title="Park ticket on hold [F8]"
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 font-medium text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Hold (F8)</span>
              </button>

              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-400 hover:text-rose-400 font-medium text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          ORDER DISCOUNT MODAL
          ========================================= */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-3">Apply Order Discount</h3>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[5, 10, 15, 20].map((pct) => (
                <button
                  key={pct}
                  onClick={() => {
                    setOrderDiscountPercent(pct);
                    setShowDiscountModal(false);
                    playSound.tap();
                  }}
                  className={`py-2 rounded-lg font-bold text-xs border ${
                    orderDiscountPercent === pct
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {pct}% OFF
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOrderDiscountPercent(0);
                  setShowDiscountModal(false);
                  playSound.tap();
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300"
              >
                Remove Discount
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          CUSTOM ITEM / OPEN RING MODAL
          ========================================= */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-3">Open Ring / Custom Item</h3>
            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Item Description:
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Daily Newspaper, Ice Bag"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Unit Price ({settings.currencySymbol}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="5.00"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-lg font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white shadow-md"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
