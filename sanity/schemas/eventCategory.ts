import { defineField, defineType } from "sanity";

export default defineType({
  name: "eventCategory",
  title: "Event Category",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "color",
      title: "Badge Color (hex)",
      type: "string",
      description: 'Enter a hex color value, e.g. #e63946',
      validation: (Rule) =>
        Rule.required().regex(/^#[0-9A-Fa-f]{6}$/, {
          name: "hex color",
          invert: false,
        }),
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "color" },
  },
});
