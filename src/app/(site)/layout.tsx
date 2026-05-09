import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { sanityFetchSingle } from "../../../sanity/lib/client";
import { siteSettingsQuery } from "../../../sanity/lib/queries";
import type { SiteSettings } from "../../../sanity/lib/types";

export const revalidate = 60;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await sanityFetchSingle<SiteSettings>(siteSettingsQuery);

  return (
    <>
      <Navbar navItems={settings?.navItems} />
      <main className="min-h-screen">{children}</main>
      <Footer
        footer={settings?.footer}
        contact={settings?.contact}
        quickLinks={settings?.navItems}
      />
    </>
  );
}
