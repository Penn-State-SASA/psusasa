"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export default function StudioPage() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-lg bg-white p-8 shadow-md text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Sanity Studio</h1>
          <p className="mt-4 text-gray-600">
            Please set <code className="rounded bg-gray-100 px-2 py-1 text-sm">NEXT_PUBLIC_SANITY_PROJECT_ID</code> in
            your <code className="rounded bg-gray-100 px-2 py-1 text-sm">.env.local</code> file to enable the Studio.
          </p>
        </div>
      </div>
    );
  }

  return <NextStudio config={config} />;
}
