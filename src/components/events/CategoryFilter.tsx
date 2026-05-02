"use client";

const categories = [
  "All",
  "Cultural Show",
  "Festival",
  "Social",
  "THON",
  "Community Service",
];

interface CategoryFilterProps {
  selected: string;
  onChange: (category: string) => void;
}

export default function CategoryFilter({
  selected,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            selected === cat
              ? "bg-sasa-red-900 text-sasa-gold-400 shadow-md"
              : "bg-gray-100 text-sasa-neutral-500 hover:bg-gray-200"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
