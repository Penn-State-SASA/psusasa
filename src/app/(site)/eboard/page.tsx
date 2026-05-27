import type { Metadata } from "next";
import { sanityFetch } from "../../../../sanity/lib/client";
import { officersQuery } from "../../../../sanity/lib/queries";
import SectionHeading from "@/components/shared/SectionHeading";
import OfficerCard from "@/components/eboard/OfficerCard";
import type { Officer } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin Board | SASA at Penn State",
  description:
    "Meet the Admin Board of the South Asian Student Association at Penn State.",
};

export const revalidate = 60;

export default async function EBoardPage() {
  const officers = await sanityFetch<Officer>(officersQuery);

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-sasa-red-900 py-16">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
              Admin <span className="text-sasa-gold-400">Board</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Meet the leaders who make SASA happen.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {officers.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {officers.map((officer) => (
                <OfficerCard key={officer._id} officer={officer} />
              ))}
            </div>
          ) : (
            <div className="text-center">
              <SectionHeading>Admin Board Coming Soon</SectionHeading>
              <p className="mt-4 text-sasa-neutral-500">
                Our admin board members will be listed here soon. Check back
                later!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
