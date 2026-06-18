import type { Metadata } from "next";
import { sanityFetch } from "../../../../sanity/lib/client";
import { galleryAlbumsQuery } from "../../../../sanity/lib/queries";
import SectionHeading from "@/components/shared/SectionHeading";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import type { GalleryAlbum, GalleryImage } from "@/lib/types";

export const metadata: Metadata = {
  title: "Gallery | SASA at Penn State",
  description:
    "Browse photos from SASA events, cultural shows, and gatherings at Penn State.",
  alternates: { canonical: "/gallery" },
};

export const revalidate = 60;

function albumHeading(album: GalleryAlbum): string {
  return album.title?.trim() || album.eventTitle?.trim() || "Untitled Album";
}

function albumPhotosAsImages(album: GalleryAlbum): GalleryImage[] {
  const heading = albumHeading(album);
  return album.images.map((p) => ({
    _id: p._key,
    image: p.image,
    caption: p.caption,
    eventTitle: heading,
    semester: album.semester,
  }));
}

export default async function GalleryPage() {
  const albums = await sanityFetch<GalleryAlbum>(galleryAlbumsQuery);

  const semesters = albums.reduce(
    (acc, album) => {
      const key = album.semester || "Other";
      if (!acc[key]) acc[key] = [];
      acc[key].push(album);
      return acc;
    },
    {} as Record<string, GalleryAlbum[]>
  );

  const semesterKeys = Object.keys(semesters);

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-sasa-red-900 py-16">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="hero-paisley-overlay" />
          <div className="relative z-10">
            <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
              Photo <span className="text-sasa-gold-400">Gallery</span>
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Memories from our events, festivals, and gatherings.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {albums.length > 0 ? (
            <div className="space-y-20">
              {semesterKeys.map((semester) => (
                <div key={semester}>
                  <h2 className="mb-10 font-heading text-3xl font-bold text-sasa-red-900">
                    {semester}
                  </h2>
                  <div className="space-y-14">
                    {semesters[semester].map((album) => (
                      <div key={album._id}>
                        <h3 className="mb-6 font-heading text-xl font-semibold text-sasa-red-900">
                          {albumHeading(album)}
                        </h3>
                        <GalleryGrid images={albumPhotosAsImages(album)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <SectionHeading>Gallery Coming Soon</SectionHeading>
              <p className="mt-4 text-sasa-neutral-500">
                Photos from our events will appear here. Follow{" "}
                <a
                  href="https://instagram.com/psusasa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sasa-gold-600 hover:underline"
                >
                  @psusasa
                </a>{" "}
                on Instagram for the latest photos!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
