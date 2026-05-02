import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

interface BlockProps {
  children?: React.ReactNode;
}

interface LinkProps {
  value?: { href?: string };
  children?: React.ReactNode;
}

const components = {
  block: {
    h1: ({ children }: BlockProps) => (
      <h1 className="mb-4 font-heading text-3xl font-bold text-sasa-red-900">
        {children}
      </h1>
    ),
    h2: ({ children }: BlockProps) => (
      <h2 className="mb-3 font-heading text-2xl font-bold text-sasa-red-900">
        {children}
      </h2>
    ),
    h3: ({ children }: BlockProps) => (
      <h3 className="mb-2 font-heading text-xl font-semibold text-sasa-red-900">
        {children}
      </h3>
    ),
    normal: ({ children }: BlockProps) => (
      <p className="mb-4 leading-relaxed text-sasa-neutral-500">{children}</p>
    ),
  },
  marks: {
    strong: ({ children }: BlockProps) => (
      <strong className="font-semibold text-sasa-red-900">{children}</strong>
    ),
    em: ({ children }: BlockProps) => <em>{children}</em>,
    link: ({ value, children }: LinkProps) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sasa-gold-600 underline hover:text-sasa-gold-400"
      >
        {children}
      </a>
    ),
  },
};

export default function PortableTextRenderer({
  value,
}: {
  value: PortableTextBlock[];
}) {
  if (!value) return null;
  return <PortableText value={value} components={components} />;
}
