"use client";

import { useState } from "react";
import CategoryFilter from "@/components/events/CategoryFilter";
import EventGrid from "@/components/events/EventGrid";
import type { SanityEvent, SanityEventCategory } from "@/lib/types";

interface EventsPageClientProps {
  upcoming: SanityEvent[];
  past: SanityEvent[];
  categories: SanityEventCategory[];
}

export default function EventsPageClient({
  upcoming,
  past,
  categories,
}: EventsPageClientProps) {
  const [category, setCategory] = useState("All");

  const filterEvents = (events: SanityEvent[]) =>
    category === "All"
      ? events
      : events.filter((e) => e.category?._id === category);

  const filteredUpcoming = filterEvents(upcoming);
  const filteredPast = filterEvents(past);

  return (
    <div className="space-y-12">
      <CategoryFilter
        categories={categories}
        selected={category}
        onChange={setCategory}
      />

      {filteredUpcoming.length > 0 && (
        <EventGrid events={filteredUpcoming} title="Upcoming Events" />
      )}

      {filteredPast.length > 0 && (
        <>
          {filteredUpcoming.length > 0 && (
            <div className="section-divider-mandala" />
          )}
          <EventGrid events={filteredPast} title="Past Events" />
        </>
      )}

      {filteredUpcoming.length === 0 && filteredPast.length === 0 && (
        <p className="text-center text-sasa-neutral-500">
          No events found in this category.
        </p>
      )}
    </div>
  );
}
