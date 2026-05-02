import Button from "@/components/shared/Button";

export default function JoinCTA() {
  return (
    <section className="relative overflow-hidden bg-sasa-forest py-20">
      <div className="hero-paisley-overlay" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          Become a Part of{" "}
          <span className="text-sasa-gold-400">Our Community</span>
        </h2>
        <p className="mt-4 text-lg text-white/80">
          Whether you&apos;re South Asian or simply interested in learning about South
          Asian culture, SASA welcomes everyone. Join us for events, make
          lifelong friends, and celebrate diversity.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button href="/join" variant="primary">
            Join SASA Today
          </Button>
          <a
            href="https://instagram.com/psusasa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-sasa-gold-400 transition-colors hover:text-sasa-gold-400/80"
          >
            Follow @psusasa on Instagram
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
