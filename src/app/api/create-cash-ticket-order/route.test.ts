import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import {
  appendTicketToAirtable,
  hasUsedMemberPricing,
  lookupCurrentMember,
} from "@/lib/airtable";
import { sendTicketConfirmationEmail } from "@/lib/ticketEmail";
import { PSU_CONTACT_EMAIL_ERROR } from "@/lib/email";
import { makeEvent, makeTicketType } from "@/test/factories";
import { jsonRequest } from "@/test/request";
import { muteConsole } from "@/test/console";

vi.mock("../../../../sanity/lib/client", () => ({ sanityFetchSingle: vi.fn(), sanityFetch: vi.fn() }));
vi.mock("@/lib/airtable");
vi.mock("@/lib/ticketEmail", () => ({ sendTicketConfirmationEmail: vi.fn() }));

const ga = makeTicketType({ _key: "ga", memberPriceCents: 1000, nonMemberPriceCents: 1500 });

const buyer = {
  eventId: "event-1",
  ticketTypeKey: "ga",
  quantity: 2,
  firstName: "Asha",
  lastName: "Patel",
  contactEmail: "asha@example.com",
  psuEmail: "",
};

function reserve(overrides: Record<string, unknown> = {}) {
  return POST(jsonRequest("/api/create-cash-ticket-order", { ...buyer, ...overrides }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sanityFetchSingle).mockResolvedValue(makeEvent({ ticketTypes: [ga] }));
  vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: false, year: null });
  vi.mocked(hasUsedMemberPricing).mockResolvedValue(false);
  vi.mocked(appendTicketToAirtable).mockResolvedValue({ inserted: true });
  muteConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/create-cash-ticket-order", () => {
  it("reserves an unpaid cash order at the plain ticket price, with no card fee", async () => {
    const res = await reserve();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      eventName: "Diwali Night",
      ticketTypeName: "General Admission",
      quantity: 2,
      memberUnits: 0,
      nonMemberUnits: 2,
      amountDueCents: 3000,
    });
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "Cash",
        paid: false,
        amountPaidCents: 3000,
        quantity: 2,
      }),
      null
    );
  });

  it("sends no confirmation email for an order that isn't paid yet", async () => {
    await reserve();
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
  });

  it("applies the one-seat member discount the same way the card route does", async () => {
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: "Junior" });
    const res = await reserve({ psuEmail: "abc123@psu.edu" });
    expect((await res.json()).amountDueCents).toBe(1000 + 1500);
  });

  it("refuses when cash payment is turned off for the event", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(
      makeEvent({ ticketTypes: [ga], cashPaymentEnabled: false })
    );
    const res = await reserve();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Cash payment is not available for this event." });
    expect(appendTicketToAirtable).not.toHaveBeenCalled();
  });

  it("rejects a PSU contact email", async () => {
    const res = await reserve({ contactEmail: "abc123@psu.edu" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: PSU_CONTACT_EMAIL_ERROR });
  });

  it("settles a $0 order immediately and confirms it by email", async () => {
    vi.mocked(sanityFetchSingle).mockResolvedValue(
      makeEvent({ ticketTypes: [{ ...ga, memberPriceCents: 0 }] })
    );
    vi.mocked(lookupCurrentMember).mockResolvedValue({ isMember: true, year: null });

    const res = await reserve({ quantity: 1, psuEmail: "abc123@psu.edu" });

    expect(await res.json()).toMatchObject({ free: true });
    expect(appendTicketToAirtable).toHaveBeenCalledWith(
      expect.objectContaining({ paid: true, amountPaidCents: 0 }),
      null
    );
    expect(sendTicketConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it("returns a 500 when the Airtable write fails", async () => {
    vi.mocked(appendTicketToAirtable).mockRejectedValue(new Error("Airtable error: 500"));
    const res = await reserve();
    expect(res.status).toBe(500);
  });
});
