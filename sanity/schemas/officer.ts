import { defineField, defineType } from "sanity";

export default defineType({
  name: "officer",
  title: "Officer",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      validation: (Rule) => Rule.required(),
      options: {
        list: [
          { title: "President", value: "President" },
          { title: "Vice President", value: "Vice President" },
          { title: "Treasurer", value: "Treasurer" },
          { title: "Secretary", value: "Secretary" },
          { title: "Cultural Chair", value: "Cultural Chair" },
          { title: "Events Chair", value: "Events Chair" },
          { title: "PR Chair", value: "PR Chair" },
          { title: "THON Chair", value: "THON Chair" },
        ],
      },
    }),
    defineField({
      name: "headshot",
      title: "Headshot",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first",
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "headshot" },
  },
});
