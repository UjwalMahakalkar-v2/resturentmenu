import { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { posAPI } from '@/services/api';
import type { POSOrder } from '@/types';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  kot: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
};

const PAYMENT_ICONS: Record<string, string> = {
  cash: '💵', card: '💳', upi: '📱',
};

export default function POSOrderHistory() {
  const [orders, setOrders] = useState<POSOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, settingsData] = await Promise.all([
        posAPI.getOrders({ date: dateFilter, status: statusFilter || undefined, limit: 100 }),
        posAPI.getSettings(),
      ]);
      setOrders(ordersData);
      setCurrencySymbol(settingsData.currencySymbol ?? '₹');
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;

  const totals = orders.reduce((acc, o) => ({
    count: acc.count + 1,
    revenue: acc.revenue + (o.paymentStatus === 'paid' ? o.totalAmount : 0),
  }), { count: 0, revenue: 0 });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="text-sm outline-none bg-transparent" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium">Total Orders</p>
          <p className="text-2xl font-bold text-blue-700">{totals.count}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium">Revenue Collected</p>
          <p className="text-2xl font-bold text-green-700">{fmt(totals.revenue)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No orders for this date.</div>
      ) : (
        <div className="space-y-2">
          {orders.map(order => (
            <div key={order.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{order.orderNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{order.orderType}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {order.tableName && <span className="text-xs text-gray-500">Table: {order.tableName}</span>}
                      {order.customerName && <span className="text-xs text-gray-500">• {order.customerName}</span>}
                      <span className="text-xs text-gray-400">• {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{fmt(order.totalAmount)}</p>
                    {order.paymentMethod && (
                      <p className="text-xs text-gray-500">{PAYMENT_ICONS[order.paymentMethod]} {order.paymentMethod}</p>
                    )}
                  </div>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {expandedId === order.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 space-y-1.5">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.name} <span className="text-gray-400">×{item.quantity}</span></span>
                        <span className="text-gray-900 font-medium">{fmt(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
                    </div>
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount</span><span>-{fmt(order.discountAmount)}</span>
                      </div>
                    )}
                    {order.gstAmount > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>GST</span><span>{fmt(order.gstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
                      <span>Total</span><span>{fmt(order.totalAmount)}</span>
                    </div>
                  </div>
                  {order.notes && (
                    <p className="mt-2 text-xs text-gray-500 italic">Note: {order.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
