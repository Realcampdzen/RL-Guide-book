/**
 * Centralized scroll-lock manager using reference counting.
 *
 * Multiple components (ChatBot, HintOverlay, BroBonfire, etc.) can request
 * body scroll lock independently. Instead of each component saving/restoring
 * the previous `overflow` style (which causes race conditions when multiple
 * overlays open/close in different orders), we count active locks:
 *
 * - `lockScroll()` increments the counter and sets `overflow: hidden` on body.
 * - `unlockScroll()` decrements the counter; body is unlocked only when all
 *   locks have been released (counter === 0).
 * - `forceUnlock()` resets the counter to 0 and restores scroll. Useful for
 *   safety cleanup (e.g., BlueNestLanding mount).
 */

let lockCount = 0;

export function lockScroll(): void {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    (document.body.style as any).overscrollBehavior = 'none';
  }
}

export function unlockScroll(): void {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overscroll-behavior');
  }
}

/**
 * Safety valve: forcefully remove all scroll locks.
 * Call this during major view transitions (e.g., mounting BlueNestLanding)
 * to clear any leaked locks from unclean unmounts / HMR.
 */
export function forceUnlock(): void {
  lockCount = 0;
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('overscroll-behavior');
}

/** Current number of active locks (useful for debugging). */
export function getScrollLockCount(): number {
  return lockCount;
}
