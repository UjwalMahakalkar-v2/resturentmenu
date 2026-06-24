import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useMenu } from '@/hooks/useMenu';
import { restaurantService } from '@/services/restaurantService';
import { tenantAPI } from '@/services/tenantApi';
import type { Tenant } from '@/types/tenant';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import CategoryTabs from '@/components/CategoryTabs';
import CategorySelection from '@/components/CategorySelection';
import MenuCard from '@/components/MenuCard';
import MenuItemDetail from '@/components/MenuItemDetail';
import FloatingSocialButtons from '@/components/FloatingSocialButtons';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { TenantMenuItem } from '@/types/tenant';
import type { Restaurant } from '@/types';

export default function Menu() {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const { menuItems, categories, loading } = useMenu(tenant?.id);

  useEffect(() => {
    const loadTenant = async () => {
      if (tenantSlug) {
        try {
          const t = await tenantAPI.getBySlug(tenantSlug);
          setTenant(t);
        } catch (err) {
          console.error(err);
        }
      }
    };
    loadTenant();
  }, [tenantSlug]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<TenantMenuItem | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
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
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const menuSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      const r = await restaurantService.get(tenant?.id);
      setRestaurant(r);
    };
    loadRestaurant();
  }, [tenant?.id]);

  useEffect(() => {
    const handleRestaurantUpdate = async () => {
      const r = await restaurantService.get(tenant?.id);
      setRestaurant(r);
    };
    window.addEventListener('restaurant-updated', handleRestaurantUpdate);
    return () => window.removeEventListener('restaurant-updated', handleRestaurantUpdate);
  }, [tenant?.id]);

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setShowCategorySelection(false);
    setTimeout(() => {
      menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBackToCategories = () => {
    setShowCategorySelection(true);
    setActiveCategory('');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToMenu = () => {
    setActiveCategory('all'); // Set to 'all' to show all items
    setShowCategorySelection(false);
    setTimeout(() => {
      menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Veg filter
      if (vegOnly && item.type !== 'veg') {
        return false;
      }

      // Category filter - show all items if activeCategory is empty or 'all'
      if (activeCategory && activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          categories.find(c => c.id === item.category)?.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [menuItems, activeCategory, searchQuery, categories, vegOnly]);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <Header restaurant={restaurant} />
      <Hero restaurant={restaurant} onViewMenu={scrollToMenu} />

      {/* Category Selection View */}
      {showCategorySelection && (
        <CategorySelection
          categories={categories}
          onCategorySelect={handleCategorySelect}
        />
      )}

      {/* Menu Section */}
      {!showCategorySelection && (
        <section ref={menuSectionRef} className="py-12">
          {/* Back Button */}
          <div className="container-custom mb-6">
            <button
              onClick={handleBackToCategories}
              className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Categories
            </button>
          </div>

          <div className="container-custom">
            {/* Search Bar */}
            <div className="mb-8">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search for dishes, categories..."
              />
            </div>
          </div>

          {/* Category Tabs */}
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          {/* Veg Filter Toggle */}
          <div className="container-custom mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">
                All Items ({filteredItems.length})
              </span>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <span className={`text-sm font-medium transition-colors ${vegOnly ? 'text-gray-400' : 'text-gray-700'}`}>
                All
              </span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={vegOnly}
                  onChange={(e) => setVegOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </div>
              <span className={`text-sm font-medium transition-colors flex items-center gap-1 ${vegOnly ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="inline-block w-3 h-3 border-2 border-green-600 rounded-sm bg-white"></span>
                Veg Only
              </span>
            </label>
          </div>

          {/* Menu Items Grid */}
          <div className="container-custom mt-6">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-xl text-gray-600">
                  {searchQuery
                    ? 'No dishes found matching your search.'
                    : 'No dishes available in this category.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <MenuCard 
                    key={item.id} 
                    item={item} 
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-dark text-white py-8 mt-16">
        <div className="container-custom text-center">
          <p className="text-gray-400">
            © 2026 {restaurant.name}. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Menu Item Detail Modal */}
      <MenuItemDetail
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        categories={categories}
      />

      {/* Floating Social Media Buttons */}
      {tenant && (
        <FloatingSocialButtons 
          restaurant={restaurant} 
          tenantId={tenant.id} 
        />
      )}
    </div>
  );
}
