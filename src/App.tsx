import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Product, 
  CartItem, 
  Sale, 
  Shift, 
  Customer, 
  StoreSettings, 
  HeldSale, 
  PaymentBreakdown,
  SaleItem
} from './types/pos';
import { posStorage, DEFAULT_SETTINGS } from './utils/storage';
import { playSound } from './utils/sound';
import { useHardwareScanner } from './utils/useHardwareScanner';

// Components
import { Navbar, ActiveTab } from './components/Navbar';
import { RegisterView } from './components/RegisterView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { ShiftModal } from './components/ShiftModal';
import { ShiftView } from './components/ShiftView';
import { CustomersView } from './components/CustomersView';
import { SettingsView } from './components/SettingsView';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CameraScannerModal } from './components/CameraScannerModal';
import { HeldSalesModal } from './components/HeldSalesModal';
import { CustomerFacingDisplay } from './components/CustomerFacingDisplay';
import { AddProductModal } from './components/AddProductModal';
import { RefundModal } from './components/RefundModal';
import { LowStockAlertModal, LowStockAlertItem } from './components/LowStockAlertModal';
import { OutOfStockModal, OutOfStockAlertData } from './components/OutOfStockModal';
import { InventoryAuthModal } from './components/InventoryAuthModal';
import { Lock, KeyRound } from 'lucide-react';

export default function App() {
  // 1. Persistent State
  const [settings, setSettings] = useState<StoreSettings>(() => posStorage.getSettings());
  const [products, setProducts] = useState<Product[]>(() => posStorage.getProducts());
  const [sales, setSales] = useState<Sale[]>(() => posStorage.getSales());
  const [currentShift, setCurrentShift] = useState<Shift>(() => posStorage.getCurrentShift());
  const [customers, setCustomers] = useState<Customer[]>(() => posStorage.getCustomers());
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => posStorage.getHeldSales());

  // 2. Active Session / Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('register');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCardPricing, setIsCardPricing] = useState<boolean>(false);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [isInventoryUnlocked, setIsInventoryUnlocked] = useState<boolean>(false);
  const [isInventoryAuthOpen, setIsInventoryAuthOpen] = useState<boolean>(false);

  // 3. Modals State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [currentReceiptSale, setCurrentReceiptSale] = useState<Sale | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isHeldSalesOpen, setIsHeldSalesOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isCustomerDisplayOpen, setIsCustomerDisplayOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [scannedNewBarcode, setScannedNewBarcode] = useState<string>('');
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isLowStockAlertOpen, setIsLowStockAlertOpen] = useState(false);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlertItem[]>([]);
  const [outOfStockAlert, setOutOfStockAlert] = useState<OutOfStockAlertData | null>(null);

  // 4. Barcode feedback banner notification
  const [scanNotification, setScanNotification] = useState<{ name: string; barcode: string } | null>(null);

  // Sync state to local storage automatically
  useEffect(() => {
    posStorage.saveSettings(settings);
  }, [settings]);

  // Synchronize display theme (Dark vs Light mode)
  useEffect(() => {
    const isLight = settings.themeMode === 'light';
    if (isLight) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [settings.themeMode]);

  useEffect(() => {
    posStorage.saveProducts(products);
  }, [products]);

  useEffect(() => {
    posStorage.saveSales(sales);
  }, [sales]);

  useEffect(() => {
    posStorage.saveCurrentShift(currentShift);
  }, [currentShift]);

  useEffect(() => {
    posStorage.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    posStorage.saveHeldSales(heldSales);
  }, [heldSales]);

  // Handle Barcode Scan (Common for both Hardware Scanner & Camera Scanner)
  const handleBarcodeScanned = useCallback((scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    // Search product in catalog
    const matchedProduct = products.find(
      (p) => p.barcode.toLowerCase() === cleanCode.toLowerCase() || p.sku.toLowerCase() === cleanCode.toLowerCase()
    );

    if (matchedProduct) {
      // Validate stock before adding or incrementing
      const existingItem = cart.find((item) => item.product.id === matchedProduct.id);
      const currentQty = existingItem ? existingItem.quantity : 0;

      if (matchedProduct.stock <= 0 || currentQty + 1 > matchedProduct.stock) {
        playSound.errorTone();
        setOutOfStockAlert({
          product: matchedProduct,
          availableStock: matchedProduct.stock,
          currentCartQty: currentQty,
        });
        return;
      }

      // Add or increment in cart
      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === matchedProduct.id);
        if (existingIndex > -1) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: next[existingIndex].quantity + 1,
          };
          playSound.doubleBeep();
          return next;
        } else {
          playSound.scanBeep();
          return [...prev, { product: matchedProduct, quantity: 1 }];
        }
      });

      // Switch to register view if currently elsewhere
      if (activeTab !== 'register') {
        setActiveTab('register');
      }

      // Flash scanner notification toast
      setScanNotification({ name: matchedProduct.name, barcode: matchedProduct.barcode });
      setTimeout(() => setScanNotification(null), 2500);
    } else {
      playSound.errorTone();
      // Scanned item not found in inventory: open add new product popup with barcode prefilled
      setScannedNewBarcode(cleanCode);
      setIsAddProductModalOpen(true);
    }
  }, [products, activeTab, cart]);

  // Global Hardware Scanner Listener (USB / Bluetooth HID)
  useHardwareScanner({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  // Tab Navigation with password check for inventory
  const handleSelectTab = useCallback((tab: ActiveTab) => {
    if (tab === 'inventory') {
      if (!isInventoryUnlocked) {
        setIsInventoryAuthOpen(true);
        return;
      }
    } else {
      setIsInventoryUnlocked(false);
    }
    setActiveTab(tab);
  }, [isInventoryUnlocked]);

  // Global Keyboard Navigation (F1: Register, F3: Inventory, F5: Reports, F6: Shift)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleSelectTab('register');
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleSelectTab('inventory');
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleSelectTab('reports');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setIsShiftModalOpen(true);
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleSelectTab('customers');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectTab]);

  // Cart Financials
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.customPrice ?? item.product.price;
      const discount = item.discountPercent ? (price * item.discountPercent) / 100 : 0;
      return acc + (price - discount) * item.quantity;
    }, 0);
  }, [cart]);

  const discountAmount = (subtotal * orderDiscountPercent) / 100;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const taxAmount = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!item.product.taxable) return acc;
      const price = item.customPrice ?? item.product.price;
      const discount = item.discountPercent ? (price * item.discountPercent) / 100 : 0;
      const itemSubtotal = (price - discount) * item.quantity;
      const effectiveSubtotal = orderDiscountPercent > 0 ? itemSubtotal * (1 - orderDiscountPercent / 100) : itemSubtotal;
      return acc + effectiveSubtotal * (settings.defaultTaxRate / 100);
    }, 0);
  }, [cart, orderDiscountPercent, settings.defaultTaxRate]);

  const baseGrandTotal = Number((discountedSubtotal + taxAmount).toFixed(2));
  const cardSurcharge = isCardPricing && settings.dualPricingEnabled
    ? Number((baseGrandTotal * (settings.cardSurchargePercent / 100)).toFixed(2))
    : 0;
  const grandTotal = Number((baseGrandTotal + cardSurcharge).toFixed(2));

  // Complete Sale Handler
  const handleCompleteSale = (
    payment: PaymentBreakdown,
    finalTotal: number,
    finalCardSurcharge: number
  ) => {
    const saleId = `sale-${Date.now()}`;
    const receiptNum = `R-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saleItems: SaleItem[] = cart.map((item) => {
      const price = item.customPrice ?? item.product.price;
      const discount = item.discountPercent ? (price * item.discountPercent) / 100 : 0;
      const itemSubtotal = Number(((price - discount) * item.quantity).toFixed(2));
      const effectiveSubtotal = orderDiscountPercent > 0 ? itemSubtotal * (1 - orderDiscountPercent / 100) : itemSubtotal;
      const itemTax = item.product.taxable ? Number((effectiveSubtotal * (settings.defaultTaxRate / 100)).toFixed(2)) : 0;

      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        barcode: item.product.barcode,
        category: item.product.category,
        costPrice: item.product.costPrice,
        unitPrice: price,
        quantity: item.quantity,
        discountPercent: item.discountPercent || orderDiscountPercent || 0,
        subtotal: itemSubtotal,
        tax: itemTax,
        total: Number((itemSubtotal + itemTax).toFixed(2)),
      };
    });

    const newSale: Sale = {
      id: saleId,
      receiptNumber: receiptNum,
      timestamp: new Date().toISOString(),
      items: saleItems,
      subtotal,
      taxRate: settings.defaultTaxRate,
      taxAmount,
      discountAmount,
      discountPercent: orderDiscountPercent,
      isCardPricing,
      cardSurchargeAmount: finalCardSurcharge,
      grandTotal: finalTotal,
      payment,
      cashierName: settings.cashierName,
      shiftId: currentShift.id,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
      status: 'completed',
      tamperHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };

    // 1. Update Inventory Stock in real-time & check for items hitting low stock threshold
    const hitLowStockItems: LowStockAlertItem[] = [];
    setProducts((prev) => {
      const updated = [...prev];
      cart.forEach((cartItem) => {
        const pIndex = updated.findIndex((p) => p.id === cartItem.product.id);
        if (pIndex > -1) {
          const currentProd = updated[pIndex];
          const newStock = Math.max(0, currentProd.stock - cartItem.quantity);
          if (newStock <= currentProd.lowStockThreshold) {
            hitLowStockItems.push({
              product: { ...currentProd, stock: newStock },
              newStock,
              threshold: currentProd.lowStockThreshold,
            });
          }
          updated[pIndex] = {
            ...currentProd,
            stock: newStock,
          };
        }
      });
      return updated;
    });

    if (hitLowStockItems.length > 0) {
      setLowStockAlerts(hitLowStockItems);
    } else {
      setLowStockAlerts([]);
    }

    // 2. Add to Sales records
    setSales((prev) => [newSale, ...prev]);

    // 3. Update Current Shift totals
    setCurrentShift((prev) => {
      const isCash = payment.method === 'cash';
      const isCard = payment.method === 'card';
      const isSplit = payment.method === 'split';

      const cashPortion = isCash ? finalTotal : isSplit ? (payment.splitCashAmount || 0) : 0;
      const cardPortion = isCard ? finalTotal : isSplit ? (payment.splitCardAmount || 0) : 0;

      return {
        ...prev,
        cashSales: Number((prev.cashSales + cashPortion).toFixed(2)),
        cardSales: Number((prev.cardSales + cardPortion).toFixed(2)),
        totalSales: Number((prev.totalSales + finalTotal).toFixed(2)),
        expectedCash: Number((prev.expectedCash + cashPortion).toFixed(2)),
      };
    });

    // 4. Update Customer loyalty points if selected
    if (selectedCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === selectedCustomer.id
            ? {
                ...c,
                points: c.points + Math.floor(finalTotal),
                totalSpent: Number((c.totalSpent + finalTotal).toFixed(2)),
                visitCount: c.visitCount + 1,
              }
            : c
        )
      );
    }

    // 5. Open receipt modal & clear active cart
    setIsPaymentOpen(false);
    setCurrentReceiptSale(newSale);
    setIsReceiptOpen(true);
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscountPercent(0);
  };

  // Close receipt and trigger low stock alert if any sold items hit target limit
  const handleCloseReceipt = () => {
    setIsReceiptOpen(false);
    if (lowStockAlerts.length > 0) {
      setIsLowStockAlertOpen(true);
      playSound.errorTone();
    }
  };

  const handleNewSaleFromReceipt = () => {
    setIsReceiptOpen(false);
    setActiveTab('register');
    if (lowStockAlerts.length > 0) {
      setIsLowStockAlertOpen(true);
      playSound.errorTone();
    }
  };

  // Park / Hold Current Sale
  const handleHoldSale = (title?: string) => {
    if (cart.length === 0) return;
    const held: HeldSale = {
      id: `held-${Date.now()}`,
      title: title || `Order #${Math.floor(100 + Math.random() * 900)} (${cart.length} items)`,
      createdAt: new Date().toISOString(),
      items: [...cart],
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      discountPercent: orderDiscountPercent,
      isCardPricing,
    };

    setHeldSales((prev) => [held, ...prev]);
    setCart([]);
    setSelectedCustomer(null);
    setOrderDiscountPercent(0);
    playSound.tap();
  };

  // Restore Parked Sale
  const handleRestoreHeldSale = (heldSale: HeldSale) => {
    setCart(heldSale.items);
    if (heldSale.customerId) {
      const cust = customers.find((c) => c.id === heldSale.customerId);
      setSelectedCustomer(cust || null);
    }
    setOrderDiscountPercent(heldSale.discountPercent);
    setIsCardPricing(heldSale.isCardPricing);

    // Remove from held sales
    setHeldSales((prev) => prev.filter((h) => h.id !== heldSale.id));
    setActiveTab('register');
    playSound.tap();
  };

  // Add new product from scanned modal
  const handleAddNewProductFromScan = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    if (activeTab === 'register') {
      setCart((prev) => [...prev, { product: newProd, quantity: 1 }]);
      playSound.scanBeep();
      setScanNotification({ name: newProd.name, barcode: newProd.barcode });
      setTimeout(() => setScanNotification(null), 2500);
    }
  };

  // Delete Held Sale
  const handleDeleteHeldSale = (id: string) => {
    setHeldSales((prev) => prev.filter((h) => h.id !== id));
  };

  // Process and record refund
  const handleConfirmRefund = (saleToRefund: Sale, reason: string) => {
    // 1. Mark sale as refunded
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleToRefund.id
          ? {
              ...s,
              status: 'refunded',
              refundReason: reason,
              refundTimestamp: new Date().toISOString(),
              refundAmount: s.grandTotal,
            }
          : s
      )
    );

    // 2. Restock products back to inventory
    setProducts((prev) => {
      const updated = [...prev];
      saleToRefund.items.forEach((saleItem) => {
        const idx = updated.findIndex((p) => p.id === saleItem.productId);
        if (idx > -1) {
          updated[idx] = {
            ...updated[idx],
            stock: updated[idx].stock + saleItem.quantity,
          };
        }
      });
      return updated;
    });

    // 3. Balance current shift drawer
    setCurrentShift((prev) => {
      const isCash = saleToRefund.payment.method === 'cash';
      const isCard = saleToRefund.payment.method === 'card';
      const isSplit = saleToRefund.payment.method === 'split';

      const cashDeduction = isCash
        ? saleToRefund.grandTotal
        : isSplit
        ? (saleToRefund.payment.splitCashAmount || 0)
        : 0;
      const cardDeduction = isCard
        ? saleToRefund.grandTotal
        : isSplit
        ? (saleToRefund.payment.splitCardAmount || 0)
        : 0;

      return {
        ...prev,
        cashSales: Math.max(0, Number((prev.cashSales - cashDeduction).toFixed(2))),
        cardSales: Math.max(0, Number((prev.cardSales - cardDeduction).toFixed(2))),
        totalSales: Math.max(0, Number((prev.totalSales - saleToRefund.grandTotal).toFixed(2))),
        expectedCash: Math.max(0, Number((prev.expectedCash - cashDeduction).toFixed(2))),
      };
    });

    // 4. Open receipt modal with updated refunded receipt
    const refundedSale: Sale = {
      ...saleToRefund,
      status: 'refunded',
      refundReason: reason,
      refundTimestamp: new Date().toISOString(),
      refundAmount: saleToRefund.grandTotal,
    };
    setCurrentReceiptSale(refundedSale);
    setIsReceiptOpen(true);
    playSound.tap();
  };

  // Reprint Receipt trigger from ledger
  const handleReprintReceipt = (sale: Sale) => {
    setCurrentReceiptSale(sale);
    setIsReceiptOpen(true);
  };

  // Print arbitrary report text (X-Report or Z-Report)
  const handlePrintReport = (reportText: string) => {
    const printWindow = window.open('', '', 'width=350,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>POS Report</title>
            <style>
              body { font-family: monospace; font-size: 11px; padding: 10px; margin: 0; white-space: pre-wrap; }
            </style>
          </head>
          <body>${reportText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } else {
      window.print();
    }
  };

  // Reset to initial demo store data
  const handleResetAllData = () => {
    if (confirm('Reset all inventory, sales, and shifts back to fresh factory demo data?')) {
      posStorage.resetToSampleData();
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100">
      
      {/* Top Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        settings={settings}
        setSettings={setSettings}
        currentShift={currentShift}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onToggleCustomerDisplay={() => setIsCustomerDisplayOpen(true)}
        heldSalesCount={heldSales.length}
        onOpenHeldSales={() => setIsHeldSalesOpen(true)}
      />

      {/* Floating Barcode Scan Feedback Toast */}
      {scanNotification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700/80 text-white px-4 py-2 rounded-full font-medium text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="text-emerald-400 font-bold">⚡ Scanned:</span>
          <span className="font-semibold">{scanNotification.name}</span>
          <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
            {scanNotification.barcode}
          </span>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'register' && (
          <RegisterView
            products={products}
            cart={cart}
            setCart={setCart}
            settings={settings}
            customers={customers}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            onOpenPaymentModal={() => setIsPaymentOpen(true)}
            onOpenCameraScanner={() => setIsCameraScannerOpen(true)}
            onHoldSale={handleHoldSale}
            heldSalesCount={heldSales.length}
            onOpenHeldSales={() => setIsHeldSalesOpen(true)}
            isCardPricing={isCardPricing}
            setIsCardPricing={setIsCardPricing}
            orderDiscountPercent={orderDiscountPercent}
            setOrderDiscountPercent={setOrderDiscountPercent}
            onUnrecognizedBarcode={(code) => {
              setScannedNewBarcode(code);
              setIsAddProductModalOpen(true);
            }}
            onOpenRefundModal={() => setIsRefundModalOpen(true)}
            onShowOutOfStockAlert={(data) => setOutOfStockAlert(data)}
          />
        )}

        {activeTab === 'inventory' && (
          isInventoryUnlocked ? (
            <InventoryView
              products={products}
              setProducts={setProducts}
              settings={settings}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                <Lock className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Inventory is Protected</h2>
              <p className="text-xs text-slate-400 mb-5">Enter manager password (1111) to access the product catalog.</p>
              <button
                onClick={() => setIsInventoryAuthOpen(true)}
                className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-700/70 shadow-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-slate-300" />
                <span>Enter Password (1111)</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'reports' && (
          <ReportsView
            sales={sales}
            setSales={setSales}
            products={products}
            setProducts={setProducts}
            settings={settings}
            onReprintReceipt={handleReprintReceipt}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            setCustomers={setCustomers}
            settings={settings}
            sales={sales}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            onResetAllData={handleResetAllData}
          />
        )}

        {activeTab === 'shift' && (
          <ShiftView
            currentShift={currentShift}
            setCurrentShift={setCurrentShift}
            settings={settings}
          />
        )}
      </main>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        subtotal={subtotal}
        taxAmount={taxAmount}
        discountAmount={discountAmount}
        grandTotal={baseGrandTotal}
        settings={settings}
        isCardPricing={isCardPricing}
        setIsCardPricing={setIsCardPricing}
        onCompleteSale={handleCompleteSale}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={handleCloseReceipt}
        sale={currentReceiptSale}
        settings={settings}
        onNewSale={handleNewSaleFromReceipt}
      />

      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onBarcodeDetected={handleBarcodeScanned}
        products={products}
      />

      <HeldSalesModal
        isOpen={isHeldSalesOpen}
        onClose={() => setIsHeldSalesOpen(false)}
        heldSales={heldSales}
        onRestoreHeldSale={handleRestoreHeldSale}
        onDeleteHeldSale={handleDeleteHeldSale}
        settings={settings}
      />

      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        shift={currentShift}
        setShift={setCurrentShift}
        settings={settings}
        onPrintReport={handlePrintReport}
      />

      <CustomerFacingDisplay
        isOpen={isCustomerDisplayOpen}
        onClose={() => setIsCustomerDisplayOpen(false)}
        cart={cart}
        settings={settings}
        subtotal={subtotal}
        taxAmount={taxAmount}
        discountAmount={discountAmount}
        grandTotal={grandTotal}
        isCardPricing={isCardPricing}
      />

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddNewProductFromScan}
        settings={settings}
        initialBarcode={scannedNewBarcode}
      />

      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        sales={sales}
        onConfirmRefund={handleConfirmRefund}
        settings={settings}
      />

      <LowStockAlertModal
        isOpen={isLowStockAlertOpen}
        onClose={() => {
          setIsLowStockAlertOpen(false);
          setLowStockAlerts([]);
        }}
        lowStockItems={lowStockAlerts}
        currencySymbol={settings.currencySymbol}
        onGoToInventory={() => {
          setIsLowStockAlertOpen(false);
          setLowStockAlerts([]);
          handleSelectTab('inventory');
        }}
      />

      <OutOfStockModal
        isOpen={!!outOfStockAlert}
        onClose={() => setOutOfStockAlert(null)}
        data={outOfStockAlert}
        onGoToInventory={() => {
          setOutOfStockAlert(null);
          handleSelectTab('inventory');
        }}
      />

      <InventoryAuthModal
        isOpen={isInventoryAuthOpen}
        onSuccess={() => {
          setIsInventoryUnlocked(true);
          setIsInventoryAuthOpen(false);
          setActiveTab('inventory');
        }}
        onCancel={() => {
          setIsInventoryAuthOpen(false);
        }}
      />
    </div>
  );
}
