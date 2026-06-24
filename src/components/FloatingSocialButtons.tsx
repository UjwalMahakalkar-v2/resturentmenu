import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Restaurant } from '@/types';

interface FloatingSocialButtonsProps {
  restaurant: Restaurant;
  tenantId: string;
}

export default function FloatingSocialButtons({ restaurant, tenantId }: FloatingSocialButtonsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleWhatsAppClick = async () => {
    if (!restaurant.socialMedia?.whatsapp) return;

    // Track click
    try {
      await fetch('/api/social-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          platform: 'whatsapp',
        }),
      });
    } catch (error) {
      console.error('Failed to track WhatsApp click:', error);
    }

    // Generate WhatsApp link
    const phone = restaurant.socialMedia.whatsapp.replace(/\D/g, '');
    const message = restaurant.socialMedia.whatsappMessage || `Hi! I'm interested in your menu at ${restaurant.name}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleInstagramClick = async () => {
    if (!restaurant.socialMedia?.instagram) return;

    // Track click
    try {
      await fetch('/api/social-analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          platform: 'instagram',
        }),
      });
    } catch (error) {
      console.error('Failed to track Instagram click:', error);
    }

    // Generate Instagram link
    let instagramUrl = restaurant.socialMedia.instagram;
    if (!instagramUrl.startsWith('http')) {
      // If it's just a username, create the full URL
      const username = instagramUrl.replace('@', '');
      instagramUrl = `https://instagram.com/${username}`;
    }
    
    window.open(instagramUrl, '_blank');
  };

  const hasWhatsApp = !!restaurant.socialMedia?.whatsapp && restaurant.socialMedia?.enableWhatsapp !== false;
  const hasInstagram = !!restaurant.socialMedia?.instagram && restaurant.socialMedia?.enableInstagram !== false;

  if (!hasWhatsApp && !hasInstagram) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Instagram Button */}
      {hasInstagram && (
        <button
          onClick={handleInstagramClick}
          className={`
            flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 
            text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300
            ${isExpanded ? 'px-4 py-3' : 'p-3'}
          `}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          aria-label="Follow us on Instagram"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          {isExpanded && (
            <span className="font-medium whitespace-nowrap animate-fade-in">
              Follow Us
            </span>
          )}
        </button>
      )}

      {/* WhatsApp Button */}
      {hasWhatsApp && (
        <button
          onClick={handleWhatsAppClick}
          className={`
            flex items-center gap-2 bg-green-500 text-white rounded-full 
            shadow-lg hover:shadow-xl hover:bg-green-600 transition-all duration-300
            ${isExpanded ? 'px-4 py-3' : 'p-3'}
          `}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
          {isExpanded && (
            <span className="font-medium whitespace-nowrap animate-fade-in">
              Chat with Us
            </span>
          )}
        </button>
      )}

      {/* Pulse animation for WhatsApp */}
      {hasWhatsApp && (
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateX(10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }
        `}</style>
      )}
    </div>
  );
}
