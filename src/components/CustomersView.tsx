import React, { useState } from 'react';
import { Users, UserPlus, Search, Phone, Mail, Award, Edit2, Trash2, X, ShoppingBag, LayoutGrid, List } from 'lucide-react';
import { Customer, StoreSettings, Sale } from '../types/pos';
import { playSound } from '../utils/sound';

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  settings: StoreSettings;
  sales: Sale[];
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  setCustomers,
  settings,
  sales,
}) => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [newCust, setNewCust] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const filtered = customers.filter(c => {
    if (c.id === 'cust-walkin') return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCust.name) return;

    const cust: Customer = {
      id: `cust-${Date.now()}`,
      name: newCust.name,
      phone: newCust.phone || '',
      email: newCust.email || '',
      points: 25, // Welcome bonus points
      totalSpent: 0,
      visitCount: 0,
      createdAt: new Date().toISOString(),
      notes: newCust.notes || '',
    };

    setCustomers(prev => [cust, ...prev]);
    setIsAddOpen(false);
    setNewCust({ name: '', phone: '', email: '', notes: '' });
    playSound.tap();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? editingCustomer : c));
    setEditingCustomer(null);
    playSound.tap();
  };

  // Customer sales history
  const customerSales = selectedHistoryCustomer
    ? sales.filter(s => s.customerId === selectedHistoryCustomer.id)
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      
      {/* Top Header & Search Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800/80 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-300" />
              <span>Customer Directory</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({filtered.length} {filtered.length === 1 ? 'customer' : 'customers'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* New Customer Button */}
            <button
              onClick={() => {
                setIsAddOpen(true);
                playSound.tap();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Customer</span>
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
            placeholder="Search by customer name, phone, or email..."
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
      </div>

      {/* Main Customers List / Grid Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-950/40">
        {filtered.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Users className="w-10 h-10 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="font-medium text-sm text-slate-300">No customers found</p>
            <p className="text-xs text-slate-500 mt-1">
              Add your first customer to track purchases and loyalty rewards.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((customer) => (
              <div
                key={customer.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs font-mono">
                        {customer.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm leading-tight">{customer.name}</h4>
                        <div className="text-[11px] text-slate-400">
                          Since {new Date(customer.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <span className="text-amber-400 font-mono text-xs font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {customer.points} pts
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-300">
                    {customer.phone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono text-[11px]">{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="text-[11px] text-slate-500 italic pt-1 truncate">
                        "{customer.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-medium">Spent</div>
                    <div className="font-bold text-white font-mono">
                      {settings.currencySymbol}{customer.totalSpent.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSelectedHistoryCustomer(customer);
                        playSound.tap();
                      }}
                      className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      History
                    </button>
                    <button
                      onClick={() => {
                        setEditingCustomer({ ...customer });
                        playSound.tap();
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Edit customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingCustomer(customer);
                        playSound.tap();
                      }}
                      title="Delete customer"
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950/80 border-b border-slate-800/80 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Phone</th>
                  <th className="py-2.5 px-3 font-semibold">Email</th>
                  <th className="py-2.5 px-3 font-semibold">Points</th>
                  <th className="py-2.5 px-3 font-semibold">Total Spent</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {customer.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {customer.phone || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {customer.email || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-amber-400 font-mono font-medium">
                        {customer.points} pts
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {settings.currencySymbol}{customer.totalSpent.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedHistoryCustomer(customer);
                            playSound.tap();
                          }}
                          className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          History
                        </button>
                        <button
                          onClick={() => {
                            setEditingCustomer({ ...customer });
                            playSound.tap();
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCustomer(customer);
                            playSound.tap();
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <h3 className="font-bold text-base text-white">New Customer</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-300 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  placeholder="(718) 555-0199"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={newCust.email}
                  onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300 block mb-1">Preferences / Notes</label>
                <textarea
                  value={newCust.notes}
                  onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  placeholder="Preferences, regulars notes..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white resize-none focus:outline-none focus:border-slate-600 transition-colors"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-xs transition-colors active:scale-95"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <h3 className="font-bold text-base text-white">Edit Customer</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={editingCustomer.phone}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300 block mb-1">Loyalty Points</label>
                <input
                  type="number"
                  value={editingCustomer.points}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, points: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-xs transition-colors active:scale-95"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {selectedHistoryCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg text-slate-100 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">{selectedHistoryCustomer.name}</h3>
                <p className="text-xs text-slate-400">Past Orders & Receipts</p>
              </div>
              <button
                onClick={() => setSelectedHistoryCustomer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {customerSales.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No previous orders found for this customer.</p>
              ) : (
                customerSales.map((sale) => (
                  <div key={sale.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white font-mono">{sale.receiptNumber}</div>
                      <div className="text-[11px] text-slate-500">{new Date(sale.timestamp).toLocaleString()}</div>
                      <div className="text-slate-400 mt-1">{sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-emerald-400 font-mono">{settings.currencySymbol}{sale.grandTotal.toFixed(2)}</div>
                      <div className="text-[10px] uppercase text-slate-500">{sale.payment.method}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Delete Customer?</h3>
                <p className="text-xs text-slate-400">Remove customer profile and points.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs my-3 space-y-1">
              <div className="font-bold text-white text-sm">{deletingCustomer.name}</div>
              {deletingCustomer.phone && <div className="text-slate-400 font-mono text-[11px]">{deletingCustomer.phone}</div>}
              <div className="text-amber-400 font-bold font-mono text-xs">{deletingCustomer.points} loyalty points</div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
                  playSound.tap();
                  setDeletingCustomer(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-xs font-bold text-white shadow-xs transition-colors active:scale-95"
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
