import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import { membershipFormCopyQuery } from "../../../../sanity/lib/queries";
import type { MembershipFormCopy } from "../../../../sanity/lib/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      psuEmail,
      phone,
      year,
      membershipType,
      major,
      hometown,
      gender,
      religion,
      identity,
      generation,
      instagram,
    } = body;

    if (
      membershipType !== "returning" &&
      membershipType !== "transfer" &&
      membershipType !== "new"
    ) {
      return NextResponse.json(
        { error: "Invalid membership type. Please go back and select one." },
        { status: 400 }
      );
    }

    const copy = await sanityFetchSingle<MembershipFormCopy>(
      membershipFormCopyQuery
    );

    const tierPriceCents =
      membershipType === "returning"
        ? copy?.tiers?.returningPriceCents
        : membershipType === "transfer"
          ? copy?.tiers?.transferPriceCents
          : copy?.tiers?.newMemberPriceCents;
    const tierLabel =
      membershipType === "returning"
        ? copy?.tiers?.returningLabel ?? "Returning Member"
        : membershipType === "transfer"
          ? copy?.tiers?.transferLabel ?? "Transfer Student"
          : copy?.tiers?.newMemberLabel ?? "New Member";

    const amount =
      typeof tierPriceCents === "number" && tierPriceCents >= 50
        ? Math.round(tierPriceCents)
        : typeof copy?.priceCents === "number" && copy.priceCents >= 50
          ? Math.round(copy.priceCents)
          : 50;

    const metadata: Record<string, string> = {
      firstName: String(firstName ?? "").slice(0, 500),
      lastName: String(lastName ?? "").slice(0, 500),
      psuEmail: String(psuEmail ?? "").slice(0, 500),
      phone: String(phone ?? "").slice(0, 500),
      year: String(year ?? "").slice(0, 500),
      membershipType: String(membershipType).slice(0, 50),
      membershipTier: tierLabel.slice(0, 500),
      amountPaidCents: String(amount),
      major: String(major ?? "").slice(0, 500),
      hometown: String(hometown ?? "").slice(0, 500),
      gender: String(gender ?? "").slice(0, 500),
      religion: String(religion ?? "").slice(0, 500),
      identity: String(identity ?? "").slice(0, 500),
      generation: String(generation ?? "").slice(0, 500),
      instagram: String(instagram ?? "").slice(0, 500),
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata,
      receipt_email: psuEmail ?? undefined,
      description: "SASA Membership — Penn State South Asian Student Association",
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Payment intent error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
