import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> {
    /**
     * Non-standard (React types don't include it), but valid HTML attribute:
     * https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/fetchPriority
     *
     * We intentionally keep it lowercase (`fetchpriority`) to avoid React warning
     * about unknown camelCased prop on <img>.
     */
    fetchpriority?: 'high' | 'low' | 'auto' | string;
  }
}

