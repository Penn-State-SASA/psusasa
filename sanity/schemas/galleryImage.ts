import { defineField, defineType } from "sanity";

export default defineType({
  name: "galleryImage",
  title: "Gallery Image",
  type: "document",
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "caption",
      title: "Caption",
      type: "string",
    }),
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "event" }],
    }),
    defineField({
      name: "semester",
      title: "Semester",
      type: "string",
      description: 'e.g. "Fall 2025", "Spring 2026"',
    }),
  ],
  preview: {
    select: { title: "caption", media: "image", subtitle: "semester" },
  },
});
