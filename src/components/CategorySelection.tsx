import { Category } from '@/types';

interface CategorySelectionProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
}

// Category images mapping
const categoryImages: Record<string, string> = {
  'beverages': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop',
  'indian-nonveg': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop',
  'main-course-veg-nonveg': 'https://images.unsplash.com/photo-1585937421612-70e008356f33?w=600&h=400&fit=crop',
  'handi-special': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop',
  'tandoori-starters': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop',
  'chinese-sizzling': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=400&fit=crop',
  'chinese-veg': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&h=400&fit=crop',
  'chinese-nonveg': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&h=400&fit=crop',
  'roti-sabji': 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&h=400&fit=crop',
  'dal': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop',
  'rice': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&h=400&fit=crop',
  'soup-veg-nonveg': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop',
  'starters-veg-nonveg-tandoorse-nonveg': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&h=400&fit=crop',
};

export default function CategorySelection({ categories, onCategorySelect }: CategorySelectionProps) {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const getGridClass = (index: number) => {
    // Create a pattern: 2 items, 2 items, 1 full-width item
    const position = index % 5;
    if (position < 2) return 'col-span-1'; // First two items
    if (position < 4) return 'col-span-1'; // Next two items
    return 'col-span-2'; // Fifth item spans full width
  };

  return (
    <section className="py-12 px-4 bg-cream min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-700 mb-3">
            View Dine-In Menu
          </h1>
          <p className="text-lg text-gray-600">
            Select your category below.
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {sortedCategories.map((category, index) => {
            const image = categoryImages[category.id] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop';
            const gridClass = getGridClass(index);

            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`${gridClass} group relative overflow-hidden rounded-2xl h-40 md:h-48 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-primary-500`}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 group-hover:from-black/50 group-hover:to-black/80 transition-all duration-300" />
                </div>

                {/* Category Name */}
                <div className="relative h-full flex items-center justify-center p-4">
                  <h3 className="text-white font-bold text-xl md:text-2xl text-center uppercase tracking-wide drop-shadow-lg">
                    {category.name}
                  </h3>
                </div>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 border-4 border-transparent group-hover:border-primary-400 rounded-2xl transition-all duration-300 pointer-events-none" />
              </button>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="mt-10 text-center">
          <button
            onClick={() => onCategorySelect('all')}
            className="btn-primary text-lg px-10 py-4 shadow-lg hover:shadow-xl"
          >
            View All Items
          </button>
        </div>
      </div>
    </section>
  );
}
