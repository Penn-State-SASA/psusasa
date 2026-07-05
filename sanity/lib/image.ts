import createImageUrlBuilder from "@sanity/image-url";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const builder = projectId
  ? createImageUrlBuilder({ projectId, dataset })
  : null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  if (!builder) {
    // Chainable no-op stub so any builder method sequence resolves to the
    // fallback logo when the Sanity project id is unavailable.
    const stub: Record<string, unknown> = {
      url: () => "/sasa-logo.png",
    };
    const chain = new Proxy(stub, {
      get(target, prop) {
        if (prop === "url") return target.url;
        return () => chain;
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return chain as any;
  }
  return builder.image(source);
}
