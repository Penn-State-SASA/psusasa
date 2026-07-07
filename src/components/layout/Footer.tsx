import Link from "next/link";
import Image from "next/image";
import type { ContactCopy, FooterCopy, NavItem } from "../../../sanity/lib/types";

const FALLBACK_FOOTER: Required<FooterCopy> = {
  tagline: "South Asian Student Association at Penn State",
  quickLinksHeading: "Quick Links",
  contactHeading: "Contact Us",
  socialHeading: "Follow Us",
  copyright:
    "© {year} Penn State South Asian Student Association. All rights reserved.",
};

const FALLBACK_CONTACT: Required<ContactCopy> = {
  email: "exec.psusasa@gmail.com",
  instagramHandle: "@psusasa",
  instagramUrl: "https://instagram.com/psusasa",
  tiktokHandle: "@sasapsu",
  tiktokUrl: "https://tiktok.com/@sasapsu",
  linkedinUrl: "",
  officeAddress: "204 HUB\nPenn State University Park",
};

const FALLBACK_QUICK_LINKS: NavItem[] = [
  { href: "/about", label: "About Us" },
  { href: "/events", label: "Events" },
  { href: "/eboard", label: "Admin Board" },
  { href: "/gallery", label: "Gallery" },
  { href: "/join", label: "Join SASA" },
];

interface FooterProps {
  footer?: FooterCopy | null;
  contact?: ContactCopy | null;
  quickLinks?: NavItem[] | null;
}

export default function Footer({ footer, contact, quickLinks }: FooterProps) {
  const f = { ...FALLBACK_FOOTER, ...(footer ?? {}) };
  const c = { ...FALLBACK_CONTACT, ...(contact ?? {}) };
  const links =
    quickLinks && quickLinks.length > 0 ? quickLinks : FALLBACK_QUICK_LINKS;

  const copyright = f.copyright.replace(
    "{year}",
    String(new Date().getFullYear())
  );

  return (
    <footer className="bg-sasa-red-900 text-sasa-gold-400/90">
      {/* Mandala border */}
      <div className="section-divider-mandala" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo + tagline */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <Image
            src="/sasa-logo-white.png"
            alt="SASA Logo"
            width={108}
            height={60}
          />
          <p className="text-center text-sm text-sasa-gold-400/70">
            {f.tagline}
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-sasa-gold-400">
              {f.quickLinksHeading}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.href ?? link.label}>
                  <Link
                    href={link.href ?? "#"}
                    className="transition-colors hover:text-sasa-gold-400"
                  >
                    {link.label ?? ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-sasa-gold-400">
              {f.contactHeading}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={`mailto:${c.email}`}
                  className="transition-colors hover:text-sasa-gold-400"
                >
                  {c.email}
                </a>
              </li>
              <li>Instagram DM: {c.instagramHandle}</li>
              {c.linkedinUrl && (
                <li>
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-sasa-gold-400"
                  >
                    LinkedIn
                  </a>
                </li>
              )}
              {c.officeAddress.split("\n").map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-sasa-gold-400">
              {f.socialHeading}
            </h3>
            <div className="mt-4 flex gap-4">
              {/* Instagram */}
              <a
                href={c.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full bg-sasa-red-700/40 p-2 transition-colors hover:bg-sasa-gold-600/20"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              {/* TikTok */}
              <a
                href={c.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="rounded-full bg-sasa-red-700/40 p-2 transition-colors hover:bg-sasa-gold-600/20"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.15a8.16 8.16 0 005.58 2.18v-3.44a4.85 4.85 0 01-2-.58l.02.01h-.02z"/>
                </svg>
              </a>
              {/* Email */}
              <a
                href={`mailto:${c.email}`}
                aria-label="Email"
                className="rounded-full bg-sasa-red-700/40 p-2 transition-colors hover:bg-sasa-gold-600/20"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-sasa-red-700/50 pt-6 text-center text-xs text-sasa-gold-400/60">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
