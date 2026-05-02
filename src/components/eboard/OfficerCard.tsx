import Image from "next/image";
import { urlFor } from "../../../sanity/lib/image";
import type { Officer } from "@/lib/types";

interface OfficerCardProps {
  officer: Officer;
}

export default function OfficerCard({ officer }: OfficerCardProps) {
  return (
    <div className="group overflow-hidden rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-sasa-gold-600/30 hover:shadow-lg">
      {/* Headshot */}
      <div className="mx-auto h-40 w-40 overflow-hidden rounded-full border-4 border-sasa-gold-600/20 bg-sasa-red-900/5">
        {officer.headshot ? (
          <Image
            src={urlFor(officer.headshot).width(320).height(320).url()}
            alt={officer.name}
            width={160}
            height={160}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-heading text-3xl text-sasa-red-900/20">
              {officer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 text-center">
        <h3 className="font-heading text-lg font-bold text-sasa-red-900">
          {officer.name}
        </h3>
        <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sasa-gold-600">
          {officer.role}
        </p>
        {officer.bio && (
          <p className="mt-3 text-sm leading-relaxed text-sasa-neutral-500">
            {officer.bio}
          </p>
        )}
      </div>
    </div>
  );
}
