/**
 * Template 3: Premium Dark
 * Style: Modern, luxury, dark mode, premium
 * Colors: Black, dark gray, gold accents, white text (theme primary = gold accent)
 * Target: Lounges, rooftop restaurants, bars, premium dining
 */
import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Star, Heart, UtensilsCrossed } from 'lucide-react';
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

export default function PremiumDarkTemplate({ restaurant, menuItems, categories, tenant }: Props) {
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

  const accent = 'var(--color-primary)';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Full-Screen Hero ── */}
      <section className="relative h-screen max-h-[800px] min-h-[500px] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=900&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/60 to-black/30" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt="" className="w-10 h-10 rounded-full border-2 object-contain" style={{ borderColor: accent }} />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white/10 backdrop-blur-md" style={{ borderColor: accent }}>
                  <UtensilsCrossed className="w-5 h-5" style={{ color: accent }} />
                </div>
              )}
              <span className="font-bold text-lg tracking-wider uppercase text-white/90">{restaurant.name}</span>
            </div>
            <div className="flex items-center gap-3">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
                </a>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="sm:hidden p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                  <Phone className="w-4 h-4 text-white" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: accent }}>Welcome to</p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-4">{restaurant.name}</h1>
          <p className="text-white/60 text-base sm:text-xl max-w-xl mb-8">{restaurant.tagline || 'An Exclusive Dining Experience'}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 border-2 text-sm font-medium tracking-wider uppercase hover:bg-white hover:text-black transition-all duration-300"
              style={{ borderColor: accent, color: accent }}
            >
              Explore Menu
            </button>
            {tenant && (
              <ReservationWidget
                tenantId={tenant.id}
                accent="var(--color-primary)"
                triggerClassName="px-8 py-3 text-sm font-medium tracking-wider uppercase transition-opacity hover:opacity-90"
                triggerStyle={{ backgroundColor: accent, color: '#0a0a0a' }}
                label="Reserve a Table"
                showIcon={false}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Restaurant Story ── */}
      {restaurant.about && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: accent }}>Our Story</p>
            <p className="text-white/50 text-base leading-relaxed">{restaurant.about}</p>
            <div className="w-16 h-px mx-auto mt-6" style={{ backgroundColor: accent }} />
          </div>
        </section>
      )}

      {/* ── Featured Dishes ── */}
      {popularItems.length > 0 && (
        <section className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: accent }}>Chef's Selection</p>
            <h2 className="text-3xl font-bold mb-8">Featured Dishes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer relative rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/25 transition-all duration-300"
                >
                  {item.image ? (
                    <div className="h-48 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-white/5">
                      <span className="text-5xl opacity-30">🍽️</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-3 h-3 border rounded-sm flex items-center justify-center ${item.type === 'veg' ? 'border-green-400' : 'border-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-400' : 'bg-red-400'}`} />
                      </span>
                      <h4 className="font-semibold text-white text-sm line-clamp-1">{item.name}</h4>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg" style={{ color: accent }}>₹{item.price}</span>
                      <Star className="w-4 h-4 fill-current" style={{ color: accent }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Menu Section ── */}
      <div ref={menuRef} className="scroll-mt-4">
        {/* Sticky filters */}
        <div className="sticky top-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-3 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search dishes..."
                  className="w-full pl-10 pr-9 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-white/30 transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setVegOnly(!vegOnly)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex-shrink-0 ${
                  vegOnly ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                <span className={`w-3 h-3 rounded-sm border-2 ${vegOnly ? 'border-green-400 bg-green-400' : 'border-green-500'} flex items-center justify-center`}>
                  {vegOnly && <span className="w-1 h-1 bg-green-900 rounded-full" />}
                </span>
                Veg
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === 'all' ? 'text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                }`}
                style={activeCategory === 'all' ? { backgroundColor: accent } : {}}
              >
                All
              </button>
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat.id ? 'text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                  }`}
                  style={activeCategory === cat.id ? { backgroundColor: accent } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="max-w-7xl mx-auto px-6 py-10">
          <p className="text-xs text-white/30 mb-6">{filteredItems.length} items</p>
          {Object.keys(groupedItems).length === 0 ? (
            <div className="text-center py-20"><p className="text-lg text-white/40">No dishes found.</p></div>
          ) : (
            Object.entries(groupedItems).map(([catId, items]) => {
              const cat = categories.find(c => c.id === catId);
              return (
                <div key={catId} className="mb-12">
                  {activeCategory === 'all' && (
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-1">{cat?.name || 'Other'}</h3>
                      <div className="w-8 h-0.5" style={{ backgroundColor: accent }} />
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group flex gap-4 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] cursor-pointer transition-all duration-300"
                      >
                        {/* Thumbnail */}
                        {item.hasImage && item.image ? (
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {item.popular && (
                              <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: accent, color: '#000' }}>
                                <Star className="w-2.5 h-2.5 fill-current" /> Popular
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl opacity-30">{cat?.icon || '🍽️'}</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center ${
                                item.type === 'veg' ? 'border-green-400' : 'border-red-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-400' : 'bg-red-400'}`} />
                              </span>
                              <h4 className="font-semibold text-white text-sm line-clamp-1">{item.name}</h4>
                            </div>
                            <p className="text-xs text-white/40 line-clamp-2">{item.description}</p>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-lg font-bold" style={{ color: accent }}>₹{item.price}</span>
                            <div className="flex items-center gap-2">
                              {!item.available && (
                                <span className="text-[10px] text-white/30 uppercase tracking-wider">Sold Out</span>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                                className="p-1"
                              >
                                <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-white/20 group-hover:text-white/40'}`} />
                              </button>
                              {item.available && (
                                <button
                                  onClick={e => e.stopPropagation()}
                                  className="text-[11px] font-semibold px-3 py-1 rounded-lg border transition-all duration-300 hover:text-black"
                                  style={{ borderColor: accent, color: accent }}
                                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = e.currentTarget.style.borderColor; e.currentTarget.style.color = '#000'; }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = String(accent); }}
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
      </div>

      {/* ── Contact Section ── */}
      <section className="py-12 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: accent }}>Visit Us</p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/40 text-sm">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-4 h-4" /> {restaurant.phone}
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-4 h-4" /> {restaurant.email}
              </a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MapPin className="w-4 h-4" /> {restaurant.location}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h4 className="font-bold tracking-wider uppercase text-sm" style={{ color: accent }}>{restaurant.name}</h4>
          <p className="text-white/20 text-xs mt-2">© 2026 {restaurant.name} · Powered by MenuMate</p>
        </div>
      </footer>

      <MenuItemDetail item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} categories={categories} />
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
