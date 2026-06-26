import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Star, Heart } from 'lucide-react';
import MenuItemDetail from '@/components/MenuItemDetail';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import type { TenantMenuItem } from '@/types/tenant';
import type { Restaurant, Category } from '@/types';

interface Props {
  restaurant: Restaurant;
  menuItems: TenantMenuItem[];
  categories: Category[];
  tenant: { id: string; name: string } | null;
}

export default function ModernTemplate({ restaurant, menuItems, categories, tenant }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('favorites') || '[]')
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (vegOnly && item.type !== 'veg') return false;
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          categories.find(c => c.id === item.category)?.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [menuItems, activeCategory, searchQuery, categories, vegOnly]);

  const groupedItems = useMemo(() => {
    if (activeCategory !== 'all') return { [activeCategory]: filteredItems };
    const groups: Record<string, TenantMenuItem[]> = {};
    sortedCategories.forEach(cat => {
      const items = filteredItems.filter(i => i.category === cat.id);
      if (items.length > 0) groups[cat.id] = items;
    });
    const uncategorized = filteredItems.filter(
      i => !categories.find(c => c.id === i.category)
    );
    if (uncategorized.length > 0) groups['__other'] = uncategorized;
    return groups;
  }, [filteredItems, sortedCategories, activeCategory, categories]);

  const toggleFav = (id: string) => {
    const updated = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  const mapsUrl = restaurant?.location
    ? `https://maps.google.com/?q=${encodeURIComponent(restaurant.location)}`
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ── Sticky Top Bar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo && (
              <img src={restaurant.logo} alt={restaurant.name} className="h-9 w-9 rounded-lg object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                {restaurant.name || 'Restaurant'}
              </h1>
              <p className="text-[11px] text-gray-500 hidden sm:block">{restaurant.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="hidden sm:flex items-center gap-1 hover:text-gray-900">
                <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
              </a>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}
                className="sm:hidden p-2 rounded-full text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}>
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Banner (compact) ── */}
      <div className="relative h-48 sm:h-64 overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop'}
          alt="Restaurant"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-white text-2xl sm:text-4xl font-bold mb-1">{restaurant.name}</h2>
            <p className="text-gray-200 text-sm sm:text-base">{restaurant.tagline}</p>
            <div className="flex items-center gap-4 mt-2 text-gray-300 text-xs">
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1 hover:text-white">
                  <Mail className="w-3 h-3" /> {restaurant.email}
                </a>
              )}
              {restaurant.location && mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white">
                  <MapPin className="w-3 h-3" /> {restaurant.location}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div ref={menuRef} className="sticky top-[57px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Search bar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search dishes..."
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Veg toggle */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                vegOnly
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <span className="w-3 h-3 border-2 border-green-600 rounded-sm flex items-center justify-center">
                {vegOnly && <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />}
              </span>
              Veg
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeCategory === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              All
            </button>
            {sortedCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === cat.id ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Menu Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <p className="text-xs text-gray-400 mb-4">{filteredItems.length} items</p>

        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg text-gray-500">No dishes found.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([catId, items]) => {
            const cat = categories.find(c => c.id === catId);
            return (
              <div key={catId} className="mb-8">
                {activeCategory === 'all' && (
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                    {cat?.name || 'Other'}
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="flex gap-4 bg-white rounded-2xl p-3 border border-gray-100 hover:shadow-lg hover:border-gray-200 cursor-pointer transition-all group"
                    >
                      {/* Image */}
                      {item.hasImage && item.image ? (
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          {item.popular && (
                            <span className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Popular
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">{cat?.icon || '🍽️'}</span>
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-start gap-2">
                            <div className={`mt-1 flex-shrink-0 w-4 h-4 border-2 rounded-sm flex items-center justify-center ${
                              item.type === 'veg' ? 'border-green-600' : 'border-red-600'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                          <div className="flex items-center gap-2">
                            {!item.available && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">Sold Out</span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                              className="p-1.5 hover:bg-gray-50 rounded-full"
                            >
                              <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                            </button>
                            {item.available && (
                              <button
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                              >
                                ADD
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">© 2026 {restaurant.name}. All rights reserved.</p>
          <p className="text-gray-600 text-xs mt-1">Powered by MenuMate</p>
        </div>
      </footer>

      {/* Detail Modal */}
      <MenuItemDetail
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        categories={categories}
      />

      {/* Social Buttons */}
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
