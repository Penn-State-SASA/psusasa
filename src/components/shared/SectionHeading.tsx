interface SectionHeadingProps {
  children: React.ReactNode;
  subtitle?: string;
  centered?: boolean;
  light?: boolean;
}

export default function SectionHeading({
  children,
  subtitle,
  centered = true,
  light = false,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "text-center" : ""}>
      <h2
        className={`font-heading text-3xl font-bold sm:text-4xl ${
          light ? "text-white" : "text-sasa-red-900"
        }`}
      >
        {children}
      </h2>
      <div
        className={`mt-3 h-1 w-16 rounded-full bg-sasa-gold-600 ${
          centered ? "mx-auto" : ""
        }`}
      />
      {subtitle && (
        <p
          className={`mt-4 text-lg ${
            light ? "text-white/80" : "text-sasa-neutral-500"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
