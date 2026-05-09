import { defineField, defineType } from "sanity";

export default defineType({
  name: "aboutPage",
  title: "About Page",
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
          initialValue: "About SASA",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue:
            "The South Asian Student Association at Penn State University",
        },
      ],
    }),
    defineField({
      name: "history",
      title: "History Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Our History",
        },
        {
          name: "body",
          title: "Body",
          type: "array",
          of: [{ type: "block" }],
        },
      ],
    }),
    defineField({
      name: "mission",
      title: "Mission Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Our Mission",
        },
        {
          name: "quote",
          title: "Pull-Quote",
          type: "text",
          rows: 3,
          initialValue:
            "Fostering an environment at Penn State that allows students of South Asian heritage to share and promote their culture.",
        },
        {
          name: "body",
          title: "Body",
          type: "array",
          of: [{ type: "block" }],
        },
      ],
    }),
    defineField({
      name: "countries",
      title: "Countries Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Countries We Represent",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue: "Representing the diverse cultures of South Asia",
        },
        {
          name: "items",
          title: "Countries",
          type: "array",
          of: [
            {
              type: "object",
              fields: [
                { name: "name", title: "Name", type: "string" },
                { name: "abbr", title: "Abbreviation", type: "string" },
                {
                  name: "countryCode",
                  title: "ISO Country Code (lowercase, for flagcdn)",
                  type: "string",
                  description: 'Two-letter lowercase ISO code, e.g. "in", "pk".',
                },
              ],
              preview: { select: { title: "name", subtitle: "abbr" } },
            },
          ],
          initialValue: [
            { name: "India", abbr: "IND", countryCode: "in" },
            { name: "Pakistan", abbr: "PAK", countryCode: "pk" },
            { name: "Afghanistan", abbr: "AFG", countryCode: "af" },
            { name: "Bangladesh", abbr: "BGD", countryCode: "bd" },
            { name: "Bhutan", abbr: "BTN", countryCode: "bt" },
            { name: "Sri Lanka", abbr: "LKA", countryCode: "lk" },
            { name: "Maldives", abbr: "MDV", countryCode: "mv" },
          ],
        },
      ],
    }),
    defineField({
      name: "values",
      title: "Values Section",
      type: "object",
      fields: [
        {
          name: "heading",
          title: "Heading",
          type: "string",
          initialValue: "Our Values",
        },
        {
          name: "items",
          title: "Values",
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
                "We honor our rich cultural heritage through vibrant events, performances, and traditions that showcase the beauty and diversity of South Asia.",
            },
            {
              title: "Share",
              description:
                "We open our doors to the entire Penn State community, sharing our food, music, dance, and stories to foster cross-cultural understanding and appreciation.",
            },
            {
              title: "Grow",
              description:
                "We develop leaders, build lifelong friendships, and strengthen our community through service, mentorship, and collaborative initiatives.",
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "About Page" }),
  },
});
