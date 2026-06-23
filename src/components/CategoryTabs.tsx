import { Category } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setShowLeftShadow(container.scrollLeft > 0);
    setShowRightShadow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="sticky top-[72px] z-40 bg-cream py-3 sm:py-4 shadow-sm">
      <div className="container-custom relative">
        {/* Left Shadow */}
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-cream to-transparent z-10 pointer-events-none" />
        )}

        {/* Categories */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === 'all'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Items
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`px-4 sm:px-6 py-2 text-sm sm:text-base rounded-full font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Right Shadow */}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-cream to-transparent z-10 pointer-events-none" />
        )}
      </div>
    </div>
  );
}
