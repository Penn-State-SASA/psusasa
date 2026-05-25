import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PortableTextRenderer from "@/components/sanity/PortableTextRenderer";
import { sanityFetchSingle } from "../../sanity/lib/client";
import {
  notFoundPageQuery,
  siteSettingsQuery,
} from "../../sanity/lib/queries";
import type {
  NotFoundPageCopy,
  SiteSettings,
} from "../../sanity/lib/types";
import type { PortableTextBlock } from "@portabletext/types";

// Next.js statically generates the root not-found page at build time and
// reuses it for every unmatched URL, so `revalidate` doesn't fire and edits
// in Sanity never reach the live page. force-dynamic re-renders on every
// request so the latest Sanity content always shows.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Page Not Found",
};

const FALLBACK_HERO_TITLE = "Page Not Found";
const FALLBACK_HERO_SUBTITLE =
  "We couldn't find the page you were looking for.";
const FALLBACK_PRIMARY_LABEL = "Back to Home";
const FALLBACK_PRIMARY_HREF = "/";

export default async function NotFound() {
  const [copy, settings] = await Promise.all([
    sanityFetchSingle<NotFoundPageCopy>(notFoundPageQuery),
    sanityFetchSingle<SiteSettings>(siteSettingsQuery),
  ]);

  const heroTitle = copy?.hero?.title ?? FALLBACK_HERO_TITLE;
  const heroSubtitle = copy?.hero?.subtitle ?? FALLBACK_HERO_SUBTITLE;
  const body = copy?.body;

  const primaryLabel = copy?.primaryCta?.label ?? FALLBACK_PRIMARY_LABEL;
  const primaryHref = copy?.primaryCta?.href ?? FALLBACK_PRIMARY_HREF;

  const secondaryLabel = copy?.secondaryCta?.label?.trim();
  const secondaryHref = copy?.secondaryCta?.href?.trim();
  const showSecondary = Boolean(secondaryLabel && secondaryHref);

  return (
    <>
      <Navbar navItems={settings?.navItems} />
      <main className="min-h-screen">
        <section className="relative bg-sasa-red-900 py-20">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <p className="font-heading text-6xl font-bold text-sasa-gold-400 sm:text-7xl">
              404
            </p>
            <h1 className="mt-4 font-heading text-4xl font-bold text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-lg text-white/80">{heroSubtitle}</p>
          </div>
        </section>

        <section className="bg-white py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            {body && body.length > 0 && (
              <div className="mb-8 text-left">
                <PortableTextRenderer value={body as PortableTextBlock[]} />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={primaryHref}
                className="rounded bg-sasa-red-900 px-6 py-3 text-sm font-semibold text-white hover:bg-sasa-red-700 transition-colors inline-block text-center"
              >
                {primaryLabel}
              </Link>
              {showSecondary && (
                <Link
                  href={secondaryHref!}
                  className="rounded border-2 border-sasa-gold-400 px-6 py-3 text-sm font-semibold text-sasa-gold-400 hover:bg-sasa-gold-400/10 transition-colors inline-block text-center"
                >
                  {secondaryLabel}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer
        footer={settings?.footer}
        contact={settings?.contact}
        quickLinks={settings?.navItems}
      />
    </>
  );
}
