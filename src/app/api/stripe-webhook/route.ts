import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function appendMemberToAirtable(
  metadata: Record<string, string>,
  paymentIntentId: string
) {
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? "Members";
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Timestamp: new Date().toISOString(),
        "First Name": metadata.firstName,
        "Last Name": metadata.lastName,
        "PSU Email": metadata.psuEmail,
        Phone: metadata.phone,
        Year: metadata.year,
        Major: metadata.major,
        Hometown: metadata.hometown,
        Gender: metadata.gender,
        Religion: metadata.religion,
        Identity: metadata.identity,
        Generation: metadata.generation,
        Instagram: metadata.instagram,
        "Stripe Payment Intent ID": paymentIntentId,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable error: ${res.status} ${body}`);
  }

  console.log(`Member ${metadata.psuEmail} added to Airtable`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      if (paymentIntent.metadata) {
        await appendMemberToAirtable(paymentIntent.metadata, paymentIntent.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
