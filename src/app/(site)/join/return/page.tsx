import type { Metadata } from "next";
import Link from "next/link";
import Stripe from "stripe";
import { appendMemberToAirtable } from "@/lib/airtable";

export const metadata: Metadata = {
  title: "Welcome | SASA at Penn State",
  description: "You're officially a SASA member!",
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function JoinReturnPage({
  searchParams,
}: {
  searchParams: { payment_intent?: string };
}) {
  const paymentIntentId = searchParams.payment_intent;

  if (!paymentIntentId) {
    return (
      <div>
        {/* Hero */}
        <section className="bg-sasa-red-900 py-16">
          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <div className="hero-paisley-overlay" />
            <div className="relative z-10">
              <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
                Join <span className="text-sasa-gold-400">SASA</span>
              </h1>
            </div>
          </div>
        </section>

        {/* Error */}
        <section className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 text-center">
              <p className="text-red-700">
                Something went wrong. Please{" "}
                <Link href="/join" className="underline font-semibold">
                  try again
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  let paymentIntent: Stripe.PaymentIntent | null = null;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    console.error("Error retrieving payment intent:", err);
  }

  const isComplete = paymentIntent?.status === "succeeded";

  if (isComplete && paymentIntent?.metadata) {
    try {
      await appendMemberToAirtable(paymentIntent.metadata, paymentIntent.id);
    } catch (err) {
      console.error("Airtable write failed:", err);
    }
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-sasa-red-900 py-16">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
              {isComplete ? "You're officially a SASA member!" : "Payment Status"}
            </h1>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {isComplete ? (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
              {/* Checkmark */}
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-sasa-gold-400/20">
                <svg
                  className="h-10 w-10 text-sasa-gold-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.293 5.293a1 1 0 011.414 1.414l-10 10a1 1 0 01-1.414 0l-6-6a1 1 0 011.414-1.414L10 14.586l9.293-9.293z" />
                </svg>
              </div>

              <h2 className="font-heading text-2xl font-bold text-sasa-red-900 mb-3">
                Welcome to SASA!
              </h2>

              <p className="mb-4 text-sasa-neutral-500">
                Your $35 membership payment was successful. A confirmation email will be sent to the PSU email you provided.
              </p>

              <div className="mb-8 rounded-lg bg-gray-50 p-4 text-left">
                <p className="mb-3 text-sm font-semibold text-sasa-red-900">
                  Next steps:
                </p>
                <ul className="space-y-2 text-sm text-sasa-neutral-500">
                  <li>
                    • Follow us on Instagram:{" "}
                    <a
                      href="https://instagram.com/psusasa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sasa-gold-600 hover:underline"
                    >
                      @psusasa
                    </a>
                  </li>
                  <li>
                    • Check your email (spam folder) for a confirmation receipt from Stripe
                  </li>
                  <li>
                    {/* TODO: Add GroupMe invite link once GroupMe API is integrated */}
                    • We&apos;ll reach out with details on how to join our GroupMe community
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/"
                  className="rounded bg-sasa-red-900 px-6 py-3 text-sm font-semibold text-white hover:bg-sasa-red-700 transition-colors inline-block text-center"
                >
                  Back to Home
                </Link>
                <Link
                  href="/events"
                  className="rounded border-2 border-sasa-gold-400 px-6 py-3 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 transition-colors inline-block text-center"
                >
                  See Upcoming Events
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
              <p className="mb-4 text-yellow-700">
                Your payment is still processing or was not completed.
              </p>
              <Link
                href="/join"
                className="inline-block rounded bg-sasa-red-900 px-6 py-2 text-sm font-semibold text-white hover:bg-sasa-red-700"
              >
                Try Again
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
