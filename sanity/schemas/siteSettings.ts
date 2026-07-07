import { defineField, defineType } from "sanity";

export default defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "navItems",
      title: "Navigation Items",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "label", title: "Label", type: "string" },
            { name: "href", title: "Href", type: "string" },
          ],
          preview: {
            select: { title: "label", subtitle: "href" },
          },
        },
      ],
      initialValue: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Events", href: "/events" },
        { label: "E-Board", href: "/eboard" },
        { label: "Gallery", href: "/gallery" },
        { label: "Join", href: "/join" },
      ],
    }),
    defineField({
      name: "footer",
      title: "Footer",
      type: "object",
      fields: [
        {
          name: "tagline",
          title: "Tagline",
          type: "string",
          initialValue: "South Asian Student Association at Penn State",
        },
        {
          name: "quickLinksHeading",
          title: "Quick Links Heading",
          type: "string",
          initialValue: "Quick Links",
        },
        {
          name: "contactHeading",
          title: "Contact Heading",
          type: "string",
          initialValue: "Contact Us",
        },
        {
          name: "socialHeading",
          title: "Social Heading",
          type: "string",
          initialValue: "Follow Us",
        },
        {
          name: "copyright",
          title: "Copyright Notice",
          type: "string",
          description:
            "Use {year} as a placeholder for the current year.",
          initialValue:
            "© {year} Penn State South Asian Student Association. All rights reserved.",
        },
      ],
    }),
    defineField({
      name: "contact",
      title: "Contact Info",
      type: "object",
      fields: [
        {
          name: "email",
          title: "Email Address",
          type: "string",
          initialValue: "exec.psusasa@gmail.com",
        },
        {
          name: "instagramHandle",
          title: "Instagram Handle",
          type: "string",
          initialValue: "@psusasa",
        },
        {
          name: "instagramUrl",
          title: "Instagram URL",
          type: "url",
          initialValue: "https://instagram.com/psusasa",
        },
        {
          name: "tiktokHandle",
          title: "TikTok Handle",
          type: "string",
          initialValue: "@sasapsu",
        },
        {
          name: "tiktokUrl",
          title: "TikTok URL",
          type: "url",
          initialValue: "https://tiktok.com/@sasapsu",
        },
        {
          name: "linkedinUrl",
          title: "LinkedIn URL",
          description:
            "Link to the SASA LinkedIn page. Shows under Contact Us in the footer when set.",
          type: "url",
        },
        {
          name: "officeAddress",
          title: "Office Address",
          type: "text",
          rows: 2,
          initialValue: "204 HUB\nPenn State University Park",
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
