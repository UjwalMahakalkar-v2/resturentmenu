import { useState, useEffect } from 'react';
import { ShoppingCart, History, Settings, Lock } from 'lucide-react';
import { posAPI } from '@/services/api';
import POSTerminal from './POSTerminal';
import POSOrderHistory from './POSOrderHistory';
import POSSettings from './POSSettings';

type POSTab = 'terminal' | 'history' | 'settings';

const TABS: { id: POSTab; label: string; icon: React.ReactNode }[] = [
  { id: 'terminal', label: 'Terminal', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'history', label: 'Order History', icon: <History className="w-4 h-4" /> },
  { id: 'settings', label: 'POS Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function POSDashboard() {
  const [activeTab, setActiveTab] = useState<POSTab>('terminal');
  const [posEnabled, setPosEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    posAPI.getSettings()
      .then((s: any) => setPosEnabled(s.posEnabled === true))
      .catch(() => setPosEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-500">Loading POS…</div>;

  if (!posEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">POS Not Enabled</h3>
        <p className="text-gray-500 text-sm max-w-xs">
          The Point of Sale module is not enabled for your account.
          Contact your super admin to enable it.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'terminal' && <POSTerminal />}
      {activeTab === 'history' && <POSOrderHistory />}
      {activeTab === 'settings' && <POSSettings />}
    </div>
  );
}
