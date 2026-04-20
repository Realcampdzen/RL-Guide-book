export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  const useLocal = import.meta.env.DEV || hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (useLocal) return '';

  let baseUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
  
  // RKN Anti-Proxy Shield: force route Vercel backend through Cloudflare
  if (baseUrl.includes('backend-murex-one-40.vercel.app')) {
      baseUrl = 'https://api.realcampguide.ru';
  }
  
  return baseUrl;
}
