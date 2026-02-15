import { expect, test } from '@playwright/test';

const PROFILE_TABS = ['В пути', 'Избранное', 'Коллекция', 'Журнал'] as const;

test.describe('Profile mobile smoke', () => {
  test('opens profile and switches core tabs', async ({ page }) => {
    await page.goto('/');

    const profileTriggers = [
      page.getByRole('button', { name: /профил|мой путь/i }),
      page.getByRole('button', { name: /личный кабинет/i }),
    ];

    let opened = false;
    for (const trigger of profileTriggers) {
      if (await trigger.first().isVisible().catch(() => false)) {
        await trigger.first().click();
        opened = true;
        break;
      }
    }

    if (!opened) {
      await page.goto('/#profile');
    }

    await expect(page.locator('.profile-view')).toBeVisible();

    // Horizontal overflow guard.
    const hasOverflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth + 1;
    });
    expect(hasOverflow).toBeFalsy();

    for (const tabName of PROFILE_TABS) {
      const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') }).first();
      if (await tab.isVisible().catch(() => false)) {
        await tab.click();
      }
    }
  });
});
