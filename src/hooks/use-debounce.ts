import { useEffect, useState } from "react";

/** Delay default untuk filter pencarian dropdown (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Menunda pembaruan nilai hingga user berhenti mengetik.
 * Timer dibersihkan otomatis saat unmount atau value berubah.
 */
export function useDebounce<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
