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
      major,
      hometown,
      gender,
      religion,
      identity,
      generation,
      instagram,
    } = body;

    const metadata: Record<string, string> = {
      firstName: String(firstName ?? "").slice(0, 500),
      lastName: String(lastName ?? "").slice(0, 500),
      psuEmail: String(psuEmail ?? "").slice(0, 500),
      phone: String(phone ?? "").slice(0, 500),
      year: String(year ?? "").slice(0, 500),
      major: String(major ?? "").slice(0, 500),
      hometown: String(hometown ?? "").slice(0, 500),
      gender: String(gender ?? "").slice(0, 500),
      religion: String(religion ?? "").slice(0, 500),
      identity: String(identity ?? "").slice(0, 500),
      generation: String(generation ?? "").slice(0, 500),
      instagram: String(instagram ?? "").slice(0, 500),
    };

    const copy = await sanityFetchSingle<MembershipFormCopy>(
      membershipFormCopyQuery
    );
    const amount =
      typeof copy?.priceCents === "number" && copy.priceCents >= 50
        ? Math.round(copy.priceCents)
        : 50;

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
