import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMenu } from '@/hooks/useMenu';
import { restaurantService } from '@/services/restaurantService';
import { publicAPI } from '@/services/api';
import { applyTheme } from '@/contexts/ThemeContext';
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
import { Loader2, ArrowLeft, Search, X, CalendarCheck } from 'lucide-react';
import { publicReservationsAPI } from '@/services/api';
import type { TenantMenuItem } from '@/types/tenant';
import type { Restaurant, MenuTemplate } from '@/types';

export default function Menu() {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null);
  const { menuItems, categories, loading } = useMenu(tenant?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [template, setTemplate] = useState<MenuTemplate>('classic');
  const [posEnabled, setPosEnabled] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    reservationDate: '', reservationTime: '', partySize: 2, notes: '',
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant>({
    name: '',
    tagline: '',
    logo: '',
    heroImage: '',
    phone: '',
    email: '',
    location: '',
    about: '',
  });
  const menuSectionRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Load tenant by slug
  useEffect(() => {
    if (!tenantSlug) return;
    publicAPI.getTenantBySlug(tenantSlug)
      .then(t => setTenant(t))
      .catch(console.error);
  }, [tenantSlug]);

  // Load restaurant settings + apply theme (only when we have a real tenantId)
  useEffect(() => {
    if (!tenant?.id) return;
    const load = async () => {
      const r = await restaurantService.get(tenant.id);
      setRestaurant(r);
      if (r.theme) applyTheme(r.theme);
      if (r.template) setTemplate(r.template);
      if ((r as any).posEnabled) setPosEnabled(true);
    };
    load();
  }, [tenant?.id]);

  useEffect(() => {
    if (!tenant?.id) return;
    const handleUpdate = async () => {
      const r = await restaurantService.get(tenant.id);
      setRestaurant(r);
      if (r.theme) applyTheme(r.theme);
      if (r.template) setTemplate(r.template);
    };
    window.addEventListener('restaurant-updated', handleUpdate);
    return () => window.removeEventListener('restaurant-updated', handleUpdate);
  }, [tenant?.id]);

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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setBookingSubmitting(true);
    try {
      const res = await publicReservationsAPI.create({
        tenantId: tenant.id,
        ...bookingForm,
        customerEmail: bookingForm.customerEmail || undefined,
        notes: bookingForm.notes || undefined,
      });
      setBookingSuccess(res.id);
      setBookingForm({ customerName: '', customerPhone: '', customerEmail: '', reservationDate: '', reservationTime: '', partySize: 2, notes: '' });
    } catch {
      alert('Failed to submit booking. Please try again.');
    } finally {
      setBookingSubmitting(false);
    }
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
      {posEnabled && (
        <div className="container-custom py-4 flex justify-center">
          <button
            onClick={() => { setShowBooking(true); setBookingSuccess(null); }}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            <CalendarCheck className="w-4 h-4" />
            Reserve a Table
          </button>
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

      {/* Booking Modal */}
      {showBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowBooking(false); setBookingSuccess(null); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-lg font-bold text-gray-900">Reserve a Table</h2>
              </div>
              <button
                onClick={() => { setShowBooking(false); setBookingSuccess(null); }}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              ><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-5">
              {bookingSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Received!</h3>
                  <p className="text-gray-500 text-sm mb-1">We'll confirm your reservation shortly.</p>
                  <p className="text-xs text-gray-400 font-mono">Ref: {bookingSuccess}</p>
                  <button
                    onClick={() => { setShowBooking(false); setBookingSuccess(null); }}
                    className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
                    style={{ background: 'var(--color-primary)' }}
                  >Done</button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Your Name *</label>
                      <input required value={bookingForm.customerName} onChange={e => setBookingForm(f => ({ ...f, customerName: e.target.value }))}
                        placeholder="Full name" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{'--tw-ring-color':'var(--color-primary)'} as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                      <input required type="tel" value={bookingForm.customerPhone} onChange={e => setBookingForm(f => ({ ...f, customerPhone: e.target.value }))}
                        placeholder="+91 98765..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{'--tw-ring-color':'var(--color-primary)'} as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                      <input type="email" value={bookingForm.customerEmail} onChange={e => setBookingForm(f => ({ ...f, customerEmail: e.target.value }))}
                        placeholder="optional" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{'--tw-ring-color':'var(--color-primary)'} as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                      <input required type="date" value={bookingForm.reservationDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={e => setBookingForm(f => ({ ...f, reservationDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{'--tw-ring-color':'var(--color-primary)'} as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Time *</label>
                      <select required value={bookingForm.reservationTime} onChange={e => setBookingForm(f => ({ ...f, reservationTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white" style={{'--tw-ring-color':'var(--color-primary)'} as any}>
                        <option value="">Select time</option>
                        {Array.from({ length: 25 }, (_, i) => {
                          const h = Math.floor(i / 2) + 10;
                          const m = i % 2 === 0 ? '00' : '30';
                          if (h > 22) return null;
                          const suffix = h < 12 ? 'AM' : 'PM';
                          const label = `${h % 12 || 12}:${m} ${suffix}`;
                          return <option key={`${h}:${m}`} value={`${String(h).padStart(2,'0')}:${m}`}>{label}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Party Size *</label>
                      <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2.5">
                        <button type="button" onClick={() => setBookingForm(f => ({ ...f, partySize: Math.max(1, f.partySize - 1) }))}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">−</button>
                        <span className="flex-1 text-center text-sm font-semibold">{bookingForm.partySize}</span>
                        <button type="button" onClick={() => setBookingForm(f => ({ ...f, partySize: Math.min(20, f.partySize + 1) }))}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Special Requests</label>
                      <textarea value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Allergies, celebrations, seating preference…" rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none" style={{'--tw-ring-color':'var(--color-primary)'} as any} />
                    </div>
                  </div>
                  <button type="submit" disabled={bookingSubmitting}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
                    style={{ background: 'var(--color-primary)' }}>
                    {bookingSubmitting ? 'Submitting…' : 'Request Reservation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
