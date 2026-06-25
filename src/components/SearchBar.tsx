import { Search, X } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search dishes...' }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative max-w-2xl mx-auto w-full">
      <div
        className="flex items-center gap-3 bg-white rounded-full px-5 py-3 shadow-md transition-all duration-200"
        style={isFocused ? { boxShadow: '0 0 0 2px var(--color-primary), 0 4px 12px rgba(0,0,0,0.1)' } : {}}
      >
        <Search className="w-5 h-5 flex-shrink-0 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-transparent"
          style={{ minHeight: '28px' }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
