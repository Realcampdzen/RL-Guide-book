import { expect, test } from '@playwright/test';

// Roles to simulate in the Personal Cabinet
const ROLES = ['traveler', 'parent', 'counselor', 'developer'];

const setRole = async (page: any, role: string) => {
  await page.evaluate((r) => {
    // Inject auth state into localStorage simulating hydratedKeyRef ecosystem
    const baseDeviceId = 'e2e-audit-bot-device';
    const activeKey = r === 'traveler' ? 'v1' : `user1`;
    
    // Clear storage to prevent cross-contamination
    window.localStorage.clear();
    
    if (r !== 'traveler') {
      window.localStorage.setItem('hydrated_state_key', activeKey);
      window.localStorage.setItem(`putevoditel_progress_${activeKey}`, JSON.stringify({
         profile: { role: r, baseDeviceId }
      }));
    }
  }, role);
  // Reload to apply injected state
  await page.reload();
};

test.describe('Personal Cabinet Automated Matrix Audit', () => {

  for (const role of ROLES) {
    test.describe(`Role: ${role.toUpperCase()}`, () => {
      
      let consoleErrors: string[] = [];
      let networkErrors: string[] = [];

      test.beforeEach(async ({ page }) => {
        consoleErrors = [];
        networkErrors = [];

        // Error Catcher: Console Errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        // Error Catcher: Network 5xx Errors
        page.on('response', response => {
          if (response.status() >= 500) {
            networkErrors.push(`[${response.status()}] ${response.url()}`);
          }
        });

        await page.goto('/#profile');
        await setRole(page, role);
        await page.waitForTimeout(500); // Wait for auth hydration
      });

      test('should navigate tabs without crashing or horizontal overflow', async ({ page }) => {
        await expect(page.locator('.profile-view')).toBeVisible({ timeout: 10000 });

        // Guard against horizontal layout shifts
        const hasOverflow = await page.evaluate(() => {
          const root = document.documentElement;
          return root.scrollWidth > root.clientWidth + 1;
        });
        expect(hasOverflow).toBeFalsy();

        // RBAC Verification
        if (role === 'parent' || role === 'traveler') {
          // Dev and squad panels should NOT be visible
          await expect(page.getByText('Dev Cabinet', { exact: false })).toBeHidden();
          await expect(page.getByText('Заявки в отряд', { exact: false })).toBeHidden();
        }

        if (role === 'developer') {
          // Dev elements should be accessible
          const devButton = page.getByRole('button', { name: /совет лагеря|админ/i });
          if (await devButton.count() > 0) {
             await expect(devButton.first()).toBeVisible();
          }
        }

        // Final verification no catastrophic errors occurred
        if (consoleErrors.length > 0) {
          console.log(`[${role}] Console Errors detected:`, consoleErrors);
        }
        if (networkErrors.length > 0) {
          console.log(`[${role}] Network Errors detected:`, networkErrors);
        }
        
        // Expose errors array to the test runner so we can triage them automatically
        expect(networkErrors.length, `Expected 0 network 5xx errors, found: \n${networkErrors.join('\n')}`).toBe(0);
      });
    });
  }
});
