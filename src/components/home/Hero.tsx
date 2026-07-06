import Image from "next/image";
import Button from "@/components/shared/Button";
import type { CtaPair } from "../../../sanity/lib/types";

const FALLBACK: Required<CtaPair> = {
  title: "Celebrating South Asian Heritage in Happy Valley",
  tagline:
    "Penn State's South Asian Student Association — fostering community, culture, and connection since 1960.",
  pillars: "Celebrate | Share | Grow",
  primaryCtaLabel: "Join SASA",
  primaryCtaHref: "/join",
  secondaryCtaLabel: "Upcoming Events",
  secondaryCtaHref: "/events",
};

interface HeroProps {
  copy?: CtaPair | null;
}

export default function Hero({ copy }: HeroProps) {
  const c = { ...FALLBACK, ...(copy ?? {}) };
  const pillars = c.pillars.split("|").map((p) => p.trim()).filter(Boolean);

  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-sasa-red-900">
      {/* Paisley overlay */}
      <div className="hero-paisley-overlay" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* SASA Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/sasa-logo-white.png"
            alt="SASA Logo"
            width={243}
            height={135}
            priority
          />
        </div>

        <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {c.title}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
          {c.tagline}
        </p>

        {pillars.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3 text-sasa-gold-600 font-heading text-xl tracking-widest">
            {pillars.map((p, i) => (
              <span key={i} className="flex items-center gap-3">
                <span>{p}</span>
                {i < pillars.length - 1 && (
                  <span className="text-sasa-gold-400">|</span>
                )}
              </span>
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button href={c.primaryCtaHref} variant="primary">
            {c.primaryCtaLabel}
          </Button>
          <Button href={c.secondaryCtaHref} variant="secondary">
            {c.secondaryCtaLabel}
          </Button>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
