import { test, expect, type Page } from "@playwright/test";

// Assertions stay content-agnostic: in CI there's no Sanity project, so pages
// render their built-in fallbacks; locally they render real CMS content.

const PUBLIC_PAGES = ["/", "/about", "/events", "/eboard", "/gallery", "/join"];

/** Collects uncaught exceptions (crashes, hydration failures) for the page's lifetime. */
function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (err) => errors.push(err));
  return errors;
}

for (const path of PUBLIC_PAGES) {
  test(`${path} loads with a heading and no uncaught errors`, async ({ page }) => {
    const errors = trackPageErrors(page);
    const res = await page.goto(path);

    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    // Give client components (the membership form, Stripe.js) time to boot.
    await page.waitForLoadState("networkidle");
    expect(errors).toEqual([]);
  });
}

test("every navbar link leads to a working page", async ({ page, isMobile }) => {
  await page.goto("/");
  const header = page.locator("header");

  if (isMobile) await header.getByRole("button", { name: "Toggle menu" }).click();
  const hrefs = await header
    .locator('a[href^="/"]:visible')
    .evaluateAll((links) => Array.from(new Set(links.map((a) => a.getAttribute("href")!))));
  expect(hrefs.length).toBeGreaterThan(1);

  for (const href of hrefs) {
    await page.goto("/");
    if (isMobile) await header.getByRole("button", { name: "Toggle menu" }).click();
    await header.locator(`a[href="${href}"]:visible`).first().click();
    await expect(page).toHaveURL((url) => url.pathname === href);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});

test("an unknown path shows the 404 page", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("robots.txt and the sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("Disallow: /api/");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("https://psusasa.com/join");
});
