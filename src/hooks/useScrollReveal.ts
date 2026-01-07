import { useEffect, useRef } from 'react';

export const useScrollReveal = (selector: string = '.reveal-on-scroll') => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(50px)';
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

