import Link from "next/link";
import Image from "next/image";
import { urlFor } from "../../../sanity/lib/image";
import type { SanityEvent } from "@/lib/types";

interface EventCardProps {
  event: SanityEvent;
}

function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

export default function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
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
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: event.category.color,
              color: getTextColor(event.category.color),
            }}
          >
            {event.category.name}
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
