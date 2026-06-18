import { defineField, defineType } from "sanity";

export default defineType({
  name: "galleryAlbum",
  title: "Gallery Album",
  type: "document",
  description:
    "A group of photos from one event. Shown under a single heading on the gallery page.",
  fields: [
    defineField({
      name: "title",
      title: "Heading",
      type: "string",
      description:
        "The heading shown above this album on the gallery page. Leave blank to use the linked event's title instead.",
    }),
    defineField({
      name: "event",
      title: "Linked Event (optional)",
      type: "reference",
      to: [{ type: "event" }],
      description:
        "Link an existing event. Its title is used as the heading when the 'Heading' field is blank.",
    }),
    defineField({
      name: "semester",
      title: "Semester",
      type: "string",
      description:
        'e.g. "Fall 2025", "Spring 2026". Albums are grouped by semester on the page.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "date",
      title: "Event Date",
      type: "date",
      description:
        "Used to sort albums within a semester (newest first).",
    }),
    defineField({
      name: "images",
      title: "Photos",
      type: "array",
      description:
        "Drag and drop multiple images here, or click '+ Add item' for each photo. Captions are optional per photo.",
      of: [
        {
          type: "object",
          name: "galleryPhoto",
          title: "Photo",
          fields: [
            {
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "caption",
              title: "Caption",
              type: "string",
            },
          ],
          preview: {
            select: { title: "caption", media: "image" },
            prepare({ title, media }) {
              return { title: title || "Photo", media };
            },
          },
        },
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: {
      title: "title",
      eventTitle: "event.title",
      semester: "semester",
      media: "images.0.image",
      images: "images",
    },
    prepare({ title, eventTitle, semester, media, images }) {
      const displayTitle = title || eventTitle || "Untitled Album";
      const count = Array.isArray(images) ? images.length : 0;
      return {
        title: displayTitle,
        subtitle: `${semester || "No semester"} • ${count} photo${count === 1 ? "" : "s"}`,
        media,
      };
    },
  },
});
