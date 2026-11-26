import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { launchApp, makeScratch, openProject } from '../e2e/launch';
import { ASSETS, readStages, record, watchStages } from './record';

// The quest the user drops, in their own words
const QUEST = 'Fix double charges at checkout. Add a regression test.';

// A plain shop API, with the kind of wiki a project builds up after a few tasks
const FILES: Record<string, string> = {
  'package.json':
    '{\n  "name": "shop-api",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  'README.md': '# shop-api\n\nA tiny checkout for a shop: one SKU, one card, one charge.\n\n```sh\nnpm test\n```\n',
  'src/checkout.js':
    "const TAX = 0.1;\n\n// Charges a cart, then takes the stock it bought\nexport async function checkout(store, cart) {\n  const item = await store.find(cart.sku);\n  if (!item || item.stock < cart.quantity) throw new Error('sold out');\n  const price = Math.round(item.price * cart.quantity * (1 + TAX));\n  await store.charge(cart.card, price);\n  await store.take(cart.sku, cart.quantity);\n  return { charged: price };\n}\n",
  'src/store.js':
    '// A stand-in for the shop database, so the checkout can be read on its own\nexport function memoryStore(items) {\n  const rows = new Map(Object.entries(items).map(([sku, row]) => [sku, { sku, ...row }]));\n  return {\n    async find(sku) {\n      return rows.get(sku) ?? null;\n    },\n    async take(sku, quantity) {\n      rows.get(sku).stock -= quantity;\n    },\n    async charge(card, price) {\n      this.charges.push({ card, price });\n    },\n    charges: [],\n  };\n}\n',
  'test/checkout.test.js':
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { checkout } from '../src/checkout.js';\nimport { memoryStore } from '../src/store.js';\n\nconst cart = (more) => ({ id: 'c1', sku: 'lamp', quantity: 1, card: 'tok_1', ...more });\n\ntest('charges the price with tax', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  assert.equal((await checkout(store, cart())).charged, 22);\n});\n\ntest('charges for every unit', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  assert.equal((await checkout(store, cart({ quantity: 2 }))).charged, 44);\n});\n\ntest('turns away a sold-out item without a charge', async () => {\n  const store = memoryStore({ lamp: { stock: 0, price: 20 } });\n  await assert.rejects(checkout(store, cart()), /sold out/);\n  assert.equal(store.charges.length, 0);\n});\n",
  'test/store.test.js':
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { memoryStore } from '../src/store.js';\n\ntest('finds an item by its sku', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  assert.equal((await store.find('lamp')).price, 20);\n});\n\ntest('taking stock lowers it', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  await store.take('lamp', 2);\n  assert.equal((await store.find('lamp')).stock, 1);\n});\n",
  '.crew/wiki/Checkout.md':
    'The checkout path\n\n`POST /checkout` finds the item, charges the card, then takes the stock. Price is the item price with 10% tax, rounded.\n\nThe order of those three steps is the whole design: see [[Payment retries]] for what happens after a charge and [[Testing]] for how the flow is proven.\n',
  '.crew/wiki/Payment retries.md':
    'Payment retries\n\nA failed charge is retried twice with the same card token, then the cart is left as it was. A retry must never take stock twice, which is why the stock must be settled before the charge.\n\nRelated: [[Checkout]]\n',
  '.crew/wiki/Testing.md':
    'Testing\n\nThe shop runs `npm test` on node:test; every flow test builds a memory store instead of a database. A bug fix lands with the test that fails without it.\n\nRelated: [[Checkout]] and [[Release checklist]]\n',
  '.crew/wiki/Release checklist.md':
    'Release checklist\n\n1. `npm test` is green.\n2. The checkout was tried by hand on a phone, twice in a row.\n3. Anything that changed the price is noted in the changelog.\n\nRelated: [[Testing]]\n',
  '.crew/memory/coder.md':
    'The checkout is the only place that takes stock; nothing else may.\nA charge and the stock it paid for belong in one claim.',
  '.crew/memory/reviewer.md':
    'Read-then-write across an await is the bug this project keeps meeting.\nAsk for the test that fails before the fix, not after.',
  '.crew/memory/tester.md': 'The double-click path needs two carts, not two clicks on one: the store is what races.',
};

// Each member's next answer; a turn may write files, call an app tool, or just take its time
const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const pass = (summary: string, checks: string[] = []) => hb(summary, { verdict: 'pass', checks });

// The waits are close to what the video's scenes last, so the footage is cut rather than sped up
const SCRIPT = {
  interpreter: [
    {
      call: {
        name: 'start_task',
        input: {
          original: QUEST,
          title: 'Fix the double charge',
          request:
            'A double click on Pay charges the card twice. Make the last unit go to one checkout only, and add a regression test for the double-click path.',
        },
      },
      text: 'On it. The conductor takes it from here.',
    },
    {
      text: 'Fixed the double charge. The last lamp now sells once, and all 6 tests pass.',
    },
  ],
  conductor: [
    {
      text: 'A code change that needs a plan: the race spans the checkout and the store.',
      wait: 1600,
      structured: { summary: 'A code change, planned first', body: '', kind: 'code' },
    },
    {
      text: 'Plan: settle the stock in one step before the charge, release it if the charge fails, and prove it with a double-click test.',
      wait: 2200,
      ...hb('Settle the stock in one step, then charge', {
        points: [
          'store.claim checks and takes the stock with no await between',
          'checkout charges only after the claim, and releases it when the charge fails',
          'test: two carts buy the last lamp at once, one charge',
        ],
      }),
    },
  ],
  judge: [
    {
      text: 'Goal met: the last lamp is charged once, and the test proves it.',
      wait: 1200,
      structured: { summary: 'The double charge is gone and a test guards it', body: '', decision: 'done' },
    },
  ],
  reviewer: [
    {
      text: 'The plan covers the race and the test that proves it. Go ahead.',
      wait: 1600,
      ...pass('Plan covers the race and its test'),
    },
    {
      text: 'Line 9 reads the stock and line 13 takes it. Two carts both pass the check in between, so the last lamp is charged twice. Settle it in one step.',
      wait: 2600,
      ...hb('The stock is still read, then taken', {
        verdict: 'rework',
        points: ['src/checkout.js:9-13 the stock is read, then taken; two carts both pass the check'],
      }),
    },
    {
      text: 'One claim per unit, released on a failed charge, and the test proves it. Good.',
      wait: 1800,
      ...pass('The claim is one step and released on failure'),
    },
  ],
  coder: [
    {
      text: 'Turning a second click on the same cart away, with a double-click test.',
      wait: 3800,
      write: [
        {
          file: 'src/checkout.js',
          text: "const TAX = 0.1;\n// A cart already at checkout is turned away, so a double click charges once\nconst running = new Set();\n\nexport async function checkout(store, cart) {\n  if (running.has(cart.id)) throw new Error('already running');\n  running.add(cart.id);\n  try {\n    const item = await store.find(cart.sku);\n    if (!item || item.stock < cart.quantity) throw new Error('sold out');\n    const price = Math.round(item.price * cart.quantity * (1 + TAX));\n    await store.charge(cart.card, price);\n    await store.take(cart.sku, cart.quantity);\n    return { charged: price };\n  } finally {\n    running.delete(cart.id);\n  }\n}\n",
        },
        {
          file: 'test/checkout.test.js',
          text: "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { checkout } from '../src/checkout.js';\nimport { memoryStore } from '../src/store.js';\n\nconst cart = (more) => ({ id: 'c1', sku: 'lamp', quantity: 1, card: 'tok_1', ...more });\n\ntest('charges the price with tax', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  assert.equal((await checkout(store, cart())).charged, 22);\n});\n\ntest('charges for every unit', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  assert.equal((await checkout(store, cart({ quantity: 2 }))).charged, 44);\n});\n\ntest('turns away a sold-out item without a charge', async () => {\n  const store = memoryStore({ lamp: { stock: 0, price: 20 } });\n  await assert.rejects(checkout(store, cart()), /sold out/);\n  assert.equal(store.charges.length, 0);\n});\n\ntest('a double click on the last lamp charges once', async () => {\n  const store = memoryStore({ lamp: { stock: 1, price: 20 } });\n  const results = await Promise.allSettled([checkout(store, cart({ id: 'a' })), checkout(store, cart({ id: 'b' }))]);\n  assert.equal(store.charges.length, 1);\n  assert.equal(results.filter((r) => r.status === 'rejected').length, 1);\n});\n",
        },
      ],
      ...hb('A cart at checkout turns a second click away'),
    },
    {
      text: 'The store claims the stock in one step, checkout charges after it and releases it if the charge fails.',
      wait: 3200,
      write: [
        {
          file: 'src/store.js',
          text: '// A stand-in for the shop database, so the checkout can be read on its own\nexport function memoryStore(items) {\n  const rows = new Map(Object.entries(items).map(([sku, row]) => [sku, { sku, ...row }]));\n  const claims = new Map();\n  return {\n    async find(sku) {\n      return rows.get(sku) ?? null;\n    },\n    async take(sku, quantity) {\n      rows.get(sku).stock -= quantity;\n    },\n    // Checks and takes the stock with no await between, so two checkouts cannot both get the last unit\n    async claim(sku, quantity) {\n      const row = rows.get(sku);\n      if (!row || row.stock < quantity) return null;\n      row.stock -= quantity;\n      const id = claims.size + 1;\n      claims.set(id, { sku, quantity });\n      return { id, price: row.price };\n    },\n    async release(id) {\n      const held = claims.get(id);\n      rows.get(held.sku).stock += held.quantity;\n      claims.delete(id);\n    },\n    async charge(card, price) {\n      this.charges.push({ card, price });\n    },\n    charges: [],\n  };\n}\n',
        },
        {
          file: 'src/checkout.js',
          text: "const TAX = 0.1;\n\n// The claim is the checkout: the store hands out a unit once, and only then does the card see a charge\nexport async function checkout(store, cart) {\n  const claim = await store.claim(cart.sku, cart.quantity);\n  if (!claim) throw new Error('sold out');\n  const price = Math.round(claim.price * cart.quantity * (1 + TAX));\n  try {\n    await store.charge(cart.card, price);\n  } catch (err) {\n    await store.release(claim.id);\n    throw err;\n  }\n  return { charged: price };\n}\n",
        },
      ],
      ...hb('Claim the stock in one step, then charge'),
    },
  ],
  tester: [
    {
      text: 'npm test → 5 passed, 1 failed: two carts still buy the last lamp twice. The new test caught it.',
      wait: 2800,
      ...hb('The double-click test fails: two charges', {
        verdict: 'rework',
        points: ['test/checkout.test.js a double click on the last lamp: 2 charges, expected 1'],
        checks: ['npm test → 5 passed, 1 failed'],
      }),
    },
    {
      text: 'npm test → 6 passed. Two carts at once: one charge, one "sold out".',
      wait: 2600,
      ...pass('6 tests pass, the double-click test among them', ['npm test → 6 passed']),
    },
  ],
  librarian: [
    {
      text: 'Folded the race into the checkout document.',
      wait: 1400,
      call: {
        name: 'wiki_write',
        input: {
          title: 'Checkout',
          body: 'The checkout path\n\n`POST /checkout` claims the stock from the store in one step, then charges the card; a failed charge releases the claim. Two checkouts of the last unit get one charge and one "sold out".\n\nRelated: [[Payment retries]], [[Testing]]',
        },
      },
    },
  ],
};

// Versions are commits under the project's own refs, which needs a repository; without git the demo still runs, minus the diff
function commitAll(project: string) {
  try {
    execFileSync('git', ['init', '-q'], { cwd: project });
    execFileSync('git', ['add', '-A'], { cwd: project });
    execFileSync('git', ['-c', 'user.name=crew', '-c', 'user.email=crew@localhost', 'commit', '-qm', 'shop api'], {
      cwd: project,
    });
  } catch {
    // a machine without git shows the report without its file chips
  }
}

test('record the English demo', async () => {
  const scratch = makeScratch(FILES);
  commitAll(scratch.project);
  // The window starts in Korean and remembers the language it was left in, so it is picked before the recording
  const first = await launchApp(scratch.db);
  await (await first.firstWindow()).getByRole('button', { name: 'ENG' }).click();
  await first.close();

  const app = await launchApp(scratch.db, SCRIPT);
  const page = await app.firstWindow();
  await openProject(app, scratch.project, { project: 'Project', openMore: 'Open folder…' });
  const legend = page.locator('.legend .ui-fold-head');
  await expect(legend).toBeVisible();
  if ((await legend.getAttribute('aria-expanded')) === 'true') await legend.click();
  await expect(legend).toHaveAttribute('aria-expanded', 'false');

  const take = await record(page);
  const still = (name: string) =>
    page.screenshot({ path: path.join(ASSETS, `${name}.png`), animations: 'disabled', scale: 'css' });
  await watchStages(page);
  take.mark('open');
  // The crew walks in from beyond the edges of the camp
  await page.waitForTimeout(4200);
  take.mark('ask');
  await page.getByLabel('Message').pressSequentially(QUEST, { delay: 34 });
  await page.waitForTimeout(550);
  take.mark('sent');
  await page.getByLabel('Message').press('Enter');
  const report = page.getByText('Fixed the double charge.', { exact: false });
  await expect(report).toBeVisible({ timeout: 120_000 });
  take.mark('done');
  const changedFile = page.locator('.report-files').getByRole('button', { name: 'src/checkout.js', exact: true });
  await expect(changedFile).toBeVisible();
  await still('report');

  await changedFile.click();
  const diff = page.getByRole('dialog');
  await expect(diff.getByRole('heading', { name: 'src/checkout.js', exact: true })).toBeVisible();
  await expect(diff.locator('.diff-line[data-kind="add"]').first()).toBeVisible();
  await still('diff');
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Log' }).click();
  const testRun = page
    .getByLabel('Task log')
    .getByRole('button', { name: /Test done/ })
    .first();
  await testRun.scrollIntoViewIfNeeded();
  await testRun.click();
  const checks = page.getByText('npm test → 6 passed', { exact: false }).last();
  await expect(checks).toBeVisible();
  await checks.scrollIntoViewIfNeeded();
  await still('log');

  await page.getByRole('tab', { name: 'Memory' }).click();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  const paymentRetries = page.getByLabel('Document Payment retries', { exact: true });
  await expect(paymentRetries).toBeVisible();
  await page.waitForTimeout(400);
  await still('wiki');
  await paymentRetries.click();
  await expect(page.getByLabel('Wiki document').getByRole('heading', { name: 'Payment retries' })).toBeVisible();
  await still('wiki-doc');

  await page.getByRole('tab', { name: 'Workflow' }).click();
  const review = page.getByLabel('Step Code review', { exact: true });
  await expect(review).toBeVisible();
  await page.waitForTimeout(400);
  await still('workflow');
  await review.click();
  await page.getByLabel('Owner role', { exact: true }).click();
  await expect(page.getByRole('option', { name: /^Tester / })).toBeVisible();
  await still('workflow-owner');
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Chat' }).click();
  const session = page.getByLabel('Session', { exact: true });
  await session.click();
  await page.getByRole('option', { name: 'New session', exact: true }).click();
  await expect(report).toHaveCount(0);
  await session.click();
  const previous = page.getByRole('option', { name: /^Fix double charges/ });
  await expect(previous).toBeVisible();
  await still('history');
  await previous.click();
  await expect(report).toBeVisible();
  await expect(changedFile).toBeVisible();
  await still('history-chat');

  const stages = await readStages(page);
  expect(stages.map(({ text }) => text).join('\n')).toMatch(
    /(?:^|\n)Develop\nCode review\nFixing\nCode review(?:\n|$)/,
  );
  take.marks.stages = stages;
  await take.finish(app);
});
