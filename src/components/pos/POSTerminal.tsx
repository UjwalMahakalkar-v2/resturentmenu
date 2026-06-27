import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ChevronDown, Printer, CheckCircle, X } from 'lucide-react';
import { posAPI, menuAPI, categoryAPI } from '@/services/api';
import type {
  POSSettings, POSSection, POSTable, POSOrderItem, POSOrderType, POSPaymentMethod,
} from '@/types';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

type CartItem = POSOrderItem & { tempId: string };

const ORDER_TYPES: { id: POSOrderType; label: string; icon: string }[] = [
  { id: 'dine-in', label: 'Dine-In', icon: '🪑' },
  { id: 'takeaway', label: 'Takeaway', icon: '📦' },
  { id: 'delivery', label: 'Delivery', icon: '🛵' },
];

const PAYMENT_METHODS: { id: POSPaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'upi', label: 'UPI', icon: '📱' },
];

export default function POSTerminal() {
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [sections, setSections] = useState<POSSection[]>([]);
  const [tables, setTables] = useState<POSTable[]>([]);
  const [menuItems, setMenuItems] = useState<TenantMenuItem[]>([]);
  const [categories, setCategories] = useState<TenantCategory[]>([]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<POSOrderType>('dine-in');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('cash');
  const [placing, setPlacing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, sec, tbl, items, cats] = await Promise.all([
        posAPI.getSettings(),
        posAPI.getSections(),
        posAPI.getTables(),
        menuAPI.getAll(),
        categoryAPI.getAll(),
      ]);
      setSettings(s);
      setSections(sec);
      setTables(tbl);
      setMenuItems((items as any[]).filter((i: any) => i.available !== false));
      setCategories(cats as any);
      if (sec.length > 0) setSelectedSectionId(sec[0].id);
    } catch {
      toast.error('Failed to load POS data');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sym = settings?.currencySymbol ?? '₹';
  const fmt = (n: number) => `${sym}${n.toFixed(2)}`;

  // Filtered menu items
  const filteredItems = menuItems.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Cart operations
  const addToCart = (item: TenantMenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.price }
          : c
        );
      }
      return [...prev, {
        tempId: `tmp_${Date.now()}_${Math.random()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        subtotal: item.price,
      }];
    });
  };

  const updateQty = (tempId: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.tempId === tempId ? { ...c, quantity: c.quantity + delta, subtotal: (c.quantity + delta) * c.price } : c)
      .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (tempId: string) => setCart(prev => prev.filter(c => c.tempId !== tempId));

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setDiscountAmount(0);
  };

  // Totals
  const subtotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const gstAmount = settings?.gstEnabled ? Math.round(subtotal * (settings.gstRate / 100) * 100) / 100 : 0;
  const total = Math.max(0, subtotal - discountAmount + gstAmount);

  const selectedTable = tables.find(t => t.id === selectedTableId);
  const sectionTables = tables.filter(t => t.sectionId === selectedSectionId);

  const placeOrder = async (kotOnly = false) => {
    if (cart.length === 0) { toast.error('Add items to the order'); return; }
    if (orderType === 'dine-in' && !selectedTableId) { toast.error('Select a table for dine-in'); return; }
    setPlacing(true);
    try {
      await posAPI.createOrder({
        orderType,
        sectionId: orderType === 'dine-in' ? selectedSectionId || null : null,
        tableId: orderType === 'dine-in' ? selectedTableId || null : null,
        tableName: selectedTable?.name || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        status: kotOnly ? 'kot' : 'open',
        subtotal,
        discountAmount,
        gstAmount,
        totalAmount: total,
        paymentMethod: kotOnly ? null : paymentMethod,
        paymentStatus: kotOnly ? 'pending' : 'paid',
        notes: notes.trim(),
        items: cart.map(c => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity, notes: '' })),
      });
      toast.success(kotOnly ? 'KOT sent to kitchen' : 'Order placed & paid!');
      clearCart();
      // Refresh tables to update status
      const tbl = await posAPI.getTables();
      setTables(tbl);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex gap-0 h-[calc(100vh-260px)] min-h-[500px]">
      {/* ── LEFT: Menu ── */}
      <div className="flex-1 flex flex-col min-w-0 pr-4 border-r border-gray-200">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search menu items…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}{cat.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`relative text-left p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                    inCart ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="flex items-start gap-1.5 mb-1">
                    <span className={`mt-0.5 w-2.5 h-2.5 rounded-sm flex-shrink-0 border-2 ${item.type === 'veg' ? 'border-green-600 bg-green-500' : 'border-red-600 bg-red-500'}`} />
                    <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{item.name}</p>
                  </div>
                  <p className="text-sm font-bold text-primary-700">{sym}{item.price}</p>
                </button>
              );
            })}
            {filteredItems.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-12 text-sm">No items found</p>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Order Panel ── */}
      <div className="w-80 flex-shrink-0 flex flex-col pl-4">
        {/* Order Type */}
        <div className="flex gap-1 mb-3">
          {ORDER_TYPES.map(ot => (
            <button
              key={ot.id}
              onClick={() => { setOrderType(ot.id); if (ot.id !== 'dine-in') setSelectedTableId(''); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                orderType === ot.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {ot.icon} {ot.label}
            </button>
          ))}
        </div>

        {/* Table Selector (Dine-In only) */}
        {orderType === 'dine-in' && (
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <select value={selectedSectionId} onChange={e => { setSelectedSectionId(e.target.value); setSelectedTableId(''); }}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none appearance-none">
                <option value="">Section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative flex-1">
              <select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none appearance-none">
                <option value="">Table</option>
                {sectionTables.map(t => (
                  <option key={t.id} value={t.id} disabled={t.status === 'occupied'}>
                    {t.name} {t.status === 'occupied' ? '(Occupied)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Customer info */}
        <div className="flex gap-2 mb-3">
          <input value={customerName} onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
          <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
            placeholder="Phone"
            className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500" />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 mb-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <p className="text-sm">No items added</p>
              <p className="text-xs mt-1">Click menu items to add</p>
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {cart.map(item => (
                <div key={item.tempId} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{sym}{item.price} × {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.tempId, -1)} className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.tempId, 1)} className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center hover:bg-gray-200">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.tempId)} className="w-5 h-5 text-gray-400 hover:text-red-500 flex items-center justify-center ml-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-gray-900 w-14 text-right">{fmt(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Order notes…"
          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-primary-500" />

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 mb-3 space-y-1 text-xs">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Discount</span>
            <div className="flex items-center gap-1">
              <span>{sym}</span>
              <input type="number" min={0} value={discountAmount}
                onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="w-16 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none" />
            </div>
          </div>
          {settings?.gstEnabled && (
            <div className="flex justify-between text-gray-600">
              <span>GST ({settings.gstRate}%)</span><span>{fmt(gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-200">
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="flex gap-1 mb-3">
          {PAYMENT_METHODS.map(pm => (
            <button key={pm.id} onClick={() => setPaymentMethod(pm.id)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                paymentMethod === pm.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {pm.icon} {pm.label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {settings?.enableKot && (
            <button
              onClick={() => placeOrder(true)}
              disabled={placing || cart.length === 0}
              className="flex-1 flex items-center justify-center gap-1 py-2 border-2 border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50 disabled:opacity-50 transition-colors"
            >
              <Printer className="w-4 h-4" /> KOT
            </button>
          )}
          <button
            onClick={() => placeOrder(false)}
            disabled={placing || cart.length === 0}
            className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> {placing ? 'Placing…' : 'Bill & Pay'}
          </button>
          {cart.length > 0 && (
            <button onClick={clearCart} className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
