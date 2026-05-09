import SectionHeading from "@/components/shared/SectionHeading";
import PortableTextRenderer from "@/components/sanity/PortableTextRenderer";
import type { MissionCopy, ValueCard } from "../../../sanity/lib/types";
import type { PortableTextBlock } from "@portabletext/types";

const FALLBACK_VALUE_CARDS: ValueCard[] = [
  {
    title: "Celebrate",
    description:
      "Honoring South Asian traditions through cultural shows, festivals, and events that bring our heritage to life.",
  },
  {
    title: "Share",
    description:
      "Creating spaces to share our cultures, stories, and experiences with the Penn State community.",
  },
  {
    title: "Grow",
    description:
      "Building lasting friendships, leadership skills, and a stronger South Asian community in Happy Valley.",
  },
];

const FALLBACK_ICONS = ["🎭", "🤝", "🌱"];

const FALLBACK_BODY_TEXT =
  "The South Asian Student Association (SASA) at Penn State fosters an environment that allows students of South Asian heritage to share and promote their culture. We bring together the diverse communities of India, Pakistan, Afghanistan, Bangladesh, Bhutan, Sri Lanka, and the Maldives to celebrate our shared heritage and unique traditions.";

interface MissionSectionProps {
  copy?: MissionCopy | null;
}

export default function MissionSection({ copy }: MissionSectionProps) {
  const eyebrow = copy?.eyebrow ?? "Our Mission";
  const heading = copy?.heading ?? "Who We Are";
  const body = copy?.body;
  const cards =
    copy?.valueCards && copy.valueCards.length > 0
      ? copy.valueCards
      : FALLBACK_VALUE_CARDS;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading subtitle={eyebrow}>{heading}</SectionHeading>

        <div className="mt-8 text-center text-lg leading-relaxed text-sasa-neutral-500">
          {body && body.length > 0 ? (
            <PortableTextRenderer value={body as PortableTextBlock[]} />
          ) : (
            <p>{FALLBACK_BODY_TEXT}</p>
          )}
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {cards.map((value, idx) => (
            <div
              key={value.title ?? idx}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center shadow-sm"
            >
              <span className="text-3xl">
                {FALLBACK_ICONS[idx] ?? FALLBACK_ICONS[0]}
              </span>
              <h3 className="mt-3 font-heading text-xl font-semibold text-sasa-red-900">
                {value.title}
              </h3>
              <p className="mt-2 text-sm text-sasa-neutral-500">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
