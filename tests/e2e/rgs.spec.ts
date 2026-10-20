import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createZstdDecompress } from 'node:zlib';
import { expect, test, type Page, type Route } from '@playwright/test';

// The game against a mock Stake Engine RGS that serves real books from stake/math/.

const BOOKS = 'stake/math/books_base.jsonl.zst';
interface Book { id: number; events: unknown[]; payoutMultiplier: number }

async function firstBooks(n: number): Promise<Book[]> {
  const out: Book[] = [];
  const rl = createInterface({ input: createReadStream(BOOKS).pipe(createZstdDecompress()) });
  for await (const line of rl) {
    out.push(JSON.parse(line));
    if (out.length >= n) break;
  }
  rl.close();
  return out;
}

const M = 1_000_000;

interface Rgs { calls: string[]; balance: number }

async function mockRgs(page: Page, book: Book, extra: Record<string, unknown> = {}): Promise<Rgs> {
  const rgs: Rgs = { calls: [], balance: 1000 * M };
  let stake = 0;
  await page.route('https://rgs.test/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    rgs.calls.push(path);
    const body = route.request().postDataJSON?.() ?? {};
    const json = (data: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (path === '/wallet/authenticate') {
      return json({
        balance: { amount: rgs.balance, currency: 'USD' },
        round: null,
        config: {
          minBet: 100_000, maxBet: 100 * M, stepBet: 10_000, defaultBetLevel: 1 * M,
          betLevels: [100_000, 200_000, 500_000, 1 * M, 2 * M, 5 * M, 10 * M, 100 * M],
          jurisdiction: { socialCasino: false, disabledSpacebar: false, displayRTP: true, ...extra },
        },
      });
    }
    if (path === '/wallet/play') {
      stake = body.amount;
      rgs.balance -= stake;
      return json({ balance: { amount: rgs.balance, currency: 'USD' }, round: { betID: 1, active: book.payoutMultiplier > 0, mode: body.mode, payoutMultiplier: book.payoutMultiplier / 100, state: book.events } });
    }
    if (path === '/wallet/end-round') {
      rgs.balance += Math.round((stake * book.payoutMultiplier) / 100);
      return json({ balance: { amount: rgs.balance, currency: 'USD' } });
    }
    if (path.startsWith('/bet/replay/')) return json({ payoutMultiplier: book.payoutMultiplier / 100, costMultiplier: 1, state: book.events });
    return route.fulfill({ status: 404, body: '{}' });
  });
  return rgs;
}

async function raise(page: Page) {
  await page.locator('#raise-curtain').click({ timeout: 60_000 });
  await expect(page.locator('#loader')).toBeHidden({ timeout: 5_000 });
}

test.skip(!existsSync(BOOKS), 'run `npm run books` first');

test('plays a real book through the RGS and settles from the server balance', async ({ page }) => {
  const books = await firstBooks(400);
  const win = books.find((b) => b.payoutMultiplier >= 150 && b.payoutMultiplier < 2000)!;
  const rgs = await mockRgs(page, win);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?sessionID=abc&rgs_url=rgs.test&lang=en&currency=USD&device=desktop&nointro&speed=4');
  await raise(page);
  await expect(page.locator('#balance')).toHaveText('$1,000.00');
  await expect(page.locator('.stub.on')).toContainText('$1.00');
  await page.locator('#spin').click();
  await expect(page.locator('#spin')).not.toHaveClass(/busy/, { timeout: 90_000 });
  expect(rgs.calls).toEqual(['/wallet/authenticate', '/wallet/play', '/wallet/end-round']);
  const expected = 1000 - 1 + win.payoutMultiplier / 100;
  await expect(page.locator('#balance')).toHaveText(`$${expected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  expect(errors).toEqual([]);
});

test('a losing round needs no end-round call', async ({ page }) => {
  const lose = (await firstBooks(50)).find((b) => b.payoutMultiplier === 0)!;
  const rgs = await mockRgs(page, lose);
  await page.goto('/?sessionID=abc&rgs_url=rgs.test&nointro&speed=4');
  await raise(page);
  await page.locator('#spin').click();
  await expect(page.locator('#spin')).not.toHaveClass(/busy/, { timeout: 60_000 });
  expect(rgs.calls).toEqual(['/wallet/authenticate', '/wallet/play']);
  await expect(page.locator('#balance')).toHaveText('$999.00');
});

test('refuses a book whose wins do not add up', async ({ page }) => {
  const win = (await firstBooks(200)).find((b) => b.payoutMultiplier > 0)!;
  await mockRgs(page, { ...win, payoutMultiplier: win.payoutMultiplier + 1 });
  await page.goto('/?sessionID=abc&rgs_url=rgs.test&nointro&speed=4');
  await raise(page);
  await page.locator('#spin').click();
  await expect(page.getByRole('alertdialog')).toContainText('could not be shown');
});

test('replay mode fetches one round and makes no wallet calls', async ({ page }) => {
  const win = (await firstBooks(200)).find((b) => b.payoutMultiplier > 0)!;
  const rgs = await mockRgs(page, win);
  await page.goto(`/?replay=true&game=g1&version=1&mode=base&event=${win.id}&rgs_url=rgs.test&amount=2000000&speed=4`);
  await raise(page);
  await expect(page.locator('.box-office')).toBeHidden();
  await page.locator('#spin').click();
  await expect(page.locator('#marquee')).toContainText('Replay finished', { timeout: 60_000 });
  expect(rgs.calls).toEqual([`/bet/replay/g1/1/base/${win.id}`]);
});

test('social mode replaces restricted words', async ({ page }) => {
  const lose = (await firstBooks(50)).find((b) => b.payoutMultiplier === 0)!;
  await mockRgs(page, lose, { socialCasino: true });
  await page.goto('/?sessionID=abc&rgs_url=rgs.test&social=true&currency=XGC&nointro');
  await raise(page);
  await page.locator('#btn-info').click();
  const text = (await page.getByRole('dialog').innerText()).toLowerCase();
  for (const word of [' stake', ' bet ', ' buy ', ' pays ', ' cost ']) expect(text).not.toContain(word);
});
