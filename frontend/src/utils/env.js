/**
 * Base URL for API/static asset links built by hand (uploaded receipt images,
 * scanned document previews). Empty in dev so Vite's proxy handles it.
 */
export const apiBaseUrl = import.meta.env.VITE_API_URL || '';
