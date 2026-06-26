import { useState, useMemo, useRef } from 'react';
import { Search, X, Phone, Mail, MapPin, Star, Heart, UtensilsCrossed } from 'lucide-react';
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

export default function ElegantTemplate({ restaurant, menuItems, categories, tenant }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [menuItems, searchQuery, categories, vegOnly]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, TenantMenuItem[]> = {};
    sortedCategories.forEach(cat => {
      const items = filteredItems.filter(i => i.category === cat.id);
      if (items.length > 0) groups[cat.id] = items;
    });
    return groups;
  }, [filteredItems, sortedCategories]);

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

  const scrollToCategory = (catId: string) => {
    document.getElementById(`cat-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Full-Screen Hero ── */}
      <div className="relative h-[70vh] sm:h-[80vh] overflow-hidden">
        <img
          src={restaurant.heroImage || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&h=900&fit=crop'}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

        {/* Logo + Name */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          {restaurant.logo ? (
            <img src={restaurant.logo} alt="" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 object-contain mb-5 shadow-2xl" />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white/30 flex items-center justify-center mb-5 bg-white/10 backdrop-blur-md">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
          )}
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tight mb-3">
            {restaurant.name}
          </h1>
          <p className="text-gray-200 text-base sm:text-xl font-light max-w-xl">
            {restaurant.tagline || 'A Culinary Experience'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-5 text-gray-300 text-xs sm:text-sm">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
              </a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5" /> {restaurant.email}
              </a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MapPin className="w-3.5 h-3.5" /> {restaurant.location}
              </a>
            )}
          </div>
          <button
            onClick={() => menuRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-8 px-8 py-3 border-2 border-white/60 text-white rounded-full hover:bg-white hover:text-gray-900 transition-all font-medium text-sm tracking-wide"
          >
            Explore Menu
          </button>
        </div>
      </div>

      {/* ── Category Quick Nav ── */}
      <div ref={menuRef} className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-1">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-8 py-3 text-sm outline-none bg-transparent border-b-2 border-transparent focus:border-gray-900 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Category links */}
            <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
              {sortedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-3 whitespace-nowrap transition-colors tracking-wide uppercase"
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Veg filter */}
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 ${
                vegOnly ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full border-2 ${vegOnly ? 'border-green-600 bg-green-600' : 'border-green-600'}`} />
              Veg
            </button>
          </div>
        </div>
      </div>

      {/* ── Menu Sections ── */}
      <div className="max-w-5xl mx-auto px-4 py-10">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="text-center py-24">
            <p className="text-xl text-gray-400 font-light">No dishes found.</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([catId, items]) => {
            const cat = categories.find(c => c.id === catId);
            return (
              <section key={catId} id={`cat-${catId}`} className="mb-16 scroll-mt-16">
                {/* Category header */}
                <div className="text-center mb-8">
                  <span className="text-3xl mb-2 block">{cat?.icon || '🍽️'}</span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">
                    {cat?.name || 'Menu'}
                  </h2>
                  <div className="w-12 h-0.5 mx-auto mt-3" style={{ backgroundColor: 'var(--color-primary)' }} />
                </div>

                {/* Items */}
                <div className="space-y-4">
                  {items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group cursor-pointer"
                    >
                      {item.hasImage && item.image ? (
                        /* Card with image — horizontal layout */
                        <div className="flex gap-5 items-start p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            {item.popular && (
                              <span className="absolute top-2 left-2 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" /> Popular
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${
                                item.type === 'veg' ? 'border-green-600' : 'border-red-600'
                              }`}>
                                <span className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                              </span>
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3 font-light leading-relaxed">{item.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                              <div className="flex items-center gap-2">
                                {!item.available && (
                                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Sold Out</span>
                                )}
                                <button
                                  onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                                  className="p-1.5"
                                >
                                  <Heart className={`w-4 h-4 transition-colors ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-300 group-hover:text-gray-400'}`} />
                                </button>
                                {item.available && (
                                  <button
                                    onClick={e => e.stopPropagation()}
                                    className="text-xs font-medium px-4 py-1.5 rounded-full border-2 transition-all hover:text-white"
                                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                                  >
                                    Add
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Text-only item — elegant line layout */
                        <div className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors">
                          <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center flex-shrink-0 ${
                            item.type === 'veg' ? 'border-green-600' : 'border-red-600'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                              {item.popular && (
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-400 line-clamp-1 font-light">{item.description}</p>
                            )}
                          </div>
                          <span className="text-sm text-gray-400 tracking-widest">{'·'.repeat(10)}</span>
                          <span className="font-bold whitespace-nowrap" style={{ color: 'var(--color-primary)' }}>₹{item.price}</span>
                          <button
                            onClick={e => { e.stopPropagation(); toggleFav(item.id); }}
                            className="p-1"
                          >
                            <Heart className={`w-3.5 h-3.5 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* ── About Section ── */}
      {restaurant.about && (
        <div className="bg-gray-50 py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-4">Our Story</h2>
            <div className="w-12 h-0.5 mx-auto mb-6" style={{ backgroundColor: 'var(--color-primary)' }} />
            <p className="text-gray-600 leading-relaxed font-light">{restaurant.about}</p>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h3 className="text-xl font-serif font-bold mb-2">{restaurant.name}</h3>
          <p className="text-gray-400 text-sm font-light">{restaurant.tagline}</p>
          <div className="flex items-center justify-center gap-6 mt-4 text-gray-500 text-xs">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="hover:text-white transition-colors">{restaurant.phone}</a>
            )}
            {restaurant.email && (
              <a href={`mailto:${restaurant.email}`} className="hover:text-white transition-colors">{restaurant.email}</a>
            )}
            {restaurant.location && mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{restaurant.location}</a>
            )}
          </div>
          <p className="text-gray-700 text-xs mt-6">© 2026 {restaurant.name} · Powered by MenuMate</p>
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
