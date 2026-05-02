import { defineField, defineType } from "sanity";

export default defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Date",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Cultural Show", value: "Cultural Show" },
          { title: "Festival", value: "Festival" },
          { title: "Social", value: "Social" },
          { title: "THON", value: "THON" },
          { title: "Community Service", value: "Community Service" },
        ],
      },
    }),
    defineField({
      name: "isFeatured",
      title: "Featured?",
      type: "boolean",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "title", date: "date" },
    prepare({ title, date }) {
      return {
        title,
        subtitle: date
          ? new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "No date set",
      };
    },
  },
});
