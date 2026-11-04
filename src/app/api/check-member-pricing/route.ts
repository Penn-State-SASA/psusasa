import { NextRequest, NextResponse } from "next/server";
import { hasUsedMemberPricing, lookupCurrentMember } from "@/lib/airtable";
import { normalizedName } from "@/lib/ticketing";

// Read-only preview check the purchase form calls on PSU-email blur, so
// step 1 can show an accurate price before the buyer clicks Continue —
// the actual purchase routes always re-run this same logic server-side
// regardless of what this returns, so there's no trust issue in exposing it.
export async function POST(req: NextRequest) {
  try {
    const { eventId, psuEmail, firstName, lastName } = await req.json();

    if (typeof eventId !== "string" || !eventId) {
      return NextResponse.json({ error: "Missing event." }, { status: 400 });
    }

    const email = typeof psuEmail === "string" ? psuEmail.trim() : "";
    if (!email) {
      return NextResponse.json({ isMember: false, alreadyUsed: false, nameMismatch: false });
    }

    const record = await lookupCurrentMember(email);
    // Mirrors resolveTicketOrder's own check — a name that doesn't match
    // the Members-table record previews as "not a member" too, so this
    // preview never promises a discount the real purchase won't honor.
    // nameMismatch distinguishes "no membership under this email" from
    // "found a membership, but the name doesn't match" so the form can
    // tell the buyer which one actually happened.
    const nameMismatch =
      record.isMember &&
      normalizedName(firstName, lastName) !==
        normalizedName(record.firstName, record.lastName);
    const isMember = record.isMember && !nameMismatch;
    const alreadyUsed = isMember ? await hasUsedMemberPricing(eventId, email) : false;

    return NextResponse.json({ isMember, alreadyUsed, nameMismatch });
  } catch (err) {
    console.error("Member pricing check error:", err);
    return NextResponse.json({ error: "Failed to check pricing." }, { status: 500 });
  }
}
