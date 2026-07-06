import SectionHeading from "@/components/shared/SectionHeading";
import PortableTextRenderer from "@/components/sanity/PortableTextRenderer";
import type { MissionCopy } from "../../../sanity/lib/types";
import type { PortableTextBlock } from "@portabletext/types";

const FALLBACK_BODY_TEXT =
  "The South Asian Student Association (SASA) at Penn State fosters an environment that allows students of South Asian heritage to share and promote their culture. We bring together the diverse communities of India, Pakistan, Afghanistan, Bangladesh, Bhutan, Sri Lanka, and the Maldives to celebrate our shared heritage and unique traditions.";

interface MissionSectionProps {
  copy?: MissionCopy | null;
}

export default function MissionSection({ copy }: MissionSectionProps) {
  const eyebrow = copy?.eyebrow ?? "Our Mission";
  const heading = copy?.heading ?? "Who We Are";
  const body = copy?.body;

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
      </div>
    </section>
  );
}
