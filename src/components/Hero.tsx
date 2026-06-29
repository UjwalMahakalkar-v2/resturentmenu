import { ArrowDown } from 'lucide-react';
import { Restaurant } from '@/types';

interface HeroProps {
  restaurant?: Restaurant;
  onViewMenu: () => void;
}

export default function Hero({ restaurant, onViewMenu }: HeroProps) {
  const defaultCoverImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop';

  return (
    <section className="relative h-[300px] sm:h-[420px] md:h-[500px] overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={restaurant?.heroImage || defaultCoverImage}
          alt="Restaurant"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-5xl md:text-6xl font-bold mb-2 sm:mb-4 animate-fade-in leading-tight">
            {restaurant?.name || 'Welcome to Our Restaurant'}
          </h2>
          <p className="text-sm sm:text-xl md:text-2xl mb-5 sm:mb-8 text-gray-200 animate-fade-in">
            {restaurant?.tagline || 'Experience the finest culinary delights'}
          </p>
          <button
            onClick={onViewMenu}
            className="btn-primary text-sm sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 gap-2 animate-fade-in"
          >
            View Our Menu
            <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Decorative Bottom Wave — fill matches theme background */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z"
            style={{ fill: 'var(--color-bg)' }}
          />
        </svg>
      </div>
    </section>
  );
}
