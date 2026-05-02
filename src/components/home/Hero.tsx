import Image from "next/image";
import Button from "@/components/shared/Button";

export default function Hero() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-sasa-red-900">
      {/* Paisley overlay */}
      <div className="hero-paisley-overlay" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        {/* SASA Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/sasa-logo.png"
            alt="SASA Logo"
            width={180}
            height={135}
            priority
          />
        </div>

        <h1 className="font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          Celebrating South Asian Heritage{" "}
          <span className="text-sasa-gold-400">in Happy Valley</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
          Penn State&apos;s South Asian Student Association — fostering community,
          culture, and connection since 1960.
        </p>

        <div className="mt-4 flex items-center justify-center gap-3 text-sasa-gold-600 font-heading text-xl tracking-widest">
          <span>Celebrate</span>
          <span className="text-sasa-gold-400">|</span>
          <span>Share</span>
          <span className="text-sasa-gold-400">|</span>
          <span>Grow</span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button href="/join" variant="primary">
            Join SASA
          </Button>
          <Button href="/events" variant="secondary">
            Upcoming Events
          </Button>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
