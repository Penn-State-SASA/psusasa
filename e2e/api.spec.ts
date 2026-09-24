import { test, expect } from "@playwright/test";
import { PSU_CONTACT_EMAIL_ERROR } from "../src/lib/email";

// Routing, middleware, and input checks in the real Next runtime. Every
// request here is rejected before the route touches Stripe or Airtable.

const buyer = {
  eventId: "e2e-no-such-event",
  ticketTypeKey: "ga",
  quantity: 1,
  firstName: "E2E",
  lastName: "Smoke",
  contactEmail: "e2e@example.com",
  psuEmail: "",
};

test.describe("ticket purchase routes", () => {
  test("refuse a PSU address as the contact email", async ({ request }) => {
    const res = await request.post("/api/create-ticket-payment-intent", {
      data: { ...buyer, contactEmail: "abc123@psu.edu" },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: PSU_CONTACT_EMAIL_ERROR });
  });

  test("refuse an order without the buyer's name", async ({ request }) => {
    const res = await request.post("/api/create-ticket-payment-intent", {
      data: { ...buyer, firstName: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("refuse a cash order with an invalid email", async ({ request }) => {
    const res = await request.post("/api/create-cash-ticket-order", {
      data: { ...buyer, contactEmail: "not-an-email" },
    });
    expect(res.status()).toBe(400);
  });

  test("need an event to check member pricing", async ({ request }) => {
    const res = await request.post("/api/check-member-pricing", { data: {} });
    expect(res.status()).toBe(400);
  });
});

test.describe("webhooks", () => {
  test("the Stripe webhook refuses an unsigned request", async ({ request }) => {
    const res = await request.post("/api/stripe-webhook", { data: "{}" });
    expect(res.status()).toBe(400);
  });

  test("the Stripe webhook refuses a forged signature", async ({ request }) => {
    const res = await request.post("/api/stripe-webhook", {
      data: '{"type":"payment_intent.succeeded"}',
      headers: { "stripe-signature": "t=1767225600,v1=deadbeef" },
    });
    expect(res.status()).toBe(400);
  });

  test("the Sanity revalidate hook refuses a wrong secret", async ({ request }) => {
    const res = await request.post("/api/revalidate", { data: { secret: "wrong" } });
    expect(res.status()).toBe(401);
  });
});

test("check-in login needs a password", async ({ request }) => {
  const res = await request.post("/api/checkin-login", {
    data: { eventId: "e2e-no-such-event" },
  });
  expect(res.status()).toBe(400);
});
