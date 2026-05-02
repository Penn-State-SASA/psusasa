import createImageUrlBuilder from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const builder = projectId
  ? createImageUrlBuilder({ projectId, dataset })
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  if (!builder) {
    return {
      width: () => ({ height: () => ({ url: () => "/sasa-logo.png" }), url: () => "/sasa-logo.png" }),
      height: () => ({ url: () => "/sasa-logo.png", width: () => ({ url: () => "/sasa-logo.png" }) }),
      url: () => "/sasa-logo.png",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }
  return builder.image(source);
}
