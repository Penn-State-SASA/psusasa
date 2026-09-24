import type { SanityEvent, TicketType } from "@/lib/types";
import type { TicketRecord } from "@/lib/airtable";

export function makeTicketType(overrides: Partial<TicketType> = {}): TicketType {
  return {
    _key: "ga",
    name: "General Admission",
    memberPriceCents: 1000,
    nonMemberPriceCents: 1500,
    salesOpen: true,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<SanityEvent> = {}): SanityEvent {
  return {
    _id: "event-1",
    title: "Diwali Night",
    slug: { current: "diwali-night" },
    date: "2026-11-01T23:00:00Z",
    description: "",
    coverImage: { _type: "image", asset: { _ref: "image-x", _type: "reference" } },
    category: null,
    isFeatured: false,
    ticketingEnabled: true,
    cashPaymentEnabled: true,
    ticketTypes: [makeTicketType()],
    ...overrides,
  };
}

export function makeTicketRecord(overrides: Partial<TicketRecord> = {}): TicketRecord {
  return {
    id: "rec1",
    firstName: "Asha",
    lastName: "Patel",
    contactEmail: "asha@example.com",
    psuEmail: "",
    isMember: false,
    memberYear: null,
    ticketTypeKey: "ga",
    ticketTypeName: "General Admission",
    quantity: 1,
    amountPaidCents: 1500,
    paymentMethod: "Card",
    paid: true,
    checkedInCount: 0,
    checkedInAt: null,
    boardMemberName: null,
    ...overrides,
  };
}
