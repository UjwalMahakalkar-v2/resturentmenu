/**
 * Template 6: Luxury Dining
 * Style: Ultra-premium, fine dining, Michelin-star aesthetic
 * Colors: Ivory/parchment bg, near-black, gold (theme primary) accents, serif typography feel
 * Target: Fine dining restaurants, 5-star hotels, tasting menu venues, high-end supper clubs
 */
import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Star } from 'lucide-react';
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

export default function LuxuryDiningTemplate({ restaurant, menuItems, categories, tenant }: Props) {
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

  const signatureDishes = useMemo(
    () => menuItems.filter(i => i.popular && i.available).slice(0, 3),
    [menuItems]
  );

  const mapsUrl = restaurant?.location
    ? `https://maps.google.com/?q=${encodeURIComponent(restaurant.location)}`
    : null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf8f3', color: '#1a1612' }}>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-[#faf8f3]/97 backdrop-blur-md border-b border-[#ddd0b8]/50">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo ? (
              <img src={restaurant.logo} alt="" className="w-9 h-9 object-contain rounded-sm" />
            ) : null}
            <div>
              <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-[#1a1612]">
                {restaurant.name}
              </h1>
              <p className="text-[9px] tracking-[0.2em] uppercase text-[#9a8878] hidden sm:block">{restaurant.tagline}</p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[11px] tracking-[0.2em] uppercase font-medium text-[#9a8878] hover:text-[#1a1612] transition-colors hidden sm:block"
            >
              Menu
            </button>
            {tenant && (
              <ReservationWidget
                tenantId={tenant.id}
                accent="var(--color-primary)"
                triggerClassName="text-[11px] tracking-[0.15em] uppercase font-medium px-4 py-2 border border-[#1a1612]/20 hover:border-[#1a1612] text-[#1a1612] transition-all hidden sm:block"
                label="Reserve"
                showIcon={false}
              />
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="sm:hidden">
                <Phone className="w-4 h-4 text-[#9a8878]" />
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* ── Full-Screen Hero ── */}
      <section className="relative h-[70vh] min-h-[400px] max-h-[700px] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1600&h=900&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-[#faf8f3]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <p className="text-[10px] tracking-[0.4em] uppercase mb-4 text-white/60"
            style={{ color: 'var(--color-primary)' }}>
            Est. Fine Dining
          </p>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight leading-none">
            {restaurant.name}
          </h2>
          <p className="text-white/60 text-sm sm:text-lg tracking-wide max-w-lg mb-8">
            {restaurant.tagline || 'An Unparalleled Dining Experience'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 text-[11px] tracking-[0.25em] uppercase font-semibold text-white border border-white/40 hover:bg-white hover:text-[#1a1612] transition-all duration-300"
            >
              View Menu
            </button>
            {tenant && (
              <ReservationWidget
                tenantId={tenant.id}
                accent="var(--color-primary)"
                triggerClassName="px-8 py-3 text-[11px] tracking-[0.25em] uppercase font-semibold text-[#1a1612] transition-opacity hover:opacity-90"
                triggerStyle={{ backgroundColor: 'var(--color-primary)' }}
                label="Reserve a Table"
                showIcon={false}
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Decorative divider ── */}
      <div className="flex items-center justify-center py-8 px-6">
        <div className="h-px flex-1 max-w-xs bg-[#ddd0b8]" />
        <span className="px-4 text-[#c8b090]" style={{ color: 'var(--color-primary)' }}>✦</span>
        <div className="h-px flex-1 max-w-xs bg-[#ddd0b8]" />
      </div>

      {/* ── Restaurant Story ── */}
      {restaurant.about && (
        <section className="pb-12 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#9a8878] mb-4">Our Philosophy</p>
            <p className="text-[#5a4a3a] text-sm sm:text-base leading-relaxed">{restaurant.about}</p>
          </div>
        </section>
      )}

      {/* ── Signature Dishes ── */}
      {signatureDishes.length > 0 && (
        <section className="py-12 px-6 bg-[#1a1612]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: 'var(--color-primary)' }}>Chef's Table</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">Signature Dishes</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {signatureDishes.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group cursor-pointer"
                >
                  <div className="relative h-56 sm:h-72 overflow-hidden mb-4">
                    {item.image ? (
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-5xl">
                        {categories.find(c => c.id === item.category)?.icon || '🍽️'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-3 h-3 fill-current" style={{ color: 'var(--color-primary)' }} />
                        <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: 'var(--color-primary)' }}>Signature</span>
                      </div>
                      <h4 className="text-white font-bold text-base">{item.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[#9a8878] text-xs line-clamp-1 flex-1">{item.description}</p>
                    <span className="font-bold text-base ml-4 flex-shrink-0" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Decorative divider ── */}
      <div className="flex items-center justify-center py-10 px-6">
        <div className="h-px flex-1 max-w-xs bg-[#ddd0b8]" />
        <span className="px-4" style={{ color: 'var(--color-primary)' }}>✦</span>
        <div className="h-px flex-1 max-w-xs bg-[#ddd0b8]" />
      </div>

      {/* ── Menu Heading ── */}
      <div ref={menuRef} className="text-center px-6 mb-8 scroll-mt-14">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#9a8878] mb-2">À La Carte</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-[#1a1612]">Our Menu</h3>
      </div>

      {/* ── Sticky Search + Filters ── */}
      <div className="sticky top-[57px] z-40 bg-[#faf8f3]/97 backdrop-blur-md border-b border-[#ddd0b8]/50">
        <div className="max-w-4xl mx-auto px-6 py-3 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#b0a090]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search the menu..."
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#ddd0b8] text-sm text-[#1a1612] placeholder-[#b0a090] outline-none focus:border-[#c0a878] transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0a090] hover:text-[#5a4a3a]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-wider uppercase font-semibold border transition-all flex-shrink-0 ${
                vegOnly
                  ? 'bg-green-700 border-green-700 text-white'
                  : 'bg-white border-[#ddd0b8] text-[#9a8878] hover:border-[#c0a878]'
              }`}
            >
              <span className={`inline-block w-3 h-3 border-2 ${vegOnly ? 'border-white bg-white/20' : 'border-green-600'} rounded-sm`} />
              Veg
            </button>
          </div>
          {/* Category tabs */}
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`text-[11px] tracking-[0.2em] uppercase font-semibold whitespace-nowrap pb-2 border-b-2 transition-all flex-shrink-0 ${
                activeCategory === 'all' ? 'text-[#1a1612]' : 'border-transparent text-[#b0a090] hover:text-[#5a4a3a]'
              }`}
              style={activeCategory === 'all' ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}
            >
              All
            </button>
            {sortedCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-[11px] tracking-[0.2em] uppercase font-semibold whitespace-nowrap pb-2 border-b-2 transition-all flex-shrink-0 ${
                  activeCategory === cat.id ? '' : 'border-transparent text-[#b0a090] hover:text-[#5a4a3a]'
                }`}
                style={activeCategory === cat.id ? { borderBottomColor: 'var(--color-primary)', color: 'var(--color-primary)' } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Menu Items — Elegant List Layout ── */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[#b0a090] mb-8">{filteredItems.length} preparations</p>
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-24">
            <p className="text-2xl mb-2">🕯️</p>
            <p className="text-[#9a8878] tracking-wide">No dishes found.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([catId, items]) => {
            const cat = categories.find(c => c.id === catId);
            return (
              <div key={catId} className="mb-12">
                {activeCategory === 'all' && (
                  <div className="mb-6">
                    <p className="text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-primary)' }}>
                      {cat?.icon} Course
                    </p>
                    <h3 className="text-lg font-bold text-[#1a1612] tracking-wide">{cat?.name || 'Other'}</h3>
                    <div className="w-12 h-px mt-2" style={{ backgroundColor: 'var(--color-primary)' }} />
                  </div>
                )}
                <div className="space-y-0 divide-y divide-[#ede5d8]">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group flex gap-4 py-5 cursor-pointer hover:bg-[#f5f0e8]/50 transition-colors px-2 -mx-2"
                    >
                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1.5">
                          <span className={`mt-1 w-3 h-3 border-2 rounded-sm flex-shrink-0 ${item.type === 'veg' ? 'border-green-600' : 'border-red-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-[#1a1612] text-sm tracking-wide">{item.name}</h4>
                              {item.popular && (
                                <span className="text-[9px] tracking-[0.15em] uppercase font-semibold px-2 py-0.5"
                                  style={{ color: 'var(--color-primary)', backgroundColor: 'transparent', border: '1px solid var(--color-primary)' }}>
                                  Signature
                                </span>
                              )}
                              {!item.available && (
                                <span className="text-[9px] tracking-wider uppercase text-[#b0a090]">Unavailable</span>
                              )}
                            </div>
                            <p className="text-[#9a8878] text-xs leading-relaxed mt-1 line-clamp-2">{item.description}</p>
                          </div>
                        </div>
                      </div>
                      {/* Image (small thumbnail) + Price */}
                      <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
                        {item.hasImage && item.image && (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-sm">
                            <img src={item.image} alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                          </div>
                        )}
                        <span className="font-bold text-base tabular-nums" style={{ color: 'var(--color-primary)' }}>
                          ₹{item.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Contact Section ── */}
      <section className="py-16 px-6 bg-[#1a1612] text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="h-px flex-1 bg-white/10" />
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--color-primary)' }}>Visit Us</p>
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                <span className="tracking-wide">{restaurant.phone}</span>
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                <span className="tracking-wide">{restaurant.email}</span>
              </a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <MapPin className="w-4 h-4" />
                <span className="tracking-wide">{restaurant.location}</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black py-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h4 className="text-xs tracking-[0.4em] uppercase font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
            {restaurant.name}
          </h4>
          <p className="text-white/20 text-xs tracking-wide">© 2026 {restaurant.name} · Powered by MenuMate</p>
        </div>
      </footer>

      <MenuItemDetail item={selectedItem} isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} categories={categories} />
      {tenant && <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />}
    </div>
  );
}
