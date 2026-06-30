/**
 * Template 5: Organic Cafe
 * Style: Natural, earthy, green, farm-to-table, wholesome
 * Colors: Warm cream bg, sage green, terra cotta accents, soft shadows
 * Target: Health cafes, organic restaurants, vegetarian/vegan, sustainable dining
 */
import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Leaf, Heart } from 'lucide-react';
import MenuItemDetail from '@/components/MenuItemDetail';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import ReservationWidget from '@/components/ReservationWidget';
import ShareMenuButton from '@/components/ShareMenuButton';
import type { TenantMenuItem } from '@/types/tenant';
import type { Restaurant, Category } from '@/types';

interface Props {
  restaurant: Restaurant;
  menuItems: TenantMenuItem[];
  categories: Category[];
  tenant: { id: string; name: string } | null;
}

export default function OrganicCafeTemplate({ restaurant, menuItems, categories, tenant }: Props) {
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
    return menuItems.filter(item => {
      if (vegOnly && item.type !== 'veg') return false;
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
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

  const todaysPicks = useMemo(
    () => menuItems.filter(i => i.popular && i.available).slice(0, 4),
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
    <div className="min-h-screen" style={{ backgroundColor: '#f9f5f0', color: '#2c2420' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#f9f5f0]/95 backdrop-blur-md border-b border-[#e8ddd4] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="" className="w-10 h-10 rounded-full object-contain flex-shrink-0 ring-2 ring-[#c8b89a]/40" />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: 'var(--color-primary)', opacity: 0.15 }}>
                🌿
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--color-primary)' }}>
                {restaurant.name || 'Restaurant'}
              </h1>
              <p className="text-[10px] text-[#9c8878] truncate hidden sm:block italic">{restaurant.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#c8b89a] text-[#7a6655] hover:bg-[#c8b89a]/20 transition-colors">
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{restaurant.phone}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative h-[260px] sm:h-[360px] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1490914327627-9fe8d52f4d90?w=1400&h=600&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#f9f5f0] via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-7 sm:px-10">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-2 text-white bg-green-600/80 backdrop-blur-sm">
              <Leaf className="w-3 h-3" /> Fresh · Natural · Wholesome
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#2c2420] leading-tight">{restaurant.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {tenant && (
                <ReservationWidget
                  tenantId={tenant.id}
                  accent="var(--color-primary)"
                  triggerClassName="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
                  triggerStyle={{ backgroundColor: 'var(--color-primary)' }}
                  label="Reserve a Table"
                />
              )}
              {restaurant.enableShareMenu !== false && (
                <ShareMenuButton title={restaurant.name}
                  triggerClassName="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold shadow-sm bg-white hover:opacity-90 transition-opacity"
                  triggerStyle={{ color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact strip ── */}
      {(restaurant.phone || restaurant.email || restaurant.location) && (
        <div className="bg-[#f0ebe4] border-b border-[#e0d5ca]">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-5 text-xs text-[#9c8878]">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-[#4a7c59] transition-colors">
                <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1.5 hover:text-[#4a7c59] transition-colors">
                <Mail className="w-3.5 h-3.5" /> {restaurant.email}
              </a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#4a7c59] transition-colors">
                <MapPin className="w-3.5 h-3.5" /> {restaurant.location}
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── About ── */}
      {restaurant.about && (
        <section className="py-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-10 bg-[#c8b89a]" />
              <Leaf className="w-4 h-4 text-[#4a7c59]" />
              <div className="h-px w-10 bg-[#c8b89a]" />
            </div>
            <p className="text-[#7a6655] text-sm leading-relaxed italic">"{restaurant.about}"</p>
          </div>
        </section>
      )}

      {/* ── Today's Picks ── */}
      {todaysPicks.length > 0 && (
        <section className="pb-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
              <h3 className="font-bold text-[#2c2420] text-base">What's Good Today</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {todaysPicks.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-[#ede5dc]"
                >
                  <div className="relative h-28 sm:h-36 overflow-hidden bg-[#f0ebe4]">
                    {item.image ? (
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {categories.find(c => c.id === item.category)?.icon || '🌱'}
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm"
                    >
                      <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-red-400 text-red-400' : 'text-[#c8b89a]'}`} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-[#2c2420] font-semibold text-xs line-clamp-1">{item.name}</p>
                    <p className="font-bold text-sm mt-1" style={{ color: 'var(--color-primary)' }}>₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Sticky Search + Categories ── */}
      <div ref={menuRef} className="scroll-mt-14">
        <div className="sticky top-[57px] z-40 bg-[#f9f5f0]/97 backdrop-blur-md border-b border-[#e0d5ca]">
          <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b0a090]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search dishes..."
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#e0d5ca] rounded-xl text-sm text-[#2c2420] placeholder-[#b0a090] outline-none focus:border-[#c8b89a] transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a090] hover:text-[#7a6655]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all flex-shrink-0 ${
                  vegOnly ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-[#e0d5ca] text-[#9c8878]'
                }`}
              >
                <Leaf className={`w-3.5 h-3.5 ${vegOnly ? 'text-green-600' : 'text-[#b0a090]'}`} />
                Veg Only
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === 'all' ? 'text-white shadow-sm' : 'bg-white text-[#9c8878] border border-[#e0d5ca] hover:border-[#c8b89a]'
                }`}
                style={activeCategory === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                All
              </button>
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === cat.id ? 'text-white shadow-sm' : 'bg-white text-[#9c8878] border border-[#e0d5ca] hover:border-[#c8b89a]'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  {cat.icon || '🌿'} {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-xs text-[#b0a090] mb-5">{filteredItems.length} items on the menu</p>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-20">
              <Leaf className="w-12 h-12 mx-auto mb-3 text-[#c8b89a]" />
              <p className="text-[#9c8878]">No dishes found.</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([catId, items]) => {
              const cat = categories.find(c => c.id === catId);
              return (
                <div key={catId} className="mb-10">
                  {activeCategory === 'all' && (
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-xl">{cat?.icon || '🌿'}</span>
                      <h3 className="font-bold text-[#2c2420] text-base">{cat?.name || 'Other'}</h3>
                      <div className="flex-1 h-px bg-[#e0d5ca]" />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-[#ede5dc] cursor-pointer transition-all"
                      >
                        {item.hasImage && item.image ? (
                          <div className="relative h-40 overflow-hidden">
                            <img src={item.image} alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            {item.type === 'veg' && (
                              <span className="absolute top-3 left-3 bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Leaf className="w-2.5 h-2.5" /> Pure Veg
                              </span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                              className="absolute top-3 right-3 bg-white/90 p-1.5 rounded-full shadow-sm"
                            >
                              <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-red-400 text-red-400' : 'text-[#c8b89a]'}`} />
                            </button>
                          </div>
                        ) : (
                          <div className="h-14 flex items-center justify-center bg-[#f5f0ea] gap-2">
                            <span className="text-xl">{cat?.icon || '🌿'}</span>
                            {item.type === 'veg' && (
                              <span className="text-[10px] text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Leaf className="w-2.5 h-2.5" /> Veg
                              </span>
                            )}
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start gap-2 mb-1">
                            <span className={`mt-0.5 w-3.5 h-3.5 border-2 rounded-sm flex-shrink-0 ${item.type === 'veg' ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'}`} />
                            <h4 className="font-semibold text-[#2c2420] text-sm leading-snug">{item.name}</h4>
                          </div>
                          <p className="text-[#9c8878] text-xs line-clamp-2 leading-relaxed mb-3 ml-5">{item.description}</p>
                          <div className="flex items-center justify-between ml-5">
                            <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                            {!item.available ? (
                              <span className="text-[10px] text-[#b0a090] font-medium">Sold Out</span>
                            ) : (
                              <button
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-semibold px-4 py-1.5 rounded-full text-white hover:opacity-85 transition-opacity shadow-sm"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                              >
                                Add
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
      <footer className="bg-[#2c2420] text-[#c8b89a] py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <Leaf className="w-4 h-4 text-green-400" />
              <h4 className="font-bold text-white">{restaurant.name}</h4>
            </div>
            <p className="text-[#9c8878] text-xs italic">{restaurant.tagline}</p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1 text-xs text-[#7a6655]">
            {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="hover:text-[#c8b89a]">{restaurant.phone}</a>}
            {restaurant.email && <a href={`mailto:${restaurant.email}`} className="hover:text-[#c8b89a]">{restaurant.email}</a>}
          </div>
        </div>
        <p className="text-[#5a4a3a] text-xs text-center mt-6">© 2026 {restaurant.name} · Powered by MenuMate</p>
      </footer>

      <MenuItemDetail item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} categories={categories} />
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
