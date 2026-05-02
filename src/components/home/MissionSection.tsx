import SectionHeading from "@/components/shared/SectionHeading";

export default function MissionSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading subtitle="Our Mission">Who We Are</SectionHeading>

        <p className="mt-8 text-center text-lg leading-relaxed text-sasa-neutral-500">
          The South Asian Student Association (SASA) at Penn State fosters an
          environment that allows students of South Asian heritage to share and
          promote their culture. We bring together the diverse communities of
          India, Pakistan, Afghanistan, Bangladesh, Bhutan, Sri Lanka, and the
          Maldives to celebrate our shared heritage and unique traditions.
        </p>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: "Celebrate",
              description:
                "Honoring South Asian traditions through cultural shows, festivals, and events that bring our heritage to life.",
              icon: "🎭",
            },
            {
              title: "Share",
              description:
                "Creating spaces to share our cultures, stories, and experiences with the Penn State community.",
              icon: "🤝",
            },
            {
              title: "Grow",
              description:
                "Building lasting friendships, leadership skills, and a stronger South Asian community in Happy Valley.",
              icon: "🌱",
            },
          ].map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center shadow-sm"
            >
              <span className="text-3xl">{value.icon}</span>
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
