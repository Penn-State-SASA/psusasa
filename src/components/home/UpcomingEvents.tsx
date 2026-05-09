import SectionHeading from "@/components/shared/SectionHeading";
import EventCard from "@/components/shared/EventCard";
import Button from "@/components/shared/Button";
import type { SanityEvent } from "@/lib/types";
import type { UpcomingEventsCopy } from "../../../sanity/lib/types";

const FALLBACK: Required<UpcomingEventsCopy> = {
  heading: "Upcoming Events",
  subtitle: "See what's coming up next",
  emptyMessage: "No upcoming events right now — check back soon!",
  viewAllLabel: "View All Events",
};

interface UpcomingEventsProps {
  events: SanityEvent[];
  copy?: UpcomingEventsCopy | null;
}

export default function UpcomingEvents({ events, copy }: UpcomingEventsProps) {
  const c = { ...FALLBACK, ...(copy ?? {}) };

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading subtitle={c.subtitle}>{c.heading}</SectionHeading>

        {events.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-sasa-neutral-500">
            {c.emptyMessage}
          </p>
        )}

        <div className="mt-10 text-center">
          <Button href="/events" variant="primary">
            {c.viewAllLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
