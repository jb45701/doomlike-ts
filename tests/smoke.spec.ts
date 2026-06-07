import { test, expect } from '@playwright/test';

test('game page loads', async ({ page }) => {
  await page.goto('/');
  // Game canvas should exist
  await page.waitForSelector('#game-canvas', { timeout: 10000 });
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();
});

test('editor page loads', async ({ page }) => {
  await page.goto('/editor.html');
  await page.waitForSelector('canvas', { timeout: 10000 });
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
});
