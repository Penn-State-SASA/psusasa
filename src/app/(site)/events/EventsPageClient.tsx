"use client";

import { useState } from "react";
import CategoryFilter from "@/components/events/CategoryFilter";
import EventGrid from "@/components/events/EventGrid";
import type { SanityEvent, SanityEventCategory } from "@/lib/types";

interface EventsPageClientProps {
  upcoming: SanityEvent[];
  categories: SanityEventCategory[];
}

export default function EventsPageClient({
  upcoming,
  categories,
}: EventsPageClientProps) {
  const [category, setCategory] = useState("All");

  const filteredUpcoming =
    category === "All"
      ? upcoming
      : upcoming.filter((e) => e.category?._id === category);

  return (
    <div className="space-y-12">
      <CategoryFilter
        categories={categories}
        selected={category}
        onChange={setCategory}
      />

      {filteredUpcoming.length > 0 ? (
        <EventGrid events={filteredUpcoming} title="Upcoming Events" />
      ) : (
        <p className="text-center text-sasa-neutral-500">
          No events found in this category.
        </p>
      )}
    </div>
  );
}
