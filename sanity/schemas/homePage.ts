import { defineField, defineType } from "sanity";

export default defineType({
  name: "homePage",
  title: "Home Page",
  type: "document",
  fields: [
    defineField({
      name: "hero",
      title: "Hero",
      type: "object",
      fields: [
        {
          name: "title",
          title: "Title",
          type: "string",
          initialValue: "Celebrating South Asian Heritage in Happy Valley",
        },
        {
          name: "tagline",
          title: "Tagline",
          type: "text",
          rows: 2,
          initialValue:
            "Penn State's South Asian Student Association — fostering community, culture, and connection since 1960.",
        },
        {
          name: "primaryCtaLabel",
          title: "Primary CTA Label",
          type: "string",
          initialValue: "Join SASA",
        },
        {
          name: "primaryCtaHref",
          title: "Primary CTA Href",
          type: "string",
          initialValue: "/join",
        },
        {
          name: "secondaryCtaLabel",
          title: "Secondary CTA Label",
          type: "string",
          initialValue: "Upcoming Events",
        },
        {
          name: "secondaryCtaHref",
          title: "Secondary CTA Href",
          type: "string",
          initialValue: "/events",
        },
      ],
    }),
    defineField({
      name: "mission",
      title: "Mission Section",
      type: "object",
      fields: [
        {
          name: "eyebrow",
          title: "Eyebrow / Subtitle",
          type: "string",
          initialValue: "Our Mission",
        },
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Who We Are",
        },
        {
          name: "body",
          title: "Body",
          type: "array",
          of: [{ type: "block" }],
        },
        {
          name: "valueCards",
          title: "Value Cards",
          description:
            "Icons stay in code based on card position (1st = 🎭, 2nd = 🤝, 3rd = 🌱).",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                { name: "title", title: "Title", type: "string" },
                { name: "description", title: "Description", type: "text", rows: 3 },
              ],
              preview: { select: { title: "title" } },
            },
          ],
          initialValue: [
            {
              title: "Celebrate",
              description:
                "Honoring South Asian traditions through cultural shows, festivals, and events that bring our heritage to life.",
            },
            {
              title: "Share",
              description:
                "Creating spaces to share our cultures, stories, and experiences with the Penn State community.",
            },
            {
              title: "Grow",
              description:
                "Building lasting friendships, leadership skills, and a stronger South Asian community in Happy Valley.",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "upcomingEvents",
      title: "Upcoming Events Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Upcoming Events",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue: "See what's coming up next",
        },
        {
          name: "emptyMessage",
          title: "Empty State Message",
          type: "string",
          initialValue: "No upcoming events right now — check back soon!",
        },
        {
          name: "viewAllLabel",
          title: "View All Button Label",
          type: "string",
          initialValue: "View All Events",
        },
      ],
    }),
    defineField({
      name: "joinCta",
      title: "Join CTA Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Become a Part of Our Community",
        },
        {
          name: "description",
          title: "Description",
          type: "text",
          rows: 3,
          initialValue:
            "Whether you're South Asian or simply interested in learning about South Asian culture, SASA welcomes everyone. Join us for events, make lifelong friends, and celebrate diversity.",
        },
        {
          name: "primaryCtaLabel",
          title: "Primary CTA Label",
          type: "string",
          initialValue: "Join SASA Today",
        },
        {
          name: "primaryCtaHref",
          title: "Primary CTA Href",
          type: "string",
          initialValue: "/join",
        },
        {
          name: "secondaryCtaLabel",
          title: "Secondary CTA Label",
          type: "string",
          initialValue: "Follow @psusasa on Instagram",
        },
        {
          name: "secondaryCtaHref",
          title: "Secondary CTA Href",
          type: "string",
          initialValue: "https://instagram.com/psusasa",
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Home Page" }),
  },
});
