/**
 * Template 2: Modern Bistro
 * Style: Clean, minimal, elegant, cafe style
 * Colors: Cream, beige, brown, light gold (inherits theme)
 * Target: Cafes, fine dining, bakeries, premium restaurants
 */
import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Star, Heart, ArrowRight } from 'lucide-react';
import MenuItemDetail from '@/components/MenuItemDetail';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import ReservationWidget from '@/components/ReservationWidget';
import type { TenantMenuItem } from '@/types/tenant';
import type { Restaurant, Category } from '@/types';

interface Props {
  restaurant: Restaurant;
  menuItems: TenantMenuItem[];
  categories: Category[];
  tenant: { id: string; name: string } | null;
}

export default function ModernBistroTemplate({ restaurant, menuItems, categories, tenant }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('favorites') || '[]')
  );
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
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) ||
          categories.find(c => c.id === item.category)?.name.toLowerCase().includes(q);
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
    return groups;
  }, [filteredItems, sortedCategories, activeCategory]);

  const popularItems = useMemo(
    () => menuItems.filter(i => i.popular && i.available).slice(0, 6),
    [menuItems]
  );

  const toggleFav = (id: string) => {
    const updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem('favorites', JSON.stringify(updated));
  };

  const mapsUrl = restaurant?.location
    ? `https://maps.google.com/?q=${encodeURIComponent(restaurant.location)}`
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* ── Header ── */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo && (
              <img src={restaurant.logo} alt={restaurant.name} className="h-10 w-10 rounded-xl object-contain shadow-sm" />
            )}
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-primary)' }}>
                {restaurant.name || 'Restaurant'}
              </h1>
              <p className="text-[11px] text-gray-400 hidden sm:block">{restaurant.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="p-2 rounded-xl text-white shadow-sm" style={{ backgroundColor: 'var(--color-primary)' }}>
                <Phone className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <section className="relative h-[280px] sm:h-[400px] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&h=600&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-white text-3xl sm:text-5xl font-bold mb-2 tracking-tight">{restaurant.name}</h2>
            <p className="text-gray-200 text-sm sm:text-lg mb-4">{restaurant.tagline || 'Welcome to our restaurant'}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                View Menu <ArrowRight className="w-4 h-4" />
              </button>
              {tenant && (
                <ReservationWidget
                  tenantId={tenant.id}
                  accent="var(--color-primary)"
                  triggerClassName="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm border border-white/60 hover:bg-white/10 transition-colors"
                  label="Reserve a Table"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Restaurant Info Strip ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
          {restaurant.phone && (
            <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
              <Phone className="w-4 h-4" /> {restaurant.phone}
            </a>
          )}
          {restaurant.email && (
            <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
              <Mail className="w-4 h-4" /> {restaurant.email}
            </a>
          )}
          {restaurant.location && mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
              <MapPin className="w-4 h-4" /> {restaurant.location}
            </a>
          )}
        </div>
      </section>

      {/* ── Featured Dishes ── */}
      {popularItems.length > 0 && (
        <section className="py-10 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Featured Dishes</h3>
            <p className="text-sm text-gray-500 mb-6">Our most popular selections</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {popularItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300"
                >
                  {item.image ? (
                    <div className="h-36 sm:h-44 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="h-36 sm:h-44 flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)', opacity: 0.08 }}>
                      <span className="text-4xl">🍽️</span>
                    </div>
                  )}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-3 h-3 border-2 rounded-sm flex items-center justify-center ${item.type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                      </span>
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Search + Category Tabs + Menu ── */}
      <div ref={menuRef} className="scroll-mt-16">
        {/* Sticky filters */}
        <div className="sticky top-[57px] z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
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
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex-shrink-0 ${
                  vegOnly ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border-2 border-green-600 flex items-center justify-center`}>
                  {vegOnly && <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />}
                </span>
                Veg Only
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'all' ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={activeCategory === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                All Items
              </button>
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {cat.icon || '🍽️'} {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <p className="text-xs text-gray-400 mb-6">{filteredItems.length} items</p>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-20"><p className="text-lg text-gray-500">No dishes found.</p></div>
          ) : (
            Object.entries(groupedItems).map(([catId, items]) => {
              const cat = categories.find(c => c.id === catId);
              return (
                <div key={catId} className="mb-10">
                  {activeCategory === 'all' && (
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-2xl">{cat?.icon || '🍽️'}</span>
                      <h3 className="text-xl font-bold text-gray-900">{cat?.name || 'Other'}</h3>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 cursor-pointer transition-all duration-300"
                      >
                        {item.hasImage && item.image ? (
                          <div className="relative h-44 overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {item.popular && (
                              <span className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-current" /> Popular
                              </span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:bg-white transition-all"
                            >
                              <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="h-20 flex items-center justify-center bg-gray-50">
                            <span className="text-3xl">{cat?.icon || '🍽️'}</span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-2">
                            <span className={`mt-0.5 w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${
                              item.type === 'veg' ? 'border-green-600' : 'border-red-600'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                            <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                            {!item.available ? (
                              <span className="text-[10px] text-gray-400 font-medium uppercase">Sold Out</span>
                            ) : (
                              <button
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-semibold px-4 py-1.5 rounded-xl text-white shadow-sm hover:opacity-90 transition-opacity"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                              >
                                ADD
                              </button>
                            )}
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
      </div>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h4 className="font-bold text-lg">{restaurant.name}</h4>
              <p className="text-gray-400 text-sm">{restaurant.tagline}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400 text-xs">
              {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="hover:text-white">{restaurant.phone}</a>}
              {restaurant.email && <a href={`mailto:${restaurant.email}`} className="hover:text-white">{restaurant.email}</a>}
            </div>
          </div>
          <p className="text-gray-600 text-xs text-center mt-6">© 2026 {restaurant.name} · Powered by MenuMate</p>
        </div>
      </footer>

      <MenuItemDetail item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} categories={categories} />
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
