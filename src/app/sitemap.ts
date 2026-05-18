import { MetadataRoute } from "next";
import { sanityFetch } from "../../sanity/lib/client";
import { allEventsQuery } from "../../sanity/lib/queries";
import type { SanityEvent } from "@/lib/types";

const baseUrl = "https://psusasa.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/events`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/eboard`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/gallery`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/join`, changeFrequency: "monthly", priority: 0.8 },
  ];

  let eventRoutes: MetadataRoute.Sitemap = [];
  try {
    const events = await sanityFetch<SanityEvent>(allEventsQuery);
    eventRoutes = events
      .filter((event) => event.slug?.current)
      .map((event) => ({
        url: `${baseUrl}/events/${event.slug.current}`,
        lastModified: event._updatedAt ? new Date(event._updatedAt) : undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      }));
  } catch (error) {
    console.error("sitemap: failed to fetch events from Sanity", error);
  }

  return [...staticRoutes, ...eventRoutes];
}
