"use client";

import type { SanityEventCategory } from "@/lib/types";

interface CategoryFilterProps {
  categories: SanityEventCategory[];
  selected: string;
  onChange: (categoryId: string) => void;
}

export default function CategoryFilter({
  categories,
  selected,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button
        onClick={() => onChange("All")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
          selected === "All"
            ? "bg-sasa-red-900 text-sasa-gold-400 shadow-md"
            : "bg-gray-100 text-sasa-neutral-500 hover:bg-gray-200"
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat._id}
          onClick={() => onChange(cat._id)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            selected === cat._id
              ? "bg-sasa-red-900 text-sasa-gold-400 shadow-md"
              : "bg-gray-100 text-sasa-neutral-500 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
