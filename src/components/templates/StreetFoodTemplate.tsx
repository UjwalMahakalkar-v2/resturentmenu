/**
 * Template 4: Street Food
 * Style: Bold, vibrant, energetic — night market / food-truck festival vibe
 * Colors: Deep charcoal background, electric theme-primary accent, neon price tags
 * Target: Street food stalls, food courts, fast food, dhaba, casual eating
 */
import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, MapPin, Flame, Zap } from 'lucide-react';
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

export default function StreetFoodTemplate({ restaurant, menuItems, categories, tenant }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
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

  const bestSellers = useMemo(
    () => menuItems.filter(i => i.popular && i.available).slice(0, 5),
    [menuItems]
  );

  const mapsUrl = restaurant?.location
    ? `https://maps.google.com/?q=${encodeURIComponent(restaurant.location)}`
    : null;

  const itemCount = (catId: string) => menuItems.filter(i => i.category === catId && i.available).length;

  return (
    <div className="min-h-screen bg-[#111318] text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#111318]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="" className="w-9 h-9 rounded-lg object-contain flex-shrink-0 border border-white/10" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl bg-white/5 flex-shrink-0">🍜</div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-base leading-tight truncate" style={{ color: 'var(--color-primary)' }}>
                {restaurant.name || 'Restaurant'}
              </h1>
              <p className="text-[10px] text-white/40 truncate hidden sm:block">{restaurant.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 hover:border-white/20 transition-colors text-white/70 hover:text-white">
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{restaurant.phone}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative h-[260px] sm:h-[380px] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1400&h=600&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111318] via-[#111318]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center px-6 sm:px-10">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-3 border"
              style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', color: '#000' }}>
              <Zap className="w-3 h-3" /> FRESH & HOT
            </div>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-3 text-white">
              {restaurant.name}
            </h2>
            <p className="text-white/60 text-sm sm:text-base mb-5">{restaurant.tagline || 'Street food at its best'}</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-6 py-2.5 rounded-xl font-extrabold text-sm shadow-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
              >
                Order Now →
              </button>
              {tenant && (
                <ReservationWidget
                  tenantId={tenant.id}
                  accent="var(--color-primary)"
                  triggerClassName="px-6 py-2.5 rounded-xl font-extrabold text-sm border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
                  label="Reserve a Table"
                />
              )}
              {restaurant.enableShareMenu !== false && (
                <ShareMenuButton title={restaurant.name} label="Share" triggerClassName="px-6 py-2.5 rounded-xl font-extrabold text-sm border-2 border-white/30 text-white hover:bg-white/10 transition-colors" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact strip ── */}
      {(restaurant.phone || restaurant.location) && (
        <div className="bg-[#1a1d24] border-y border-white/5">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center gap-4 text-xs text-white/40">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
              </a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MapPin className="w-3.5 h-3.5" /> {restaurant.location}
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Best Sellers ── */}
      {bestSellers.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-black text-white uppercase tracking-wide">Best Sellers</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {bestSellers.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="flex-shrink-0 w-36 sm:w-44 cursor-pointer group"
                >
                  <div className="relative h-28 sm:h-36 rounded-xl overflow-hidden bg-white/5 mb-2">
                    {item.image ? (
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        {categories.find(c => c.id === item.category)?.icon || '🍽️'}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                      style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>
                      <Flame className="w-2.5 h-2.5" /> HOT
                    </div>
                  </div>
                  <p className="text-white text-xs font-bold line-clamp-1">{item.name}</p>
                  <p className="font-black text-base mt-0.5" style={{ color: 'var(--color-primary)' }}>₹{item.price}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Sticky Search + Categories ── */}
      <div ref={menuRef} className="scroll-mt-14">
        <div className="sticky top-[57px] z-40 bg-[#111318]/97 backdrop-blur-md border-b border-white/10 py-3">
          <div className="max-w-5xl mx-auto px-4 space-y-3">
            {/* Search + veg toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search dishes..."
                  className="w-full pl-9 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-white/25 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex-shrink-0 ${
                  vegOnly ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                <span className="inline-block w-3 h-3 border-2 border-green-500 rounded-sm" />
                Veg
              </button>
            </div>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === 'all' ? 'text-black shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
                style={activeCategory === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
              >
                All
              </button>
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
                    activeCategory === cat.id ? 'text-black shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: 'var(--color-primary)' } : {}}
                >
                  <span>{cat.icon || '🍽️'}</span>
                  {cat.name}
                  <span className={`text-[9px] px-1 rounded ${activeCategory === cat.id ? 'bg-black/20 text-black/60' : 'bg-white/10 text-white/40'}`}>
                    {itemCount(cat.id)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-xs text-white/25 mb-5 font-bold uppercase tracking-widest">{filteredItems.length} items</p>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-20">
              <p className="text-3xl mb-2">🍽️</p>
              <p className="text-white/40">No dishes found.</p>
            </div>
          ) : (
            Object.entries(groupedItems).map(([catId, items]) => {
              const cat = categories.find(c => c.id === catId);
              return (
                <div key={catId} className="mb-10">
                  {activeCategory === 'all' && (
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{cat?.icon || '🍽️'}</span>
                      <h3 className="font-black text-white text-base uppercase tracking-wide">{cat?.name || 'Other'}</h3>
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] text-white/30 font-bold">{items.length} items</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group flex gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:border-white/20 hover:bg-white/[0.07] cursor-pointer transition-all"
                      >
                        {/* Image */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                          {item.hasImage && item.image ? (
                            <img src={item.image} alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">{cat?.icon || '🍽️'}</div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`w-3 h-3 border-2 rounded-sm flex-shrink-0 ${item.type === 'veg' ? 'border-green-500 bg-green-500/20' : 'border-red-500 bg-red-500/20'}`} />
                              <h4 className="text-white font-bold text-sm line-clamp-1">{item.name}</h4>
                              {item.popular && (
                                <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-white/40 text-xs line-clamp-2 leading-relaxed">{item.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-black text-lg leading-none" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                            {!item.available ? (
                              <span className="text-[10px] font-bold text-white/25 uppercase">Sold Out</span>
                            ) : (
                              <button
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-extrabold px-4 py-1.5 rounded-lg transition-all hover:opacity-80"
                                style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}
                              >
                                ADD+
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
      <footer className="bg-[#0a0c10] border-t border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-black text-white" style={{ color: 'var(--color-primary)' }}>{restaurant.name}</p>
            <p className="text-white/30 text-xs">{restaurant.tagline}</p>
          </div>
          <p className="text-white/20 text-xs">© 2026 {restaurant.name} · Powered by MenuMate</p>
        </div>
      </footer>

      <MenuItemDetail item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} categories={categories} />
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
