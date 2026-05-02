import Image from "next/image";
import { urlFor } from "../../../sanity/lib/image";

interface SanityImageProps {
  source: { _type: string; asset: { _ref: string; _type: string } };
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
}

export default function SanityImage({
  source,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
}: SanityImageProps) {
  if (!source) return null;

  const imageUrl = urlFor(source)
    .width(width || 800)
    .height(height || 600)
    .url();

  if (fill) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className={className}
        priority={priority}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className={className}
      priority={priority}
    />
  );
}
