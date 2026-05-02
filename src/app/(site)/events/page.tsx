import type { Metadata } from "next";
import { sanityFetch } from "../../../../sanity/lib/client";
import {
  upcomingEventsQuery,
  pastEventsQuery,
} from "../../../../sanity/lib/queries";
import SectionHeading from "@/components/shared/SectionHeading";
import EventsPageClient from "./EventsPageClient";
import type { SanityEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Events | SASA at Penn State",
  description:
    "Explore upcoming and past events hosted by the South Asian Student Association at Penn State.",
};

export const revalidate = 60;

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([
    sanityFetch<SanityEvent>(upcomingEventsQuery),
    sanityFetch<SanityEvent>(pastEventsQuery),
  ]);

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-sasa-red-900 py-16">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
              Our <span className="text-sasa-gold-400">Events</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              From cultural shows to community service — there&apos;s always
              something happening at SASA.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {upcoming.length === 0 && past.length === 0 ? (
            <div className="text-center">
              <SectionHeading>Events Coming Soon</SectionHeading>
              <p className="mt-4 text-sasa-neutral-500">
                Check back soon for upcoming SASA events, or follow us on{" "}
                <a
                  href="https://instagram.com/psusasa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sasa-gold-600 hover:underline"
                >
                  Instagram
                </a>{" "}
                for the latest updates.
              </p>
            </div>
          ) : (
            <EventsPageClient upcoming={upcoming} past={past} />
          )}
        </div>
      </section>
    </div>
  );
}
