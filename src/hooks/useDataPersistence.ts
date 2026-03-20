import { useState, useEffect } from 'react';

export function useDataPersistence<T>(key: string, initialValue: T) {
  // Read from storage or use initial value
  const [data, setData] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Write to storage whenever state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, data]);

  return [data, setData] as const;
}
