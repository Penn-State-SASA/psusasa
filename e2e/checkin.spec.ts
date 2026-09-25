import { test, expect } from "@playwright/test";

// An event id that can't exist, so nothing here ever reaches a real board.
const EVENT = "e2e-no-such-event";

test("the event picker is open to everyone", async ({ page }) => {
  const res = await page.goto("/checkin");
  expect(res?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Select an Event" })).toBeVisible();
});

test("a signed-out visitor is sent to the event's login, without a redirect loop", async ({
  page,
}) => {
  const res = await page.goto(`/checkin/${EVENT}`);
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(`/checkin/${EVENT}/login`);
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("a wrong password is refused and stays on the login page", async ({ page }) => {
  await page.goto(`/checkin/${EVENT}/login`);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Enter" }).click();

  await expect(page.getByText("Incorrect password.")).toBeVisible();
  await expect(page).toHaveURL(`/checkin/${EVENT}/login`);
});

test("a forged session cookie doesn't open the board", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "sasa_checkin_session", value: "forged.signature", url: baseURL! },
  ]);
  await page.goto(`/checkin/${EVENT}`);
  await expect(page).toHaveURL(`/checkin/${EVENT}/login`);
});

test("the board's API refuses a signed-out caller", async ({ request }) => {
  const res = await request.get(`/api/checkin/${EVENT}/tickets`);
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ error: "Not authorized" });
});

test("the former board check-in refuses a signed-out caller", async ({ request }) => {
  const res = await request.post(`/api/checkin/${EVENT}/former-board`, {
    data: { rosterKey: "om-makwana" },
  });
  expect(res.status()).toBe(401);
  expect(await res.json()).toEqual({ error: "Not authorized" });
});
