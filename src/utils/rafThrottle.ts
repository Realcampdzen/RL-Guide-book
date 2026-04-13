export type RafThrottled<TArgs extends unknown[]> = (...args: TArgs) => void;

/**
 * Throttle a hot handler to at most once per animation frame.
 * Preserves the latest arguments.
 */
export function rafThrottle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void
): RafThrottled<TArgs> {
  let rafId: number | null = null;
  let lastArgs: TArgs | null = null;

  return (...args: TArgs) => {
    lastArgs = args;
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      if (!lastArgs) return;
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    });
  };
}
