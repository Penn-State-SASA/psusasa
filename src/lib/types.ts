import type { PortableTextBlock } from "@portabletext/types";

export interface SanityImageSource {
  _type: "image";
  asset: {
    _ref: string;
    _type: "reference";
  };
  hotspot?: {
    x: number;
    y: number;
    height: number;
    width: number;
  };
}

export interface SanityEvent {
  _id: string;
  title: string;
  slug: { current: string };
  date: string;
  description: string;
  coverImage: SanityImageSource;
  category:
    | "Cultural Show"
    | "Festival"
    | "Social"
    | "THON"
    | "Community Service";
  isFeatured: boolean;
}

export interface Officer {
  _id: string;
  name: string;
  role: string;
  headshot: SanityImageSource;
  bio: string;
  order: number;
}

export interface GalleryImage {
  _id: string;
  image: SanityImageSource;
  caption: string;
  eventTitle?: string;
  semester: string;
}

export interface Announcement {
  _id: string;
  title: string;
  body: PortableTextBlock[];
  publishedAt: string;
}
