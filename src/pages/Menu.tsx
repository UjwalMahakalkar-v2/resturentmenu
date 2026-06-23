import { useState, useMemo, useRef, useEffect } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { restaurantService } from '@/services/restaurantService';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SearchBar from '@/components/SearchBar';
import CategoryTabs from '@/components/CategoryTabs';
import CategorySelection from '@/components/CategorySelection';
import MenuCard from '@/components/MenuCard';
import MenuItemDetail from '@/components/MenuItemDetail';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { MenuItem, Restaurant } from '@/types';

export default function Menu() {
  const { menuItems, categories, loading } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant>(restaurantService.get());
  const [showCategorySelection, setShowCategorySelection] = useState(true);
  const menuSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleRestaurantUpdate = () => {
      setRestaurant(restaurantService.get());
    };
    window.addEventListener('restaurant-updated', handleRestaurantUpdate);
    return () => window.removeEventListener('restaurant-updated', handleRestaurantUpdate);
  }, []);

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
    setShowCategorySelection(false);
    setTimeout(() => {
      menuSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) {
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
  }, [menuItems, activeCategory, searchQuery, categories]);



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

          {/* Menu Items Grid */}
          <div className="container-custom mt-8">
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
    </div>
  );
}
