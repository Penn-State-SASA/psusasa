import { sanityFetch, sanityFetchSingle } from "../../sanity/lib/client";
import {
  featuredEventsQuery,
  homePageQuery,
  siteSettingsQuery,
} from "../../sanity/lib/queries";
import type { HomePageCopy, SiteSettings } from "../../sanity/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import MissionSection from "@/components/home/MissionSection";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import JoinCTA from "@/components/home/JoinCTA";
import type { SanityEvent } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const [events, copy, settings] = await Promise.all([
    sanityFetch<SanityEvent>(featuredEventsQuery),
    sanityFetchSingle<HomePageCopy>(homePageQuery),
    sanityFetchSingle<SiteSettings>(siteSettingsQuery),
  ]);

  return (
    <>
      <Navbar navItems={settings?.navItems} />
      <main>
        <Hero copy={copy?.hero} />
        <MissionSection copy={copy?.mission} />
        <div className="section-divider-mandala" />
        <UpcomingEvents events={events} copy={copy?.upcomingEvents} />
        <JoinCTA copy={copy?.joinCta} />
      </main>
      <Footer
        footer={settings?.footer}
        contact={settings?.contact}
        quickLinks={settings?.navItems}
      />
    </>
  );
}
