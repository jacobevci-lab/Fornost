const { test, expect } = require('@playwright/test');

const axePath = require.resolve('axe-core/axe.min.js');
const allowedPlatformResourceHosts = new Set(['static.cloudflareinsights.com']);

async function gotoHome(page) {
  const response = await page.goto('/', { waitUntil: 'networkidle' });
  expect(response, 'Home page response should exist').not.toBeNull();
  expect(response.status(), 'Home page should return HTTP 200').toBe(200);
}

async function collectRuntimeErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => {
    const host = new URL(request.url()).hostname;
    if (!allowedPlatformResourceHosts.has(host)) {
      failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || 'failed'}`);
    }
  });

  return { consoleErrors, pageErrors, badResponses, failedRequests };
}

test('structural, SEO, translation and asset integrity', async ({ page }) => {
  const runtime = await collectRuntimeErrors(page);
  await gotoHome(page);

  const result = await page.evaluate((allowedHosts) => {
    const allowed = new Set(allowedHosts);
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const brokenAnchors = [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href'))
      .filter((href) => href && href !== '#')
      .filter((href) => !document.getElementById(href.slice(1)));

    const incompleteTranslations = [...document.querySelectorAll('[data-i18n]')]
      .filter((el) => !el.dataset.en || !el.dataset.tr)
      .map((el) => el.outerHTML.slice(0, 180));

    const imagesWithoutAlt = [...document.images]
      .filter((img) => !img.hasAttribute('alt'))
      .map((img) => img.getAttribute('src'));

    const resources = [
      ...[...document.querySelectorAll('script[src]')].map((el) => el.src),
      ...[...document.querySelectorAll('link[rel="stylesheet"][href]')].map((el) => el.href),
      ...[...document.querySelectorAll('img[src]')].map((el) => el.src)
    ];
    const rawResources = [
      ...[...document.querySelectorAll('script[src]')].map((el) => el.getAttribute('src')),
      ...[...document.querySelectorAll('link[rel="stylesheet"][href]')].map((el) => el.getAttribute('href')),
      ...[...document.querySelectorAll('img[src]')].map((el) => el.getAttribute('src'))
    ].filter(Boolean);
    const unexpectedExternalResources = resources.filter((url) => {
      const parsed = new URL(url, location.href);
      return parsed.origin !== location.origin && !allowed.has(parsed.hostname);
    });

    return {
      duplicateIds,
      brokenAnchors,
      incompleteTranslations,
      imagesWithoutAlt,
      unexpectedExternalResources,
      h1Count: document.querySelectorAll('h1').length,
      formCount: document.querySelectorAll('form').length,
      mailtoLinks: [...document.querySelectorAll('a[href^="mailto:"]')].map((a) => a.getAttribute('href')),
      canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      description: document.querySelector('meta[name="description"]')?.content || '',
      ogTitle: document.querySelector('meta[property="og:title"]')?.content || '',
      ogDescription: document.querySelector('meta[property="og:description"]')?.content || '',
      ogUrl: document.querySelector('meta[property="og:url"]')?.content || '',
      viewport: document.querySelector('meta[name="viewport"]')?.content || '',
      lang: document.documentElement.lang,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      inlineScripts: [...document.scripts].filter((script) => !script.src && script.textContent.trim()).length,
      insecureResources: rawResources.filter((url) => url.trim().startsWith('http://')),
      title: document.title
    };
  }, [...allowedPlatformResourceHosts]);

  expect(result.duplicateIds).toEqual([]);
  expect(result.brokenAnchors).toEqual([]);
  expect(result.incompleteTranslations).toEqual([]);
  expect(result.imagesWithoutAlt).toEqual([]);
  expect(result.unexpectedExternalResources).toEqual([]);
  expect(result.insecureResources).toEqual([]);
  expect(result.inlineScripts).toBe(0);
  expect(result.h1Count).toBe(1);
  expect(result.formCount).toBe(0);
  expect(result.mailtoLinks.length).toBeGreaterThanOrEqual(2);
  expect(result.mailtoLinks.every((href) => href === 'mailto:info@fornostsecurity.com')).toBeTruthy();
  expect(result.canonical).toBe('https://fornostsecurity.com/');
  expect(result.description.length).toBeGreaterThan(70);
  expect(result.description.length).toBeLessThan(180);
  expect(result.ogTitle).toContain('Fornost Security');
  expect(result.ogDescription.length).toBeGreaterThan(40);
  expect(result.ogUrl).toBe('https://fornostsecurity.com/');
  expect(result.viewport).toContain('width=device-width');
  expect(['en', 'tr']).toContain(result.lang);
  expect(result.title).toContain('Fornost Security');
  expect(result.horizontalOverflow).toBeLessThanOrEqual(1);

  expect(runtime.consoleErrors).toEqual([]);
  expect(runtime.pageErrors).toEqual([]);
  expect(runtime.badResponses).toEqual([]);
  expect(runtime.failedRequests).toEqual([]);
});

test('English and Turkish switching is complete and persists', async ({ page }) => {
  await gotoHome(page);
  await page.evaluate(() => localStorage.removeItem('fornost-language'));
  await page.reload({ waitUntil: 'networkidle' });

  await page.locator('[data-set-lang="tr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page).toHaveTitle('Fornost Security | Kurumsal Siber Güvenlik Danışmanlığı');
  await expect(page.locator('h1')).toContainText('Riski, mimariyi ve');

  const trMismatch = await page.evaluate(() => [...document.querySelectorAll('[data-i18n]')]
    .filter((el) => el.textContent.trim() !== el.dataset.tr.trim())
    .map((el) => ({ text: el.textContent.trim(), expected: el.dataset.tr.trim() })));
  expect(trMismatch).toEqual([]);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
  await expect(page.locator('h1')).toContainText('Riski, mimariyi ve');

  await page.locator('[data-set-lang="en"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Fornost Security | Enterprise Cybersecurity Advisory');
  await expect(page.locator('h1')).toContainText('Security that connects');

  const enMismatch = await page.evaluate(() => [...document.querySelectorAll('[data-i18n]')]
    .filter((el) => el.textContent.trim() !== el.dataset.en.trim())
    .map((el) => ({ text: el.textContent.trim(), expected: el.dataset.en.trim() })));
  expect(enMismatch).toEqual([]);
});

test('navigation anchors and back-to-top behavior work', async ({ page }) => {
  await gotoHome(page);

  await page.locator('a[href="#company"]').first().click();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  await expect(page.locator('#company')).toBeInViewport();

  await page.locator('#backToTop').click();
  await expect.poll(async () => page.evaluate(() => Math.round(window.scrollY)), { timeout: 5000 }).toBeLessThan(12);

  await page.locator('a[href="#capabilities"]').first().click();
  await expect(page.locator('#capabilities')).toBeInViewport();

  await page.locator('a[href="#contact"]').first().click();
  await expect(page.locator('#contact')).toBeInViewport();
});

test('mobile navigation supports pointer and keyboard closure without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoHome(page);

  const toggle = page.locator('#menuToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#siteNav')).toHaveClass(/open/);
  await expect(page.locator('body')).toHaveClass(/menu-open/);

  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await expect(page.locator('#siteNav')).not.toHaveClass(/open/);

  await toggle.click();
  await page.locator('#siteNav a[href="#capabilities"]').click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#siteNav')).not.toHaveClass(/open/);
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('responsive layout has no horizontal overflow across supported viewports', async ({ page }) => {
  const viewports = [
    { width: 320, height: 640 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 980, height: 1100 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await gotoHome(page);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerRight: document.querySelector('.site-header').getBoundingClientRect().right,
      viewportWidth: document.documentElement.clientWidth,
      heroWidth: document.querySelector('.hero-copy').getBoundingClientRect().width
    }));
    expect(metrics.overflow, `${viewport.width}px viewport should not overflow`).toBeLessThanOrEqual(1);
    expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.heroWidth).toBeGreaterThan(250);
  }
});

test('WCAG A/AA automated accessibility scan has no violations', async ({ browser }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL;
  const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const response = await page.goto(new URL('/', baseURL).toString(), { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  await page.addScriptTag({ path: axePath });

  const desktop = await page.evaluate(async () => axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
  }));
  expect(desktop.violations, JSON.stringify(desktop.violations, null, 2)).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.addScriptTag({ path: axePath });
  const mobile = await page.evaluate(async () => axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
  }));
  expect(mobile.violations, JSON.stringify(mobile.violations, null, 2)).toEqual([]);

  await context.close();
});

test('reduced-motion preference disables reveal animation dependency', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gotoHome(page);

  const hiddenRevealCount = await page.evaluate(() => [...document.querySelectorAll('.reveal')]
    .filter((el) => {
      const style = getComputedStyle(el);
      return Number(style.opacity) < 0.99;
    }).length);

  expect(hiddenRevealCount).toBe(0);
});

test('no unsafe HTML/script sinks are exposed in shipped client code', async ({ request, baseURL }) => {
  const scriptUrl = new URL('/script.js', baseURL).toString();
  const response = await request.get(scriptUrl);
  expect(response.status()).toBe(200);
  const source = await response.text();

  expect(source).not.toMatch(/\.innerHTML\s*=/);
  expect(source).not.toMatch(/\.outerHTML\s*=/);
  expect(source).not.toMatch(/\beval\s*\(/);
  expect(source).not.toMatch(/new\s+Function\s*\(/);
  expect(source).not.toMatch(/document\.write\s*\(/);
});
