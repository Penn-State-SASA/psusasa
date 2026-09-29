import { NextRequest } from "next/server";

/** A POST with a JSON body, the way the app's forms call its API routes. */
export function jsonRequest(
  path: string,
  body: unknown,
  { cookie }: { cookie?: string } = {}
): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(new URL(path, "http://localhost"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** A GET, as middleware sees a page navigation or API fetch. */
export function getRequest(path: string, { cookie }: { cookie?: string } = {}): NextRequest {
  return new NextRequest(new URL(path, "http://localhost"), {
    headers: cookie ? { cookie } : {},
  });
}
