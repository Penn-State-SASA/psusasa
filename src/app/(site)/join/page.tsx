import type { Metadata } from "next";
import dynamic from "next/dynamic";
import SectionHeading from "@/components/shared/SectionHeading";
import PortableTextRenderer from "@/components/sanity/PortableTextRenderer";
import { sanityFetchSingle } from "../../../../sanity/lib/client";
import {
  joinPageQuery,
  membershipFormCopyQuery,
} from "../../../../sanity/lib/queries";
import type {
  ContactCard,
  JoinPageCopy,
  MembershipFormCopy,
  SocialButton,
  ValueCard,
} from "../../../../sanity/lib/types";
import type { PortableTextBlock } from "@portabletext/types";

const MembershipForm = dynamic(
  () => import("@/components/join/MembershipForm"),
  { ssr: false }
);

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Join | SASA at Penn State",
  description:
    "Join the South Asian Student Association at Penn State. Get involved, meet new people, and celebrate South Asian culture.",
  alternates: { canonical: "/join" },
};

const FALLBACK_HERO_TITLE = "Join SASA";
const FALLBACK_HERO_SUBTITLE =
  "Get involved with one of Penn State's most vibrant cultural organizations.";

const FALLBACK_WHY_HEADING = "Why Join SASA?";
const FALLBACK_WHY_ITEMS: ValueCard[] = [
  {
    title: "Cultural Events",
    description:
      "Experience vibrant cultural shows, Diwali celebrations, Holi festivals, and more.",
  },
  {
    title: "Community",
    description:
      "Meet fellow students who share your heritage and make lifelong friendships.",
  },
  {
    title: "Leadership",
    description:
      "Develop leadership skills by joining committees and organizing events.",
  },
  {
    title: "THON",
    description:
      "Be part of our THON efforts — Penn State's largest student-run philanthropy.",
  },
];

const FALLBACK_FORM_HEADING = "Become a member!";
const FALLBACK_FORM_SUBTITLE =
  "Fill out the form below to join — $35 annual membership";

const FALLBACK_CONTACT_HEADING = "Get In Touch";
const FALLBACK_CONTACT_CARDS: ContactCard[] = [
  {
    label: "Email",
    value: "exec.psusasa@gmail.com",
    href: "mailto:exec.psusasa@gmail.com",
  },
  {
    label: "Instagram",
    value: "@psusasa",
    href: "https://instagram.com/psusasa",
  },
  {
    label: "Office",
    value: "204 HUB\nPenn State University Park",
    href: "",
  },
];

const FALLBACK_SOCIAL_HEADING = "Follow us on social media:";
const FALLBACK_SOCIAL_BUTTONS: SocialButton[] = [
  { label: "Instagram", href: "https://instagram.com/psusasa" },
  { label: "TikTok", href: "https://tiktok.com/@sasapsu" },
];

const CONTACT_ICONS = [
  // 0: Email
  (
    <svg
      key="email"
      className="h-6 w-6 text-sasa-red-900"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  ),
  // 1: Instagram
  (
    <svg
      key="ig"
      className="h-6 w-6 text-sasa-red-900"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  // 2: Location
  (
    <svg
      key="loc"
      className="h-6 w-6 text-sasa-red-900"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
      />
    </svg>
  ),
];

const SOCIAL_ICONS = [
  // 0: Instagram
  (
    <svg
      key="ig"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  ),
  // 1: TikTok
  (
    <svg
      key="tt"
      className="h-5 w-5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.18v-3.44a4.85 4.85 0 01-2-.58l.02.01h-.02z" />
    </svg>
  ),
];

export default async function JoinPage() {
  const [copy, formCopy] = await Promise.all([
    sanityFetchSingle<JoinPageCopy>(joinPageQuery),
    sanityFetchSingle<MembershipFormCopy>(membershipFormCopyQuery),
  ]);

  const heroTitle = copy?.hero?.title ?? FALLBACK_HERO_TITLE;
  const heroSubtitle = copy?.hero?.subtitle ?? FALLBACK_HERO_SUBTITLE;

  const whyHeading = copy?.whyJoin?.heading ?? FALLBACK_WHY_HEADING;
  const whyItems =
    copy?.whyJoin?.items && copy.whyJoin.items.length > 0
      ? copy.whyJoin.items
      : FALLBACK_WHY_ITEMS;

  const formHeading = copy?.formSection?.heading ?? FALLBACK_FORM_HEADING;
  const formSubtitle = copy?.formSection?.subtitle ?? FALLBACK_FORM_SUBTITLE;
  const formHelp = copy?.formSection?.helpText;

  const contactHeading = copy?.contact?.heading ?? FALLBACK_CONTACT_HEADING;
  const contactCards =
    copy?.contact?.cards && copy.contact.cards.length > 0
      ? copy.contact.cards
      : FALLBACK_CONTACT_CARDS;

  const socialHeading = copy?.social?.heading ?? FALLBACK_SOCIAL_HEADING;
  const socialButtons =
    copy?.social?.buttons && copy.social.buttons.length > 0
      ? copy.social.buttons
      : FALLBACK_SOCIAL_BUTTONS;

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-sasa-red-900 py-16">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-lg text-white/80">{heroSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Why Join */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>{whyHeading}</SectionHeading>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {whyItems.map((item, idx) => (
              <div
                key={item.title ?? idx}
                className="rounded-xl border border-gray-100 bg-gray-50 p-6"
              >
                <h3 className="font-heading text-lg font-semibold text-sasa-red-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-sasa-neutral-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Membership Form */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading subtitle={formSubtitle}>{formHeading}</SectionHeading>
          <div className="mt-10">
            <MembershipForm copy={formCopy} />
          </div>
          <div className="mt-4 text-center text-sm text-sasa-neutral-400">
            {formHelp && formHelp.length > 0 ? (
              <PortableTextRenderer value={formHelp as PortableTextBlock[]} />
            ) : (
              <p>
                Having trouble with the form? Email us directly at{" "}
                <a
                  href="mailto:exec.psusasa@gmail.com"
                  className="text-sasa-gold-600 hover:underline"
                >
                  exec.psusasa@gmail.com
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="section-divider-mandala" />

      {/* Contact Info */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading>{contactHeading}</SectionHeading>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {contactCards.map((card, idx) => {
              const lines = (card.value ?? "").split("\n");
              const valueNode =
                lines.length > 1 ? (
                  <p className="mt-1 text-sm text-sasa-neutral-500">
                    {lines.map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < lines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ) : card.href ? (
                  <a
                    href={card.href}
                    target={
                      /^https?:\/\//.test(card.href) ? "_blank" : undefined
                    }
                    rel={
                      /^https?:\/\//.test(card.href)
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="mt-1 block text-sm text-sasa-gold-600 hover:underline"
                  >
                    {card.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-sasa-neutral-500">
                    {card.value}
                  </p>
                );

              return (
                <div
                  key={card.label ?? idx}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sasa-red-900/10">
                    {CONTACT_ICONS[idx] ?? CONTACT_ICONS[0]}
                  </div>
                  <h3 className="mt-4 font-heading font-semibold text-sasa-red-900">
                    {card.label}
                  </h3>
                  {valueNode}
                </div>
              );
            })}
          </div>

          {/* Social Links */}
          <div className="mt-10 text-center">
            <p className="text-sm text-sasa-neutral-500">{socialHeading}</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              {socialButtons.map((btn, idx) => (
                <a
                  key={btn.label ?? idx}
                  href={btn.href ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={btn.label}
                  className="rounded-full bg-sasa-red-900 p-3 text-sasa-gold-400 transition-colors hover:bg-sasa-red-700"
                >
                  {SOCIAL_ICONS[idx] ?? SOCIAL_ICONS[0]}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
