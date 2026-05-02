import EventCard from "@/components/shared/EventCard";
import type { SanityEvent } from "@/lib/types";

interface EventGridProps {
  events: SanityEvent[];
  title?: string;
}

export default function EventGrid({ events, title }: EventGridProps) {
  if (events.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="mb-6 font-heading text-2xl font-bold text-sasa-red-900">
          {title}
        </h3>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    </div>
  );
}
