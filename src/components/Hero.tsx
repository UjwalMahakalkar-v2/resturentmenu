import { ArrowDown } from 'lucide-react';
import { Restaurant } from '@/types';

interface HeroProps {
  restaurant?: Restaurant;
  onViewMenu: () => void;
}

export default function Hero({ restaurant, onViewMenu }: HeroProps) {
  const defaultCoverImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop';
  
  return (
    <section className="relative h-[400px] sm:h-[500px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={restaurant?.heroImage || defaultCoverImage}
          alt="Restaurant"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 animate-fade-in">
            {restaurant?.name || 'Welcome to Our Restaurant'}
          </h2>
          <p className="text-base sm:text-xl md:text-2xl mb-6 sm:mb-8 text-gray-200 animate-fade-in">
            {restaurant?.tagline || 'Experience the finest culinary delights'}
          </p>
          <button
            onClick={onViewMenu}
            className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 inline-flex items-center gap-2 animate-fade-in"
          >
            View Our Menu
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="#faf8f5"
          />
        </svg>
      </div>
    </section>
  );
}
