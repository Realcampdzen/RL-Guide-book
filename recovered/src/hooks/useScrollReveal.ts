import { useEffect, useRef } from 'react';

export const useScrollReveal = (selector: string = '.reveal-on-scroll') => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const revealNow = (el: Element) => {
      el.classList.add('reveal-active');
      if (el instanceof HTMLElement) {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.dataset.revealInit = '1';
      }
    };

    const ensureHidden = (el: Element) => {
      if (!(el instanceof HTMLElement)) return;
      if (el.dataset.revealInit === '1') return;
      el.dataset.revealInit = '1';
      el.style.opacity = '0';
      el.style.transform = 'translateY(50px)';
      el.style.willChange = 'opacity, transform';
    };

    // If user prefers reduced motion, don't animate at all—just show content.
    if (prefersReducedMotion) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(revealNow);
      return;
    }

    // Fallback for older browsers / WebViews: just reveal immediately.
    if (typeof (window as any).IntersectionObserver === 'undefined') {
      const elements = document.querySelectorAll(selector);
      elements.forEach(revealNow);
      return;
    }

    const observerOptions: IntersectionObserverInit = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-active');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observerRef.current = observer;

    // Observe elements with the selector
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      ensureHidden(el);
      observer.observe(el);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [selector]);

  // Function to manually trigger reveal for elements (e.g., hero items)
  const initReveal = (selector: string = '.reveal-item') => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.classList.add('reveal-active');
    });
  };

  return { initReveal };
};
