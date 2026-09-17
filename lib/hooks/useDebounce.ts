"use client";

import { useEffect, useState } from "react";

/**
 * Custom hook to debounce a changing value by a given delay in milliseconds.
 *
 * @param value The value to debounce (e.g. search input query).
 * @param delay The debounce delay in milliseconds (default: 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
