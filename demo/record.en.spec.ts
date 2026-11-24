import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { launchApp, makeScratch, openProject } from '../e2e/launch';
import { readStages, record, watchStages } from './record';

// The quest the user drops, in their own words
const QUEST = 'Fix the checkout double charge and add a test for it';

// A plain shop API, with the kind of wiki a project builds up after a few tasks
const FILES: Record<string, string> = {
  'package.json':
    '{\n  "name": "shop-api",\n  "private": true,\n  "type": "module",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  'README.md': '# shop-api\n\nA tiny checkout for a shop: one SKU, one card, one charge.\n\n```sh\nnpm test\n```\n',
  'src/checkout.js':
    "const TAX = 0.1;\n\n// Charges a cart, then takes the stock it bought\nexport async function checkout(store, cart) {\n  const item = await store.find(cart.sku);\n  if (!item || item.stock < cart.quantity) throw new Error('sold out');\n  const price = Math.round(item.price * cart.quantity * (1 + TAX));\n  await store.charge(cart.card, price);\n  await store.take(cart.sku, cart.quantity);\n  return { charged: price };\n}\n",
  'src/store.js':
    '// A stand-in for the shop database, so the checkout can be read on its own\nconst rows = new Map();\n\nexport function memoryStore(items) {\n  for (const [sku, row] of Object.entries(items)) rows.set(sku, { sku, ...row });\n  return {\n    async find(sku) {\n      return rows.get(sku) ?? null;\n    },\n    async take(sku, quantity) {\n      const row = rows.get(sku);\n      row.stock -= quantity;\n    },\n    async charge(card, price) {\n      this.charges.push({ card, price });\n    },\n    charges: [],\n  };\n}\n',
  'test/checkout.test.js':
    "import { test } from 'node:test';\nimport assert from 'node:assert/strict';\nimport { checkout } from '../src/checkout.js';\nimport { memoryStore } from '../src/store.js';\n\ntest('charges the price with tax', async () => {\n  const store = memoryStore({ lamp: { stock: 3, price: 20 } });\n  const done = await checkout(store, { sku: 'lamp', quantity: 1, card: 'tok_1' });\n  assert.equal(done.charged, 22);\n});\n",
  '.crew/wiki/checkout.md':
    'The checkout path\n\n`POST /checkout` finds the item, charges the card, then takes the stock. Price is the item price with 10% tax, rounded.\n\nThe order of those three steps is the whole design: see [[Payment retries]] for what happens after a charge and [[Testing]] for how the flow is proven.\n',
  '.crew/wiki/Payment retries.md':
    'Payment retries\n\nA failed charge is retried twice with the same card token, then the cart is left as it was. A retry must never take stock twice, which is why the claim comes before the charge.\n\nRelated: [[Checkout]]\n',
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

// Each member's next answer; a turn may write a file, call an app tool, or just take its time
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
          kind: 'code',
          size: 'large',
          title: 'Fix the double charge',
          request:
            'A double click on Pay charges the card twice. Make checkout claim the stock and charge it in one step, and add a test for the double-click path.',
        },
      },
      text: 'On it. Opening the quest for the crew.',
    },
    {
      text: 'Shipped. A double click now charges once, the second request gets "sold out", and 18 tests pass, the new double-click test among them.',
    },
  ],
  conductor: [
    {
      text: 'Plan: make the stock claim one step, charge only after it, and prove it with the double-click test.',
      wait: 2600,
      ...hb('Claim the stock in one step, then charge', {
        points: [
          'store.claim takes one unit or returns nothing, in a single step',
          'checkout charges the claim, and releases it when the charge fails',
          'test: two checkouts of the last item, one charge',
        ],
        files: [],
      }),
    },
  ],
  reviewer: [
    {
      text: 'The plan covers the race and the test that proves it. Go ahead.',
      wait: 1800,
      ...pass('Plan covers the race and its test'),
    },
    {
      text: 'Line 9 reads the stock and line 13 takes it. Two carts still pass the check before either takes, so both charge. Claim it in one step.',
      wait: 2600,
      ...hb('The claim is still read-then-write', {
        verdict: 'rework',
        points: ['src/checkout.js:9-13 the stock is read, then taken; claim it in one step'],
      }),
    },
    {
      text: 'One claim per unit, release on a failed charge, and the test proves it. Good.',
      wait: 1800,
      ...pass('The claim is atomic and released on failure'),
    },
  ],
  coder: [
    {
      text: 'Making checkout hold the cart while it works.',
      wait: 3800,
      write: {
        file: 'src/checkout.js',
        text: "const TAX = 0.1;\n\n// One checkout per cart at a time, and the stock is checked right before the charge\nexport async function checkout(store, cart) {\n  if (await store.pending(cart.id)) throw new Error('already running');\n  await store.markPending(cart.id);\n  const item = await store.find(cart.sku);\n  if (!item || item.stock < cart.quantity) throw new Error('sold out');\n  const price = Math.round(item.price * cart.quantity * (1 + TAX));\n  await store.charge(cart.card, price);\n  await store.take(cart.sku, cart.quantity);\n  await store.clearPending(cart.id);\n  return { charged: price };\n}\n",
      },
      ...hb('Held the cart for the length of the checkout', { files: ['src/checkout.js'] }),
    },
    {
      text: 'Atomic claim, charge after it, release if the charge fails, and the double-click test is in.',
      wait: 3200,
      write: {
        file: 'src/checkout.js',
        text: "const TAX = 0.1;\n\n// The claim is the checkout: the store hands out one unit once, and only then does the card see a charge\nexport async function checkout(store, cart) {\n  const claim = await store.claim(cart.sku, cart.quantity);\n  if (!claim) throw new Error('sold out');\n  const price = Math.round(claim.price * cart.quantity * (1 + TAX));\n  try {\n    await store.charge(cart.card, price);\n  } catch (err) {\n    await store.release(claim.id);\n    throw err;\n  }\n  return { charged: price, claimId: claim.id };\n}\n",
      },
      ...hb('Claim in one step, charge after it', { files: ['src/checkout.js', 'test/checkout.test.js'] }),
    },
  ],
  tester: [
    {
      text: 'npm test → 17 passed, 1 failed: the double-click test charges twice. That is the bug talking.',
      wait: 2800,
      ...hb('The double-click test fails as it should', {
        verdict: 'rework',
        points: ['test/checkout.test.js the last item is taken twice'],
        checks: ['npm test → 17 passed, 1 failed'],
      }),
    },
    {
      text: 'npm test → 18 passed. The double-click path charges once and the second request gets "sold out".',
      wait: 2600,
      ...pass('18 tests pass, double-click path included', ['npm test → 18 passed', 'npm run lint → 0 problems']),
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
          body: 'Checkout\n\n`POST /checkout` claims one unit from the store, then charges the card. The claim is a single step, so a double click cannot buy the last item twice; a failed charge releases the claim.\n\nRelated: [[Payment retries]], [[Testing]]',
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
  await watchStages(page);
  take.mark('open');
  // The crew walks in from beyond the edges of the camp
  await page.waitForTimeout(4200);
  take.mark('ask');
  await page.getByLabel('Message').pressSequentially(QUEST, { delay: 34 });
  take.mark('sent');
  await page.getByLabel('Message').press('Enter');
  await expect(page.getByText('A double click now charges once', { exact: false })).toBeVisible({ timeout: 120_000 });
  take.mark('done');
  await page.waitForTimeout(2200);
  // The files the task changed hang under its report; the first opens its diff
  const chip = page.getByRole('button', { name: /checkout\.js$/ }).first();
  if (await chip.count()) {
    take.mark('diff');
    await chip.click();
    await page.waitForTimeout(2600);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }
  // A glimpse of each place the work lands, not a tour of them
  for (const [name, tab, then] of [
    ['wiki', 'Memory', 'Graph'],
    ['workflow', 'Workflow', ''],
    ['connect', 'Connect', ''],
  ] as const) {
    take.mark(name);
    await page.getByRole('tab', { name: tab }).click();
    if (then) {
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: then }).first().click();
    }
    await page.waitForTimeout(2400);
  }
  const stages = await readStages(page);
  expect(stages.map(({ text }) => text).join('\n')).toMatch(/(?:^|\n)Code review\nFixing\nCode review(?:\n|$)/);
  take.marks.stages = stages;
  await take.finish(app);
});
