import type { Metadata } from "next";
import Image from "next/image";
import SectionHeading from "@/components/shared/SectionHeading";
import PortableTextRenderer from "@/components/sanity/PortableTextRenderer";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import { aboutPageQuery } from "../../../../sanity/lib/queries";
import type {
  AboutPageCopy,
  CountryItem,
  ValueCard,
} from "../../../../sanity/lib/types";
import type { PortableTextBlock } from "@portabletext/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "About | SASA at Penn State",
  description:
    "Learn about the South Asian Student Association at Penn State — our history, mission, and the countries we represent.",
  alternates: { canonical: "/about" },
};

const FALLBACK_COUNTRIES: CountryItem[] = [
  { name: "India", abbr: "IND", countryCode: "in" },
  { name: "Pakistan", abbr: "PAK", countryCode: "pk" },
  { name: "Afghanistan", abbr: "AFG", countryCode: "af" },
  { name: "Bangladesh", abbr: "BGD", countryCode: "bd" },
  { name: "Bhutan", abbr: "BTN", countryCode: "bt" },
  { name: "Sri Lanka", abbr: "LKA", countryCode: "lk" },
  { name: "Maldives", abbr: "MDV", countryCode: "mv" },
];

const FALLBACK_VALUES: ValueCard[] = [
  {
    title: "Celebrate",
    description:
      "We honor our rich cultural heritage through vibrant events, performances, and traditions that showcase the beauty and diversity of South Asia.",
  },
  {
    title: "Share",
    description:
      "We open our doors to the entire Penn State community, sharing our food, music, dance, and stories to foster cross-cultural understanding and appreciation.",
  },
  {
    title: "Grow",
    description:
      "We develop leaders, build lifelong friendships, and strengthen our community through service, mentorship, and collaborative initiatives.",
  },
];

const FALLBACK_HERO_TITLE = "About SASA";
const FALLBACK_HERO_SUBTITLE =
  "The South Asian Student Association at Penn State University";

const FALLBACK_HISTORY_HEADING = "Our History";
const FALLBACK_HISTORY_PARAGRAPHS = [
  <>
    Founded on{" "}
    <strong className="text-sasa-red-900">September 30, 1960</strong>, the
    South Asian Student Association (SASA) is one of the oldest cultural
    organizations at Penn State University. For over six decades, SASA has
    served as a home for students of South Asian heritage and anyone
    interested in South Asian culture.
  </>,
  <>
    What began as a small group of students seeking to maintain their cultural
    ties has grown into one of the most vibrant and active student
    organizations on campus, hosting cultural shows, festivals, community
    service events, and social gatherings throughout the year.
  </>,
];

const FALLBACK_MISSION_HEADING = "Our Mission";
const FALLBACK_MISSION_QUOTE =
  "Fostering an environment at Penn State that allows students of South Asian heritage to share and promote their culture.";
const FALLBACK_MISSION_BODY =
  "SASA strives to create a welcoming community where students can celebrate their heritage, educate others about South Asian cultures, and build meaningful connections that last a lifetime.";

const FALLBACK_COUNTRIES_HEADING = "Countries We Represent";
const FALLBACK_COUNTRIES_SUBTITLE =
  "Representing the diverse cultures of South Asia";

const FALLBACK_VALUES_HEADING = "Our Values";

export default async function AboutPage() {
  const copy = await sanityFetchSingle<AboutPageCopy>(aboutPageQuery);

  const heroTitle = copy?.hero?.title ?? FALLBACK_HERO_TITLE;
  const heroSubtitle = copy?.hero?.subtitle ?? FALLBACK_HERO_SUBTITLE;

  const historyHeading = copy?.history?.heading ?? FALLBACK_HISTORY_HEADING;
  const historyBody = copy?.history?.body;

  const missionHeading = copy?.mission?.heading ?? FALLBACK_MISSION_HEADING;
  const missionQuote = copy?.mission?.quote ?? FALLBACK_MISSION_QUOTE;
  const missionBody = copy?.mission?.body;

  const countriesHeading =
    copy?.countries?.heading ?? FALLBACK_COUNTRIES_HEADING;
  const countriesSubtitle =
    copy?.countries?.subtitle ?? FALLBACK_COUNTRIES_SUBTITLE;
  const countries =
    copy?.countries?.items && copy.countries.items.length > 0
      ? copy.countries.items
      : FALLBACK_COUNTRIES;

  const valuesHeading = copy?.values?.heading ?? FALLBACK_VALUES_HEADING;
  const values =
    copy?.values?.items && copy.values.items.length > 0
      ? copy.values.items
      : FALLBACK_VALUES;

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative bg-sasa-red-900 py-20">
        <div className="hero-paisley-overlay" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-4 text-lg text-white/80">{heroSubtitle}</p>
        </div>
      </section>

      {/* History */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>{historyHeading}</SectionHeading>
          <div className="mt-8 space-y-4 text-lg leading-relaxed text-sasa-neutral-500">
            {historyBody && historyBody.length > 0 ? (
              <PortableTextRenderer
                value={historyBody as PortableTextBlock[]}
              />
            ) : (
              FALLBACK_HISTORY_PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)
            )}
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Mission */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>{missionHeading}</SectionHeading>
          <p className="mt-8 text-center text-xl font-medium italic text-sasa-red-900">
            &ldquo;{missionQuote}&rdquo;
          </p>
          <div className="mt-6 text-center text-lg text-sasa-neutral-500">
            {missionBody && missionBody.length > 0 ? (
              <PortableTextRenderer
                value={missionBody as PortableTextBlock[]}
              />
            ) : (
              <p>{FALLBACK_MISSION_BODY}</p>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Countries We Represent */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading subtitle={countriesSubtitle}>
            {countriesHeading}
          </SectionHeading>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {countries.map((country, idx) => (
              <div
                key={country.name ?? idx}
                className="group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50 p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Flag background — light watermark */}
                {country.countryCode && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.15] transition-opacity group-hover:opacity-25">
                    <Image
                      src={`https://flagcdn.com/w320/${country.countryCode}.png`}
                      alt=""
                      width={320}
                      height={213}
                      className="h-full w-full object-cover"
                      aria-hidden="true"
                    />
                  </div>
                )}
                <span className="relative font-heading text-2xl font-bold tracking-wider text-sasa-red-900">
                  {country.abbr ?? country.name}
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
              {valuesHeading}
            </h2>
            <div className="mt-3 mx-auto h-1 w-16 rounded-full bg-sasa-gold-600" />

            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {values.map((v, idx) => (
                <div key={v.title ?? idx}>
                  <h3 className="font-heading text-2xl font-bold text-sasa-gold-400">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-white/80">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
