import { MenuItem } from '@/types';
import { Heart, Star } from 'lucide-react';
import { useState } from 'react';

interface MenuCardProps {
  item: MenuItem;
  onClick?: () => void;
}

export default function MenuCard({ item, onClick }: MenuCardProps) {
  const [isFavorite, setIsFavorite] = useState(() => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favorites.includes(item.id);
  });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (isFavorite) {
      const updated = favorites.filter((id: string) => id !== item.id);
      localStorage.setItem('favorites', JSON.stringify(updated));
    } else {
      favorites.push(item.id);
      localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    setIsFavorite(!isFavorite);
  };

  const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';

  // Compact pill layout for items without images
  if (!item.hasImage) {
    return (
      <div 
        className="bg-white rounded-full shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transform transition-all hover:scale-[1.02] group"
        onClick={onClick}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 gap-3">
          {/* Left: Veg/Non-veg + Name */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={item.type === 'veg' ? 'badge-veg flex-shrink-0' : 'badge-non-veg flex-shrink-0'}>
              <div className={`w-2 h-2 rounded-full ${
                item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                {item.name}
              </h3>
              {item.description && (
                <p className="text-xs text-gray-500 truncate hidden sm:block">
                  {item.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Badges + Price */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {item.popular && (
              <span className="hidden sm:inline-flex badge-popular text-xs px-2 py-0.5">
                Popular
              </span>
            )}
            {!item.available && (
              <span className="bg-gray-200 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                N/A
              </span>
            )}
            <span className="text-lg sm:text-xl font-bold text-primary-700 whitespace-nowrap">
              ₹{item.price}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite();
              }}
              className="p-1.5 hover:bg-gray-50 rounded-full transition-colors"
            >
              <Heart
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular card layout with image
  return (
    <div className="card overflow-hidden group cursor-pointer transform transition-transform hover:scale-[1.02]" onClick={onClick}>
      {/* Image */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 loading-skeleton" />
        )}
        <img
          src={imageError ? defaultImage : item.image}
          alt={item.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {item.popular && (
            <span className="badge-popular flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Popular
            </span>
          )}
          {!item.available && (
            <span className="bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-full">
              Unavailable
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite();
          }}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {/* Veg/Non-Veg Indicator */}
              <div className={item.type === 'veg' ? 'badge-veg' : 'badge-non-veg'}>
                <div className={`w-2 h-2 rounded-full ${
                  item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'
                }`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{item.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xl sm:text-2xl font-bold text-primary-700">₹{item.price}</span>
          {item.available && (
            <button className="btn-primary text-xs sm:text-sm py-1.5 px-3 sm:px-4">
              Order Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
