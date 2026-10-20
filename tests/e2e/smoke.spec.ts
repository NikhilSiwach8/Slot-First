import { expect, test, type Page } from '@playwright/test';

async function start(page: Page, query = '') {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?seed=23&nointro&speed=4${query}`);
  await page.locator('#raise-curtain').click({ timeout: 60_000 });
  await expect(page.locator('#loader')).toBeHidden({ timeout: 5_000 });
  return errors;
}

const balance = async (page: Page) => Number((await page.locator('#balance').textContent())!.replace(/,/g, ''));

test('loads, spins and settles the balance', async ({ page }) => {
  const errors = await start(page);
  expect(await balance(page)).toBe(1000);
  await page.locator('#spin').click();
  await expect(page.locator('#spin')).toHaveClass(/busy/);
  await expect(page.locator('#spin')).not.toHaveClass(/busy/, { timeout: 60_000 });
  const after = await balance(page);
  expect(after).not.toBe(1000); // the stake was taken (and maybe a win paid)
  expect(errors).toEqual([]);
});

test('Space spins and the stake can change', async ({ page }) => {
  await start(page);
  await page.locator('#seat-up').click();
  await expect(page.locator('.stub.on')).toContainText('1.50');
  await page.keyboard.press('Space');
  await expect(page.locator('#spin')).toHaveClass(/busy/);
  await expect(page.locator('#balance')).toHaveText('998.50'); // the 1.50 stake is taken up front
  await expect(page.locator('#spin')).not.toHaveClass(/busy/, { timeout: 60_000 });
});

test('the Programme and the Playbill open and close', async ({ page }) => {
  await start(page);
  await page.locator('#btn-info').click();
  await expect(page.getByRole('dialog', { name: 'Game rules' })).toContainText('50,000×');
  await page.getByRole('button', { name: 'Light top' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('#btn-playbill').click();
  await expect(page.getByRole('dialog', { name: 'Bet modes and show buys' })).toContainText('Lights Out');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
