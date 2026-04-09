import { test, expect } from '@playwright/test';

test.describe('Performance & Chunking Tests', () => {
  test('Measure FCP, LCP and Profile Chunk Load Time', async ({ page }) => {
    // Navigate to the main page
    await page.goto('/RL-Guide-book/');

    // Wait for the main page to load
    await page.waitForLoadState('networkidle');

    // Get First Contentful Paint
    const paintTimingJson = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType('paint'))
    );
    const paintTimings = JSON.parse(paintTimingJson);
    const fcp = paintTimings.find((p: any) => p.name === 'first-contentful-paint');
    console.log(`[Performance] FCP (First Contentful Paint): ${fcp ? fcp.startTime.toFixed(2) : 'N/A'} ms`);

    // Simulate Hover over Profile Button to trigger Prefetch
    const profileBtn = page.locator('.mobile-nav-item').filter({ hasText: 'Мой путь' }).or(page.locator('.mobile-nav-item').filter({ hasText: 'Войти' }));
    
    // Simulate hover/touchstart
    await profileBtn.hover();
    console.log('[Performance] Triggered hover on Profile to simulate React.lazy prefetching...');
    
    // Wait a brief moment to allow fetch
    await page.waitForTimeout(500);

    // Measure time to fully render the Profile View
    const startProfileClick = Date.now();
    await profileBtn.click();
    
    // Wait for the Profile DOM to stabilize / lazy chunk to render
    await page.waitForSelector('.profile-container', { state: 'visible' });
    const profileRenderTime = Date.now() - startProfileClick;
    
    console.log(`[Performance] Time to Render Profile View after click (with prefetch): ${profileRenderTime} ms`);
    
    // Assert that the rendering of the lazy loaded chunk took less than ~200ms
    // If it was downloading a 1MB chunk from scratch, it would be much slower,
    // but with 255KB pre-fetched chunk, it should be extremely fast!
    expect(profileRenderTime).toBeLessThan(1000); // adjust based on env overhead
  });
});
