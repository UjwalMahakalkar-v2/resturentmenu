import { MenuItem, Category } from '@/types';
import Modal from './Modal';
import { X } from 'lucide-react';
import { useState } from 'react';

interface MenuItemDetailProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export default function MenuItemDetail({ item, isOpen, onClose, categories }: MenuItemDetailProps) {
  const [imageError, setImageError] = useState(false);
  
  if (!item) return null;

  const category = categories.find(c => c.id === item.category);
  const defaultImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className={item.hasImage ? 'grid md:grid-cols-2 gap-6' : ''}>
        {/* Image - Only show if item has image */}
        {item.hasImage && item.image && (
          <div className="relative h-80 md:h-96 rounded-lg overflow-hidden bg-gray-200">
            <img
              src={imageError ? defaultImage : item.image}
              alt={item.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              {item.popular && (
                <span className="badge-popular flex items-center gap-1 px-3 py-1.5">
                  Popular
                </span>
              )}
              {!item.available && (
                <span className="bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                  Unavailable
                </span>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="flex flex-col">
          <div className="flex items-start gap-3 mb-4">
            {/* Veg/Non-Veg Indicator */}
            <div className={item.type === 'veg' ? 'badge-veg' : 'badge-non-veg'}>
              <div className={`w-2 h-2 rounded-full ${
                item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{item.name}</h2>
                  {category && (
                    <p className="text-sm text-gray-500 uppercase tracking-wide">{category.name}</p>
                  )}
                </div>
                {/* Badges for items without images */}
                {!item.hasImage && (
                  <div className="flex gap-2">
                    {item.popular && (
                      <span className="badge-popular flex items-center gap-1 px-3 py-1.5">
                        Popular
                      </span>
                    )}
                    {!item.available && (
                      <span className="bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-full">
                        Unavailable
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">
              {item.description || 'No description available.'}
            </p>
          </div>

          {/* Type */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Type</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              item.type === 'veg' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {item.type === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
            </span>
          </div>

          {/* Price and Action */}
          <div className="mt-auto pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Price</p>
                <p className="text-4xl font-bold text-primary-700">₹{item.price}</p>
              </div>
              {item.available && (
                <button className="btn-primary text-lg px-8 py-3">
                  Order Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
