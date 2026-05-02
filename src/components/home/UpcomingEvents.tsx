import SectionHeading from "@/components/shared/SectionHeading";
import EventCard from "@/components/shared/EventCard";
import Button from "@/components/shared/Button";
import type { SanityEvent } from "@/lib/types";

interface UpcomingEventsProps {
  events: SanityEvent[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading subtitle="See what's coming up next">
          Upcoming Events
        </SectionHeading>

        {events.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-sasa-neutral-500">
            No upcoming events right now — check back soon!
          </p>
        )}

        <div className="mt-10 text-center">
          <Button href="/events" variant="primary">
            View All Events
          </Button>
        </div>
      </div>
    </section>
  );
}
