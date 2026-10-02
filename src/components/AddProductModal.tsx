import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Product, StoreSettings } from '../types/pos';
import { generateRandomBarcode } from '../utils/barcode';
import { playSound } from '../utils/sound';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
  settings: StoreSettings;
  initialBarcode?: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
  settings,
  initialBarcode = '',
}) => {
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category: 'Beverages',
    costPrice: 1.00,
    price: 2.00,
    cardPrice: 2.07,
    stock: 24,
    lowStockThreshold: 5,
    unit: 'pcs',
    colorTag: '#3b82f6',
    taxable: true,
    isActive: true,
  });

  useEffect(() => {
    if (isOpen) {
      const barcodeVal = initialBarcode ? initialBarcode.trim() : generateRandomBarcode('890');
      const skuVal = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
      setNewProduct({
        name: '',
        sku: skuVal,
        barcode: barcodeVal,
        category: 'Beverages',
        costPrice: 1.00,
        price: 2.00,
        cardPrice: 2.07,
        stock: 24,
        lowStockThreshold: 5,
        unit: 'pcs',
        colorTag: '#3b82f6',
        taxable: true,
        isActive: true,
      });
    }
  }, [isOpen, initialBarcode]);

  if (!isOpen) return null;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const barcodeVal = newProduct.barcode || generateRandomBarcode('890');
    const skuVal = newProduct.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

    const product: Product = {
      id: `prod-${Date.now()}`,
      name: newProduct.name,
      sku: skuVal,
      barcode: barcodeVal,
      category: newProduct.category || 'General',
      costPrice: Number(newProduct.costPrice) || 0,
      price: Number(newProduct.price),
      cardPrice: newProduct.cardPrice
        ? Number(newProduct.cardPrice)
        : Number((Number(newProduct.price) * (1 + settings.cardSurchargePercent / 100)).toFixed(2)),
      stock: Number(newProduct.stock) || 0,
      lowStockThreshold: Number(newProduct.lowStockThreshold) || 5,
      unit: newProduct.unit || 'pcs',
      colorTag: newProduct.colorTag || '#3b82f6',
      taxable: newProduct.taxable ?? true,
      isActive: true,
    };

    onAddProduct(product);
    playSound.tap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Add New Product</h3>
            {initialBarcode && (
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded font-mono">
                Scanned: {initialBarcode}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateProduct} className="p-5 overflow-y-auto space-y-3.5 text-xs">
          <div>
            <label className="font-medium text-slate-300 block mb-1">Product Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="e.g. Arizona Green Tea 23oz"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-slate-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-300 block mb-1">SKU</label>
              <input
                type="text"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">
                Barcode (Scannable)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setNewProduct({ ...newProduct, barcode: generateRandomBarcode('890') })}
                  className="px-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-medium transition-colors"
                >
                  Gen
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-300 block mb-1">Category</label>
              <input
                type="text"
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                placeholder="Beverages, Snacks, Deli..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Unit</label>
              <input
                type="text"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                placeholder="pcs, can, bottle, kg"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-medium text-slate-300 block mb-1">Cost Price ({settings.currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={newProduct.costPrice}
                onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Cash Price ({settings.currencySymbol}) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newProduct.price}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setNewProduct({
                    ...newProduct,
                    price: val,
                    cardPrice: Number((val * (1 + settings.cardSurchargePercent / 100)).toFixed(2))
                  });
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Card Price ({settings.currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={newProduct.cardPrice}
                onChange={(e) => setNewProduct({ ...newProduct, cardPrice: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-bold font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-300 block mb-1">Current Stock</label>
              <input
                type="number"
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>

            <div>
              <label className="font-medium text-slate-300 block mb-1">Low Stock Alert at</label>
              <input
                type="number"
                value={newProduct.lowStockThreshold}
                onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="modal-add-taxable"
              checked={newProduct.taxable}
              onChange={(e) => setNewProduct({ ...newProduct, taxable: e.target.checked })}
              className="rounded text-cyan-600 focus:ring-0 bg-slate-950 border-slate-800"
            />
            <label htmlFor="modal-add-taxable" className="text-slate-300 font-medium cursor-pointer">
              Subject to Sales Tax ({settings.defaultTaxRate}%)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold transition-colors shadow-xs active:scale-95"
            >
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
