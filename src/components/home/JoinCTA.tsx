import Button from "@/components/shared/Button";
import type { JoinCtaCopy } from "../../../sanity/lib/types";

const FALLBACK: Required<JoinCtaCopy> = {
  heading: "Become a Part of Our Community",
  description:
    "Whether you're South Asian or simply interested in learning about South Asian culture, SASA welcomes everyone. Join us for events, make lifelong friends, and celebrate diversity.",
  primaryCtaLabel: "Join SASA Today",
  primaryCtaHref: "/join",
  secondaryCtaLabel: "Follow @psusasa on Instagram",
  secondaryCtaHref: "https://instagram.com/psusasa",
};

interface JoinCTAProps {
  copy?: JoinCtaCopy | null;
}

export default function JoinCTA({ copy }: JoinCTAProps) {
  const c = { ...FALLBACK, ...(copy ?? {}) };
  const isExternal = /^https?:\/\//.test(c.secondaryCtaHref);

  return (
    <section className="relative overflow-hidden bg-sasa-forest py-20">
      <div className="hero-paisley-overlay" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          {c.heading}
        </h2>
        <p className="mt-4 text-lg text-white/80">{c.description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button href={c.primaryCtaHref} variant="primary">
            {c.primaryCtaLabel}
          </Button>
          <a
            href={c.secondaryCtaHref}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-2 text-sm font-medium text-sasa-gold-400 transition-colors hover:text-sasa-gold-400/80"
          >
            {c.secondaryCtaLabel}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
