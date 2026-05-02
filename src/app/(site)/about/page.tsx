import type { Metadata } from "next";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading";

export const metadata: Metadata = {
  title: "About | SASA at Penn State",
  description:
    "Learn about the South Asian Student Association at Penn State — our history, mission, and the countries we represent.",
};

const countries = [
  { name: "India", abbr: "IND", code: "in" },
  { name: "Pakistan", abbr: "PAK", code: "pk" },
  { name: "Afghanistan", abbr: "AFG", code: "af" },
  { name: "Bangladesh", abbr: "BGD", code: "bd" },
  { name: "Bhutan", abbr: "BTN", code: "bt" },
  { name: "Sri Lanka", abbr: "LKA", code: "lk" },
  { name: "Maldives", abbr: "MDV", code: "mv" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-sasa-red-900 py-20">
        <div className="hero-paisley-overlay" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
            About <span className="text-sasa-gold-400">SASA</span>
          </h1>
          <p className="mt-4 text-lg text-white/80">
            The South Asian Student Association at Penn State University
          </p>
        </div>
      </section>

      {/* History */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Our History</SectionHeading>
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-sasa-neutral-500">
            <p>
              Founded on <strong className="text-sasa-red-900">September 30, 1960</strong>,
              the South Asian Student Association (SASA) is one of the oldest
              cultural organizations at Penn State University. For over six
              decades, SASA has served as a home for students of South Asian
              heritage and anyone interested in South Asian culture.
            </p>
            <p>
              What began as a small group of students seeking to maintain their
              cultural ties has grown into one of the most vibrant and active
              student organizations on campus, hosting cultural shows, festivals,
              community service events, and social gatherings throughout the year.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Mission */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>Our Mission</SectionHeading>
          <p className="mt-8 text-center text-xl font-medium italic text-sasa-red-900">
            &ldquo;Fostering an environment at Penn State that allows students of
            South Asian heritage to share and promote their culture.&rdquo;
          </p>
          <p className="mt-6 text-center text-lg text-sasa-neutral-500">
            SASA strives to create a welcoming community where students can
            celebrate their heritage, educate others about South Asian cultures,
            and build meaningful connections that last a lifetime.
          </p>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Countries We Represent */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading subtitle="Representing the diverse cultures of South Asia">
            Countries We Represent
          </SectionHeading>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {countries.map((country) => (
              <div
                key={country.name}
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Flag background — light watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.15] transition-opacity group-hover:opacity-25">
                  <Image
                    src={`https://flagcdn.com/w320/${country.code}.png`}
                    alt=""
                    width={320}
                    height={213}
                    className="h-full w-full object-cover"
                    aria-hidden="true"
                  />
                </div>
                <span className="relative font-heading text-2xl font-bold tracking-wider text-sasa-red-900">
                  {country.abbr}
                </span>
                <span className="relative mt-1 text-xs text-sasa-neutral-500">
                  {country.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Values */}
      <section className="bg-sasa-red-900 py-20">
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
              Our Values
            </h2>
            <div className="mt-3 mx-auto h-1 w-16 rounded-full bg-sasa-gold-600" />

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div>
                <h3 className="font-heading text-2xl font-bold text-sasa-gold-400">
                  Celebrate
                </h3>
                <p className="mt-3 text-white/80">
                  We honor our rich cultural heritage through vibrant events,
                  performances, and traditions that showcase the beauty and
                  diversity of South Asia.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-sasa-gold-400">
                  Share
                </h3>
                <p className="mt-3 text-white/80">
                  We open our doors to the entire Penn State community, sharing
                  our food, music, dance, and stories to foster cross-cultural
                  understanding and appreciation.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-sasa-gold-400">
                  Grow
                </h3>
                <p className="mt-3 text-white/80">
                  We develop leaders, build lifelong friendships, and strengthen
                  our community through service, mentorship, and collaborative
                  initiatives.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
