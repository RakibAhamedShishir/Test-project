import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  SlidersHorizontal, 
  AlertTriangle, 
  Download, 
  Upload, 
  Barcode as BarcodeIcon, 
  Printer, 
  Check, 
  X,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { Product, StoreSettings } from '../types/pos';
import { BarcodeView } from './BarcodeView';
import { generateRandomBarcode } from '../utils/barcode';
import { playSound } from '../utils/sound';
import { AddProductModal } from './AddProductModal';

interface InventoryViewProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  settings: StoreSettings;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  setProducts,
  settings,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  
  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Restock delivery');
  const [labelPrintProduct, setLabelPrintProduct] = useState<Product | null>(null);
  const [labelPrintCount, setLabelPrintCount] = useState<number>(10);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [importNotification, setImportNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New product form
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    category: 'Beverages',
    costPrice: 1.00,
    price: 2.00,
    cardPrice: 2.07,
    stock: 20,
    lowStockThreshold: 5,
    unit: 'pcs',
    colorTag: '#06b6d4',
    taxable: true,
    isActive: true,
  });

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return ['All', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
      const matchStock = !filterLowStockOnly || p.stock <= p.lowStockThreshold;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      return matchCat && matchStock && matchQuery;
    });
  }, [products, categoryFilter, filterLowStockOnly, search]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= p.lowStockThreshold).length;
  }, [products]);

  // Handle Create Product
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
      cardPrice: newProduct.cardPrice ? Number(newProduct.cardPrice) : Number((Number(newProduct.price) * 1.035).toFixed(2)),
      stock: Number(newProduct.stock) || 0,
      lowStockThreshold: Number(newProduct.lowStockThreshold) || 5,
      unit: newProduct.unit || 'pcs',
      colorTag: newProduct.colorTag || '#3b82f6',
      taxable: newProduct.taxable ?? true,
      isActive: true,
    };

    setProducts((prev) => [product, ...prev]);
    setIsAddModalOpen(false);
    playSound.tap();
  };

  // Handle Edit Product
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? editingProduct : p))
    );
    setEditingProduct(null);
    playSound.tap();
  };

  // Handle Delete Product Confirmation
  const handleConfirmDelete = () => {
    if (!deletingProduct) return;
    setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
    playSound.tap();
    setDeletingProduct(null);
  };

  // Handle Stock Adjustment
  const handleApplyAdjustment = () => {
    if (!adjustingProduct) return;
    const newStock = Math.max(0, adjustingProduct.stock + adjustQty);
    setProducts((prev) =>
      prev.map((p) => (p.id === adjustingProduct.id ? { ...p, stock: newStock } : p))
    );
    setAdjustingProduct(null);
    playSound.tap();
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Cost Price', 'Selling Price', 'Card Price', 'Stock', 'Low Stock Limit', 'Unit', 'Taxable'];
    const rows = products.map((p) => [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.sku,
      p.barcode,
      `"${p.category}"`,
      p.costPrice.toFixed(2),
      p.price.toFixed(2),
      (p.cardPrice || p.price).toFixed(2),
      p.stock,
      p.lowStockThreshold,
      p.unit,
      p.taxable ? 'YES' : 'NO'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sleetpos_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Backup Export
  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(products, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `sleetpos_catalog_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Excel (.xlsx, .xls, .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          setImportNotification({ message: 'No sheets found in uploaded file.', type: 'error' });
          setTimeout(() => setImportNotification(null), 4000);
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          setImportNotification({ message: 'The uploaded file contains no data rows.', type: 'error' });
          setTimeout(() => setImportNotification(null), 4000);
          return;
        }

        let updatedCount = 0;
        let addedCount = 0;

        setProducts((prev) => {
          const list = [...prev];

          rawRows.forEach((row, index) => {
            const name = String(
              row['Name'] ||
              row['Product Name'] ||
              row['name'] ||
              row['Item Name'] ||
              row['Product'] ||
              row['Title'] ||
              ''
            ).trim();

            if (!name) return; // Skip empty rows

            const barcode = String(
              row['Barcode'] ||
              row['barcode'] ||
              row['UPC'] ||
              row['EAN'] ||
              row['Code'] ||
              ''
            ).trim() || generateRandomBarcode('890');

            const sku = String(
              row['SKU'] ||
              row['sku'] ||
              row['Item Code'] ||
              row['Item SKU'] ||
              ''
            ).trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;

            const category = String(row['Category'] || row['category'] || row['Dept'] || 'General').trim();
            const costPrice = parseFloat(String(row['Cost Price'] || row['Cost'] || row['costPrice'] || 0)) || 0;
            const price = parseFloat(String(row['Selling Price'] || row['Price'] || row['Cash Price'] || row['price'] || 0)) || 1.00;
            const cardPrice = parseFloat(String(row['Card Price'] || row['cardPrice'] || 0)) || Number((price * 1.035).toFixed(2));
            const stock = parseInt(String(row['Stock'] || row['Qty'] || row['Quantity'] || row['stock'] || 0), 10) || 0;
            const lowStockThreshold = parseInt(String(row['Low Stock Limit'] || row['Low Stock'] || row['Min Stock'] || row['lowStockThreshold'] || 5), 10) || 5;
            const unit = String(row['Unit'] || row['unit'] || 'pcs').trim() || 'pcs';
            const taxableStr = String(row['Taxable'] || row['taxable'] || 'YES').trim().toUpperCase();
            const taxable = taxableStr !== 'NO' && taxableStr !== 'FALSE' && taxableStr !== '0';

            const existingIndex = list.findIndex(
              (p) =>
                (row['ID'] && p.id === String(row['ID']).trim()) ||
                (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase() === sku.toLowerCase())
            );

            if (existingIndex > -1) {
              list[existingIndex] = {
                ...list[existingIndex],
                name,
                category,
                costPrice: costPrice > 0 ? costPrice : list[existingIndex].costPrice,
                price: price > 0 ? price : list[existingIndex].price,
                cardPrice: cardPrice > 0 ? cardPrice : list[existingIndex].cardPrice,
                stock,
                lowStockThreshold,
                unit,
                taxable,
              };
              updatedCount++;
            } else {
              const newProd: Product = {
                id: `prod-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
                name,
                sku,
                barcode,
                category,
                costPrice,
                price,
                cardPrice,
                stock,
                lowStockThreshold,
                unit,
                colorTag: '#06b6d4',
                taxable,
                isActive: true,
              };
              list.unshift(newProd);
              addedCount++;
            }
          });

          return list;
        });

        playSound.saleChime();
        setImportNotification({
          message: `Successfully imported: ${addedCount} new added, ${updatedCount} updated!`,
          type: 'success',
        });
        setTimeout(() => setImportNotification(null), 5000);
      } catch (err: any) {
        console.error('Import error:', err);
        setImportNotification({
          message: `Failed to import file: ${err?.message || 'Invalid format'}`,
          type: 'error',
        });
        setTimeout(() => setImportNotification(null), 5000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100 relative">
      
      {/* Import Notification Banner */}
      {importNotification && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 border animate-in fade-in slide-in-from-top duration-200 ${
            importNotification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-rose-950/50'
          }`}
        >
          {importNotification.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{importNotification.message}</span>
          <button
            onClick={() => setImportNotification(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      
      {/* Top Header & Metrics */}
      <div className="p-3 bg-slate-900 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-white tracking-tight flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-300" />
              <span>Inventory Catalog</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({products.length} {products.length === 1 ? 'item' : 'items'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Low Stock Filter Button */}
            <button
              onClick={() => { setFilterLowStockOnly(!filterLowStockOnly); playSound.tap(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                filterLowStockOnly
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-850'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Low Stock ({lowStockCount})</span>
            </button>

            {/* Export CSV (Download Inventory) */}
            <button
              onClick={exportCSV}
              title="Download inventory catalog as CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium rounded-xl transition-colors active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export</span> CSV
            </button>

            {/* Import Excel / CSV */}
            <label
              title="Import Excel (.xlsx, .xls) or CSV inventory spreadsheet"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium rounded-xl transition-colors cursor-pointer active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Import Excel</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportExcel}
              />
            </label>

            {/* Add Product Button */}
            <button
              onClick={() => {
                setNewProduct({
                  name: '',
                  sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                  barcode: generateRandomBarcode('890'),
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
                setIsAddModalOpen(true);
                playSound.tap();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Search Bar matching RegisterView */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU, or barcode..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 transition-colors shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Filter Tabs matching RegisterView */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
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

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950/90 sticky top-0 z-10 border-b border-slate-800/80 text-slate-400">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Product & SKU</th>
              <th className="py-2.5 px-3 font-semibold">Barcode</th>
              <th className="py-2.5 px-3 font-semibold">Category</th>
              <th className="py-2.5 px-3 font-semibold">Cost</th>
              <th className="py-2.5 px-3 font-semibold">Cash Price</th>
              <th className="py-2.5 px-3 font-semibold">Stock Level</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Search className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-300">No matching products</p>
                    <p className="text-xs text-slate-500">Try adjusting your search query or category filter</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const isLow = product.stock <= product.lowStockThreshold;
                const isOut = product.stock <= 0;

                return (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-900/60 transition-colors group"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: product.colorTag || '#06b6d4' }}
                        />
                        <div>
                          <div className="font-semibold text-white group-hover:text-cyan-300">
                            {product.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {product.sku}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                      {product.barcode}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-xs">
                      {product.category}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-xs font-mono">
                      {settings.currencySymbol}{product.costPrice.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white text-xs font-mono">
                        {settings.currencySymbol}{product.price.toFixed(2)}
                      </div>
                      {product.cardPrice && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          Card: {settings.currencySymbol}{product.cardPrice.toFixed(2)}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold font-mono ${
                            isOut
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {product.stock} {product.unit}
                        </span>

                        {/* Quick stock adjust trigger */}
                        <button
                          onClick={() => {
                            setAdjustingProduct(product);
                            setAdjustQty(0);
                            playSound.tap();
                          }}
                          className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-lg border border-slate-800/80 bg-slate-950 hover:bg-slate-800 transition-colors"
                        >
                          ± Count
                        </button>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Print Barcode Label */}
                        <button
                          onClick={() => {
                            setLabelPrintProduct(product);
                            setLabelPrintCount(1);
                            playSound.tap();
                          }}
                          title="Print Barcode Shelf Label"
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <BarcodeIcon className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingProduct({ ...product });
                            playSound.tap();
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            setDeletingProduct(product);
                            playSound.tap();
                          }}
                          title="Delete product"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =========================================
          ADD PRODUCT MODAL
          ========================================= */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={(product) => setProducts((prev) => [product, ...prev])}
        settings={settings}
      />

      {/* =========================================
          EDIT PRODUCT MODAL
          ========================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/60">
              <h3 className="font-bold text-white text-base">Edit Product</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-medium text-slate-300 block mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">SKU</label>
                  <input
                    type="text"
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">Cost Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.costPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Cash Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Card Price ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.cardPrice || editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cardPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-cyan-400 font-bold font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-300 block mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-300 block mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    value={editingProduct.lowStockThreshold}
                    onChange={(e) => setEditingProduct({ ...editingProduct, lowStockThreshold: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold transition-colors shadow-xs active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          STOCK ADJUSTMENT MODAL
          ========================================= */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-0.5">Adjust Stock Count</h3>
            <p className="text-xs text-slate-400 mb-3">{adjustingProduct.name}</p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 mb-3 text-center">
              <div className="text-xs text-slate-400">Current Stock:</div>
              <div className="text-2xl font-bold text-white font-mono">
                {adjustingProduct.stock} {adjustingProduct.unit}
              </div>
              <div className="text-xs text-cyan-400 mt-1 font-mono">
                New Stock will be: {Math.max(0, adjustingProduct.stock + adjustQty)} {adjustingProduct.unit}
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Change Quantity (+ or -):
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdjustQty(prev => prev - 5)}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustQty(prev => prev - 1)}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-center py-1.5 bg-slate-950 border border-slate-800 rounded-lg font-bold text-white font-mono focus:outline-none focus:border-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQty(prev => prev + 1)}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustQty(prev => prev + 12)}
                    className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg"
                  >
                    +12
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Reason for Adjustment:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-slate-600"
                >
                  <option value="Restock delivery">Restock / New delivery</option>
                  <option value="Physical count audit">Physical count / inventory audit</option>
                  <option value="Damaged or expired">Damaged / Expired / Spoiled</option>
                  <option value="Customer return">Customer return</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAdjustment}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-xs transition-colors"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          PRINT BARCODE LABELS MODAL
          ========================================= */}
      {labelPrintProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 text-slate-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <BarcodeIcon className="w-5 h-5 text-cyan-400" />
                <span>Print Barcode Label</span>
              </h3>
              <button
                onClick={() => setLabelPrintProduct(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Label Preview Card */}
            <div className="bg-white text-slate-950 p-4 rounded-xl border border-slate-300 shadow-md text-center mx-auto w-64 mb-4 select-text">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                {settings.storeName}
              </div>
              <div className="font-extrabold text-xs line-clamp-2 leading-snug mb-1">
                {labelPrintProduct.name}
              </div>
              <div className="text-xl font-black text-slate-900 my-1 font-mono">
                {settings.currencySymbol}{labelPrintProduct.price.toFixed(2)}
              </div>
              <div className="flex justify-center my-1.5">
                <BarcodeView value={labelPrintProduct.barcode} height={42} showText={true} />
              </div>
              <div className="text-[9px] font-mono text-slate-500">
                SKU: {labelPrintProduct.sku}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-1 text-xs">
              <span className="text-slate-400">Labels to print:</span>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setLabelPrintCount(num)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors ${
                      labelPrintCount === num
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLabelPrintProduct(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound.tap();
                  window.print();
                }}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          DELETE PRODUCT CONFIRMATION MODAL
          ========================================= */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Product?</h3>
                <p className="text-xs text-slate-400">Remove from inventory catalog.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs my-3 space-y-1">
              <div className="font-bold text-white text-sm">{deletingProduct.name}</div>
              <div className="text-slate-400 font-mono text-[11px]">
                SKU: {deletingProduct.sku} • Barcode: {deletingProduct.barcode}
              </div>
              <div className="text-emerald-400 font-bold font-mono">
                {settings.currencySymbol}{deletingProduct.price.toFixed(2)} • Stock: {deletingProduct.stock} {deletingProduct.unit}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-xs transition-colors active:scale-95"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
