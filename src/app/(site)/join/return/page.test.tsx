import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import JoinReturnPage from "./page";
import { appendMemberToAirtable } from "@/lib/airtable";
import { sanityFetchSingle } from "../../../../../sanity/lib/client";
import { paymentIntentsRetrieve } from "@/test/stripeMock";
import { muteConsole } from "@/test/console";

vi.mock("stripe", async () => (await import("@/test/stripeMock")).stripeWithSpiedPaymentIntents());
vi.mock("@/lib/airtable", () => ({ appendMemberToAirtable: vi.fn() }));
vi.mock("../../../../../sanity/lib/client", () => ({
  sanityFetchSingle: vi.fn(),
  sanityFetch: vi.fn(),
}));

const membershipMetadata = {
  purchaseType: "membership",
  firstName: "Asha",
  lastName: "Patel",
  psuEmail: "abc123@psu.edu",
};

function paymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: "pi_123",
    status: "succeeded",
    amount: 3635,
    metadata: membershipMetadata,
    ...overrides,
  };
}

async function visit(searchParams: { payment_intent?: string } = { payment_intent: "pi_123" }) {
  return renderToStaticMarkup(await JoinReturnPage({ searchParams }));
}

beforeEach(() => {
  vi.resetAllMocks();
  // No CMS copy: the page renders its built-in fallbacks.
  vi.mocked(sanityFetchSingle).mockResolvedValue(null);
  paymentIntentsRetrieve.mockResolvedValue(paymentIntent());
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("join return page", () => {
  it("records a paid membership and welcomes the new member", async () => {
    const html = await visit();
    expect(appendMemberToAirtable).toHaveBeenCalledWith(membershipMetadata, "pi_123");
    expect(html).toContain("officially a SASA member");
  });

  it("shows what Stripe actually charged", async () => {
    expect(await visit()).toContain("$36.35");
  });

  it("does not make someone a member by pasting a ticket payment into the URL", async () => {
    // Would otherwise grant membership, and member ticket pricing, for the
    // price of a ticket.
    paymentIntentsRetrieve.mockResolvedValue(
      paymentIntent({ metadata: { purchaseType: "ticket", psuEmail: "abc123@psu.edu" } })
    );
    await visit();
    expect(appendMemberToAirtable).not.toHaveBeenCalled();
  });

  it("does not record a payment with no purchase tag", async () => {
    paymentIntentsRetrieve.mockResolvedValue(paymentIntent({ metadata: {} }));
    await visit();
    expect(appendMemberToAirtable).not.toHaveBeenCalled();
  });

  it("records nothing while the payment hasn't succeeded", async () => {
    paymentIntentsRetrieve.mockResolvedValue(paymentIntent({ status: "processing" }));
    const html = await visit();
    expect(appendMemberToAirtable).not.toHaveBeenCalled();
    expect(html).toContain("still processing or was not completed");
  });

  it("shows the error state, without calling Stripe, on a direct visit", async () => {
    const html = await visit({});
    expect(paymentIntentsRetrieve).not.toHaveBeenCalled();
    expect(html).toContain("Something went wrong");
  });

  it("still welcomes the member when the Airtable write fails", async () => {
    vi.mocked(appendMemberToAirtable).mockRejectedValue(new Error("Airtable error: 503"));
    expect(await visit()).toContain("officially a SASA member");
  });
});
