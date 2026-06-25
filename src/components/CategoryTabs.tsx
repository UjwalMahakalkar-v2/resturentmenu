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
    setShowRightShadow(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categories]);

  // Scroll active tab into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeCategory]);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const tabClass = (isActive: boolean) =>
    `px-4 sm:px-5 py-2 text-sm sm:text-base rounded-full font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] flex items-center ${
      isActive
        ? 'text-white shadow-md'
        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
    }`;

  return (
    <div className="sticky top-[60px] sm:top-[72px] z-40 py-3 sm:py-4 shadow-sm" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="container-custom relative">
        {/* Left shadow */}
        {showLeftShadow && (
          <div
            className="absolute left-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to right, var(--color-bg), transparent)' }}
          />
        )}

        {/* Tabs */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <button
            data-active={activeCategory === 'all'}
            onClick={() => onCategoryChange('all')}
            className={tabClass(activeCategory === 'all')}
            style={activeCategory === 'all' ? { backgroundColor: 'var(--color-primary)' } : {}}
          >
            All Items
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              data-active={activeCategory === category.id}
              onClick={() => onCategoryChange(category.id)}
              className={tabClass(activeCategory === category.id)}
              style={activeCategory === category.id ? { backgroundColor: 'var(--color-primary)' } : {}}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Right shadow */}
        {showRightShadow && (
          <div
            className="absolute right-0 top-0 bottom-0 w-12 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to left, var(--color-bg), transparent)' }}
          />
        )}
      </div>
    </div>
  );
}
