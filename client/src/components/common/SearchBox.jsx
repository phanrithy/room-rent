import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBox({
  value = '',
  onChange,
  placeholder = 'Search...',
  delay = 300,
  className = '',
}) {
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange) {
        onChange(query);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [query, delay, onChange]);

  const handleClear = () => {
    setQuery('');
    if (onChange) onChange('');
  };

  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <div className="absolute left-3 text-content-muted pointer-events-none">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-10 pl-9 pr-9 bg-surface text-content-primary border border-border rounded-md text-sm w-full placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 rounded hover:bg-surface-hover text-content-muted hover:text-content-primary"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
