import { sanityFetch } from "../../sanity/lib/client";
import { featuredEventsQuery } from "../../sanity/lib/queries";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import MissionSection from "@/components/home/MissionSection";
import UpcomingEvents from "@/components/home/UpcomingEvents";
import JoinCTA from "@/components/home/JoinCTA";
import type { SanityEvent } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const events = await sanityFetch<SanityEvent>(featuredEventsQuery);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MissionSection />
        <div className="section-divider-mandala" />
        <UpcomingEvents events={events} />
        <JoinCTA />
      </main>
      <Footer />
    </>
  );
}
