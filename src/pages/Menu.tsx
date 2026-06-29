import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '@/services/api';
import { applyTheme } from '@/contexts/ThemeContext';
import { getTenantSubdomainHost } from '@/utils/tenantHost';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import CategoryTabs from '@/components/CategoryTabs';
import CategorySelection from '@/components/CategorySelection';
import MenuCard from '@/components/MenuCard';
import MenuItemDetail from '@/components/MenuItemDetail';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import AnnouncementBar from '@/components/AnnouncementBar';
import ModernBistroTemplate from '@/components/templates/ModernBistroTemplate';
import PremiumDarkTemplate from '@/components/templates/PremiumDarkTemplate';
import StreetFoodTemplate from '@/components/templates/StreetFoodTemplate';
import OrganicCafeTemplate from '@/components/templates/OrganicCafeTemplate';
import LuxuryDiningTemplate from '@/components/templates/LuxuryDiningTemplate';
import { Loader2, ArrowLeft, Search, X } from 'lucide-react';
import ReservationWidget from '@/components/ReservationWidget';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import type { Restaurant, MenuTemplate } from '@/types';

const DEFAULT_RESTAURANT: Restaurant = {
  name: 'Restaurant',
  tagline: 'Delicious food, served with love',
  logo: '',
  heroImage: '',
  phone: '',
  email: '',
  location: '',
  about: 'Welcome to our restaurant.',
};

export default function Menu() {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const [menuItems, setMenuItems] = useState<TenantMenuItem[]>([]);
  const [categories, setCategories] = useState<TenantCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [template, setTemplate] = useState<MenuTemplate>('classic');
  const [restaurant, setRestaurant] = useState<Restaurant>(DEFAULT_RESTAURANT);
  const menuSectionRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Single combined bootstrap: tenant + settings + categories + menu in one request.
  // All theme/template/data state is set together before loading flips false, so the
  // page never renders the default template before the tenant's real theme is known.
  useEffect(() => {
    // Path-based access uses the /:tenantSlug param; subdomain access (pizza.menumate.in)
    // has no slug, so fall back to resolving the tenant by the current host.
    const subdomainHost = tenantSlug ? null : getTenantSubdomainHost();
    if (!tenantSlug && !subdomainHost) { setLoading(false); return; }
    let cancelled = false;
    // initial=true shows the full-screen loader (gates the first paint until the
    // tenant's template/theme are known — prevents flashing the default template).
    // Background refreshes (admin edit events) refresh data silently, no blank screen.
    const load = async (initial = false) => {
      if (initial) setLoading(true);
      const data = await publicAPI.getBootstrap(
        tenantSlug ? { slug: tenantSlug } : { subdomain: subdomainHost! },
      );
      if (cancelled) return;
      if (!data || !data.tenant) { setLoading(false); return; }
      setTenant(data.tenant);
      const r: Restaurant = { ...DEFAULT_RESTAURANT, ...(data.settings || {}) };
      setRestaurant(r);
      if (r.theme) applyTheme(r.theme);
      if (r.template) setTemplate(r.template);
      setMenuItems((data.menu || []) as TenantMenuItem[]);
      setCategories((data.categories || []) as TenantCategory[]);
      setLoading(false);
    };
    load(true);
    const onUpdate = () => load(false);
    window.addEventListener('restaurant-updated', onUpdate);
    window.addEventListener('menu-updated', onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('restaurant-updated', onUpdate);
      window.removeEventListener('menu-updated', onUpdate);
    };
  }, [tenantSlug]);

  // Preconnect to the image (R2) host so the first images don't pay full TLS/DNS
  // setup cost. The host is a deploy-time env var, so derive it from a real image URL.
  useEffect(() => {
    const sample = restaurant.heroImage || restaurant.logo || menuItems.find(m => m.image)?.image || '';
    if (!/^https?:\/\//.test(sample)) return;
    let origin = '';
    try { origin = new URL(sample).origin; } catch { return; }
    if (origin === window.location.origin) return; // same-origin needs no preconnect
    if (document.head.querySelector(`link[data-img-preconnect="${origin}"]`)) return;
    for (const rel of ['preconnect', 'dns-prefetch']) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = origin;
      if (rel === 'preconnect') link.crossOrigin = 'anonymous';
      link.setAttribute('data-img-preconnect', origin);
      document.head.appendChild(link);
    }
  }, [restaurant.heroImage, restaurant.logo, menuItems]);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 100);
    }
  }, [mobileSearchOpen]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setShowCategorySelection(false);
    setTimeout(() => menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleBackToCategories = () => {
    setShowCategorySelection(true);
    setActiveCategory('');
    setSearchQuery('');
    setMobileSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToMenu = () => {
    setActiveCategory('all');
    setShowCategorySelection(false);
    setTimeout(() => menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (vegOnly && item.type !== 'veg') return false;
      if (activeCategory && activeCategory !== 'all' && item.category !== activeCategory) return false;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Loader2 className="w-12 h-12 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // Announcement bar renders above every template; self-gates (returns null when inactive)
  const announcementEl = <AnnouncementBar announcement={restaurant.announcement} />;

  // ── Template 2: Modern Bistro ──
  if (template === 'modern-bistro') {
    return (
      <>
        {announcementEl}
        <ModernBistroTemplate
          restaurant={restaurant}
          menuItems={menuItems}
          categories={categories}
          tenant={tenant}
        />
      </>
    );
  }

  // ── Template 3: Premium Dark ──
  if (template === 'premium-dark') {
    return (
      <>
        {announcementEl}
        <PremiumDarkTemplate
          restaurant={restaurant}
          menuItems={menuItems}
          categories={categories}
          tenant={tenant}
        />
      </>
    );
  }

  // ── Template 4: Street Food ──
  if (template === 'street-food') {
    return (
      <>
        {announcementEl}
        <StreetFoodTemplate
          restaurant={restaurant}
          menuItems={menuItems}
          categories={categories}
          tenant={tenant}
        />
      </>
    );
  }

  // ── Template 5: Organic Cafe ──
  if (template === 'organic-cafe') {
    return (
      <>
        {announcementEl}
        <OrganicCafeTemplate
          restaurant={restaurant}
          menuItems={menuItems}
          categories={categories}
          tenant={tenant}
        />
      </>
    );
  }

  // ── Template 6: Luxury Dining ──
  if (template === 'luxury-dining') {
    return (
      <>
        {announcementEl}
        <LuxuryDiningTemplate
          restaurant={restaurant}
          menuItems={menuItems}
          categories={categories}
          tenant={tenant}
        />
      </>
    );
  }

  // ── Template 1: Classic (default) ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {announcementEl}
      <Header restaurant={restaurant} />
      <Hero restaurant={restaurant} onViewMenu={scrollToMenu} />

      {/* Reserve a Table CTA */}
      {tenant && (
        <div className="container-custom py-4 flex justify-center">
          <ReservationWidget
            tenantId={tenant.id}
            accent="var(--color-primary)"
            triggerClassName="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white shadow-md transition-transform hover:scale-105 active:scale-95"
            triggerStyle={{ background: 'var(--color-primary)' }}
          />
        </div>
      )}

      {/* Category Selection */}
      {showCategorySelection && (
        <CategorySelection
          categories={categories}
          onCategorySelect={handleCategorySelect}
        />
      )}

      {/* Menu Section */}
      {!showCategorySelection && (
        <section ref={menuSectionRef} className="py-6 sm:py-10 mobile-bottom-offset">
          {/* Top bar: back button + mobile search toggle */}
          <div className="container-custom mb-4 flex items-center justify-between gap-3">
            <button
              onClick={handleBackToCategories}
              className="flex items-center gap-2 font-medium transition-colors hover:opacity-70 active:opacity-50 min-h-[44px] px-2"
              style={{ color: 'var(--color-primary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Categories</span>
            </button>

            {/* Mobile search toggle button */}
            <button
              onClick={() => setMobileSearchOpen(o => !o)}
              className="sm:hidden p-2.5 rounded-full text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
              aria-label="Search"
            >
              {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Search bar — full width on mobile (collapsible), inline on tablet+ */}
          {(mobileSearchOpen) && (
            <div className="container-custom mb-4 sm:hidden animate-slide-up">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search dishes…"
                className="w-full px-5 py-3 rounded-full bg-white shadow-md outline-none text-gray-700 placeholder-gray-400"
                style={{ minHeight: '44px', boxShadow: '0 0 0 2px var(--color-primary)' }}
              />
            </div>
          )}

          {/* Desktop search bar */}
          <div className="container-custom mb-6 hidden sm:block">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search for dishes, categories…" />
          </div>

          {/* Category Tabs */}
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Filter bar */}
          <div className="container-custom mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>

            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-full shadow-sm border border-gray-200 hover:shadow-md transition-shadow min-h-[44px]">
              <span className={`text-xs sm:text-sm font-medium transition-colors ${vegOnly ? 'text-gray-400' : 'text-gray-700'}`}>All</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
              </div>
              <span className={`text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 ${vegOnly ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="inline-block w-3 h-3 border-2 border-green-600 rounded-sm bg-white" />
                Veg
              </span>
            </label>
          </div>

          {/* Menu Grid */}
          <div className="container-custom mt-5">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600">
                  {searchQuery ? 'No dishes found matching your search.' : 'No dishes available in this category.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredItems.map((item) => (
                  <MenuCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-dark text-white py-8 mt-8">
        <div className="container-custom text-center">
          <p className="text-gray-400 text-sm">
            © 2026 {restaurant.name}. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs mt-1">Powered by MenuMate</p>
        </div>
      </footer>

      {/* Item Detail Modal */}
      <MenuItemDetail
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        categories={categories}
      />

      {/* Floating Social Buttons */}
      {tenant && (
        <FloatingSocialButtons restaurant={restaurant} tenantId={tenant.id} />
      )}
    </div>
  );
}
