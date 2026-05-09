"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "../../../sanity/lib/types";

const FALLBACK_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/eboard", label: "E-Board" },
  { href: "/gallery", label: "Gallery" },
  { href: "/join", label: "Join" },
];

interface NavbarProps {
  navItems?: NavItem[] | null;
}

export default function Navbar({ navItems }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: NavItem[] =
    navItems && navItems.length > 0 ? navItems : FALLBACK_NAV;

  return (
    <header className="sticky top-0 z-50 bg-sasa-red-900 shadow-lg">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/sasa-logo.png"
            alt="SASA — Penn State South Asian Student Association"
            width={48}
            height={36}
            priority
          />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const href = link.href ?? "#";
            const isActive =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-sasa-gold-400 underline underline-offset-4 decoration-sasa-gold-400"
                      : "text-sasa-gold-400/80 hover:text-sasa-gold-400 hover:bg-sasa-red-700/30"
                  }`}
                >
                  {link.label ?? ""}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-sasa-gold-400 hover:bg-sasa-red-700/30 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-sasa-red-700/50 md:hidden">
          <ul className="space-y-1 px-4 pb-4 pt-2">
            {links.map((link) => {
              const href = link.href ?? "#";
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-sasa-red-700/30 text-sasa-gold-400"
                        : "text-sasa-gold-400/80 hover:bg-sasa-red-700/20 hover:text-sasa-gold-400"
                    }`}
                  >
                    {link.label ?? ""}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </header>
  );
}
