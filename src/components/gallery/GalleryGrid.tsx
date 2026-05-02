"use client";

import { useState } from "react";
import Image from "next/image";
import { urlFor } from "../../../sanity/lib/image";
import ImageLightbox from "./ImageLightbox";
import type { GalleryImage } from "@/lib/types";

interface GalleryGridProps {
  images: GalleryImage[];
}

export default function GalleryGrid({ images }: GalleryGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {images.map((img, index) => (
          <div
            key={img._id}
            className="mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-lg"
            onClick={() => setLightboxIndex(index)}
          >
            <div className="group relative">
              <Image
                src={urlFor(img.image).width(600).height(600).url()}
                alt={img.caption || "Gallery image"}
                width={600}
                height={600}
                className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                {img.caption && (
                  <p className="text-sm text-white">{img.caption}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
