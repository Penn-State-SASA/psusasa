import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import { computeCardFee } from "@/lib/fees";
import { paymentIntentsCreate } from "@/test/stripeMock";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("stripe", async () => (await import("@/test/stripeMock")).stripeWithSpiedPaymentIntents());
vi.mock("../../../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));

const applicant = {
  firstName: "Asha",
  lastName: "Patel",
  psuEmail: "abc123@psu.edu",
  phone: "+18145551234",
  year: "Junior",
  major: "Computer Science",
  hometown: "Pittsburgh",
  gender: "Female",
  religion: "Hindu",
  identity: "Gujarati",
  generation: "2nd generation (born in the US)",
  instagram: "@asha",
};

function join(overrides: Record<string, unknown> = {}) {
  return POST(jsonRequest("/api/create-payment-intent", { ...applicant, ...overrides }));
}

beforeEach(() => {
  vi.resetAllMocks();
  paymentIntentsCreate.mockResolvedValue({ client_secret: "pi_123_secret_abc" });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/create-payment-intent", () => {
  it("charges the Studio price grossed up for the card fee", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue({ priceCents: 4000 });
    const res = await join();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientSecret: "pi_123_secret_abc" });

    const { totalCents, feeCents } = computeCardFee(4000);
    const args = paymentIntentsCreate.mock.calls[0][0];
    expect(args.amount).toBe(totalCents);
    expect(args.metadata).toMatchObject({
      baseAmountCents: "4000",
      cardFeeCents: String(feeCents),
      amountPaidCents: String(totalCents),
    });
  });

  it.each([
    ["Sanity is unreachable", null],
    ["no price is set", {}],
    ["the price is below Stripe's 50c minimum", { priceCents: 25 }],
  ])("falls back to $35 when %s", async (_why, copy) => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(copy);
    await join();
    expect(paymentIntentsCreate.mock.calls[0][0].amount).toBe(computeCardFee(3500).totalCents);
  });

  it("tags the PaymentIntent as a membership with every form field", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue({ priceCents: 3500 });
    await join();

    const args = paymentIntentsCreate.mock.calls[0][0];
    expect(args.metadata).toMatchObject({
      purchaseType: "membership",
      membershipTier: "Regular",
      ...applicant,
    });
    expect(args.receipt_email).toBe("abc123@psu.edu");
    expect(args.automatic_payment_methods).toEqual({ enabled: true });
  });

  it("stores missing optional fields as empty strings, never 'undefined'", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue({ priceCents: 3500 });
    await join({ instagram: undefined, hometown: null });
    const { metadata } = paymentIntentsCreate.mock.calls[0][0];
    expect(metadata.instagram).toBe("");
    expect(metadata.hometown).toBe("");
  });

  it("returns a generic 500 when Stripe fails", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue({ priceCents: 3500 });
    paymentIntentsCreate.mockRejectedValue(new Error("Stripe is down"));
    const res = await join();
    expect(res.status).toBe(500);
  });
});
