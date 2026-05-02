import Link from "next/link";
import Image from "next/image";
import { urlFor } from "../../../sanity/lib/image";
import type { SanityEvent } from "@/lib/types";

interface EventCardProps {
  event: SanityEvent;
}

const categoryColors: Record<string, string> = {
  "Cultural Show": "bg-sasa-red-600 text-white",
  Festival: "bg-sasa-gold-600 text-sasa-red-900",
  Social: "bg-sasa-forest text-white",
  THON: "bg-sasa-red-500 text-white",
  "Community Service": "bg-sasa-sage text-sasa-red-900",
};

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Link
      href={`/events/${event.slug.current}`}
      className="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg"
    >
      {/* Cover Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-sasa-red-900/10">
        {event.coverImage ? (
          <Image
            src={urlFor(event.coverImage).width(600).height(375).url()}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-heading text-2xl text-sasa-red-900/20">
              SASA
            </span>
          </div>
        )}
        {/* Category badge */}
        {event.category && (
          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
              categoryColors[event.category] || "bg-gray-200 text-gray-700"
            }`}
          >
            {event.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-sasa-gold-600">
          {formattedDate}
        </p>
        <h3 className="mt-1 font-heading text-lg font-semibold text-sasa-red-900 group-hover:text-sasa-red-700">
          {event.title}
        </h3>
        {event.description && (
          <p className="mt-2 line-clamp-2 text-sm text-sasa-neutral-500">
            {event.description}
          </p>
        )}
      </div>
    </Link>
  );
}
