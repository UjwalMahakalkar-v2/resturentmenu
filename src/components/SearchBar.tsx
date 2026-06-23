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
    <div className="relative max-w-2xl mx-auto">
      <div
        className={`flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-md transition-all duration-200 ${
          isFocused ? 'ring-2 ring-primary-500 shadow-lg' : ''
        }`}
      >
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
