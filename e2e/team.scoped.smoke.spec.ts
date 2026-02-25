import { expect, test } from '@playwright/test';

test.describe('Team scoped UI smoke', () => {
  test('create-engine form exposes scope fields and conditional ids', async ({ page }) => {
    await page.goto('/');

    const openProfileCandidates = [
      page.getByRole('button', { name: /профил|мой путь/i }),
      page.getByRole('button', { name: /личный кабинет/i }),
    ];

    let opened = false;
    for (const trigger of openProfileCandidates) {
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

    const createBtn = page.getByRole('button', { name: /создать/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const scopeSelect = page.locator('select.w-input').first();
    await expect(scopeSelect).toBeVisible();

    // default camp -> no shift/squad fields required
    await scopeSelect.selectOption('camp');
    await expect(page.getByPlaceholder(/shiftId/i)).toHaveCount(0);
    await expect(page.getByPlaceholder(/squadId/i)).toHaveCount(0);

    // shift scope -> shiftId visible, squadId hidden
    await scopeSelect.selectOption('shift');
    await expect(page.getByPlaceholder(/shiftId/i)).toBeVisible();
    await expect(page.getByPlaceholder(/squadId/i)).toHaveCount(0);

    // squad scope -> both visible
    await scopeSelect.selectOption('squad');
    await expect(page.getByPlaceholder(/shiftId/i)).toBeVisible();
    await expect(page.getByPlaceholder(/squadId/i)).toBeVisible();
  });
});
