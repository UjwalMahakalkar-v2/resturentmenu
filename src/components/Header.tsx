import { Phone, Mail, MapPin } from 'lucide-react';
import { Restaurant } from '@/types';

interface HeaderProps {
  restaurant?: Restaurant;
}

export default function Header({ restaurant }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between py-3 sm:py-4">
          {/* Logo and Name */}
          <div className="flex items-center gap-2 sm:gap-4">
            {restaurant?.logo && (
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-primary-700">
                {restaurant?.name || 'Restaurant Name'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                {restaurant?.tagline || 'Fine Dining Experience'}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {restaurant?.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{restaurant.phone}</span>
              </a>
            )}
            {restaurant?.email && (
              <a
                href={`mailto:${restaurant.email}`}
                className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>{restaurant.email}</span>
              </a>
            )}
            {restaurant?.location && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4" />
                <span className="max-w-xs truncate">{restaurant.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
