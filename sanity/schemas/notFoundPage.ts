import { defineField, defineType } from "sanity";

export default defineType({
  name: "notFoundPage",
  title: "404 Page",
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
          initialValue: "Page Not Found",
        },
        {
          name: "subtitle",
          title: "Subtitle",
          type: "string",
          initialValue: "We couldn't find the page you were looking for.",
        },
      ],
    }),
    defineField({
      name: "body",
      title: "Message Body",
      description:
        "Rich text shown below the hero. Use this to add a friendly note, suggestions, or links.",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "primaryCta",
      title: "Primary Button",
      type: "object",
      fields: [
        {
          name: "label",
          title: "Label",
          type: "string",
          initialValue: "Back to Home",
        },
        {
          name: "href",
          title: "Link",
          type: "string",
          initialValue: "/",
          description: "Internal path (e.g. /) or external URL.",
        },
      ],
    }),
    defineField({
      name: "secondaryCta",
      title: "Secondary Button (optional)",
      description: "Leave the label blank to hide this button.",
      type: "object",
      fields: [
        {
          name: "label",
          title: "Label",
          type: "string",
        },
        {
          name: "href",
          title: "Link",
          type: "string",
          description: "Internal path (e.g. /events) or external URL.",
        },
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "404 Page" }),
  },
});
