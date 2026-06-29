import { Category } from '@/types';

interface CategorySelectionProps {
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
}

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

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop';

export default function CategorySelection({ categories, onCategorySelect }: CategorySelectionProps) {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <section className="py-8 px-4 min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            View Dine-In Menu
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            Select your category below.
          </p>
        </div>

        {/* Category Grid — 2 cols always on mobile, 2-3 on tablet+ */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {sortedCategories.map((category) => {
            const image = category.image || categoryImages[category.id] || DEFAULT_IMAGE;

            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className="group relative overflow-hidden rounded-xl sm:rounded-2xl h-32 sm:h-40 md:h-48 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl focus:outline-none active:scale-[0.98]"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary)')}
                onBlur={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)')}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <img
                    src={image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70 group-hover:from-black/50 group-hover:to-black/80 transition-all duration-300" />
                </div>

                {/* Category Name */}
                <div className="relative h-full flex items-center justify-center p-3">
                  <h3 className="text-white font-bold text-base sm:text-xl text-center uppercase tracking-wide drop-shadow-lg leading-tight">
                    {category.name}
                  </h3>
                </div>

                {/* Hover border */}
                <div
                  className="absolute inset-0 rounded-xl sm:rounded-2xl border-0 group-hover:border-4 transition-all duration-300 pointer-events-none"
                  style={{ borderColor: 'var(--color-primary)' }}
                />
              </button>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="mt-8 sm:mt-10 text-center">
          <button
            onClick={() => onCategorySelect('all')}
            className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 shadow-lg hover:shadow-xl w-full sm:w-auto"
          >
            View All Items
          </button>
        </div>
      </div>
    </section>
  );
}
